# Roadmap — MobileFix Pro

> The post-v1 plan, **consistent with [phases.md](phases.md)** (Phase 2.x list + "Roadmap (later)") **and [architecture.md](architecture.md) §10 "Evolution path (no re-architecture)"**.
> Sizes from phases.md: S=1–3d, M=3–7d, L=1–3w; XL=3–6w for multi-quarter work.
> Written 2026-08-02. Everything here is **post-launch** and ordered by business value, not by promise date.

---

## 1. Where we are

v1 shipped: Customer website + Admin panel, one shared API, multi-branch from day one (phases.md M6 / memory.md D-001, D-002). This file covers **Phase 2.x** (next, ordered by business value), then **Phases 3–5** (later). Every phase below either adds a module or enables existing schema — **never a re-architecture.**

**Horizon view (illustrative, not a commitment — owner re-prioritizes as business value shifts):**

| Horizon | Window | Work |
|---|---|---|
| Near term | ~2–3 months after v1 launch | Phase 2.x items 2.1–2.6 (Stripe first) |
| Medium | ~next quarter | Phase 3 — mobile apps, POS, operations center |
| Later | as demand dictates | Phase 4 enterprise, Phase 5 AI |

**Status legend used below:** all Phase 2.x items are **not started** (they are defined, not scheduled — phases.md). Phases 3–5 are **proposals** until the owner green-lights a milestone.

## 2. The no-migration guarantee (read this first)

**Opening branch #2 and accepting a Stripe payment require NO schema migration — only data and code.**

- **Branch #2:** `Branch` is a first-class entity and every business record carries `branchId` (D-002). A second store opens by inserting a `Branch` row (plus its branch-scoped settings, gallery, and stock) from the admin UI. No DDL, no code change beyond what v1 already ships.
- **Stripe payment (minimum viable):** `Booking.paymentStatus` and `Invoice.status` (`UNPAID`/`PARTIAL`/`PAID`/`REFUNDED`) are pre-wired (D-003). A Stripe webhook marks an invoice `PAID` and a booking `PARTIAL`/`PAID` with **zero schema change**. Online deposits use `Booking.depositAmount`, which already exists.
- **Optional `Payment` ledger:** the *only* piece of Phase 2.1 that touches the schema. It is a pure **additive, forward-only migration** — a new table + FKs, no column edits, no backfill — and it is skippable if we keep payment history on Invoice/Booking.

| Path | Migration? | What you get |
|---|---|---|
| Open branch #2 | none | second store live, all reports branch-scoped |
| Stripe checkout + webhook marks PAID | none | online deposits + full payment accepted |
| Full `Payment` ledger model | 1 additive migration (optional) | per-event history, refunds, deposits, reconciliation |

This is the architecture's stated point (§10): **add features, don't re-model.** Guardrail (from rules.md §4): any future schema change ships as a committed **additive** migration — no rewrites of existing columns, no destructive moves.

## 3. Evolution path recap (architecture.md §10, confirmed)

The canonical table, restated so this roadmap and architecture.md cannot drift apart:

| Phase | Adds | Architectural impact |
|---|---|---|
| P2 payments | Stripe checkout, webhooks | New `Payment` rows + webhook handler; `Booking.paymentStatus` already exists |
| P2 technician login | apps/technician or panel role | RBAC + `TECHNICIAN` role activated; reuse existing services |
| P2 inventory | parts/stock/suppliers/PO | Tables already defined; enable admin sections |
| P3 apps | React Native (Expo) | Reuse `apps/api` + `packages/shared` as-is |
| P3 multi-branch ops | branch-level reports | Already branch-scoped |

> Confirmed by §2 above: **no schema migrations are required to open branch #2 or accept a Stripe payment.** The only schema deltas anywhere in this roadmap are the two explicitly-flagged additive migrations (optional `Payment` ledger, analytics snapshot) and Phase 4's nullable `tenantId` + webhook-inbox table.

---

## 4. Phase 2.x — Next, ordered by business value

### 4.0 Phase overview

| # | Item | Size | Business value | Schema delta | Architecture impact |
|---|---|---|---|---|---|
| 2.1 | Stripe online payments | L (1–3 w) | highest — cash in hand online + at counter | none (optional ledger: +1 additive) | additive module |
| 2.2 | Technician login panel | M (3–7 d) | high — unblocks bench self-service | none | none (RBAC) |
| 2.3 | Full inventory | M–L (1–2 w) | high — stock truth per branch | none | additive module |
| 2.4 | Dark mode + i18n | M (3–7 d) | medium — polish, LOCALE_2 | none | none (UI) |
| 2.5 | Push / WhatsApp notifications | S–M (3–7 d) | medium — customer channel | none | additive adapters |
| 2.6 | Analytics expansion | M (3–7 d) | medium — branch health | +1 additive (snapshot) | additive module |

**Release packaging:** ship 2.1 as its own minor release (it touches money + webhooks). 2.2 + 2.3 together make a "team productivity" release. 2.4 is a low-risk filler release; 2.5 and 2.6 ride along as capacity allows. Nothing in 2.x requires a downtime window; each ships via the deployment.md pipeline.

### 2.1 Stripe online payments · L (1–3 w)
**Goal:** take money online — deposit at booking time, full payment at the counter and via a payment link — and handle refunds, with per-branch reconciliation.

**Key features**
- Stripe **Checkout** for the booking deposit (`Booking.depositAmount`) and for an outstanding invoice balance.
- **Webhook handler** (`POST /api/v1/webhooks/stripe`): raw-body parsing, signature verification, idempotent per event id; marks `Invoice.status`/`Booking.paymentStatus` (`PARTIAL`/`PAID`); emits `BookingEvent` + receipt email (Resend).
- **Refunds** as an admin action (minor units, money rules D-005); status → `REFUNDED`.
- Optional **`Payment` ledger** (see §2) once refund/history reporting demands rows, not derived state.
- **UI delta:** customer redirect → return URL; admin payment/refund screen on the invoice page.

**Delta vs v1 (the whole change is below — everything else is reuse)**

| Layer | Exists in v1 | Added by 2.1 |
|---|---|---|
| Schema | `Booking.paymentStatus`, `Invoice.status`, `depositAmount` | (optional) `Payment` table |
| API | `payments` module absent | `payments` module: checkout session, webhook route, refund route |
| Mail | `invoice_ready` template | payment-receipt email (new `EmailTemplate.key`) |
| UI | counter PAID toggle | checkout redirect + admin refund screen |

**Dependencies:** Stripe account + API keys; webhook endpoint on the public API domain; Phase 1 auth + invoice module (built).
**Architecture impact:** **none** on the no-migration path; **additive module** in apps/api + zod schemas in packages/shared; one optional additive migration if the ledger is adopted.

### 2.2 Technician login panel · M (3–7 d)
**Goal:** technicians self-serve their bench work instead of admin relaying every stage.

**Key features**
- Activate the **`TECHNICIAN` role** in auth + RBAC capability map (D-001: role exists; login is this phase).
- Panel (admin-shell slice or thin `apps/technician`) showing assigned bookings/repairs; **reuse the existing booking/repair services** — stage machine, `BookingEvent`, notes — no new service layer.
- **Attendance**: clock-in/out (`Attendance` table exists, unique per technician+date).
- Repair notes + images per booking (`Booking.notes`, `Booking.images`).

**Delta vs v1:** auth gains `TECHNICIAN` in the RBAC capability map; a route group + panel UI; attendance endpoints (table ready). No new business services — the stage machine and repair service are called as-is.

**Dependencies:** Phase 1 auth (refresh rotation, `authorize` middleware) — built. **Architecture impact:** none; RBAC additions + route-group activation. No schema change.

### 2.3 Full inventory · M–L (1–2 w)
**Goal:** know what parts are in which branch, buy deliberately, and move stock where the work is.

**Key features**
- **Enable the admin sections** — all tables exist: `Part`, `PartStock`, `Supplier`, `PurchaseOrder`(+items), `PartMovement`. Build the PO state machine (`DRAFT→PENDING→ORDERED→PARTIAL→RECEIVED`), receive with `PartMovement RECEIVED`.
- Parts consumed against repairs via `PartMovement USED` (reference = bookingId), decrementing `PartStock`.
- **Low-stock alerts** at `Part.lowStockThreshold` + reorder suggestions (`reorderQuantity`).
- **Barcode/QR** scan for intake and part lookup (`Part.barcode` exists).

**Delta vs v1:** the schema is 100% present (inventory block of schema.prisma). 2.3 adds the `inventory` module (services + routes + zod), admin sections (parts, stock, suppliers, POs, movements), and the low-stock notification hook (rides on the 2.5 notification service).

**Dependencies:** booking/repair flow (built) — parts attach to repairs; admin shell (built). **Architecture impact:** none; additive `inventory` module on existing schema.

### 2.4 Dark mode + i18n · M (3–7 d)
**Goal:** respect user preference and stop hard-coding `en`.

**Key features**
- Tailwind dark tokens — light stays the default (D-004); system-preference + manual toggle, persisted.
- **i18n** dict in `packages/shared`; `LOCALE_1`=en, `LOCALE_2` = `{{LOCALE_2}}` (memory.md) behind a runtime switcher; single `formatMoney`/`formatDate` path (D-005) localized.

**Delta vs v1:** design tokens gain dark scales; `packages/shared` gains the i18n dict + locale plumbing; both apps get the toggle. No API surface change (locale is a client concern; server stays UTC + branch timezone per architecture.md §8).

**Dependencies:** design tokens (built). **Architecture impact:** none; UI + packages/shared only.

### 2.5 Push / WhatsApp notifications · S–M (3–7 d)
**Goal:** move status updates to where the customer already is (notification center, phone, WhatsApp).

**Key features**
- `Notification` rows already exist with the typed enum (`BOOKING/REPAIR/INVOICE/REVIEW/SYSTEM`); add **outbound adapters**: WebPush/FCM for the notification center + WhatsApp via a provider/BSP. Provider and template copy are **TBD at implementation time** (the WhatsApp API landscape moves; verify current provider docs).
- Opt-in/opt-out per channel; unify with email so a customer gets one channel per stage.

**Delta vs v1:** the `Notification` model and its creation points (stage transitions) exist; 2.5 adds delivery adapters behind the existing notifications service and an opt-in preference store (client-side or a `Setting`-scoped row).

**Dependencies:** v1 notification model (built). **Architecture impact:** none; additive adapters behind the existing notifications service.

### 2.6 Analytics expansion · M (3–7 d)
**Goal:** answer "is this branch healthy?" — trend, not just current KPI.

**Key features**
- **Daily snapshot** table (aggregates by branch + date; the one additive migration in this phase).
- **Cohort retention** (bookings per customer over time) and **customer LTV** (derived from Invoice totals).
- **Funnel:** estimate → book → intake → delivered → paid, per branch and per service.
- Recharts dashboards in admin (already the admin charting lib).

**Delta vs v1:** the v1 dashboard computes live KPIs; 2.6 adds a nightly job that materializes the snapshot (idempotent per branch+date), plus cohort/LTV/funnel queries in the analytics module.

**Dependencies:** v1 analytics endpoints + dashboard (built). **Architecture impact:** additive; one new snapshot table + analytics service expansion.

---

## 5. Phase 3 — Mobile & omnichannel · L–XL (3–6 w)

**Goal:** customers live in their pocket, technicians work from the bench, and multi-branch runs without central-office watching.

**Key features**
- **Customer mobile app + Technician app** via React Native + Expo, **reusing `apps/api` and `packages/shared` as-is** (architecture.md §10). Two new workspaces (`apps/mobile-customer`, `apps/mobile-technician`); same auth, same endpoints, same zod contracts.
- **POS counter mode** — `Booking.isWalkIn` exists; walk-in booking → intake → invoice at the counter. In-store card/UPI capture arrives via Phase 2.1 Stripe.
- **Multi-branch operations center:** branch-level P&L and health (already branch-scoped by D-002); **stock transfers between branches via `PartMovement TRANSFERRED`** (enum exists) — a transfer is two movements (OUT at source, IN at destination) inside one transaction.

**Sub-milestones**

| Milestone | Content | Size |
|---|---|---|
| P3a | Customer app (book, pay, track, review, profile) on Expo | L |
| P3b | Technician app (assigned repairs, stage updates, attendance, photos) | M–L |
| P3c | POS counter mode (walk-in → intake → invoice → pay) | M |
| P3d | Operations center: branch P&L, health, stock transfers | M–L |

**Dependencies:** 2.1 (payments) for POS capture; 2.2 (technician login) for the technician app; 2.3 (inventory) for transfers; 2.4 (i18n) reused by the apps.
**Architecture impact:** none for the backend — new frontend workspaces only; transfers are service logic on existing tables/enums.

---

## 6. Phase 4 — Enterprise · XL (multi-quarter)

**Goal:** franchise-ready, supplier- and ERP-connected, CRM-armed.

**Key features**
- **Franchise / multi-tenant:** add `tenantId` **on top of** `Branch` (additive migration: nullable column + index). Branch stays the scoping unit; tenant console manages its branches. Per-tenant billing reuses 2.1 Stripe.
- **Supplier portal:** suppliers log in, see their POs, mark shipped — extends existing `Supplier`/`PurchaseOrder` models + the existing auth.
- **Accounting/ERP integrations:** outbound webhooks on money/stock events plus a **webhook inbox** (delivery log + retries) for external systems to pull from — a new additive table.
- **CRM:** customer segments (from `Customer.preferences` + booking history), campaigns (reuse `Notification` + Resend templates), loyalty program.

**Sub-milestones**

| Milestone | Content | Size |
|---|---|---|
| P4a | Multi-tenant (`tenantId`), tenant console | XL |
| P4b | Supplier portal | L |
| P4c | ERP/accounting webhooks + inbox | L |
| P4d | CRM segments, campaigns, loyalty | L |

**Dependencies:** 2.1, 2.2, 2.3, 2.5. **Architecture impact:** additive only — nullable `tenantId` + webhook-inbox table; no re-architecture.

---

## 7. Phase 5 — AI · L (multi-quarter, additive services)

**Goal:** accelerate the front desk, price with confidence, forecast stock, read the room.

**Key features**
- **AI repair assistant/chatbot** on the site (guided by RAG over the service catalog + FAQ/CMS content) and in admin (draft intake notes).
- **AI price prediction** for out-of-catalog devices (training signal: `ServicePrice` + repair outcomes).
- **Inventory forecasting** from `PartMovement` consumption → suggested reorder quantity/date.
- **Review sentiment + summarization** for the moderation queue (`Review` rows, statuses exist).
- **ML analytics:** anomaly detection on bookings/refunds.

**Architecture impact:** **additive services module, not re-architecture.** New `apps/ai` (or an `ai` service in apps/api) calling an external model provider; async jobs; results written back to existing models or a small new `ai` table. The monorepo contract (schema → zod → clients) is untouched. **Note:** any third-party AI provider choice is TBD at implementation time — verify current vendor docs and pricing before committing.

---

## 8. Dependency map

| Phase | Depends on | Unlocks |
|---|---|---|
| 2.1 Stripe | v1 auth + invoice | online deposits; POS capture (3); per-tenant billing (4) |
| 2.2 Technician login | v1 auth/RBAC | technician mobile app (3) |
| 2.3 Inventory | booking/repair flow | stock transfers (3); supplier portal (4); forecasting (5) |
| 2.4 Dark mode + i18n | v1 design tokens | LOCALE_2; mobile apps (3) reuse i18n |
| 2.5 Notifications | v1 notification model | customer channels (3); campaigns (4) |
| 2.6 Analytics | v1 dashboard | branch P&L (3); LTV/CRM (4); ML (5) |
| 3 Mobile/POS/ops | 2.1, 2.2, 2.3 | omnichannel business |
| 4 Enterprise | 2.x + 3 | franchise, ERP, CRM |
| 5 AI | 2.3, 2.6 | automation + pricing confidence |

Sequencing note: 2.1 (Stripe) precedes 2.2/2.3 because it puts cash in hand and is the only Phase-2 item with a revenue case on day one. Do not reorder without owner sign-off.

---

## 9. Delivery mechanics per phase

Every phase ships through the deployment.md pipeline (CI → migrate → deploy) and obeys the docs hygiene rule (rules.md §9). Concretely, a phase is "done" when:

- [ ] Feature works against a real local stack (API + DB + at least one app) — rules.md §8
- [ ] zod schemas + migrations committed; generated Prisma client updated
- [ ] Unit/integration tests green; new logic covered (70% floor on API services)
- [ ] Email/notification templates defined and tested in dev (Resend sandbox)
- [ ] Admin actions audit-logged; customer-facing copy reviewed
- [ ] Docs updated in the same PR: memory.md (if a decision), api.md, this roadmap's status lines

**Release cadence:** Phase 2.x items ship as minor releases (`v1.x.0`) on the `main` → staging → release-tag flow. Phases 3–5 are feature-milestone releases (`v2.0` etc.) — no forced annual planning; owner re-prioritizes when business value shifts.

**Status board (mirrors phases.md checkboxes; tick items as they land):**

- [ ] **2.1 Stripe payments** — checkout, webhook, refunds, receipts
- [ ] **2.2 Technician login panel** — role + bench UI + attendance
- [ ] **2.3 Full inventory** — parts/stock/suppliers/PO + movements
- [ ] **2.4 Dark mode + i18n** — tokens + `{{LOCALE_2}}`
- [ ] **2.5 Push/WhatsApp notifications** — adapters behind the service
- [ ] **2.6 Analytics expansion** — snapshot, cohort, LTV, funnel
- [ ] **3a Customer mobile app** (Expo)
- [ ] **3b Technician mobile app** (Expo)
- [ ] **3c POS counter mode**
- [ ] **3d Operations center + stock transfers**
- [ ] **4a Multi-tenant / franchise**
- [ ] **4b Supplier portal**
- [ ] **4c ERP webhooks + inbox**
- [ ] **4d CRM segments / campaigns / loyalty**
- [ ] **5a AI assistant / chatbot**
- [ ] **5b Price prediction**
- [ ] **5c Inventory forecasting**
- [ ] **5d Review sentiment + ML analytics**

---

## 10. Success metrics per phase

| Phase | Primary metric | Secondary |
|---|---|---|
| 2.1 Stripe | % of bookings with online deposit; payment error rate | refund turnaround |
| 2.2 Technician login | technician self-serve % (stages moved by tech vs admin) | attendance fill rate |
| 2.3 Inventory | stock-out days per branch; dead-stock value | PO cycle time |
| 2.4 Dark/i18n | % users in dark mode; LOCALE_2 adoption | no layout regressions |
| 2.5 Notifications | notification open/response rate per channel | opt-out rate |
| 2.6 Analytics | decision-velocity (reports consulted / wk) | snapshot freshness |
| 3 Mobile/POS | app share of bookings; walk-in→paid time at POS | app store rating |
| 4 Enterprise | tenants onboarded; supplier self-serve % | ERP sync errors |
| 5 AI | estimate acceptance rate; forecast accuracy (MAPE) | sentiment-to-moderation throughput |

---

## 11. Decision log (proposals → memory.md)

Proposed entries in the memory.md D-001…D-008 style. **Append to docs/memory.md when adopted** (they will take D-009+). IDs below are provisional.

| ID | Decision | Why | How |
|---|---|---|---|
| D-101 | Stripe ships first in Phase 2.x | Highest business value; schema-ready (D-003) | Checkout + webhook + admin refunds; mark Invoice/Booking PAID — zero migration |
| D-102 | `Payment` ledger optional, not required to ship Stripe | Invoice/Booking statuses cover counter + online; ledger is reconciliation | Adopt only when refund/payment history reporting demands it; 1 additive migration |
| D-103 | Technician login reuses booking/repair services; no new service layer | D-001; avoids duplication | Enable `TECHNICIAN` in auth + RBAC; activate route group |
| D-104 | Inventory is enabled admin functionality on existing tables | Tables pre-wired; D-002 branch-scope | Build admin sections + PartMovement service; no schema change |
| D-105 | Mobile apps are thin clients over apps/api | One backend to secure; architecture §10 | New Expo workspaces reusing packages/shared |
| D-106 | Multi-tenant deferred to Phase 4 as `tenantId` on top of branch | Branch stays the scoping unit; don't solve franchising in v1 | Additive nullable `tenantId` + index |
| D-107 | AI is an additive services module, never re-architecture | Keeps the monorepo contract stable | New app/service + external model provider; results on existing models |
| D-108 | WhatsApp provider chosen at 2.5 implementation time | Provider landscape moves fast | Adapter interface; Notification model already typed |

## 12. Guardrails (what we will NOT do)

- **No per-tenant or per-branch databases.** One logical Postgres, branch-scoped (D-002).
- **No new money types.** Minor-unit `Int` everywhere, including Stripe amounts (D-005).
- **No schema change without a committed migration** (rules.md §4) — and no phase above requires one except the explicitly flagged additive ones (`Payment` ledger in 2.1, analytics snapshot in 2.6, `tenantId`/webhook-inbox in Phase 4).
- **No bespoke identity.** JWT + rotating refresh remains the only auth story across web, admin, and mobile.

---

Depends on: docs/phases.md (Phase 2.x list), docs/architecture.md §10 (Evolution path), docs/memory.md (D-001…D-008 + D-10x proposals), prisma/schema.prisma (pre-wired entities cited above), docs/deployment.md for the delivery mechanics of each phase.
