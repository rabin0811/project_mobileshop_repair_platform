# Deployment & Operations — MobileFix Pro

> Companion to [architecture.md](architecture.md) §9 and [phases.md](phases.md). One monorepo, three deploy targets, **zero shared runtime state**.
> **v1 scope:** apps/web + apps/admin on Vercel (static SPAs), apps/api + PostgreSQL on Railway. Every later phase (roadmap.md) reuses this topology.
> Vendor-specific fields marked "verify" must be checked against current Vercel / Railway / Resend / Sentry docs before relying on them — this file was written 2026-08-02.

---

## 1. Environment matrix

| Env | Database | API host | Frontends | Env sources | Deployed by |
|---|---|---|---|---|---|
| **dev** | Local Postgres (Docker Compose) via `prisma migrate dev` | `http://localhost:4000` (`npm run dev` in apps/api) | Vite dev servers: apps/web :5173, apps/admin :5174 | `.env` files (gitignored) copied from committed `.env.example` | Developer |
| **staging** | Railway Postgres `mobfix-staging` | Railway service `api-staging` → `staging-api.<domain>` | Vercel preview / branch-alias URLs (`staging-web`, `staging-admin`) | Railway staging vault + Vercel project env (Preview scope) | CI on merge to `main` |
| **prod** | Railway Postgres `mobfix-prod` | Railway service `api` → `api.<domain>` | `web.<domain>`, `admin.<domain>` | Railway prod vault + Vercel project env (Production scope) | CI on release tag `v*` (or manual promote) |

Rules that make this matrix stable:

- `main` is always deployable (rules.md §1). Merges to `main` deploy **staging** only; **prod** is release-tagged only.
- Staging and prod DBs are **separate Postgres plugins** and are never shared or cross-connected.
- Staging is seeded with the same seed script (`scripts/`) as prod and may be wiped/reset on request.

## 2. Env var classes

Three classes; validation happens once at boot via the zod env schema in `packages/config`.

| Class | Examples | Lives in | Never in |
|---|---|---|---|
| **Public** (client-visible) | `VITE_API_URL`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_GA4_MEASUREMENT_ID` | Vercel project env (both apps, per scope) | — |
| **Server-only** (API) | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CORS_ORIGINS`, `SENTRY_DSN`, `NODE_ENV`, `PORT` | Railway vault | client bundles, git, logs |
| **CI-only** | `VERCEL_TOKEN`, `RAILWAY_TOKEN`, `PROD_DATABASE_URL_MIGRATOR` | GitHub Actions secrets (repo/org) | — |

- `packages/config` `envSchema` rejects unknown/missing variables at boot; in `NODE_ENV=production` the prod-only vars are **required** — the API refuses to start rather than run half-configured.
- Sensitive fields (`JWT_*`, `ENCRYPTION_KEY`, `CLOUDINARY_API_SECRET`) must never appear in a client bundle. Nothing with `VITE_` prefix may hold a secret.
- `CORS_ORIGINS` allowlist includes both Vercel app origins + the local dev ports; `credentials: true` (architecture.md §8).

**Rate limits (from architecture.md §8)** — constant across envs, tuned in code:

| Route group | Limit |
|---|---|
| auth | 10 / 15 min / IP |
| booking | 20 / 10 min |
| review | 5 / hr |
| estimate | 60 / 10 min |

---

## 3. Vercel — apps/web & apps/admin

### 3.1 Project setup

- Two Vercel projects (`mobileshop-web`, `mobileshop-admin`) imported from the same repo. **Root Directory** set to `apps/web` / `apps/admin` so each build context is just that app.
- Framework preset: Vite. Build command `npm run build` (= `vite build`); output directory `dist`.
- Workspace deps (`packages/{ui,shared,config}`) are resolved through npm workspaces. Verify current Vercel monorepo behavior: Vercel detects the workspace root and installs from it; if it does not, set `installCommand: npm ci` with a root `cwd` or use a root-level install. **Verify current Vercel docs.**
- `VITE_*` env per scope: Production / Preview / Development. Keep Preview vars pointed at the **staging** API so PRs never hit prod data.

### 3.2 vercel.json (same file in both apps; swap domain)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.<domain>/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

- **`/api/*` reverse proxy** makes the API same-origin from the browser's perspective. This is what makes the httpOnly refresh cookie (`SameSite=Lax`) work across web/admin → Railway. Do not route the client directly at `api.<domain>` for credentialed requests unless you switch the cookie to `SameSite=None; Secure`.
- **SPA fallback** — the catch-all rewrite to `/index.html`. Vercel serves real static files (e.g. `/assets/...`) before rewrites, so hashed assets are never intercepted.
- **Cache headers** — Vite content-hashes asset filenames, so `/assets/*` is safe to mark `immutable` for 1 year. `index.html` itself stays `no-cache` (it's the deploy surface).
- **Security headers** — CSP is intentionally *not* pinned in the file above: a static CSP that must allow Vercel Analytics, Sentry, Cloudinary and the 3D hero is easy to get wrong. Add CSP via a header **after** launch smoke tests, and start from the current defaults: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://api.<domain> https://*.sentry.io; frame-ancestors 'none'`. Verify current script/connect hosts for whichever analytics (GA4, Sentry, Vercel Analytics) are enabled. Note: nonce-based CSP requires SSR and is **not** achievable on a static SPA build.

### 3.3 Preview deployments & branch aliases

- **Every PR** gets a Vercel preview deployment with a unique URL; env vars come from the Preview scope. Preview builds run the same `vercel.json`, so `/api` points at staging.
- **Branch alias (staging):** create a per-app Git branch alias so `main` maps to a stable URL (e.g. `staging-web.<domain>`, `staging-admin.<domain>`) — set in Project → Settings → Git → branch aliases, or `vercel project alias` (verify current UI/CLI; the `vercel alias` CLI command is deprecated).
- Forks/untrusted PRs get preview builds **without** secrets where possible; the API rewrite to staging is the only cross-origin call they make.

---

## 4. Railway — apps/api

### 4.1 Node service

- One Railway service `api`, **Root Directory** = `apps/api` (Railway `rootDirectory` build field). Workspace install is handled at build.
- Build: `npm ci` then `tsc` build across the workspace graph. Start: `node dist/server.js` — **match the actual entry file** in apps/api (see api.md).
- Healthcheck: `GET /health` returns `{ ok: true, version }` with a Postgres ping; Railway probes it and restarts on failure.

`railway.json` skeleton (verify exact field names against current Railway docs — the schema evolves):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build",
    "watchPatterns": ["apps/api/**", "packages/**", "prisma/**"]
  },
  "deploy": {
    "startCommand": "node dist/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### 4.2 Auto-scaling — stateless by design

- The API holds **no session state**: access token is a stateless JWT in `Authorization: Bearer`; the refresh token is opaque, hashed at rest, delivered in an httpOnly cookie (architecture.md §5.4). **Horizontal scale = add instances** behind Railway's edge; every instance is interchangeable.
- **No sticky sessions, no volumes.** All durable state is Postgres; all files are Cloudinary (signed uploads, §5.6); PDFs are generated on the fly or stored on Cloudinary. Nothing is written to the API filesystem.
- Scale-out is a rolling replacement, so healthcheck + readiness matter: an instance that fails `/health` is dropped and replaced.

### 4.3 Railway Postgres

- Provision per env: `railway add postgresql` (or dashboard) → creates the plugin and injects `DATABASE_URL` into linked services. Link the `api` service to the correct env's Postgres **only**.
- TLS on by default; use `sslmode=require` in connection strings where Prisma requires it.
- Staging DB refresh-from-prod (restore) is a manual, audited operation — see §9.

### 4.4 Env vault

- Secrets live in Railway **Variables** (per service / environment), never in the repo. Shared values can be pulled via `railway variables` CLI; values are redacted on read.
- Separate variable groups per environment (staging vs prod) so promote/redeploy never drags a dev value into prod. Verify current Railway naming ("variables" vs "vault", environment scoping) in vendor docs.

---

## 5. Migration workflow

Prisma client generation happens in CI (`prisma generate`) and at build.

**Golden rule: run `prisma migrate deploy` against the target DB BEFORE the new API process starts. `prisma db push` is dev-only (rules.md §4).**

Options, in preference order:

1. **CI-side migrate job (recommended).** A `migrate` step in the release pipeline runs `npx prisma migrate deploy --schema prisma/schema.prisma` against the target DB using the **migrator role** (`PROD_DATABASE_URL_MIGRATOR` secret). Needs network reachability from GitHub Actions to Railway Postgres — via the Railway TCP proxy (`railway connect`) or a bastion. **Verify current Railway docs for external-CI DB access.**
2. **Railway one-shot job.** A separate "migrate" service/deployment in the same project runs migrate then exits; the `api` service deploys only after it completes. Railway supports one-off/ephemeral deployments — verify.
3. **Boot-time migrate (`prisma migrate deploy && node dist/server.js`).** Acceptable for a **single-instance staging** service only. With horizontal scaling, instances race and each needs DDL privilege. Do not use in prod.

Ordering and rollback notes:

- **Migrations first, app second, always.** Never deploy an API that expects a column the DB does not have yet.
- Migrations are **forward-only**. There is no `prisma migrate rollback`. If a migration is bad: `prisma migrate resolve --rolled-back <name>` marks it not-applied (only safe if the migration actually made no changes or you reverted them by hand), then ship a corrective forward migration. True rollback is restore-from-backup (§9).
- Every schema change requires a **committed migration** in the same PR (rules.md §4.1). The migration files live under `prisma/migrations/`.

---

## 6. CI/CD pipeline

GitHub Actions skeleton. Job chain: lint → typecheck → unit → integration → build → (deploy) migrate → deploy web/admin/api. `build` is the merge gate; the `deploy` job runs only on `main` (staging) or a release tag (prod).

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]
  release:
    types: [published]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci
      - run: npx prisma generate --schema prisma/schema.prisma
      - run: npm run typecheck

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci
      - run: npm run test:unit

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: mobfix_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/mobfix_test?schema=public
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci
      - run: npx prisma migrate deploy --schema prisma/schema.prisma
      - run: npm run test:integration   # vitest; test DB migrated then truncated per suite (rules.md §7)
      # No external SaaS in tests: Resend/Cloudinary mocked via vi.mock.

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, unit, integration]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci
      - run: npm run build                    # tsc build graph
      - run: npm run build --workspace=web    # vite build, web
      - run: npm run build --workspace=admin  # vite build, admin

  # Staging: every main merge migrates staging DB, deploys staging API,
  # and promotes web/admin to their staging branch aliases.
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: ${{ github.ref == 'refs/heads/main' }}
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci

      - name: prisma migrate deploy (staging)
        run: npx prisma migrate deploy --schema prisma/schema.prisma
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_MIGRATOR }}

      - name: Deploy API to Railway (staging)
        run: railway up --service api-staging --root-dir apps/api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Promote web to staging alias (Vercel)
        run: vercel promote --cwd apps/web --yes --to ${{ vars.VERCEL_STAGING_ALIAS }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - name: Promote admin to staging alias (Vercel)
        run: vercel promote --cwd apps/admin --yes --to ${{ vars.VERCEL_STAGING_ALIAS }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

  # Production: only on a release tag, behind required-reviewer gates.
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: ${{ github.event_name == 'release' }}
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci

      # 1) Migrate BEFORE the new API is reachable.
      - name: prisma migrate deploy (prod)
        run: npx prisma migrate deploy --schema prisma/schema.prisma
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_MIGRATOR }}

      # 2) API (Railway). --root-dir selects apps/api.
      - name: Deploy API to Railway (prod)
        run: railway up --service api --root-dir apps/api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      # 3) Frontends (Vercel). --cwd selects the app dir.
      - name: Deploy web (Vercel)
        run: vercel deploy --cwd apps/web --prod --yes
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_WEB_PROJECT_ID }}

      - name: Deploy admin (Vercel)
        run: vercel deploy --cwd apps/admin --prod --yes
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_ADMIN_PROJECT_ID }}
```

Notes:

- `environment:` is a **literal** name in GitHub Actions — the two jobs above hardcode `staging` / `production`, each with its own secrets and optional required reviewers. Forks never receive these secrets.
- Vercel preview deployments per PR are handled by the Vercel Git integration itself; the pipeline only drives **staging alias promotion** and **prod** deploys.
- `vercel` / `railway` CLIs are assumed available (global or `npx`); verify exact flag names (`--cwd`, `--root-dir`, `promote --to`, `up --service`) against the current CLI versions.

---

## 7. Secrets & rotation

### 7.1 Inventory (where each secret lives)

| Secret | Used by | Lives in | Rotation trigger |
|---|---|---|---|
| `DATABASE_URL` (app role) | API runtime | Railway vault (prod + staging) | credential change / suspected compromise |
| `DATABASE_URL_MIGRATOR` | CI migrate job | GitHub secret per environment | credential change |
| `JWT_ACCESS_SECRET` | API (HS256 signing) | Railway vault | suspected leak, periodic |
| `JWT_REFRESH_SECRET` | API (opaque refresh not signed; secret reserved) | Railway vault | suspected leak |
| `ENCRYPTION_KEY` | API (`devicePassword`, OTP codes) | Railway vault | leak — requires re-encryption, see below |
| `RESEND_API_KEY` / `RESEND_FROM` | API mailer | Railway vault | leak / periodic |
| `CLOUDINARY_API_SECRET` (+ cloud/key) | API upload signing | Railway vault | leak / periodic |
| `SENTRY_DSN` | API + web + admin | Railway vault + Vercel env | project rotation |
| `VITE_*` | web/admin build | Vercel project env | build-time change |
| `VERCEL_TOKEN`, `RAILWAY_TOKEN` | CI | GitHub secrets | engineer departure / periodic |

### 7.2 Rotation procedure

1. Generate the new value (e.g. `openssl rand -base64 48` for `JWT_ACCESS_SECRET` / `ENCRYPTION_KEY`).
2. **Dual-key window where possible.** Only `JWT_ACCESS_SECRET` signs; rotating it immediately invalidates all outstanding access tokens (15-min TTL) — clients recover silently via the refresh flow. That short window is the point: it bounds compromise exposure.
3. `ENCRYPTION_KEY` is **not** dual-writable without versioned keys. Do not rotate casually: plan a maintenance window to re-encrypt `devicePassword` (and any OTP material) with the new key, or introduce `keyVersion` (an additive migration) to allow dual-decrypt.
4. Update the vault / project env / GitHub secret; redeploy the API so the new value is live; verify `/health` and one authenticated call.
5. Revoke the old value. For user sessions, optionally revoke the refresh-token family (rules.md §4: sensitive columns are `passwordHash`, `refreshToken.tokenHash`, `otp.codeHash` — never returned).

### 7.3 Least-privilege DB user

Two Postgres roles; the runtime app never gets DDL:

| Role | Grants | Used by |
|---|---|---|
| `mobfix_app` | `CONNECT, USAGE ON SCHEMA public`; `SELECT/INSERT/UPDATE/DELETE` on all tables + `USAGE` on sequences | API runtime (`DATABASE_URL`) |
| `mobfix_migrator` | above + DDL (CREATE/ALTER, `schema_migrations`) | CI `prisma migrate deploy` only |

```sql
CREATE ROLE mobfix_app LOGIN PASSWORD '<generated>';
GRANT CONNECT ON DATABASE mobfix_prod TO mobfix_app;
GRANT USAGE ON SCHEMA public TO mobfix_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mobfix_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mobfix_app;
```

Never run the API as `postgres`/superuser. Verify Prisma runtime does not need `TRUNCATE`/`REFERENCES` that the app role lacks before launch.

---

## 8. Logging & monitoring

- **Structured JSON logs** (pino) with a `requestId` emitted per request (middleware, architecture.md §5.3). Request/response timing per route; Prisma slow-query logging in dev (`log: ['query','warn','error']`). **No PII, no tokens, no payment data** (memory.md D-008, rules.md §6).
- **Sentry:** `SENTRY_DSN` set server-side; API initializes Sentry with `requestId` attached to breadcrumbs/events. web/admin ship sourcemaps via `@sentry/vite` at build. Prod sampling: 1.0 for errors, <0.1 for transactions (verify current Sentry SDK guidance).
- **Health & uptime:** Railway healthcheck on `/health` plus an external uptime monitor (Better Stack / UptimeRobot / Railway alerts) probing `/health` from ≥2 regions. Alert on: 5xx spike, p95 latency, healthcheck failure, migration failure, backup failure.
- **Dashboards:** Railway (deployments, metrics, logs, cost per service); Vercel (deployments, Speed Insights/Analytics optional); Sentry (error + release tracking); Postgres metrics via Railway (connections, table size, bloat).
- **Error budget (SLO):** target **99.5%** uptime on `/api/v1` (~3.65 h/mo allowed downtime); 99% is the floor below which the next release is frozen. Track monthly; an on-call owner is named at launch.

---

## 9. Rollback runbook

| Target | How to revert | Downtime | Notes |
|---|---|---|---|
| web / admin (Vercel) | Dashboard → Deployments → previous good build → **Promote** (instant rollback), or `vercel rollback` (verify current CLI) | seconds | Old build already has the right `/api` rewrite. Revert is safe unless env vars changed too — if so, fix env first. |
| api (Railway) | Railway → Deployments → previous deployment → **Redeploy**; or `railway redeploy --id <deploymentId>` | seconds–minutes | Prior image is cached; stateless so no data concern. Redeploying the same commit is also acceptable. |
| PostgreSQL | **No migration rollback** — restore from backup (Railway backup or `pg_dump`/`pg_restore` from the scheduled job) | minutes–hours, RPO/RTO dependent | Migrations are forward-only. Never hand-edit `_prisma_migrations`. |

**Bad API deploy (code only):**
1. Confirm it is code, not data: check Sentry + logs for the new error signature.
2. Railway redeploy the previous deployment. Watch `/health` recover; run the §10 smoke list.
3. If that deploy also shipped a migration, the DB is now *ahead* of the old code. If the new column is nullable and nothing else depends on it, the old code runs fine — monitor. Otherwise restore the DB **before** running old code.

**Bad data / migration deploy:**
1. Stop write traffic (route `/api` to a maintenance page on Vercel, or scale API to 0 — scaling alone does not stop writes from a still-cached client, so set the rewrite first).
2. Restore the DB from the last good backup. This is the only true DB rollback.
3. Redeploy the last good API; verify `/health`; resume traffic.

**First-deploy escape hatch:** keep the first prod seed reproducible (`scripts/`) so a fresh DB + seed is a 30-minute rebuild, not a multi-day one.

---

## 10. Launch checklist

1. **Custom domain + TLS.** Vercel issues TLS automatically for web/admin. Add `api.<domain>` as a Railway custom domain (TLS via Railway proxy or your CDN — verify current Railway TLS behavior).
2. **DNS records.** CNAME `web`/`admin` → Vercel target; CNAME `api` → Railway target; apex via CNAME flattening. Take the exact values from the Vercel and Railway "domains" UIs at launch time — they are authoritative.
3. **Resend domain verification.** Add **SPF**, **DKIM** (values from Resend), optional **DMARC** (`_dmarc.<domain>`). Send a test booking-confirmation email to Gmail/Outlook; check headers + spam folder.
4. **Google Search Console.** Verify `web.<domain>` (DNS or HTML tag); submit `/sitemap.xml` once live.
5. **GA4.** `VITE_GA4_MEASUREMENT_ID` set; confirm events on a prod build, not just staging.
6. **Backups.** Enable Railway Postgres backups (verify current feature) **or** nightly `pg_dump` → object storage. RPO ≤ 24 h, RTO ≤ 1 h. **Perform one restore drill before launch.**
7. **First prod seed.** Run the seed script → creates the `ADMIN` user, first `Branch`, demo catalog, `EmailTemplate` rows. **Change the seeded admin password immediately.**
8. **Smoke tests** (staging first, then prod):
   - Auth: register → verify email → login → refresh → logout.
   - Booking: create a guest booking → confirmation email lands → visible in admin, branch-scoped.
   - Tracker: public `GET /bookings/track/:ref` returns the live stage.
   - Invoice: generate + email the PDF; mark PAID at the counter.
   - Rate-limit sanity: 11× failed `/auth/login` → HTTP 429.
   - CORS/credentials: admin web calls `/api` cross-origin with the refresh cookie flowing.
9. **Roles & access:** confirm RBAC capability map, audit log writing on a mutating admin action, and that only `mobfix_app` creds are in the running service.

---

Depends on: docs/architecture.md §9–§10, docs/phases.md, docs/memory.md (D-001, D-002, D-008), docs/rules.md (§4, §7), docs/security.md, prisma/schema.prisma, packages/config env schema; vendor docs (Vercel, Railway, Resend, Sentry, GitHub Actions) current as of 2026-08-02.
