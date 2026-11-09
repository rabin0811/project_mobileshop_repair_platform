# Testing Plan — MobileFix Pro

> Test pyramid + CI gates. Normative per [rules.md](rules.md) §7 — coverage floors and e2e journeys block merge. Companion docs: [architecture.md](architecture.md), [database.md](database.md), [security.md](security.md).

---

## 1. Strategy

- **Pyramid** (rules.md §7.1): many unit → some integration → few e2e.
  - Unit: services, zod schemas, money/utils, components — fast, no I/O.
  - Integration: services + repositories against a real test Postgres (transactions, stage machine, pricing, invoice totals).
  - E2E: Playwright critical journeys, few and slow.
- **Coverage floor: 70% on `apps/api` services** (statement + branch). Other packages: no numeric floor, but new logic requires tests in the same PR (rules.md §7.4, DoD).
- Coverage is a **gate**, not a target — the critical transition table in §4 is mandatory regardless of the percentage.

### 1.1 File layout & naming
- Unit/integration specs co-located per module: `booking.service.tests.ts`, `booking-routes.tests.ts`, `auth.service.tests.ts` (architecture.md §5.2 module layout).
- Component tests: `FeatureName.test.tsx` beside the component; `packages/ui` tests live in the library.
- E2E specs under `e2e/*.spec.ts` grouped by journey: `booking-flow.spec.ts`, `admin-stages.spec.ts`, `reviews.spec.ts`, `auth.spec.ts`, `walk-in.spec.ts`, `idempotency.spec.ts`.
- Vitest naming: `*.test.ts` / `*.test.tsx` (unit+integration); Playwright: `*.spec.ts` — CI runs them separately.

---

## 2. Tools & test infrastructure

| Concern | Decision |
|---|---|
| Unit + integration runner | **Vitest** for `apps/api`, `apps/web`, `apps/admin` (and `packages/*`) |
| E2E | **Playwright** against built web + running API + test DB; critical journeys only; `webServer` config boots the stack in CI |
| External SaaS | **Never hit in tests.** `vi.mock` Resend mailer and Cloudinary upload/sign; e2e captures the confirmation email from a mocked in-process mail sink |
| Test database | **Dedicated Postgres** (`DATABASE_URL_TEST`), migrated via Prisma (not `db push`), then **truncated per suite**; schema locked to committed migrations |
| Fixtures/seeds | Deterministic seed module (`scripts/seed --test`) with branch, catalog, prices, users; per-suite fixtures built from factories (§6) |
| Mail sink | In-memory Resend mock stores sent emails keyed by `to`/`template` — e2e asserts on the actual email payload (booking ref, links) |
| Time | Freezeable clock (`vi.useFakeTimers` / injected `now()`) for expiry windows, review-request delays, OTP TTLs |

### 2.1 Test DB workflow
1. `DATABASE_URL_TEST` points at a disposable Postgres (same major as Railway prod).
2. Migrations applied in CI via `prisma migrate deploy` against the test DB — this also validates that the committed migration set applies cleanly.
3. Per-suite: truncate all tables (FK-aware order) or reset a per-suite schema; reseed minimal fixtures. Full `migrate reset` only in isolated slow cases.
4. Tests never share state across suites; suites may run in parallel with isolated schemas if the runner supports it.

### 2.2 Test double split (vi.mock vs MSW)

| Layer | Double | When |
|---|---|---|
| Unit tests (services, controllers, schemas) | `vi.mock` of mailer/Cloudinary/client | per-test control, no network |
| Component tests | `vi.mock` the Query layer + a stub fetch | render in isolation |
| Integration (services + DB) | Real test Postgres; `vi.mock` only for Resend/Cloudinary side effects | business logic must hit real SQL |
| E2E (Playwright) | In-process mail sink + signed-upload stub at the app boundary | full journeys, mocked only where a SaaS would be hit |

MSW is optional — the project default is `vi.mock` (simpler, no request-matching surface); introduce MSW only if a feature needs cross-suite request-level mocking that `vi.mock` can't express.

### 2.3 Playwright projects
- `web-customer` (chromium, mobile viewport for the customer journey) and `admin` (desktop) share the API + DB.
- `webServer` starts the built `apps/web` (or dev server in CI with `HMR: false`) and the API against the test DB; no prod env ever involved.
- Trace on failure (`trace: 'retain-on-failure'`) uploaded as CI artifacts.

### 2.4 Running tests locally & in CI
- Root workspace scripts: `npm test` (unit+integration, all packages), `npm run test:api` (fast iteration), `npm run test:e2e` (needs built web + running API + test DB), `npm run test:coverage`.
- Env: `DATABASE_URL_TEST` required for integration/e2e; unit suites that touch no DB run with no env. A missing `DATABASE_URL_TEST` fails fast with a clear message, never a silent skip.
- Watch mode is local-only; CI runs `--run` (no watch) with `--pool=forks` isolation and the coverage gate enabled.
- CI artifacts: coverage report, Playwright traces/screenshots on failure, chunk-size report (perf gate).

---

## 3. What to test, by layer

### 3.1 zod schemas (`packages/shared`)
- **Boundary cases** per schema (rules.md §7.4): valid happy path, min/max lengths, unknown-key rejection, type coercion, enum values, money minor-unit bounds (non-negative `Int`), optional `modelId` on `ServicePrice`, ref-format regex (`MF-YYYYMMDD-XXXXX`), idempotency-key header, pagination caps (`pageSize ≤ 100`).
- Every schema change ships its boundary tests in the same PR.

### 3.2 services (`apps/api`) — the 70% floor
- **Transactions:** booking create (booking + services + event atomic — failure rolls back all); invoice generation; stage transition (booking + event + email side effects).
- **Repair stage machine:** full matrix in §4.
- **Pricing resolution:** `ServicePrice` brand-level default vs model-level override vs missing → fallback message (FR-BOOK-02); coupon math (percent/fixed, min/max, expiry, `usedCount`).
- **Review booking-verification:** only a DELIVERED booking for that email/account may review (FR-REV-01); 1 review per booking; moderation status transitions.
- **Invoice totals:** subtotal + `taxRateBps` + discount = total in minor units; no float drift (D-005); round-down policy fixed and tested.
- **Auth service:** bcrypt verify, refresh rotation, reuse detection → family revocation, OTP attempt caps, `passwordChangedAt` invalidation (unit-level, DB mocked where appropriate).
- **Idempotency:** duplicate `Idempotency-Key` returns the existing booking; concurrent same-key → exactly one booking (unique constraint + transaction).
- **Email side effects:** correct template per transition; `EmailLog` failure/dead-letter path on Resend failure.

### 3.2.1 Example — stage transition unit test
```ts
// booking.service.tests.ts
it('denies CONFIRMED → DEVICE_RECEIVED when booking is CANCELLED', async () => {
  const booking = await makeBooking({ status: 'CANCELLED', branchId: branch.id });
  await expect(service.advanceStage(booking.id, 'DEVICE_RECEIVED', admin))
    .rejects.toMatchObject({ code: 'INVALID_STAGE_TRANSITION' });
  const events = await repo.eventsFor(booking.id);
  expect(events).toHaveLength(0); // no event, no state change
});
```
Pattern: fixture → call service → assert **state + side effects** (event rows, audit, email template) → assert rejected transitions leave zero trace.

### 3.2.2 Integration vs unit split for services
- **Unit (DB mocked):** pure logic — pricing resolution math, coupon math, money/tax helpers, refresh-token hash/rotation helpers, password policy validation. No SQL, fast, no test DB.
- **Integration (test Postgres):** anything touching transactions or row state — booking create/transaction, stage transitions + event/audit rows, invoice generation, review verification, idempotency. These are the 70%-floor drivers.
- Rule of thumb: if the test asserts a row's state after a call, it is integration; if it asserts a return value of pure math, it is unit. Both live in the module's `.tests.ts` (separated by `describe('integration')`).

### 3.3 controllers & routes
- Controllers: parse → call service → map response; error mapping (`ZodError`, `Prisma` P2002/P2025, `AppError`) → envelope with correct status; no business logic asserted here (it lives in services).
- Auth/RBAC middleware: unauthenticated → 401; authorized-but-missing-capability → 403 (uniform body); wrong role denied; ownership checks on customer-scoped reads.
- Route layer: validation failures return 400 before controller runs; unknown query params rejected; rate-limit 429 shape with `Retry-After`; CSRF token required on admin mutating routes.

### 3.4 Per-module service test matrix (`apps/api`)

| Module | Required unit/integration coverage |
|---|---|
| `auth` | login/register/reset/verify flows, refresh rotation + reuse detection, `passwordChangedAt`, OTP caps, uniform errors |
| `bookings` | create transaction, slot conflict, cancel window, idempotency, walk-in, stage machine (all §4 rows) |
| `repairs` | stage transitions, event + email side effects, device-field encryption (encrypt on write, never returned) |
| `pricing` | brand default vs model override, missing price fallback, estimate endpoint consistency |
| `invoices` | totals (`subtotal + taxRateBps − discount`), status transitions, PDF-generation trigger, email send |
| `reviews` | booking-verified gate, 1-per-booking, moderation transitions, reply/feature flags |
| `coupons` | percent/fixed math, min-order/max-discount, expiry, usage cap, inactive rejected |
| `customers` | profile read/write, saved devices/addresses ownership, export/delete (GDPR-style) |
| `branches` | hours validation, settings scoping (`GLOBAL`/`BRANCH`), geo fields |
| `cms` | content CRUD, sanitize-html on render, publish/draft transitions, `seo` overrides |
| `audit` | write on every mutating admin action, immutability (no update/delete path) |
| `upload` | sign constraints (folder/type/size), per-user folder, rate limit 429 |

### 3.5 frontend (web + admin)
- **Component tests** for `packages/ui` primitives + domain components: booking wizard steps, tracker timeline, review form, admin stage-stepper (renders allowed/disallowed actions per role), invoice totals display (money formatting).
- **Hooks with TanStack Query testing library:** query caching/invalidation on mutation success, optimistic update rollback on error, error-state rendering.
- **Forms:** react-hook-form + zod resolver surfaces the same schema errors as the API (rules.md §5.3).
- Admin guards: unauthenticated/admin-less route → redirect + no data fetch.
- Accessibility smoke in component tests: labels wired, focus order, `prefers-reduced-motion` honored.

### 3.6 e2e (Playwright) — critical journeys
1. **Guest booking:** pick branch → brand → model → service → slot → details (+ optional photo mock) → confirm → mail sink receives confirmation with booking ref → tracker shows PENDING → admin confirms → device received → advance to DELIVERED.
2. **Admin stage transition + audit:** manager moves a booking through stages; illegal transition is rejected in UI and server; `AuditLog` rows exist for each write (verify via API/DB).
3. **Review submission + moderation:** verified customer (DELIVERED booking) submits review → PENDING → admin approves → review appears on public pages; second review for the same booking is blocked.
4. **Auth flows:** register → email verification (OTP from mail sink) → login → refresh rotation → logout revokes; password reset via OTP; unverified user can book but not review.
5. **Walk-in booking** at the counter (admin-created) → full pipeline.
6. **Idempotent retry:** double-submit the booking confirm step → one booking.

### 3.7 What not to test (over-testing guard)
- **Exact third-party behavior:** Resend/Cloudinary internals are mocked — we test our integration contract (template key, `to`, payload shape), not their SDK.
- **Tailwind class output:** styling changes are not unit-tested; visual regressions live in component tests only where behavior matters (hidden states, aria, focus).
- **Framework plumbing:** React Router / TanStack Query mechanics are trusted; we test our hooks, invalidations, and guards.
- **One-assertion-per-test dogmatism is avoided** for invariant tables (§4) — a row is one clear assertion.
- **No e2e duplication:** a journey covered by unit+integration does not also need an e2e variant unless it crosses the full stack (render → API → DB → email).

### 3.8 E2E journey step map (concrete)

| Journey | Steps (assertion highlights) |
|---|---|
| Guest booking | `/` → `/book` → branch → brand → model → service(s) → slot → contact details → confirm → mail sink has `booking_confirmation` with `MF-...` ref → `/track/:ref` shows PENDING |
| Admin stage transition | login admin → bookings list → open booking → confirm → device intake (IMEI/password) → advance stages → illegal move rejected → `AuditLog` rows present per write |
| Review + moderation | customer with DELIVERED booking → `/review` submit → PENDING → admin approves → public page shows review → second submit blocked |
| Auth + verification | register → OTP from mail sink → verify → login → refresh rotates (cookie re-set) → logout revokes → password reset via OTP |

---

## 4. Critical test table — repair stage machine & invariants

Machine (PRD §4.2, schema `BookingStatus` + `RepairStage`): booking lifecycle `PENDING → CONFIRMED → CANCELLED`; pipeline once device is in `DEVICE_RECEIVED → DIAGNOSING → WAITING_PARTS → REPAIRING → QUALITY_CHECK → COMPLETED → READY_FOR_PICKUP → DELIVERED`.

| # | Case | Expected |
|---|---|---|
| 1 | `PENDING → CONFIRMED` | Allowed; `BookingEvent` + audit written; confirmation email |
| 2 | `PENDING → CANCELLED` | Allowed (FR-BOOK-05); cancellation email + event; no pipeline entry |
| 3 | `CONFIRMED → CANCELLED` (before DEVICE_RECEIVED) | Allowed; cancellation email + event |
| 4 | Cancel after `DEVICE_RECEIVED` or later | **Denied** — 409/validation error; no event |
| 5 | `CONFIRMED → DEVICE_RECEIVED` (intake) | Allowed — pipeline entry; device fields (IMEI, password) recorded, password encrypted at rest, never returned |
| 6 | `PENDING → DEVICE_RECEIVED` (skip confirm) | **Denied** |
| 7 | `DEVICE_RECEIVED → DIAGNOSING` | Allowed; stage email + event |
| 8 | `DIAGNOSING → WAITING_PARTS` and `WAITING_PARTS → REPAIRING` | Allowed (optional stop); each writes event + email |
| 9 | `DIAGNOSING → REPAIRING` (skip WAITING_PARTS) | Allowed — WAITING_PARTS is optional, not mandatory |
| 10 | Any skip other than #9 (e.g. `DEVICE_RECEIVED → REPAIRING`, `QUALITY_CHECK → DELIVERED`) | **Denied** |
| 11 | Forward chain `... → QUALITY_CHECK → COMPLETED → READY_FOR_PICKUP → DELIVERED` | Each transition allowed; event + email per hop; `DELIVERED` is terminal |
| 12 | Backward move (e.g. `QUALITY_CHECK → REPAIRING`) without undo permission | **Denied** |
| 13 | Undo/override (explicit manager capability, audited) | Allowed only with capability + `AuditLog` entry; tested as an explicit route |
| 14 | Transition on a `CANCELLED` booking | **Denied** |
| 15 | Transition by wrong role (CUSTOMER calls stage route) | 403; no state change, no event |
| 16 | Concurrent transitions (two staff move same booking) | Linearized — one wins, second gets conflict; no duplicate events |
| 17 | Booking lifecycle | Full guest → admin → DELIVERED path ends with 1 invoice, review eligibility |
| 18 | 1 review per booking | `Review.bookingId` unique — duplicate submit **denied**; review only after DELIVERED and only by that email/account (FR-REV-01) |
| 19 | Idempotency | Same `Idempotency-Key` → same booking returned, no duplicate; concurrent same-key → 1 booking |
| 20 | Rate limits | Booking 20/10 min, review 5/hr, auth 10/15 min, estimate 60/10 min → 429 on exceed with `Retry-After` |

Every row has a unit test (service); the denied rows additionally verified through the route layer.

### 4.1 Non-stage invariants (beyond the machine)

| # | Invariant | Expected |
|---|---|---|
| 21 | Idempotency key replay on booking create | Same key → same booking, no duplicate row; concurrent same-key → exactly 1 booking |
| 22 | Coupon bounds | Percent 1..100, fixed in minor units; expired/inactive/over-usage rejected; `minOrderAmount`/`maxDiscount` honored |
| 23 | Invoice totals | `subtotal + tax(bps) − discount = total` in minor units; status transitions `DRAFT→ISSUED→PAID/VOID` enforced; totals never negative |
| 24 | OTP caps | 5 attempts invalidate code; expired (10 min) rejected; consumed code cannot be reused; hash-only storage verified |
| 25 | Upload sign constraints | Folder/type/size enforced at sign time; per-user folder; 429 over limit; signature one-time |
| 26 | Email side effects | Correct template per event; failure dead-letters to `EmailLog` without failing the request |
| 27 | Review eligibility | Not-DELIVERED booking → denied; wrong email/account → denied; duplicate for same booking → denied (rows 18 covers state, this covers eligibility inputs) |
| 28 | Sensitive-field leak guard | Any response shape that would serialize `passwordHash`/`tokenHash`/`codeHash`/`devicePassword` fails the serializer test |

---

## 5. CI gates

| Gate | Tool | Blocks merge when |
|---|---|---|
| Lint | eslint (workspaces) | any error |
| Typecheck | `tsc --noEmit` strict | any error |
| Unit | Vitest (packages + apps) | failures; `apps/api` service coverage < 70% |
| Integration | Vitest (test Postgres) | failures |
| Build | `vite build` / `tsc` for all apps | any failure |
| E2E | Playwright (critical journeys) | journey failure |
| Bundle/perf | size-limit + Lighthouse CI | budgets from [performance.md](performance.md) exceeded |

- **CI order:** lint → typecheck → unit → integration → build → e2e → perf (bundle + Lighthouse). Perf/e2e run after green unit/integration to fail fast on cheap gates.
- **Concurrency & cache:** unit/integration suites can run in parallel across workers when the test DB is schema-isolated per worker; Playwright jobs use a shared build artifact (build once, reuse). Dependencies cached on the lockfile hash.
- **Coverage enforcement:** thresholds in Vitest config (`coverage.thresholds` — global + per-file for `apps/api/services`); the coverage report is a CI artifact; new-service dirs without tests fail the gate until the floor is met.
- **Flaky-test policy:** flaky e2e/integration tests get **retry (max 2)** with quarantined reporting; a test that flakes twice is quarantined (moved to `flaky.spec`) and must be fixed within one sprint — flakiness is never papered over by raising retries.
- Coverage thresholds live in the Vitest config, not in prose, so CI enforces them.
- PR checklist enforces the mandatory items (rules.md §1.4): schema change → migration + client, behavior change → docs touched.

### 5.1 Test ownership & review expectations
- **Author** writes the tests for the change: zod boundary tests for schema changes, service tests for business logic, component tests for new UI, e2e only when a full journey is touched.
- **Reviewer** checks the §3 matrix was consulted (not just "tests added"), the §4 table rows are covered for stage/invariant changes, and that no test hits external SaaS or the shared prod DB.
- A PR that changes behavior without a test is rejected (rules.md §7, DoD); a test that only asserts the happy path on a multi-branch condition is rejected.
- Coverage numbers are reviewed per PR for `apps/api/services`; a dip below 70% blocks merge even if the CI gate config were mis-set.

---

## 6. Test data

- **Deterministic factories** (no `Date.now()`, no `Math.random()` in tests — inject a clock or fixed seed): `makeBooking(overrides)` produces bookings at fixed timestamps with fixed refs; `makeUser`/`makePrice` power pricing + auth tests.
- **Seeding helper** (`scripts/seed --test`): one branch (fixed `businessHours`), a brand + model, core `ServicePrice` rows (brand default + model override), one verified user, and one walk-in booking in a known stage — every suite truncates then reseeds (fast, deterministic).
- Money assertions use integer minor units; tax tests use `taxRateBps` (1800 default) with a fixed expected total.
- Email asserts are keyed by template name + `to`, never by timestamp or ordering beyond creation order.
- Factories are shared via `packages/test-utils` (or a test-only package) so web/admin/e2e import the same fixtures as the API.

### 6.1 Determinism rules
- **No `Date.now()` / `Math.random()` in test paths:** inject a clock (`now()` via a small time module) or `vi.setSystemTime`; refs/ids come from factories (fixed `MF-20260801-<seq>`), never generated randomness.
- Seed one fixed `businessHours` and one fixed `taxRateBps` (1800) so totals are asserted against known constants.
- Email assertions key by `template` + `to` (order-independent beyond creation); the mail sink returns a copy so asserts can't mutate fixtures.
- Each suite truncates + reseeds (fast) — no cross-suite coupling; parallel workers use schema isolation if the runner supports it.
- Fixture drift is a CI failure mode: if a seed field is renamed, the factory typecheck fails immediately (strict mode, rules.md §2.1).

### 6.2 Seed data shape (what `scripts/seed --test` creates)
- 1 `Branch` (fixed `businessHours`, fixed `timezone`, geo set) + its settings scoped `GLOBAL`/`BRANCH`.
- 1 `Brand` → 1 `DeviceModel`; `ServicePrice` rows for brand-default and model-override (fixed minor-unit values).
- 2 `Service` rows (one FIXED, one FROM), a `Coupon`, and a fixed `taxRateBps` (1800).
- 1 verified `User`/`Customer`, 1 unverified user, 1 admin, 1 manager (roles for RBAC tests).
- 1 `Booking` in a known stage (e.g. CONFIRMED) and 1 DELIVERED booking (for review-eligibility tests) with fixed refs.
- All values are exported constants the factories reuse — tests reference the same prices/hours rather than re-deriving them.

### 6.3 Coverage exclusions & rationale
- The 70% floor applies to `apps/api/services`; **excluded** from the floor (but still expected to be exercised where feasible): generated Prisma client, route/controller wiring glue, config/bootstrap, and vendor code.
- Exclusions are declared in the Vitest coverage config with a comment — adding an exclusion is a review item, never a silent escape hatch.
- `packages/ui` and app components use behavior-driven tests, not a numeric floor (rules.md §7.1).

### 6.4 Naming & assertion conventions
- Test names state the **behavior and the fixture**, not the implementation: `denies CONFIRMED → DEVICE_RECEIVED when booking is CANCELLED`, not `advanceStage should work`.
- One behavior per test, but invariant-table rows (§4) may assert multiple effects of one call (state + event + email).
- Assert on the error **code** (envelope `code`), not message text — messages are copy and change.
- Assert money as integers in minor units with exact expected values (no float math in tests, matching D-005).
- Time-dependent tests always pin the clock; a test that needs `Date.now()` to pass is a defect.

---

Depends on: [rules.md](rules.md) §7 (pyramid, mocks, CI), [architecture.md](architecture.md) (services/routes, stage machine, envelope), [database.md](database.md) (test DB, migrations, indexes), [performance.md](performance.md) (Lighthouse/size gates), [security.md](security.md) (auth/RBAC/upload behaviors under test).
