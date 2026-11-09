# Project Memory — MobileFix Pro

> The living decision log. When a decision changes, update **this** file and the doc(s) that reference it. Brand content lives here and propagates — never edit a `{{PLACEHOLDER}}` in individual docs.

---

## Brand identity (placeholders until owner supplies values)

| Token | Value |
|---|---|
| `{{SHOP_NAME}}` | _pending_ |
| `{{TAGLINE}}` | _pending_ |
| `{{OWNER}}` | _pending_ |
| `{{EST_YEAR}}` | _pending_ |
| `{{PHONE}}` / `{{WHATSAPP}}` | _pending_ |
| `{{EMAIL}}` | _pending_ |
| `{{DOMAIN}}` | _pending_ |
| `{{REG_NO}}` | _pending_ (optional) |
| `{{ADDRESS}}` / `{{MAPS_URL}}` | _pending_ |
| `{{CURRENCY}}` | ₹ (default, change if not INR) |
| `{{LOCALE_1}}` / `{{LOCALE_2}}` | en (Phase 2: _pending_) |
| `{{TIMEZONE}}` | Asia/Kolkata (default, change if needed) |
| `{{BRAND_PRIMARY}}` | `#1A5CFF` (swap for brand color) |

**Why:** business identity is content, not architecture — it must not block scaffolding. **How to apply:** when values arrive, fill this table, then run the propagation script to replace tokens across `docs/` and seed data.

---

## Locked decisions

### D-001 · v1 scope: Customer website + Admin panel (2026-08-02)
Technicians are **records managed by admin**; no technician login in v1. POS, payments, apps are post-launch.
**Why:** fastest path to running the real business loop with one tool.
**How:** `UserRole.TECHNICIAN` exists; auth for it is Phase 2. Do not add a technician route group in v1.

### D-002 · Multi-branch from day one
`Branch` is a first-class entity. Every business record carries `branchId`; settings scope `GLOBAL` or `BRANCH`.
**Why:** opening a second store must be a data insertion, never a migration.
**How:** any new branch-scoped model MUST include `branchId` + index. All list queries filter by branch.

### D-003 · Payments deferred to Phase 2 (Stripe)
`Booking.paymentStatus`, `Invoice.status` (UNPAID/PARTIAL/PAID/REFUNDED) are pre-wired. No checkout code in v1.
**Why:** v1 payment is at the counter; schema readiness avoids re-modeling.
**How:** do not invent payment flows in v1; Stripe hooks land in Phase 2.x.

### D-004 · Design: minimal professional / light
White `#FFFFFF`, off-white surface `#F7F7F8`, ink `#111111`, muted `#6B7280`, border `#E5E5E7`, primary `#1A5CFF` (swap via `{{BRAND_PRIMARY}}`). Inter typeface, 8px radius, flat shadows, Lucide icons. Dark mode is Phase 2.
**Why:** trust-first aesthetic for a service business; light keeps 3D hero and photos prominent.
**How:** Tailwind tokens only — see [design.md](design.md).

### D-005 · Money = integer minor units; tax = basis points
`Int` cents/paise everywhere; tax rate `Int` bps. No floats for currency.
**Why:** eliminates float drift and decimal-precision bugs across Prisma, API, and clients.
**How:** `packages/shared` exposes `formatMoney()`/`parseMoney()` — single conversion point.

### D-006 · Booking references are high-entropy, not sequential
`MF-YYYYMMDD-XXXXX` (5-char base32 suffix) used for the public tracker and booking emails.
**Why:** the tracker is public without login; the ref is the bearer secret.
**How:** generated in the booking service; never return raw `cuid()` in public URLs.

### D-007 · The Prisma schema is the contract
API zod schemas, API docs, and frontend types derive from `packages/db`. Schema changes require a committed migration.
**Why:** single source of truth; keeps web/admin/api/types in lockstep.
**How:** see [rules.md §4](rules.md).

### D-008 · Observability baseline
Structured JSON logs with `requestId`; `GET /health`; Sentry in prod. No customer PII in logs.
**Why:** stateless horizontally-scaled API needs distributed tracing by request id.
**How:** middleware emits `requestId`; error middleware redacts sensitive fields.

---

## Reference index

- Product: [PRD.md](PRD.md)
- System: [architecture.md](architecture.md)
- Data: [database.md](database.md) + [../prisma/schema.prisma](../prisma/schema.prisma)
- API: [api.md](api.md)
- UI: [design.md](design.md) · [component-library.md](component-library.md) · [wireframes.md](wireframes.md)
- Flows: [flows.md](flows.md)
- Quality: [rules.md](rules.md) · [testing.md](testing.md) · [security.md](security.md) · [performance.md](performance.md) · [seo.md](seo.md)
- Ops: [phases.md](phases.md) · [deployment.md](deployment.md) · [roadmap.md](roadmap.md)

## Open questions
- Service catalog & supported brands — default to the template list until owner curates (see PRD §9).
- Warranty policy wording — needed before invoice templates are finalized.
