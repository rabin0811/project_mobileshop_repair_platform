# Folder Structure — MobileFix Pro

> Annotated monorepo layout for the three deployable apps and the shared packages.
> Companion docs: [architecture.md](architecture.md) §3 (topology), [api.md](api.md) (module map), [design.md](design.md).
> Planned structure — this is the target the scaffolding scripts produce.

---

## 1. Repository root

```
Mobileshop/
├── package.json                  # npm workspaces: ["apps/*", "packages/*"]; shared scripts
├── turbo.json                    # task runner — build/test/lint graph across workspace
├── tsconfig.base.json            # base TS config (strict); apps/packages extend it
├── .npmrc                        # workspace + registry config
├── .env.example                  # API-only env template (DATABASE_URL, JWT_SECRET, RESEND_KEY, CLOUDINARY…)
├── .gitignore                    # node_modules, .env, dist, .vercel
├── README.md
├── docs/                         # this documentation set (architecture, PRD, api, flows, …)
├── scripts/
│   ├── seed.ts                   # dev seed: branches, catalog, prices, users, demo bookings
│   ├── seed-content.ts           # CMS/content seed (FAQ, gallery, blog, testimonials)
│   ├── propagate-tokens.mjs      # replaces {{PLACEHOLDER}} tokens across docs + seeds (see memory.md)
│   ├── ci.mjs                    # CI orchestration: install → generate → lint → test → migrate
│   └── release.mjs               # version bump + changelog helper
├── packages/                     # shared, non-deployable libraries (see §2)
└── apps/                         # three deployable applications (see §3–§5)
```

---

## 2. packages/ — shared code

```
packages/
├── db/                           # THE CONTRACT — Prisma schema + generated client
│   ├── package.json              # "db:generate", "db:migrate", "db:push" (dev-only)
│   ├── prisma/
│   │   ├── schema.prisma         # single source of truth (all models + enums, see api.md)
│   │   └── migrations/           # committed, versioned SQL migrations (one per schema change)
│   ├── seed/                     # re-exported seed scripts (called from scripts/seed.ts)
│   └── src/
│       ├── client.ts             # exported PrismaClient singleton (imported ONLY by apps/api)
│       └── index.ts              # re-exports client + generated types
│
├── shared/                       # framework-free, importable by web/admin/api
│   ├── package.json
│   └── src/
│       ├── index.ts              # public barrel
│       ├── zod/
│       │   ├── auth.ts           # register/login/reset schemas
│       │   ├── booking.ts        # create-booking, estimate, advance-stage schemas
│       │   ├── catalog.ts        # service/brand/model/price schemas
│       │   ├── cms.ts            # faq/gallery/blog/testimonial schemas
│       │   └── admin.ts          # customer/technician/coupon/settings schemas
│       ├── enums.ts              # mirrors Prisma enums (BookingStatus, RepairStage, …) as consts
│       ├── rbac.ts               # role → capability map (authorize() input; see api.md §4)
│       ├── money.ts              # formatMoney()/parseMoney() — the ONLY money conversion point
│       ├── refs.ts               # bookingRef/invoiceNo validators (MF-…, INV-… patterns)
│       ├── constants.ts          # pagination caps, rate-limit table, notification types
│       ├── api-client-types.ts   # Envelope<T>, ErrorEnvelope types shared by web/admin
│       └── i18n/                 # i18n dictionary (en; locale 2 is Phase 2)
│           └── en.ts
│
├── ui/                           # design-system component library (storybook-ready)
│   ├── package.json
│   └── src/
│       ├── index.ts              # barrel export
│       ├── primitives/           # Button, Input, Select, Dialog, Toast, Tabs, Badge…
│       ├── components/           # composed: PageHeader, DataTable, EmptyState, Stepper, RatingStars…
│       ├── forms/                # FormField wrappers over react-hook-form
│       ├── hooks/                # useDebounce, useMediaQuery, useClickOutside…
│       └── tokens.ts             # design tokens (colors/radius/type scale from design.md)
│
└── config/                       # shared build/lint/format presets — NO runtime code
    ├── tsconfig.base.json        # strict TS preset
    ├── eslint-preset.js
    ├── prettier.config.js
    └── tailwind-preset.js        # theme.extend tokens (brand colors, Inter, shadows)
```

**Import rule:** `web` and `admin` import only `@mobilefix/ui` and `@mobilefix/shared`. `db` is imported **only** by `api` (and scripts). Nothing imports `config` at runtime.

---

## 3. apps/web — customer site (React 18 + Vite + Tailwind + Framer Motion)

```
apps/web/
├── package.json                  # deps: @mobilefix/ui, @mobilefix/shared
├── vite.config.ts                # dev proxy: /api → http://localhost:4000; build config
├── tailwind.config.js            # extends @mobilefix/config/tailwind-preset
├── index.html                    # SPA shell (meta/OG tags, fonts)
├── vercel.json                   # rewrites /api/* → Railway; edge cache for /cms/*, /blog/*
├── public/                       # static assets (favicon, robots.txt, sitemap.xml)
├── src/
│   ├── main.tsx                  # ReactDOM root
│   ├── App.tsx                   # RouterProvider mount
│   ├── app/                      # app-level wiring — NO feature code
│   │   ├── providers.tsx         # QueryClient + AuthProvider + ThemeProvider composition
│   │   ├── router.tsx            # route table (public + protected paths)
│   │   └── auth-context.tsx      # holds accessToken in memory + refresh loop (cookie is httpOnly)
│   ├── lib/                      # thin, shared client layer
│   │   ├── api.ts                # fetch wrapper: envelope unwrap, Bearer attach, error → code/message
│   │   ├── query-keys.ts         # TanStack Query key factories (['bookings', {branch,date}], …)
│   │   ├── hooks.ts              # useAuth, useCurrentUser, useQuery/useMutation conveniences
│   │   └── utils.ts              # date/branch-tz helpers, currency format (shared money util)
│   ├── components/               # shared UI used across features (web-flavored)
│   │   ├── Header.tsx            # sticky nav: services, pricing, track, branches, blog, contact
│   │   ├── Footer.tsx
│   │   ├── BranchPicker.tsx      # branch selector fed by GET /branches
│   │   ├── RatingStars.tsx
│   │   ├── SectionHeading.tsx
│   │   └── Stepper.tsx           # booking wizard progress
│   └── features/                 # feature slices — self-contained per page/flow
│       ├── home/                 # landing: hero (R3F 3D), trust badges, how-it-works, services
│       │   ├── HomePage.tsx      #   overview, featured reviews, FAQ teaser, CTA
│       │   └── components/       #   Hero3D.tsx (lazy), TrustBadges, HowItWorks, FeaturedReviews
│       ├── services/             # services catalog
│       │   ├── ServicesPage.tsx  # list + category filter (GET /services)
│       │   └── ServiceDetailPage.tsx  # GET /services/:slug (est time, warranty, from-price)
│       ├── pricing/              # instant price calculator
│       │   ├── PricingPage.tsx   # brand → model → service multi-select → POST /repair/estimate
│       │   └── estimate-result.tsx
│       ├── booking/              # multi-step booking wizard (guest + logged-in)
│       │   ├── BookingPage.tsx   # orchestrates steps + Idempotency-Key header
│       │   ├── steps/            # branch, brand/model, services, slot, details, confirm
│       │   ├── slots.ts          # GET /bookings/slots wiring
│       │   └── images.ts         # signed upload → POST /bookings/:id/images
│       ├── track/                # public repair tracker
│       │   ├── TrackPage.tsx     # GET /bookings/track/:bookingRef (no login)
│       │   └── Timeline.tsx      # BookingEvent timeline render
│       ├── reviews/              # review submit + public reviews
│       │   ├── ReviewForm.tsx    # POST /reviews (booking-verified)
│       │   └── ReviewsPage.tsx   # GET /reviews (approved only)
│       ├── auth/                 # customer account
│       │   ├── RegisterPage.tsx / LoginPage.tsx
│       │   ├── VerifyEmailPage.tsx   # POST /auth/verify-email
│       │   └── ResetPasswordPage.tsx # forgot + reset
│       ├── profile/              # logged-in account area
│       │   ├── ProfilePage.tsx   # GET/PATCH /me, change password
│       │   ├── MyBookingsPage.tsx# GET /bookings/my (+ cancel)
│       │   ├── SavedDevices.tsx
│       │   └── Addresses.tsx
│       ├── branches/             # branch locator
│       │   ├── BranchesPage.tsx  # GET /branches
│       │   └── BranchDetailPage.tsx  # GET /branches/:slug (hours, maps, WhatsApp)
│       ├── blog/                 # CMS blog
│       │   ├── BlogPage.tsx      # GET /cms/blog-posts
│       │   └── BlogPostPage.tsx  # GET /cms/blog-posts/:slug
│       └── contact/              # contact + location
│           └── ContactPage.tsx   # branch cards, maps, WhatsApp CTA
│
│   └── feature anatomy: every slice ships {Page, components/, api.ts, hooks.ts, schema.ts}
│       (schema.ts re-exports zod schemas from @mobilefix/shared — validation mirrors the API)
```

---

## 4. apps/admin — admin panel (React 18 + Vite + Tailwind + Recharts)

```
apps/admin/
├── package.json                  # deps: @mobilefix/ui, @mobilefix/shared
├── vite.config.ts                # dev proxy: /api → http://localhost:4000
├── tailwind.config.js
├── index.html
├── vercel.json                   # SPA + /api rewrite; edge-cached nothing (admin is private)
└── src/
    ├── main.tsx                  # ReactDOM root
    ├── App.tsx                   # RouterProvider + AppShell
    ├── layout/
    │   ├── AppShell.tsx          # sidebar + topbar frame
    │   ├── Sidebar.tsx           # nav filtered by capability map (rbac.ts)
    │   ├── Topbar.tsx            # branch switcher, notifications bell, user menu
    │   └── BranchSwitcher.tsx    # scopes list/detail queries to a branchId
    ├── routes/
    │   ├── router.tsx            # admin route table
    │   ├── RequireAuth.tsx       # redirect → /login when no valid session
    │   └── RequireCapability.tsx # authorize(capability) gate per route/feature
    ├── lib/
    │   ├── api.ts                # envelope-aware fetch client (Bearer + error mapping)
    │   ├── query-keys.ts         # query key factories (['bookings', {branch, date}], …)
    │   └── utils.ts
    └── features/                 # one slice per admin function (see PRD §4 “Admin panel”)
        ├── dashboard/            # KPI tiles + Recharts (GET /analytics/overview, /bookings)
        ├── bookings/             # calendar + list, detail, intake, walk-in, cancel
        │   ├── BookingsPage.tsx  # list w/ filters (branch, status, date range, search)
        │   ├── BookingDetailPage.tsx # services/events/invoice/review + actions
        │   ├── WalkInModal.tsx   # POST /bookings/walk-in
        │   └── IntakeForm.tsx    # device details, assign technician, set estimate
        ├── repairs/              # pipeline board + stage machine
        │   ├── RepairsBoard.tsx  # kanban by RepairStage (GET /repairs)
        │   └── AdvanceStageDialog.tsx  # GET transitions → POST advance-stage
        ├── customers/            # CustomerListPage, CustomerDetailPage (history/devices)
        ├── technicians/          # TechnicianListPage, TechnicianForm (CRUD)
        ├── invoices/             # InvoiceListPage, InvoiceDetailPage (generate, markPaid, void)
        ├── reviews/              # ModerationQueuePage (approve/reject/reply/feature)
        ├── catalog/              # ServicesPage, BrandsPage, ModelsPage, PriceMatrixPage
        ├── branches/             # BranchListPage, BranchForm (businessHours editor)
        ├── coupons/              # CouponListPage, CouponForm
        ├── cms/                  # FaqAdmin, GalleryAdmin, BlogAdmin, TestimonialsAdmin
        ├── settings/             # SettingsPage (GLOBAL/BRANCH), EmailTemplateEditor
        ├── audit/                # AuditLogPage (read-only viewer, GET /audit)
        └── users/                # staff & roles (ADMIN only) — UsersPage, RoleForm
```

---

## 5. apps/api — the only backend (Express 5 + Prisma)

```
apps/api/
├── package.json                  # deps: express, zod, prisma, jsonwebtoken, bcryptjs, resend, cloudinary…
├── tsconfig.json
├── Dockerfile                    # Railway container
├── .env.example                  # DATABASE_URL, JWT_SECRET, REFRESH_COOKIE_NAME, RESEND_API_KEY,
│                                 #   CLOUDINARY_*, CORS_ORIGINS, RATE_LIMIT_*
└── src/
    ├── index.ts                  # bootstrap: load config → createApp() → listen(PORT)
    ├── app.ts                    # createApp() factory (testable without listening):
    │                             #   helmet → cors(credentials) → json(limit) → requestId → morgan
    │                             #   → routes → notFound → errorHandler
    ├── routes.ts                 # mounts every module router under /api/v1
    ├── config/
    │   ├── env.ts                # zod-validated env schema at boot (fail fast on missing secrets)
    │   └── index.ts              # typed config object (db, jwt, resend, cloudinary, limits)
    ├── middleware/
    │   ├── requestId.ts          # X-Request-Id on every request/response + log context
    │   ├── rateLimit.ts          # per-route limiters (auth 10/15min, booking 20/10min, …)
    │   ├── validate.ts           # zod validation of body/query/params BEFORE controller code
    │   ├── authenticate.ts       # parses Bearer JWT → req.user { id, role } (15-min access)
    │   ├── authorize.ts          # authorize(capabilities) — RBAC gate (ADMIN/MANAGER routes)
    │   ├── errorHandler.ts       # maps ZodError/Prisma P2002/P2025/AppError → error envelope
    │   └── notFound.ts           # 404 for unmatched routes
    ├── lib/                      # shared infrastructure — NO business logic
    │   ├── prisma.ts             # PrismaClient singleton (owns DB credentials — api-only)
    │   ├── auth.ts               # jwt sign/verify, bcrypt, refresh token issue/rotate/hash
    │   ├── refs.ts               # bookingRef (MF-YYYYMMDD-XXXXX) + invoiceNo (INV-…) generators
    │   ├── slug.ts               # slugify helper
    │   ├── mailer.ts             # Resend wrapper: template render (React Email/MJML) + retry/backoff
    │   ├── cloudinary.ts         # signature + upload helpers (signed uploads only)
    │   ├── audit.ts              # writeAudit(actor, action, entity, diff) — every mutation calls this
    │   ├── notify.ts             # create Notification rows (repair updates, invoice ready)
    │   └── paginate.ts           # page/pageSize (cap 100) + meta extraction
    └── modules/                  # one folder per module — identical file anatomy:
        ├── auth/                 #   register/login/refresh/logout/verify/reset
        ├── users/                #   admin staff + roles (ADMIN only)
        ├── customers/
        ├── branches/
        ├── brands/
        ├── models/
        ├── services/
        ├── pricing/              #   estimate resolution + price-matrix admin
        ├── bookings/             #   create, slots, track, cancel, images, admin list/detail/walk-in
        ├── repairs/              #   pipeline + stage machine (transitions, advance-stage)
        ├── invoices/             #   generate, list, markPaid, void
        ├── reviews/
        ├── coupons/
        ├── technicians/
        ├── cms/                  #   faq, gallery, blog-posts, testimonials
        ├── notifications/
        ├── settings/             #   settings + email-templates
        ├── analytics/            #   overview, bookings, revenue, services
        ├── audit/
        ├── upload/               #   POST /upload/sign (Cloudinary signed)
        └── health/
```

### Module file anatomy (e.g. `modules/bookings/`)

```
bookings/
├── bookings.routes.ts    # Express router: paths + middleware chain (validate → authenticate/authorize)
├── bookings.controller.ts# parse req → call service → map to envelope (NO business logic)
├── bookings.service.ts   # business rules, transactions (booking+services+event), side effects (email/audit)
├── bookings.repo.ts      # Prisma queries only (filters, pagination, joins)
├── bookings.schema.ts    # zod schemas (imports shared schemas; re-validates at the API boundary)
├── bookings.mail.ts      # template-keyed email builders (confirm, cancelled, stage update)
└── bookings.tests.ts     # unit tests (service/repo in isolation — framework-free)
```

---

## 6. Dependency rule

```
apps/web ──┐
           ├──> packages/ui ──> packages/shared ──> (pure TS, no server deps)
apps/admin ┘
apps/api ───> packages/db (Prisma) ──> PostgreSQL
apps/api ───> packages/shared (zod schemas, enums, rbac)
```

1. **`apps/api` is the only process with secrets** — `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_API_SECRET` are API-only. `web`/`admin` never import `packages/db` and never read API env vars.
2. **`web` and `admin` never import each other or `apps/api`** — shared contract flows through `packages/ui` (components) + `packages/shared` (zod/enums/money/rbac). API zod schemas in `shared` are the same objects the API middleware validates with, so frontend forms mirror server validation.
3. **`packages/db` is imported only by `apps/api` and `scripts/`** — a browser bundle importing Prisma is a build error (guarded by an eslint boundary rule in `config`).
4. **`packages/shared` stays framework-free** — no React, no Express, no Prisma imports; only `zod` + pure TS. This is what makes it safe to import from all three apps.
5. New business state goes in `packages/db` (schema + migration) first; then `shared` types/schemas; then `api` module; then `web`/`admin` features. That order keeps the schema as the contract.

---

**Referenced by:** [architecture.md](architecture.md) §3, [PRD.md](PRD.md) §4, [api.md](api.md) §5 module map. **Depends on:** [prisma/schema.prisma](../prisma/schema.prisma) (contract), `packages/shared` `rbac.ts` + zod schemas.
