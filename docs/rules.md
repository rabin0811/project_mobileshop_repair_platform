# Engineering Rules — MobileFix Pro

> Ground rules every contributor (human or AI) follows. These are normative — code reviews enforce them.

---

## 1. Repository & workflow

1. **Monorepo with npm workspaces.** Never install deps inside an app/package alone — run `npm install` at the root.
2. **Branch strategy:** `main` is always deployable. Work on `feat/<module>-<scope>` or `fix/<module>-<scope>`; merge via PR with CI green.
3. **Commits** follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `perf:`, `chore:`, `docs:`, `test:`. Scope optional. Write the *why* in the body.
4. **PR checklist (mandatory):** tests pass · lint/typecheck pass · zod schema updated if API shape changed · migration committed · docs touched if behavior changed · no secrets in code · changelog entry.
5. **One lockfile** at root; never commit a package-lock inside a workspace.

---

## 2. TypeScript & code style

1. `strict: true` everywhere. No `any` (use `unknown` + narrowing). No unused vars (eslint `no-unused-vars`).
2. Naming:
   - Files: `kebab-case` — `booking.service.ts`, `booking-routes.ts`.
   - Types/interfaces: `PascalCase`; component files default-export a `PascalCase` component.
   - Constants: `UPPER_SNAKE_CASE`; functions/vars: `camelCase`.
   - Prisma models/enums: `PascalCase` / `UPPER_SNAKE_CASE` (see schema).
3. Prettier defaults + Tailwind class ordering (`prettier-plugin-tailwindcss`).
4. Import order: react → third-party → `@/*` internal → relative; no relative imports across packages.
5. All public API boundaries use zod schemas from `packages/shared` — never ad-hoc `interface`s for wire types.

---

## 3. API rules

1. REST under `/api/v1`. Nouns plural: `GET /bookings`, `PATCH /bookings/:id/stage`. Actions only when a sub-resource is unnatural (`/auth/login`, `/repair/estimate`).
2. Response envelope: `{ data, meta? }`; errors: `{ error: { code, message, details? } }` with correct HTTP status.
3. **Validate every input** with zod at the route layer — trust nothing from `req.body/params/query`.
4. **No business logic in controllers.** Controllers parse → call service → map. Services hold transactions + side effects.
5. Admin routes use the `admin` router group + `authorize(capabilities)`; public routes are explicit allowlist.
6. Pagination on every list endpoint (`page/pageSize`, cap 100). Filter by `branchId` where the entity is branch-scoped.
7. Idempotency: booking creation accepts `Idempotency-Key` to prevent duplicate submissions on retry.

---

## 4. Database rules (Prisma)

1. **The schema is the contract.** Change `packages/db/schema.prisma` → `prisma migrate dev` → commit the migration + updated client.
2. Never use `prisma db push` outside local dev.
3. Money is `Int` minor units, always. Tax rate is basis points (`Int`). No floats for currency, ever.
4. Every branch-scoped model has `branchId` + index. Every list filter column has an index (`@@index`). Composite indexes for common `(branchId, status, date)` filters.
5. Soft deletion via `deletedAt` only where legally/historically required (users, bookings). Hard delete otherwise.
6. Use transactions (`prisma.$transaction`) wherever two or more writes must be atomic (booking+services+event, PO receive, stage transition).
7. N+1 is a code-review blocker. Use `include`/`select` deliberately; profile with Prisma query logging.
8. Sensitive columns: `passwordHash`, `refreshToken.tokenHash`, `otp.codeHash` — never returned by any API.

---

## 5. Frontend rules

1. Server state via TanStack Query only; mutations invalidate exact query keys.
2. Components from `packages/ui` unless a feature genuinely needs a new primitive — then add it to the library, not the feature.
3. Forms: `react-hook-form` + zod resolver with the *same* zod schemas the API validates.
4. No inline `px`/`text-3xl` invented colors outside design tokens — Tailwind tokens only ([design.md](design.md)).
5. Accessible by default: semantic HTML, `aria-*`, focus-visible rings, `prefers-reduced-motion` honored.
6. Lazy-load heavy chunks: R3F hero, charts, PDF viewer.

---

## 6. Security rules

1. OWASP Top 10 baseline. See [security.md](security.md) for the full plan.
2. Passwords bcrypt (cost 12); secrets only in server env; no secrets in client bundles or logs.
3. `helmet` + strict CORS + rate limits enabled by default; auth routes stricter.
4. All admin endpoints require `authorize()`; capability map in `packages/shared`.
5. Audit every mutating admin action (`AuditLog`). Never log passwords, tokens, or payment data.
6. Uploads via Cloudinary signed URLs only; enforce type/size server-side at sign time.
7. XSS: never `dangerouslySetInnerHTML` CMS content without a sanitizer (`sanitize-html`).
8. SQLi/NoSQLi: no string-built queries; Prisma parameterizes everything.

---

## 7. Testing rules

1. Test pyramid: many unit → some integration → few e2e. Coverage floor 70% on `apps/api` services.
2. Vitest for unit/integration (API + web/admin). Playwright for critical e2e: booking flow, admin stage transition, review submission.
3. Tests must not hit external SaaS (mock Resend/Cloudinary via `vi.mock`); DB tests run against a dedicated test Postgres, migrated then truncated per suite.
4. Every stage-transition rule has a unit test. Every zod schema has boundary tests.
5. CI blocks merge on: `lint`, `typecheck`, `unit`, `integration`, build.

---

## 8. Definition of done

- [ ] Feature works against a real local stack (API + DB + one app)
- [ ] zod schemas + migrations committed; generated client updated
- [ ] Unit/integration tests green; new logic covered
- [ ] Email template(s) defined & tested in dev (Resend sandbox)
- [ ] Admin audit-logged; customer-facing copy reviewed
- [ ] Docs updated (this set) where behavior/API changed
- [ ] No `{{PLACEHOLDER}}` leaked into a UI string for a shipped feature

---

## 9. Docs hygiene

- `docs/*` are living documents — update them in the same PR as the code they describe.
- Placeholders `{{SHOP_NAME}}` etc. live only in [memory.md](memory.md) Brand identity block until the owner supplies values; propagate centrally, never edit per-file.
