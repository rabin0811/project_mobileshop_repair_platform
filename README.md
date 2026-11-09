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

## Verified status (2026-11-09)

- [x] Missing workspace packages reconstructed (`config`, `shared`, `ui`, `db`)
- [x] Prisma schema reconstructed for users, branches, brands, models, services, prices, bookings, invoices, reviews, refresh tokens, and OTPs
- [x] Schema pushed to local PostgreSQL `mobileshop_ready` and seeded
- [x] Root `npm run typecheck` passed for API, web, and admin
- [x] Root `npm run build` passed
- [x] Express 5 validation middleware fixed (`Object.defineProperty`)
- [x] Live smoke test passed: health, branches, brands, services, estimate, booking creation, tracking, admin login, admin bookings, analytics, web/admin pages, and both Vite proxies
- [ ] Some routes mentioned in the original docs (reviews, invoices, catalog admin) are not implemented in this copy

## Demo accounts

- Admin: `admin@mobifix.local` / `Admin123!`
- Customer: `customer@example.com` / `Customer123!`

## Notes and limitations

- Local database: `mobileshop_ready`; the original `mobileshop` database was left untouched.
- The smoke test created booking `MF-20261108-7ERCM`; remove it if it is no longer useful.
- `.env` and database dumps must not be committed.
- The monorepo was repaired during the workspace standardization; review the reconstructed packages before production use.

## Troubleshooting

- **Prisma client missing**: `npm run db:generate`.
- **Database schema drift**: `npm run db:push` (development) and reseed.
- **API 500 on validation**: confirm the Express 5 middleware fix is present.
- **CORS errors**: add the frontend origins to `CORS_ORIGINS`.
- **Port conflict**: stop the process on 4000/5173/5174 or change the port in the workspace config.
