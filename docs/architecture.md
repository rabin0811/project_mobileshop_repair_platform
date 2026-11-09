# System Architecture — MobileFix Pro

> Applies to **v1** (Customer web + Admin web + API). Phase 2 (payments, technician login, inventory) is designed for but not built. Companion docs: [PRD](PRD.md), [database](database.md), [api](api.md).

---

## 1. Architecture principles

1. **Branch-first, not tenancy-later** — `Branch` is a first-class entity. Every business record carries `branchId`; every query, report, and setting is branch-scoped. A second store opens by inserting a row, never a migration.
2. **Stateless API, horizontal scale** — the Express API holds no session state (JWT + rotating refresh via httpOnly cookies). Scaling = adding Railway instances behind the edge.
3. **Money in minor units** — all amounts are integers (cents / paise). No floats, no decimal drift, trivial `Int` in Prisma.
4. **The schema is the contract** — `packages/db` (Prisma) is the single source of truth. API types (`zod` schemas), API docs, and frontend types derive from it.
5. **Every state change is audited** — bookings, stages, prices, settings: an `AuditLog` row records who/what/diff.
6. **Security at the edge** — validation (zod) on every request, rate limiting, RBAC middleware, encrypted secrets, signed uploads.
7. **Modular monorepo** — one repo, npm workspaces, three deployable apps + shared packages.

---

## 2. High-level topology

```
                        ┌────────────────────────────────────────────┐
                        │              Vercel (edge/CDN)             │
                        │                                            │
   Browser ───────────► │  apps/web     (Customer site, React/Vite)  │
   Browser ───────────► │  apps/admin   (Admin panel, React/Vite)    │
                        └──────────────┬─────────────────────────────┘
                                       │ /api/v1/*   (same-origin, reverse-proxied)
                                       ▼
                        ┌────────────────────────────────────────────┐
                        │        Railway — apps/api (Express)        │
                        │   ┌───────────┬───────────┬────────────┐   │
                        │   │ auth      │ booking   │ cms        │   │
                        │   │ repair    │ invoice   │ admin      │   │
                        │   │ analytics │ files     │ ...        │   │
                        │   └─────┬──────────────┬────────────────┘   │
                        └─────────┼──────────────┼────────────────────┘
                                  │              │
                 ┌────────────────▼───┐   ┌──────▼───────────┐
                 │   Railway — Postgres│   │  External (SaaS) │
                 │   (managed, SSL)    │   │  ┌────────────┐  │
                 │   Prisma migrations │   │  │ Resend (email) │
                 └─────────────────────┘   │  │ Cloudinary(media)│
                                           │  │ Stripe (P2)  │
                                           └──┴──────────────┘
```

- **apps/web** and **apps/admin** are two React/Vite apps sharing `packages/ui`. Both reverse-proxy `/api` to the API host in production; in dev they hit `http://localhost:4000`.
- **apps/api** is the only process with DB + service credentials. Serves JSON REST under `/api/v1` and performs all email/media side effects.
- **Postgres** on Railway (PaaS-managed). Prisma CLI runs migrations; `prisma db push` is dev-only.

---

## 3. Monorepo layout

```
Mobileshop/
  apps/
    web/          # Customer site — React 18 + Vite + Tailwind + Framer Motion
    admin/        # Admin panel — React 18 + Vite + Tailwind + Recharts
    api/          # Express 5 + Prisma — the only backend
  packages/
    db/           # Prisma schema + generated client (single source of truth)
    ui/           # Design-system component library (storybook-ready)
    shared/       # zod schemas, enums, constants, money/utils, i18n dict
    config/       # shared tsconfig, eslint, prettier, tailwind presets
  docs/           # This documentation set
  scripts/        # seed, ci, release helpers
```

> npm workspaces (`"workspaces": ["apps/*", "packages/*"]`). One lockfile, one `tsc` build graph, one CI pipeline. See [folder-structure.md](folder-structure.md).

---

## 4. Frontend architecture

### 4.1 Shared rules (both apps)
- **Vite + React 18 + TypeScript strict.**
- **State:** server state lives in **TanStack Query** (caching, retries, invalidation). Transient UI state in local `useState`/context. No global store needed in v1.
- **Routing:** React Router v6. Route guards by role (admin) or auth (customer).
- **Forms:** react-hook-form + zod resolvers, mirroring API validation (`packages/shared`).
- **Styling:** Tailwind CSS v3 with design tokens from `packages/config` + `packages/ui`. **Design system:** see [design.md](design.md) and [component-library.md](component-library.md).
- **Motion:** Framer Motion for page transitions, steppers, micro-interactions (respects `prefers-reduced-motion`).
- **3D hero:** React Three Fiber on the customer landing hero only (lazy-loaded, Canvas suspended; optional per [design.md]).

### 4.2 apps/web (customer)
Feature slices (`src/features/`): `home`, `services`, `pricing`, `booking`, `track`, `reviews`, `auth`, `profile`, `branches`, `blog`, `contact`.
- Public routes need no auth; booking supports guest + logged-in.
- Track page reads `GET /bookings/track/:ref`.

### 4.3 apps/admin
Feature slices: `dashboard`, `bookings`, `repairs`, `customers`, `technicians`, `invoices`, `reviews`, `catalog` (services/brands/models/prices), `branches`, `coupons`, `cms`, `settings`, `audit`, `users`.
- Route guard requires `ADMIN`/`MANAGER`; capability check per feature (RBAC map in `packages/shared`).

### 4.4 Data fetching conventions
- All queries go through TanStack Query hooks; mutations invalidate the affected query keys (`['bookings', {branch, date}]`, etc.).
- Envelope: `{ data, error?, meta? }`; API errors carry `{ code, message, details? }` (see [api.md](api.md)).

---

## 5. Backend architecture (apps/api)

### 5.1 Layering
```
routes (http/validation)
   → controllers (parse req → call service → map response)
      → services (business logic, transactions, email/audit side effects)
         → repositories (Prisma queries)
            → PostgreSQL
```
- **No business logic in controllers.** Services are framework-free (testable units).
- **Validation layer:** zod schemas (from `packages/shared`) enforced in middleware before any controller code.

### 5.2 Module map (v1)
`auth`, `users`, `customers`, `branches`, `brands`, `models`, `services`, `pricing`, `bookings`, `repairs`, `invoices`, `reviews`, `coupons`, `technicians`, `cms`, `notifications`, `settings`, `analytics`, `audit`, `upload`, `health`.

Each module = `{ moduleName }.routes.ts`, `.controller.ts`, `.service.ts`, `.repo.ts`, `.schema.ts`, `.mail.ts` (emails), `.tests.ts`.

### 5.3 Middleware pipeline
`helmet → cors(credentials:true) → express.json(limit) → requestId → morgan(log) → rateLimit(per-route) → validate(zod) → authenticate (optional) → authorize (required for admin) → handler → errorHandler`

- `authenticate`: parses Bearer access token → loads minimal user (`id, role, branchId-scope`) → attaches `req.user`.
- `authorize(capabilities)`: RBAC map `role → capabilities`.
- `errorHandler`: maps known errors (`ZodError`, `Prisma.PrismaClientKnownRequestError` P2002/P2025, custom `AppError`) to the error envelope; never leaks stack traces.

### 5.4 Auth (JWT + rotating refresh)
- **Access token:** JWT HS256, 15 min, claims `{ sub, role }`. Sent as `Authorization: Bearer`.
- **Refresh token:** opaque random 256-bit, hashed at rest (`sha256`), stored in `RefreshToken`, 7-day expiry, rotation on use (old token revoked → replaced), delivered in an httpOnly, `SameSite=Lax`, `Secure` cookie. Reuse detection revokes the whole session family.
- **Password:** bcrypt (cost 12). Email verification + password reset via signed/OTP flows (Resend).
- Logout revokes the refresh token; password change revokes all sessions (`passwordChangedAt` check).

### 5.5 Emails (Resend)
- `mailer` sends template-keyed emails from admin-editable `EmailTemplate` rows; rendered server-side (React Email → HTML, or MJML). Retries w/ backoff; `EmailLog` tracks deliveries and failures.
- All templates: see [PRD §5.8](PRD.md).

### 5.6 Media (Cloudinary)
- **Signed uploads only.** Client requests `POST /upload/sign` → gets a one-time signature for a constrained folder/format/size; files never touch the API. URLs stored on models (`imageUrl`, `Booking.images`).
- Transforms via Cloudinary URL params (`f_auto,q_auto,w_*`).

### 5.7 Observability
- Structured JSON logs with `requestId`; request/response timing; slow-query log (Prisma `log: ['query','warn','error']` in dev).
- Errors reported to an error tracker (Sentry) in prod. Health endpoint `GET /health` (DB ping, version).

---

## 6. Data model overview

Full schema: [prisma/schema.prisma](../prisma/schema.prisma) · ER diagram + conventions: [database.md](database.md).

```
User ── Customer ── SavedDevice / Address
  └── Technician (branchId)
Branch ── Settings(branch-scope) · Gallery · Inventory(PartStock)
Brand ── DeviceModel
Service ── ServicePrice(service,brand,model?)
Booking(branchId) ── BookingService · BookingEvent · Invoice · Review
Part ── PartStock · PurchaseOrder(+items) · PartMovement
Coupon · Faq · BlogPost · Testimonial · EmailTemplate · Notification
RefreshToken · Otp · AuditLog · Setting
```

---

## 7. Key flows

> Full walkthroughs with diagrams: [flows.md](flows.md).

- **Booking (guest):** calculator estimate → slot check → create booking (transaction: booking + services + event) → Resend confirmation → admin sees it in dashboard → confirm → device intake → stage machine → invoice → review request. All scoped to a branch.
- **Repair stage machine:** allowed transitions enforced in service layer; each move writes `BookingEvent` + email + optional notification.
- **Admin login:** email+password → JWT; RBAC capability check on every admin route; audit logged.

---

## 8. Cross-cutting concerns

| Concern | Decision |
|---|---|
| Config | `packages/config` env schema (zod-validated at boot). No secrets in client bundles; API-only env vars. |
| CORS | `credentials: true`, origin allowlist from env. |
| Rate limiting | Per-route limits (auth: 10/15min/IP, booking: 20/10min, review: 5/hr, estimate: 60/10min). |
| Pagination | `?page&pageSize` (cap 100), cursor option for high-volume reports. |
| Time | All stored `timestamptz` (UTC); display localized per branch timezone. Slots resolved in branch tz. |
| IDs | `cuid()` public-safe IDs; human booking refs `MF-YYYYMMDD-XXXXX` high-entropy suffix. |
| Money | `Int` minor units. Tax rate as basis points (`Int`, e.g. 1800 = 18%). |

---

## 9. Deployment topology

- **apps/web** & **apps/admin** → **Vercel** (static SPA + rewrites `/api/*` → Railway). Edge caching for public CMS routes via Vercel config.
- **apps/api** → **Railway** (Node container). Horizontal auto-scale; health checks.
- **PostgreSQL** → Railway managed Postgres (or Neon for branching in dev).
- Env/secret management: Railway env vault; Vercel project env; never committed.
- Migrations run as a pre-deploy step in CI against a migration service account; zero-downtime guidance in [deployment.md](deployment.md).

---

## 10. Evolution path (no re-architecture)

| Phase | Adds | Architectural impact |
|---|---|---|
| P2 payments | Stripe checkout, webhooks | New `Payment` rows + webhook handler; `Booking.paymentStatus` already exists |
| P2 technician login | apps/technician or panel role | RBAC + `TECHNICIAN` role activated; reuse existing services |
| P2 inventory | parts/stock/suppliers/PO | Tables already defined; enable admin sections |
| P3 apps | React Native (Expo) | Reuse `apps/api` + `packages/shared` as-is |
| P3 multi-branch ops | branch-level reports | Already branch-scoped |

**No schema migrations required to open branch #2 or accept a Stripe payment.** See [roadmap.md](roadmap.md).
