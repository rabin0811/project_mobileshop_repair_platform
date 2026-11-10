# project_mobileshop_repair_platform

## MobileFix Pro — Mobile Repair Shop Platform

A TypeScript monorepo for a mobile repair shop: API, customer web app, admin app, and shared packages. It uses PostgreSQL with Prisma.

- Original location: `D:\projects\Mobileshop`
- Working copy: `D:\PROJECTS_READY\project_mobileshop_repair_platform`
- Stack: TypeScript, Node.js, Express 5, React 19, Vite, Prisma 7, PostgreSQL

## Folder layout

```text
project_mobileshop_repair_platform/
  backend/          Express API
  frontend/web/     Customer web app
  frontend/admin/   Admin app
  packages/         config, shared, ui, db workspaces
  database/         Database notes
  infra/            Deployment notes
  docs/             Project documentation
```

## Setup

```powershell
npm ci
Copy-Item .env.example .env
# set DATABASE_URL, JWT secrets, CORS_ORIGINS
npm run db:generate
npm run db:push
npm run db:seed
npm run typecheck
npm run build
```

Run the apps:

```powershell
npm run dev:api     # port 4000
npm run dev:web     # port 5173
npm run dev:admin   # port 5174
```

### Local PostgreSQL with Docker

Docker Desktop is the recommended way to run PostgreSQL on this machine. The native Windows PostgreSQL portable install produced client-backend DLL initialization failures (`0xC0000142`), while the Docker container works reliably.

```powershell
docker run -d --name projects-postgres `
  -e POSTGRES_HOST_AUTH_METHOD=trust `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_DB=postgres `
  -p 127.0.0.1:5432:5432 `
  -v projects_pgdata18:/var/lib/postgresql `
  postgres:18

docker exec -i projects-postgres psql -U postgres -c "CREATE DATABASE mobileshop_ready OWNER postgres;"
```

Set both `backend/.env` and `packages/db/.env` to use `127.0.0.1` (not `localhost`) in `DATABASE_URL`. The trust setting is for local development only; the container is published only on `127.0.0.1`.

## Verified status (2026-11-10)

- [x] Missing workspace packages reconstructed (`config`, `shared`, `ui`, `db`)
- [x] Prisma schema reconstructed for users, branches, brands, models, services, prices, bookings, invoices, reviews, refresh tokens, and OTPs
- [x] Schema pushed to Docker PostgreSQL 18.6 `mobileshop_ready` and seeded
- [x] Root `npm run typecheck` passed for API, web, and admin
- [x] Root `npm run build` passed
- [x] Express 5 validation middleware fixed (`Object.defineProperty`)
- [x] Live smoke test passed: health (`db: up`), branches, brands, services, estimate, booking creation, tracking, admin login, admin bookings, analytics, web/admin pages, and both Vite proxies
- [x] Admin and customer Bearer-token flows verified (`/auth/me`, `/admin/bookings`, `/admin/analytics/overview`, `/bookings/my`)
- [x] Customer web and admin UI screenshots verified
- [ ] Some routes mentioned in the original docs (reviews, invoices, catalog admin) are not implemented in this copy
- [ ] No automated E2E suite; verification used live API and browser smoke tests

## Demo accounts

- Admin: `admin@mobifix.local` / `Admin123!`
- Customer: `customer@example.com` / `Customer123!`

## Notes and limitations

- Local database: `mobileshop_ready`; the original `mobileshop` database was left untouched.
- The API returns a Bearer `accessToken`; use `Authorization: Bearer <token>` for protected routes. Cookie-only requests to `/auth/me` return 401.
- The smoke test created booking `MF-20261108-7ERCM`; remove it if it is no longer useful.
- `.env` and database dumps must not be committed.
- The monorepo was repaired during the workspace standardization; review the reconstructed packages before production use.
- Vite binds to `localhost` (IPv6 on this machine). Use `http://localhost:5173` and `http://localhost:5174`.

## Troubleshooting

- **Prisma client missing**: `npm run db:generate`.
- **Database schema drift**: `npm run db:push` (development) and reseed.
- **Database down in `/api/v1/health`**: verify `DATABASE_URL` uses `127.0.0.1` and the Docker container is running.
- **API 500 on validation**: confirm the Express 5 middleware fix is present.
- **CORS errors**: add the frontend origins to `CORS_ORIGINS`.
- **Port conflict**: stop the process on 4000/5173/5174 or change the port in the workspace config.
- **Protected route returns 401**: send the Bearer token returned by `/api/v1/auth/login`.
