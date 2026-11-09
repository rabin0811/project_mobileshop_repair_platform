# MobileFix Pro — Mobile Repair Shop Management Platform

> Production-grade architecture for `{{SHOP_NAME}}` (working title: **MobileFix Pro**).
> v1 = **Customer website + Admin panel**, **multi-branch from day one**, payments pre-wired for Phase 2.

This repository is the complete design-and-architecture deliverable for a mobile phone
repair business management ecosystem — built to be scalable to multiple branches, mobile
apps, and enterprise growth **without re-architecting** (see [roadmap.md](docs/roadmap.md)).

---

## Status

| Area | Status |
|---|---|
| Architecture & planning | ✅ Complete — see `docs/` below |
| v1 build — packages + API | ✅ Built & verified (typecheck + build + smoke test) |
| v1 build — web + admin frontends | ✅ Built & verified (typecheck + Vite build) |
| Live DB round-trip | ✅ Verified end-to-end (seed → estimate → booking → track → stage) |
| Business identity | ⏳ Placeholders — fill in [memory.md](docs/memory.md) → **Brand identity** |

**Locked decisions** (owner-confirmed 2026-08-02): Customer+Admin scope · multi-branch data
model · payments deferred (Phase 2 Stripe) · minimal professional / light design.
Details in [memory.md](docs/memory.md).

---

## Documentation index

### Foundational
| Doc | Contents |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements: personas, scope, functional requirements with acceptance criteria, KPIs, risks |
| [docs/architecture.md](docs/architecture.md) | System architecture: topology, monorepo, frontend/backend design, auth, flows, deployment, evolution |
| [docs/rules.md](docs/rules.md) | Engineering ground rules: workflow, code style, API/DB/frontend/security/testing rules, definition of done |
| [docs/phases.md](docs/phases.md) | Build order: Phase 0 → v1 launch in ~10 weeks, milestone demos |
| [docs/design.md](docs/design.md) | Design system: tokens, typography, spacing, motion, accessibility |
| [docs/memory.md](docs/memory.md) | Living decision log + brand-identity placeholders (single propagation point) |

### Data & API
| Doc | Contents |
|---|---|
| [prisma/schema.prisma](prisma/schema.prisma) | PostgreSQL schema — the single source of truth |
| [docs/database.md](docs/database.md) | Schema documentation, ER diagram, conventions, hot queries |
| [docs/api.md](docs/api.md) | Complete REST API reference under `/api/v1` (~95 endpoints) |

### UI & flows
| Doc | Contents |
|---|---|
| [docs/wireframes.md](docs/wireframes.md) | 28 ASCII wireframes — customer site + admin panel |
| [docs/component-library.md](docs/component-library.md) | `packages/ui` catalog — primitives + domain components |
| [docs/flows.md](docs/flows.md) | Customer / admin / auth / repair-stage flows with diagrams |
| [docs/folder-structure.md](docs/folder-structure.md) | Full monorepo tree with annotations |

### Quality & operations
| Doc | Contents |
|---|---|
| [docs/security.md](docs/security.md) | Threat model, OWASP mapping, authN/Z, rate limits, hardening |
| [docs/performance.md](docs/performance.md) | Budgets, frontend/backend/database performance strategy |
| [docs/seo.md](docs/seo.md) | Prerendering, sitemap, structured data, local SEO |
| [docs/testing.md](docs/testing.md) | Test pyramid, tools, critical test tables, CI gates |
| [docs/deployment.md](docs/deployment.md) | Vercel + Railway deployment, CI/CD, rollback, launch checklist |
| [docs/roadmap.md](docs/roadmap.md) | Phase 2.x → Phase 5 expansion plan (no re-architecture) |

---

## Architecture at a glance

```
Browser → Vercel (apps/web · apps/admin) ──/api/v1──▶ Railway (apps/api · Express)
                                                       ├─ Railway PostgreSQL (Prisma)
                                                       ├─ Resend (email)
                                                       └─ Cloudinary (media, signed uploads)
Monorepo (npm workspaces): apps/{web,admin,api} · packages/{db,ui,shared,config}
```

Stack: **React (Vite) · Tailwind · Framer Motion · React Three Fiber** |
**Node.js · Express · PostgreSQL · Prisma** | JWT · Resend · Cloudinary · Recharts | Vercel + Railway.

---

## Run locally

Prereqs: **Node ≥ 20**, **Docker** (for Postgres) or a Railway/Neon database URL.

```bash
npm install                        # install all workspaces
docker compose up -d               # Postgres on localhost:5432
cp apps/api/.env.example apps/api/.env
npm run db:push                    # apply schema (dev only)
npm run db:seed                    # demo catalog + admin user
npm run dev:api                    # API → http://localhost:4000
npm run dev:web                    # customer site → http://localhost:5173
npm run dev:admin                  # admin panel → http://localhost:5174
```

**Seeded admin login:** `admin@mobileshop.dev` / `Admin@12345` (change immediately in production).

In dev, emails are logged to the API console (no Resend key needed) and OTP codes are echoed
in API responses while `DEV_ECHO_OTP=true`. The web and admin apps proxy `/api` to the API.

---

## Before you build

1. Fill the **Brand identity** table in [docs/memory.md](docs/memory.md) (shop name, contacts,
   domain, currency, timezone, brand color `{{BRAND_PRIMARY}}`).
2. Curate the service catalog + supported brands (defaults: the 12 standard services, top brands).
3. Follow [docs/phases.md](docs/phases.md). Each phase ends deployable.
4. Branch-first: any new business model **must** carry `branchId` (see [database.md](docs/database.md)).
