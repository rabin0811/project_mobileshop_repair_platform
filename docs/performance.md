# Performance Plan — MobileFix Pro

> Performance is a feature. Budgets below are normative — regressions block merge. Companion docs: [architecture.md](architecture.md), [database.md](database.md), [security.md](security.md), [seo.md](seo.md) (Core Web Vitals).

---

## 1. Performance budgets (v1)

| Metric | Budget | Where enforced |
|---|---|---|
| LCP (mobile, 4G throttled) | < 2.0 s | Lighthouse CI + prod Web Vitals |
| INP | < 200 ms | prod Web Vitals |
| CLS | < 0.1 | Lighthouse CI + prod Web Vitals |
| Lighthouse scores (perf / a11y / SEO / best-practices) | ≥ 90 each | Lighthouse CI on PR for `apps/web` + `apps/admin` |
| First paint (4G) | < 1.5 s | Lighthouse CI (PRD NFR) |
| API p95 latency (non-report endpoints) | < 300 ms | API latency monitoring (PRD NFR) |
| `apps/web` initial JS | < 220 KB gzip | size-limit check in CI |
| `apps/admin` initial JS | < 280 KB gzip | size-limit check in CI |
| Per-chunk budget | < 120 KB gzip any lazy chunk | size-limit check in CI |

Budget overrides are written to `budget.json` and reviewed; they are not a silent merge bypass.

### 1.1 Definitions & measurement conditions
- **LCP / INP / CLS:** measured in production with real-user monitoring (Vercel Analytics) and in CI with Lighthouse (mobile emulation, 4G throttling, 3x runs, median).
- **Bundle sizes:** gzip sizes of the built `index.html`-referenced JS entries and every dynamic chunk (size-limit report committed to PR).
- **API p95:** server-side timing of the request handler (requestId-logged), excluding report/analytics aggregates.
- The marketing pages (home, services, branches, blog, FAQ) are the LCP budget owners; admin is held to the same bar because staff run it daily on office hardware.

### 1.2 Web Vitals optimization playbook

| Metric | If budget breached, check in order |
|---|---|
| LCP | LCP element is the preloaded hero/OG image with `priority` + `f_auto,q_auto,w_*`; fonts are `display:swap` with preconnect; prerendered HTML serves the element without JS; CDN `s-maxage` caching is on for that route; no render-blocking third-party script |
| INP | Heavy work off the main thread (charts/PDF lazy); event handlers defer non-urgent state (no re-render storms in booking wizard); list virtualization in admin tables over ~50 rows; no long tasks from image decoding above the fold |
| CLS | Images/embeds have `width/height` or `aspect-ratio`; skeletons carry `min-height`; fonts fallback metrics aligned; no layout-affecting entrance animations above the fold; skeleton swap happens at same size |

---

## 2. Frontend (apps/web, apps/admin)

### 2.1 Code-splitting & lazy loading
- **Route-level code-splitting** via React Router v6 `lazy()` + React 18 `Suspense` for every feature slice (`src/features/*`). The initial route ships only its own slice.
- **Heavy chunks lazy-loaded on interaction, never on the critical path** (rules.md §5.6):
  - R3F 3D hero → `apps/web` home only; `Canvas` is suspended until the section scrolls into view (optional per design.md).
  - Recharts → admin dashboard only, `React.lazy` + Suspense fallback skeleton.
  - PDF viewer → invoice download route only.
- Prefetch likely chunks after `load` (booking wizard → pricing/calculator) so the next step is instant without growing the initial bundle.

### 2.2 Image & media strategy (Cloudinary)
- All raster images served via Cloudinary with **`f_auto,q_auto`** (auto format + quality) and **responsive `srcset`** (`w_480,w_768,w_1200`) — no oversized originals to mobile.
- **LCP image is preloaded** (`<link rel="preload" as="image">`) and sized with `width/height` attributes or `aspect-ratio` CSS → no CLS contribution.
- Thumbnails use explicit small widths; hero/og uses higher width; `priority` on the LCP image, `loading="lazy"` everywhere else (below-the-fold + `decoding="async"`).
- Avatar/logo images also via Cloudinary transforms — never raw uploads.

### 2.3 Fonts
- **Inter** with `display: swap` (no invisible-text FOIT) and `preconnect` to the font host; fallback stack metrics kept close (`size-adjust`/metric overrides) so CLS stays flat.
- Only the weights actually used are fetched; system-ui fallback listed first to avoid the font entirely on capable platforms.

### 2.4 Data fetching (TanStack Query)

| Aspect | Default | Rationale |
|---|---|---|
| Caching | Query keys as cache keys; `gcTime` > navigation lifetime | instant back-nav, no refetch |
| `staleTime` | catalog/CMS: long (5 min+); bookings/slots: short (30 s) | price matrix rarely changes; slot availability must stay fresh |
| Refetch | On window focus (background, non-blocking); no refetch on every mount | fresh-enough reads without layout jank |
| Mutations | Invalidate exact keys (`['bookings', {branch, date}]`) | rules.md §5.1 — never full-cache clears |
| Optimistic updates | Only where rollback is trivial (wizard, review submit) | snappy UI, no double-request on failure |
| Retries | GETs with backoff; POSTs honor `Idempotency-Key` (no blind retry) | rules.md §3.7, security.md §8 |

### 2.5 Rendering & delivery
- Public marketing routes (home, services, branches, blog, FAQ) are **prerendered/SSG** at build or revalidated per [seo.md](seo.md) — zero-client-render for crawlers and first paint; interactive parts hydrate.
- `gzip`/`brotli` served by Vercel edge; `Cache-Control` set on public CMS responses; **CDN cache headers** (`s-maxage`, `stale-while-revalidate`) on public catalog/CMS JSON and prerendered HTML so edge serves repeat visitors without origin round-trips. Admin/booking/auth responses are `private, no-store`.
- **Layout shift avoidance:** fixed dimensions (`width/height` or `aspect-ratio`) for images, placeholders, embeds; CLS-safe skeletons (`min-height`) for lists/tables; no layout-affecting animations above the fold; `prefers-reduced-motion` honored (design.md).
- **Rendering budget:** initial route render does no network-blocking work — data loads through Query placeholders + skeletons, not blocking `Suspense` waterfalls where a skeleton is acceptable.

### 2.6 Initial vs lazy bundle composition

| App | Initial (critical) | Lazy (on demand) |
|---|---|---|
| `apps/web` | react, react-dom, router, Query core, ui primitives, home/shell | R3F hero, service detail heavy blocks, booking wizard steps, PDF viewer, blog renderer |
| `apps/admin` | react, react-dom, router, Query core, ui primitives, dashboard shell | Recharts, bookings calendar, invoice PDF, analytics tables, CMS editors |

- The initial bundle must stay under the §1 budgets **including** the route slice actually loaded first — splitting by route is not enough; each feature slice is also audited for accidental heavy imports (e.g. a chart lib pulled into the shell via a shared barrel).
- Barrel exports from `packages/ui` are import-path-scoped (`@/*/ui/button`) to avoid pulling the whole library into the initial chunk — no `import * from ui`.

### 2.7 Cache & delivery policy

| Route/response | `Cache-Control` | Notes |
|---|---|---|
| Prerendered public HTML (home, services, branches, blog, FAQ) | `public, s-maxage=3600, stale-while-revalidate=86400` | Vercel edge serves without origin round-trip; revalidated on content change |
| Public catalog/CMS JSON (services, branches, blog list) | `public, s-maxage=300, stale-while-revalidate=3600` | short TTL, edge-cached |
| Static assets (JS/CSS/webfonts, hashed) | `public, max-age=31536000, immutable` | content-hashed → forever-cacheable |
| Estimate / slot responses | `no-store` (or `s-maxage` only if privacy-safe) | per-user pricing intent — don't cache |
| Booking / auth / admin / profile | `private, no-store` | never cached at edge or browser |

### 2.8 React rendering & interaction budget
- Keep INP under 200 ms (budget §1): no long tasks on the main thread from list rendering, chart animation, or image decode above the fold.
- **List virtualization** in admin tables/calendar beyond ~50 rows (windowing) — no rendering of off-screen rows.
- **Memoization discipline:** `React.memo`/`useMemo` only where re-render cost is measurable (large tables, chart data); default to plain components — premature memoization is not a perf rule.
- Mutations invalidate exact query keys; optimistic updates roll back on error (rules.md §5.1) — user-visible latency of a booking confirm is the round-trip, not a blocking refetch cascade.
- Framer Motion transitions respect `prefers-reduced-motion` (design.md); heavy entrance animations are avoided above the fold to protect CLS.

### 2.9 Third-party & analytics scripts
- GA4 + Sentry load **async/deferred**, never render-blocking; they do not touch the critical path or LCP.
- Third-party tags are self-hosted/loaded via the Vite bundle where practical; no unknown third-party script allowed into the initial HTML (perf + security, security.md §9).
- Chart/animation libraries are lazy chunks (§2.1); no chart lib ever ships in the initial bundle.

### 2.10 Vite build settings for perf
- Production build: minified, target modern browsers (no legacy polyfill bloat); sourcemaps off in prod (or sentry-only upload).
- **Manual chunks** for stable vendor groups (react/react-dom/router/query split from app code) so vendor updates don't invalidate the whole app cache and repeat visits hit the immutable CDN (§2.7).
- Build emits a **chunk-size report** (built-in/CI artifact) reviewed on any budget change; the CI gate enforces §1 budget.
- `preserveSymlinks`/DTS paths verified so `packages/ui` tree-shakes (no whole-library pull into initial chunk — §2.6).

---

## 3. Backend (apps/api)

### 3.1 Query & connection layer
- **Connection pooling:** Prisma client configured for the connection pool; managed Postgres (Railway) has a modest connection cap — introduce **PgBouncer (transaction mode)** ahead of horizontal scale so each instance doesn't multiply connections. Infra change, flagged for deployment.md.
- **Prisma query batching:** use `$transaction([...])` for parallel reads where independent; `include`/`select` deliberately — never N+1 (rules.md §4.7, review blocker).
- Hot paths are **index-driven** — see §4.1 index list; every list endpoint paginates (`page/pageSize`, cap 100; cursor option for reports, architecture.md §8).

### 3.2 Middleware & runtime
- `compression` middleware (gzip/brotli) for JSON responses above a small threshold.
- **Keep-alive** on HTTP connections; response `Cache-Control` honored for public data.
- **Stateless horizontal scale** (architecture.md §1.2): no in-process state — rate-limit counters and caches move to a shared store (Redis) once more than one instance runs; JWT + rotating refresh cookies make instances interchangeable.
- **Slow-query logging:** Prisma `log: ['warn','error']` in prod with a duration threshold; anything > 250 ms logged with `requestId` for follow-up (§4.2).
- `express.json({ limit })` caps request bodies (small abuse + perf surface).
- Middleware order is the documented pipeline (architecture.md §5.3) — validation before controller, rate limiting before auth, so cheap rejections never reach the DB.

### 3.3 Background work & long tasks
- **Email sends are queued/deferred** off the request path (in-process job runner in v1 with retry + `EmailLog` dead-letter, FR-EMAIL-03). The booking confirm response does not wait on Resend.
- **Phase 2:** BullMQ + Redis if queue volume or delivery guarantees justify a dedicated broker.
- PDF generation (invoices) runs off the request path with a "generating…" status on the invoice row; the client polls.

### 3.4 API latency budget
- Non-report endpoints: p95 < 300 ms at 1 instance under nominal load (PRD NFR).
- Report/analytics endpoints (aggregates over bookings) are **exempt** from the 300 ms target — they must page, state the cost in response `meta`, and be eligible for read-replica offload in Phase 2.

### 3.5 Endpoint latency tiers

| Tier | Examples | Target | Notes |
|---|---|---|---|
| Public catalog/CMS | services, branches, blog, FAQ, brands/models | p95 < 150 ms | CDN-cached; often served without hitting the API |
| Interactive read | estimate, slot check, tracker, booking detail | p95 < 300 ms | index-driven (§4.1) |
| Write | booking create, stage transition, review submit | p95 < 300 ms (nominal) | transactions; email deferred off-path |
| Admin list | bookings list, customers, audit | p95 < 300 ms, paginated | branch+status indexes; cap 100/page |
| Report/analytics | dashboard aggregates, funnel | p95 < 2 s | exempt from 300 ms; state cost in `meta`; Phase 2 read-replica offload |

### 3.6 Prisma query efficiency rules
- **`select` scoping, not `include` sprawl:** return only the columns a response needs; the serializer strips sensitive fields (security.md §2) but never fetches them for no reason. Large `Json` columns (CMS content, audit diffs) are excluded from list queries.
- **N+1 is a review blocker** (rules.md §4.7): batch child rows with a single `in` query or `include` where the shape is bounded; profile with Prisma query logging.
- **List endpoints stay paginated** (`page/pageSize`, cap 100) with cursor for reports — no unbounded scans on `branchId+status` ranges.
- **Write paths use transactions** for atomicity (rules.md §4.6); read paths prefer parallel `$transaction([...])` when independent.
- **Avoid per-row loops:** bulk-insert `BookingService` rows in one create; stage transitions update booking + insert event in one transaction, not two round-trips where one suffices.
- Re-check the hot-query table (§4.1) whenever a repository query shape changes — a new filter needs its index in the same migration.

### 3.7 Observability overhead & cold start
- Structured JSON logs + `requestId` and error sampling (Sentry) stay off the hot path: logging is async/batched where possible; morgan level kept to essentials in prod (no per-field PII, security.md §9.1).
- API runs on an **always-on Railway container** — no serverless cold start on the booking path; keep-alive + PgBouncer (when horizontal) keep connections warm.
- `requestId` middleware allocates one id per request — negligible; it is never an excuse for a log line per query.

### 3.8 Response sizing
- Envelope adds `{ data, meta? }`; keep list payloads lean (id + display fields; details on demand via `GET /:id`).
- `compression` middleware on JSON; public catalog/CMS payloads carry `s-maxage` so the edge serves them (no origin cost per repeat visitor).
- Request body `express.json({ limit })` prevents oversized-payload CPU/memory waste.

### 3.9 Pagination mechanics
- Offset pagination default: `page/pageSize`, `pageSize` cap 100 (architecture.md §8); `meta` carries `page/pageSize/total` and a `hasNext`.
- **Cursor pagination** for high-volume, append-only reads (audit log, events): cursor on the indexed unique key (`id`/`createdAt`) — stable under inserts, no large OFFSET scans.
- Admin list endpoints always paginate; the calendar/day view bounds results by `branchId + scheduledAt` range, never a full month scan.
- Report endpoints page and disclose total in `meta`; the DB cost of counting is bounded (index-only count or a maintained counter where hot).

### 3.10 Conditional requests & ETags
- Public list/detail GETs (catalog, branches, blog) emit an `ETag` over the canonical payload; `304 Not Modified` is handled in middleware so repeat polls cost a hash, not a query.
- Works with the CDN `s-maxage`/`stale-while-revalidate` policy (§2.7) — browsers get fresh-data semantics without origin cost.
- Never applies to auth/booking/admin reads (`private, no-store`).

---

## 4. Database (PostgreSQL)

### 4.1 Hot-query index list
Indexes below already exist in `packages/db/schema.prisma` (database.md convention: every list-filter column indexed). The hot paths that rely on them:

| Hot query | Index used |
|---|---|
| Admin dashboard / booking list by branch+status | `Booking @@index([branchId, status])` |
| Slot check & calendar per branch+day | `Booking @@index([branchId, scheduledAt])` |
| Public tracker lookup by ref | `Booking.bookingRef @unique` |
| Estimate resolution `(service, brand, model)` | `ServicePrice @@unique([serviceId, brandId, modelId])` + `@@index([brandId, modelId])` |
| Review moderation by branch+status / homepage featured | `Review @@index([branchId, status])`, `@@index([status, featured])` |
| Refresh-token lookup + rotation | `RefreshToken.tokenHash @unique`, `@@index([userId])` |
| OTP verify by email+purpose | `Otp @@index([email, purpose])` |
| Audit log queries | `AuditLog @@index([entityType, entityId])`, `@@index([actorId])`, `@@index([createdAt])` |
| Notifications unread badge | `Notification @@index([userId, readAt])` |
| Blog / FAQ / coupon public reads | `BlogPost @@index([status, publishedAt])`, `Coupon @@index([isActive, validFrom, validTo])` |
| Booking timeline | `BookingEvent @@index([bookingId])` |

**Rule:** a new hot filter/sort column on a branch-scoped model gets its `@@index` in the same migration as the column (rules.md §4.4).

### 4.2 EXPLAIN ANALYZE workflow
1. Reproduce the slow query from slow-query logs (or Prisma `log: ['query']` in dev).
2. `EXPLAIN (ANALYZE, BUFFERS)` via `psql` against the same Postgres major + data shape.
3. Confirm index usage (Seq Scan on a filtered hot path = fail); add the index per §4.1 convention, commit migration.
4. Re-check against the p95 budget; document the fix in the PR body.

### 4.3 Maintenance
- **Autovacuum** enabled (defaults) to keep dead-tuple bloat low on high-write tables (`Booking`, `BookingEvent`, `AuditLog`, `RefreshToken`); monitor bloat via Railway metrics.
- `BookingEvent` + `AuditLog` grow monotonically — retention + archival job to cold storage beyond the compliance window (security.md §6).
- Read replicas for analytics/reporting are **Phase 2** (reports must not tax the booking write path); the `analytics` module stays query-scoped to the primary in v1.
- Connection cap + pool sizing reviewed whenever instances are added (PgBouncer note §3.1).

### 4.4 Pool sizing guidance
- One Prisma client per instance with a bounded pool (default modest); total `instances × pool` must stay under the Postgres max connections with headroom for migrations + admin tooling.
- Recheck whenever instances are added (architecture.md §1.2); the PgBouncer (transaction mode) note in §3.1 is the planned lever once the budget tightens.
- Migration service account uses its own connection path — never counted against the app pool budget (deployment.md).

### 4.5 Maintenance schedule

| Task | Cadence | Signal to act |
|---|---|---|
| Autovacuum / bloat check | weekly (metrics) | bloat on `Booking`/`AuditLog`/`BookingEvent`/`RefreshToken` rising |
| Archive `BookingEvent` + `AuditLog` | monthly (beyond retention window) | table growth vs retention policy (security.md §6) |
| Index usage review | after each schema change + quarterly | unused indexes dropped; new hot filters covered (§4.1 rule) |
| Connection pool audit | on instance add / capacity change | saturation warnings; §4.4 sizing |
| Backups restore drill | quarterly | restore time within RPO/RTO (deployment.md) |

### 4.6 Report & analytics query patterns
- Dashboard KPIs (bookings today, active repairs, revenue, stage funnel) are aggregate queries over `Booking`/`Invoice` — run against the primary in v1 but kept index-driven (`branchId + createdAt` range) and cached for a short TTL so a dashboard load is not a fresh full scan.
- Funnel: single grouped query over `BookingEvent` (`fromStatus/toStatus`) rather than N per-booking queries.
- Any aggregate that needs table-wide scans is deferred to the **Phase 2 read replica** — never add an unindexed full scan to a hot primary.
- All report queries page and report `meta.count`; cost is stated per endpoint (§3.5 tier table).

---

## 5. Monitoring & CI gates

| Layer | Tool | Gate / alert |
|---|---|---|
| Perf budgets in CI | Lighthouse CI (`lighthouseci`) | PRs blocked below budgets for web + admin; `budget.json` committed |
| Prod Core Web Vitals | Vercel Analytics / Web Vitals (real-user) | Alert on p75 LCP > 2.0 s or INP > 200 ms sustained 24 h |
| Bundle size | `size-limit` / CI bundle check | Block if web > 220 KB gzip, admin > 280 KB gzip, any lazy chunk > 120 KB gzip |
| API latency | Structured logs + metrics (p50/p95/p99 per route) | Alert p95 > 300 ms sustained on non-report routes |
| Error rate | Sentry + log-based | Alert on 5xx rate > 0.5% over 5 min |
| DB health | `GET /health` (DB ping) + Railway DB metrics | Alert on connection saturation / slow queries |
| Frontend perf | Lighthouse CI + Web Vitals dashboard | Weekly perf review entry in release notes |

Flaky perf CI runs use the retry policy in [testing.md](testing.md), but **budget violations are never retried away** — a perf regression is a code-review item.

### 5.1 Alert playbook
- High error rate or p95 breach → open perf/ops ticket, attach the `requestId` samples, run §4.2 workflow on any slow-query logs.
- LCP breach in prod → check LCP element (is it the preloaded hero?), image transform chain, and whether a CDN cache header regressed to `no-store`.

### 5.2 Load & soak testing (Phase 2)
- A load script (root `scripts/load`) drives the booking + estimate hot paths against a staging API + DB, asserting the §1 API budgets under N concurrent users and during a soak window.
- Pass criteria: p95 < 300 ms, 0.5% error ceiling, connection pool saturation below warning while the script runs.
- Runs on-demand before capacity changes (new branch, promo spikes) rather than every PR; results attached to the ops ticket.

### 5.3 Performance regression workflow
1. CI budget failure (Lighthouse/size-limit) or prod alert fires.
2. Reproduce: capture the failing metric + `requestId` samples / Lighthouse trace; identify the change (PR) that crossed the budget.
3. Fix at the correct layer: bundle → split/move chunk; LCP → image/font/prerender; p95 → index/query (§4.2 workflow); INP → main-thread work offload.
4. Re-run the same gate green; note the delta in the PR body.
5. If a budget is genuinely no longer right, change `budget.json` with justification — never silently widen the gate to merge.

### 5.4 Lab vs field data reconciliation
- Lab (Lighthouse CI) enforces budgets pre-merge; **field (Vercel Web Vitals)** is the source of truth post-deploy because it reflects real devices/networks.
- A metric green in lab but over in field → device/network-specific cause (image decode, long tasks, slow origin on 4G) — follow the §1.2 playbook with field data, not lab traces.
- Field p75 sampled continuously; outliers (p95/p99) are checked but budgets are set on p75 (representative mobile).

### 5.5 Dashboard & weekly review
- Ops dashboard tiles: LCP/INP/CLS (p75), Lighthouse scores, bundle sizes, API p50/p95/p99, error rate, slow-query count, PgBouncer/connection saturation (when present).
- Weekly review: any tile at/over budget gets a ticket; LCP or p95 sustained over budget for 24 h pages the on-call (§5.1).
- Monthly: verify budgets still match product goals (new features that legitimately add weight get a reviewed `budget.json` change, never a silent drift).

---

Depends on: [architecture.md](architecture.md) (stateless scale, Cloudinary, caching, pagination), [database.md](database.md) (index conventions, maintenance), [rules.md](rules.md) (N+1, lazy chunks, Query usage), [seo.md](seo.md) (CWV/prerender), [testing.md](testing.md) (Lighthouse CI, flaky policy).
