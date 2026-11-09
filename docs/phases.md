# Implementation Phases — MobileFix Pro

> Build order for v1. Each phase ends in a deployable, demoable milestone. Estimates are for a small team (1–2 devs). Sizes: S=1–3d, M=3–7d, L=1–3w.

---

## Phase 0 — Foundations (week 1) · M
**Goal:** repo, tooling, CI, DB up and deploying.
- [ ] Scaffold monorepo (npm workspaces): `apps/web`, `apps/admin`, `apps/api`, `packages/{db,ui,shared,config}`.
- [ ] Tailwind presets + design tokens wired ([design.md](design.md)).
- [ ] Prisma schema v1 (this doc set) → first migration → Railway Postgres.
- [ ] CI: lint, typecheck, test, build on PR.
- [ ] Deployment: Vercel previews for web/admin; Railway for API. Env vault.
- **Exit:** empty apps deploy; health endpoint returns `{ ok: true }`.

## Phase 1 — Auth & admin shell (weeks 2–3) · L
**Goal:** admin can log in and manage the catalog.
- [ ] Auth API: register, login, refresh rotation, logout, email verify, forgot/reset.
- [ ] RBAC (`ADMIN`/`MANAGER`) + `authorize` middleware + audit log.
- [ ] Admin shell: layout, nav, route guards, dashboard placeholder.
- [ ] Catalog CRUD: services, brands, models, price matrix (`ServicePrice`).
- [ ] Branches CRUD + branch-scoped settings.
- **Exit:** seeded demo catalog; admin CRUDs services & prices end-to-end.

## Phase 2 — Customer site & booking (weeks 4–5) · L
**Goal:** a guest can get an estimate and book.
- [ ] Calculator endpoint + live estimate UI (brand → model → service).
- [ ] Booking create (transaction, idempotency, slot check) + confirmation email (Resend).
- [ ] Booking flow UI: branch → brand → model → services → slot → details → photos (Cloudinary signed) → confirm.
- [ ] Time-slot availability per branch/hours.
- [ ] Guest + logged-in booking; saved devices/addresses for logged-in.
- **Exit:** walk a full booking from the site; email lands in dev inbox; booking visible in admin.

## Phase 3 — Repairs, intake & invoices (weeks 6–7) · L
**Goal:** the shop runs its core loop.
- [ ] Admin booking list + calendar; walk-in create; intake form (IMEI, password vault, photos).
- [ ] Technician CRUD (data only) + assign technician.
- [ ] Repair stage state machine + `BookingEvent` + per-stage emails + public tracker page.
- [ ] Invoice generation (PDF via React Email/Cloudinary) + email; payment status field.
- [ ] Customer history page (logged-in).
- **Exit:** booking → intake → repair → invoice, with email at every step, tracked publicly.

## Phase 4 — Reviews, CMS, analytics (week 8) · M
**Goal:** trust + content + insight.
- [ ] Reviews: booking-verified submit (photos), moderation queue, reply, feature.
- [ ] Review-request auto-email N days post-DELIVERED.
- [ ] CMS: FAQ, gallery, blog, testimonials, homepage content.
- [ ] Analytics endpoints + Recharts dashboard (KPIs, funnel, revenue, top services).
- [ ] Coupons (site-wide).
- **Exit:** a full admin can operate the business without a second tool.

## Phase 5 — Hardening & SEO (weeks 9–10) · S–M
**Goal:** launch-ready.
- [ ] SEO: prerender/SSG key routes (Vite SSR or prerender), sitemap, robots, OG tags, structured data.
- [ ] Performance pass (Lighthouse ≥ 90), lazy loading, image optimization.
- [ ] Security pass ([security.md](security.md)), rate-limit tuning, error monitoring.
- [ ] Accessibility audit (WCAG AA).
- [ ] E2E suite + launch checklist.
- **Exit:** **v1 launch.**

## Phase 2.x — Post-launch (defined, not scheduled)
- [ ] Stripe payments: checkout, webhooks, refunds (schema ready).
- [ ] Technician login panel (role enabled; reuse booking/repair services).
- [ ] Inventory: parts, stock, suppliers, purchase orders (tables ready).
- [ ] Dark mode + i18n (`{{LOCALE_2}}`).
- [ ] Notifications via push/WhatsApp (R2D2) opt-in.

## Roadmap (later)
POS, mobile apps (Expo reusing `apps/api`), AI price prediction, inventory forecasting, franchise/multi-tenant, ERP/accounting hooks — see [roadmap.md](roadmap.md).

---

## Milestones recap

| # | Milestone | Week | Demo |
|---|---|---|---|
| M1 | Foundations deployed | 1 | green CI, apps online |
| M2 | Catalog + auth | 3 | admin manages catalog |
| M3 | Booking live | 5 | guest books, email lands |
| M4 | Repair → invoice loop | 7 | full operational loop |
| M5 | Trust + analytics | 8 | reviews, CMS, dashboard |
| M6 | Launch | 10 | production v1 |

> **Sequencing note:** Phases are deliberately ordered so the *money loop* (booking → repair → invoice) is complete before reviews/CMS/analytics. Do not reorder unless the owner re-prioritizes.
