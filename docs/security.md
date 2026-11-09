# Security Plan — MobileFix Pro

> OWASP Top 10 baseline as the security contract for v1. Companion docs: [architecture.md](architecture.md), [rules.md](rules.md) §6, [api.md](api.md), [database.md](database.md). Normative — code reviews enforce it; any deviation is a review blocker.

---

## 1. Principles

1. **Trust nothing from the wire.** Every request body/query/param is zod-validated before any controller code (rules.md §3.3).
2. **Least privilege.** Capability-based `authorize()` on every admin route; public routes are an explicit allowlist (architecture.md §5.3).
3. **Sensitive data never leaves the server unencrypted or at all.** `passwordHash`, `RefreshToken.tokenHash`, `Otp.codeHash`, `Booking.devicePassword` are never returned by any API (rules.md §4.8); `devicePassword` is AES-256-GCM at rest.
4. **Security at the edge and the layer.** helm, strict CORS, per-route rate limits, signed uploads, and encrypted secrets (architecture.md §1.6).
5. **Every state change is auditable.** Every mutating admin action writes an `AuditLog` row (architecture.md §1.5, FR-ADMIN-02).
6. **No secrets in client bundles, logs, or error responses.** Env schema zod-validated at boot (architecture.md §8).
7. **v1 reality:** Customer + Admin only. `TECHNICIAN` exists as a role but has no login (D-001). Payments are Phase 2 — no checkout code, no payment data handled in v1 (D-003).

---

## 2. Sensitive data inventory

| Field | Model | At-rest protection | API exposure | Notes |
|---|---|---|---|---|
| `passwordHash` | User | bcrypt (cost 12) | **Never** | Only compare; `select` scoping excludes it |
| `tokenHash` | RefreshToken | sha256 of opaque token | **Never** | Lookup key on rotate; only `{ id, expiresAt }` shape returned |
| `codeHash` | Otp | sha256 of 6-digit code | **Never** | Compare on verify; consume after success |
| `devicePassword` | Booking | **AES-256-GCM** | **Never** | Decrypted in-app for staff intake detail only; key from server env, never in client bundle |
| `bookingRef` | Booking | plaintext (needed for tracker) | Public tracker (high-entropy, D-006) | The tracker's bearer secret — never in admin URL slugs, only in email/tracker |
| PII (email, phone, name, IMEI, address) | User/Customer/Booking | at-rest in DB; backups encrypted | Scoped: owner + staff w/ capability | IMEI shown only to staff + owner |
| Money (`Int` minor units, `taxRateBps`) | Booking/Invoice | plaintext Int | Staff/owner scoped | No floats — no rounding attack surface (D-005) |
| Uploaded images | Cloudinary | provider-side | Public or signed-expiring URLs | Cloudinary keys server-only |
| Payment data (Phase 2) | — | Stripe-hosted | — | No card data ever stored or proxied in v1; Stripe checkout handles PCI scope (see §13) |

### 2.2 Data flow boundaries

| Boundary | PII/sensitive data crosses? | Controls |
|---|---|---|
| Browser → API | yes (login, booking, profile) | TLS; zod validation; envelope serializer strips sensitive fields |
| API → Resend | email address + template payload | send address from verified sender; template-keyed; no body content copied into logs |
| API → Cloudinary | no PII (media URLs only) | signed uploads; per-user folder; expiring URLs for private media |
| API → Postgres | yes (at rest) | encrypted backups; `devicePassword` AES-256-GCM; sensitive columns hashed/never returned |
| API logs / Sentry | **no** | redaction middleware (§9.1) strips PII before persistence |
| API → Stripe (Phase 2) | payment intent payload | webhook signature verified; no card data stored (hosted checkout) |
| Public tracker → browser | booking ref + stage timeline only | no PII beyond the ref's booking; rate limited; high-entropy ref (D-006) |

### 2.1 Envelope guarantees
- All API responses pass through a serializer that drops the sensitive columns above (`passwordHash`, `tokenHash`, `codeHash`, `devicePassword`) even if a service returns the row — enforced by a test (testing.md) and code review.
- Error responses use the standard envelope `{ error: { code, message, details? } }` and **never** include stack traces, SQL, or internal ids (architecture.md §5.3).

---

## 3. Threat model

| Asset | Threat | Mitigation |
|---|---|---|
| Customer PII (name, email, phone, IMEI, address) | Exfiltration via SQLi, IDOR, leak in logs | Prisma parameterization, zod validation, ownership checks, structured logs without PII, `select` scoping |
| Credentials (passwordHash, refresh tokens, OTP) | Theft, replay, brute force | bcrypt cost 12, hashed-at-rest tokens, rotation + reuse detection, rate limits, short expiry |
| Booking.devicePassword | Data breach / plaintext leakage | AES-256-GCM at rest, never returned by API, only decrypted server-side on intake detail |
| Booking reference (`MF-...`) | Guessing → unauthorized tracker access | 5-char base32 high-entropy suffix (D-006); no sequential IDs in public URLs |
| Public booking tracker | Scraping, enumeration, spam | High-entropy ref, per-IP rate limits on track reads, no customer PII beyond the ref's booking |
| Media uploads | Malware, storage abuse, stored XSS via SVG/HTML | Cloudinary signed uploads only, type/size/magic-byte check at sign time, per-user folder, expiring URLs |
| Admin panel | Privilege escalation, brute force, CSRF | `authorize()` capabilities, stricter rate limits, httpOnly + SameSite cookies, CSRF token on admin mutating routes, audit log, MFA (Phase 2) |
| Email service (Resend) | Template injection, spoofing, send abuse | Template-keyed sends, admin-approved templates, verified `{{DOMAIN}}` + SPF/DKIM, per-user rate limits |
| Booking abuse (spam, double-book) | Funnel spam, denial of service | Rate limits (20/10min), honeypot field, idempotency key, admin confirmation gate |
| Payment data | — | Out of scope in v1 (no checkout, D-003). Phase 2 Stripe handles PCI via hosted checkout; nothing stored locally |
| Dependency supply chain | Known CVE in a dependency | `npm audit` in CI, Dependabot PRs, locked root lockfile, review of new/transitive deps |
| Availability | DDoS / abuse on public endpoints | Per-route rate limits (§8), Vercel/Cloudinary edge absorption, horizontal API scale |
| Secrets | Leak via env, commit, or bundle | Railway/Vercel env vaults, never committed, `.env` gitignored, zod boot validation, rotation policy |
| Insider/staff misuse | Unauthorized admin reads/mutations | AuditLog on every mutating admin action, branch scoping, least-privilege roles, session audit |

---

## 4. OWASP Top 10 mapping

| # | Category | Concrete controls in v1 |
|---|---|---|
| A01 | Broken Access Control | Capability-based `authorize()` on every admin route; RBAC map in `packages/shared`; ownership checks (customer may read only own bookings); IDOR prevention — resources resolved via `branchId` scope + ownership, not client-supplied ids alone; public tracker uses high-entropy ref, not `cuid()` |
| A02 | Cryptographic Failures | bcrypt cost 12 for passwords; JWT HS256 15-min access; refresh tokens are opaque 256-bit random, stored as `sha256`; OTP stored as `codeHash`; `Booking.devicePassword` AES-256-GCM at rest; money as `Int` minor units (no float rounding attacks, D-005); TLS everywhere; no custom crypto — primitives only |
| A03 | Injection | Zod validation on every request; Prisma parameterization — no string-built SQL anywhere (rules.md §6.8); `devicePassword`/`notes` stored as data, never interpolated; search/filter inputs pass through zod type coercion |
| A04 | Insecure Design | Repair stage machine enforced in service layer (illegal transitions rejected server-side, FR-REPAIR-03); idempotency key on booking creation (rules.md §3.7); booking-verified reviews — only a DELIVERED booking for that email/account can review (FR-REV-01); money math in integer minor units |
| A05 | Security Misconfiguration | `helmet` defaults; CORS with `credentials:true` + origin allowlist from env; `express.json(limit)` body cap; error envelope never leaks stack traces (architecture.md §5.3); no secrets in client bundles; env schema zod-validated at boot; default-deny routes |
| A06 | Vulnerable & Outdated Components | `npm audit` gate in CI; Dependabot on the monorepo; one locked root lockfile; bump policy for Prisma/Express (active majors); periodic `npm audit fix` + full-dependency review |
| A07 | Identification & Authentication Failures | Password policy (min 8) + breached-password check at register; email verification + OTP (6-digit, 10 min, attempt-limited, `codeHash`); refresh-token rotation + reuse detection → family revocation; `passwordChangedAt` invalidates prior tokens; account lockout/throttling; cookie flags `HttpOnly, Secure, SameSite=Lax` |
| A08 | Software & Data Integrity Failures | Cloudinary **signed uploads only** — client never holds upload API keys; one-time signature constrains folder/format/size; no unsigned CDN writes; admin CMS content sanitized (`sanitize-html`) before render; supply-chain `npm audit` + locked lockfile (integrity of the pipeline) |
| A09 | Security Logging & Monitoring Failures | Structured JSON logs with `requestId` (D-008); **no PII in logs** — redaction in the error middleware; `AuditLog` on every mutating admin action (immutable trail); alerting on auth-failure spikes + error-rate thresholds; Sentry in prod |
| A10 | Server-Side Request Forgery | No user-controlled URLs are fetched server-side in v1. Image URLs are stored Cloudinary URLs produced by signed uploads; email is template-keyed; any future webhook URL (Stripe, Phase 2) validates sender + payload signature before use |

---

## 5. Authentication & authorization deep-dive

### 5.1 Auth flow security properties

| Flow | Inputs | Failure modes tested | Controls |
|---|---|---|---|
| Register | email, password, name | Duplicate email (P2002 → 409), breached password, weak password | zod, breached-list check, bcrypt 12, verification email |
| Login | email, password | Unknown user vs wrong password (uniform message), brute force, disabled user | rate limit 10/15min/IP, uniform 401, `isActive` check |
| Verify email | OTP | Wrong code, expired (10 min), too many attempts (5), reuse of consumed code | `codeHash` compare, `attempts` cap, consume-on-success |
| Refresh | httpOnly cookie | Reused/revoked token, expired (7d), stolen token replay | rotation, reuse detection → family revocation, ip/UA recorded |
| Logout | cookie | Revoked token, idempotent logout | revoke row, clear cookie |
| Reset password | email, OTP, new password | Unknown email (uniform 200), expired OTP, attempt cap | OTP rules + `passwordChangedAt` + revoke all sessions |

### 5.2 Password policy

| Rule | Value | Where |
|---|---|---|
| Minimum length | 8 chars | zod schema (`packages/shared`) at register/change |
| Hashing | bcrypt, **cost 12** | `auth` service |
| Breached-password check | At **register** (and reset) against a local breached list / provider; reject on hit | `auth` service |
| Storage | `User.passwordHash` only; never returned | schema contract (rules.md §4.8) |
| Change | Requires current password; sets `passwordChangedAt`; revokes all sessions | `auth` service + `RefreshToken` |
| Timing | Login performs a bcrypt compare regardless of user existence to avoid user-enumeration timing signal | `auth` service |

### 5.3 Email verification & OTP

- Verification email (Resend, `email_verification` template) carries an OTP for v1.
- **OTP:** 6-digit, stored as `sha256` `codeHash` (never plaintext), 10-minute expiry, `attempts` counter with a hard cap (5), consumed on success, single-use.
- Unverified users can book but not review (FR-AUTH-02).
- Password reset uses the same `Otp` table with `purpose = PASSWORD_RESET`; same attempt/expiry rules.

### 5.4 Refresh-token rotation & reuse detection

- Access token: JWT HS256, 15 min, claims `{ sub, role }`, `Authorization: Bearer`.
- Refresh token: opaque 256-bit random; stored as `sha256` in `RefreshToken.tokenHash`; 7-day expiry; delivered only in an httpOnly `SameSite=Lax` `Secure` cookie.
- **Rotation:** every refresh issues a new token and revokes the old one (`revokedAt`, `replacedByTokenId`). The cookie is re-set on each rotation.
- **Reuse detection:** presenting a revoked token = token theft → revoke the **entire session family** (walk `replacedByTokenId` chain, revoke all `userId` tokens) and force re-login. Logged as a security event.
- Logout revokes the presented token (architecture.md §5.4).
- Each row records `ip` + `userAgent` for anomaly review.

### 5.5 `passwordChangedAt` invalidation

- On password change/reset, `passwordChangedAt` is updated and all `RefreshToken` rows for the user are revoked.
- Access tokens carry an `iat`; the auth middleware rejects access tokens issued before `passwordChangedAt` (short 15-min window makes this a backstop, not a substitute for revocation).

### 5.6 Account lockout & throttling

- Route-level rate limits block brute force at the edge (auth: 10/15min/IP).
- OTP attempts capped per row (`Otp.attempts`) — 5 failures invalidate the code.
- Uniform response timing on login (bcrypt compare always runs) — no user-enumeration oracle.
- IP/email reputation hooks (blocklist, risk scoring) are **Phase 2**; v1 relies on the limits + OTP caps above.

### 5.7 Session cookie flags

| Flag | Value | Rationale |
|---|---|---|
| `HttpOnly` | true | JS cannot read the refresh token → XSS can't steal sessions |
| `Secure` | true | TLS only (Vercel/Railway are HTTPS) |
| `SameSite` | `Lax` | blocks most CSRF on top-level navigations; admin mutating calls additionally enforce CORS + CSRF token (§6.3) |
| `Path` | `/api/v1/auth` | refresh cookie only sent on auth endpoints |

### 5.8 RBAC capability matrix

Roles: `CUSTOMER`, `TECHNICIAN` (data only, no login in v1), `MANAGER`, `ADMIN`. `authorize(capabilities)` enforces at the route layer; map lives in `packages/shared` so web/admin and API stay in lockstep.

| Capability | CUSTOMER | TECHNICIAN* | MANAGER | ADMIN |
|---|---|---|---|---|
| bookings:create | ✓ (own, guest incl.) | — | ✓ | ✓ |
| bookings:read | ✓ (own only) | ✓ (assigned) | ✓ (branch) | ✓ (all) |
| bookings:write (intake, cancel, walk-in) | cancel own (window) | — | ✓ | ✓ |
| repairs:read | ✓ (own via tracker) | ✓ (assigned) | ✓ | ✓ |
| repairs:update / stage | — | ✓ (assigned, P2) | ✓ | ✓ |
| invoices:read / write | ✓ (own) | — | ✓ | ✓ |
| customers:read / write | — | — | ✓ | ✓ |
| reviews:submit | ✓ (own verified) | — | ✓ (moderate) | ✓ (moderate) |
| catalog:read | ✓ | — | ✓ | ✓ |
| catalog:write | — | — | — | ✓ |
| coupons:read / write | — | — | — | ✓ |
| branches:read | ✓ | — | ✓ | ✓ |
| branches:write | — | — | — | ✓ |
| settings:read / write | — | — | — | ✓ |
| cms:read / write | — | — | — | ✓ |
| audit:read | — | — | — | ✓ |
| users:read / write | — | — | — | ✓ |
| technicians:read / write | — | — | read | ✓ |
| analytics:read | — | — | ✓ | ✓ |

\* TECHNICIAN capabilities are reserved for Phase 2 login (D-001) — enforced as **not reachable** in v1, no route group exists.

- **Ownership layer beneath capabilities:** customers access only records where `booking.customerId == req.user.customerId`; branch staff only within `req.user.branchScope`.
- Every denied request returns the standard error envelope `403` — logged, uniform wording (no oracle for capability enumeration).

### 5.9 Token & cookie lifecycle

| Event | Access token | Refresh token (cookie) | Notes |
|---|---|---|---|
| Login | Issued 15 min | Issued 7 d, `tokenHash` stored | cookie `Set-Cookie` HttpOnly/Secure/SameSite=Lax |
| Refresh | Re-issued 15 min | **Rotated** — old revoked (`revokedAt`, `replacedByTokenId`), new issued | cookie re-set each rotation |
| Refresh with revoked token | — | **Family revocation** (walk chain, revoke all `userId` rows) + security log | reuse detection = theft signal |
| Logout | Discarded client-side | Revoked; cookie cleared | idempotent |
| Password change / reset | Rejected if `iat < passwordChangedAt` | All rows revoked | forces re-login everywhere |
| User deactivated | Rejected (route-level `isActive` check) | Revoked | immediate on next request |

### 5.10 Enumeration & abuse resistance

| Signal | Response |
|---|---|
| `bookingRef` lookup miss on tracker | Uniform 404 page (no existence oracle); rate limited 60/10min/IP |
| Login unknown-user vs wrong-password | Same 401 body + same bcrypt timing (dummy hash compare) |
| Register duplicate email | 409 generic "email in use" — does not disclose account state beyond register intent |
| OTP verify failure | Increments `Otp.attempts`; 5th failure invalidates the code; no detail about which digit was wrong |
| Capability denial | Uniform 403 body, logged — never distinguishes "exists but forbidden" vs "not found" |

---

## 6. Injection, XSS, CSRF, SSRF

### 6.1 Injection
- zod schemas on every request boundary (`packages/shared`, mirrored in web/admin forms). Zod trims/coerces; unknown keys rejected by default.
- Prisma parameterizes all queries — string-built SQL is banned (rules.md §6.8). No `$queryRaw` unless reviewed and parameterized.
- Env schema zod-validated at boot; invalid env = refuse to start.

### 6.2 XSS
- React auto-escaping is the default; **no `dangerouslySetInnerHTML`** for CMS content without `sanitize-html` (rules.md §6.7). CMS HTML (blog, FAQ, testimonials) passes through an allowlist sanitizer before render.
- Uploaded media is served via Cloudinary; uploaded-file content is never rendered as HTML (uploads constrained to image types — §7).
- CSP headers via `helmet` (see §9) limit script sources; `strict-dynamic` where the Vite bundles allow.
- Structured data / JSON-LD values (SEO) are escaped at render — a CMS value can never inject script tags into `<script type="application/ld+json">`.

### 6.3 CSRF
- Primary defense: refresh cookie `SameSite=Lax` + CORS origin allowlist with `credentials:true` (no cross-origin credentialed calls).
- State-changing **admin** routes additionally require a CSRF token (double-submit cookie + header) because admin panels are the classic CSRF target. Token issued on login; verified in the `admin` router group before `authorize()`.

### 6.4 SSRF
- No server-side fetch of user-controlled URLs in v1 (see A10 table). Image transforms happen via Cloudinary URL parameters on **Cloudinary-owned** URLs; any future provider/webhook URL must be allowlisted or signature-verified (Phase 2).

---

## 7. Uploads (Cloudinary, signed only)

| Control | Implementation |
|---|---|
| Signing | `POST /upload/sign` returns a one-time signature bound to a constrained folder/format/max-size; files upload directly to Cloudinary from the browser — **API keys never reach the client** (architecture.md §5.6) |
| Type/size | Enforced at sign time server-side (allowlist `image/jpeg\|png\|webp`; max e.g. 5 MB); magic-byte check done by Cloudinary upload profile as a second gate |
| Per-user folder | Signing keys folder to `bookings/{bookingId}` or `users/{userId}` — no cross-tenant overwrite |
| Public vs private | Booking/review photos can be public (transforms via `f_auto,q_auto,w_*`); anything private uses Cloudinary signed/expiring URLs delivered to authorized users only |
| Malware | Cloudinary-hosted media; add a virus-scanning integration on the upload profile in **Phase 2**. Client never renders uploaded content as executable (image types only) |
| Transform abuse | Sign-time URL whitelist — clients may request only documented transforms; no arbitrary Cloudinary URL forgery |
| Sign rate limit | 30/10min/IP — caps bulk signing requests |

---

## 8. Rate limiting & abuse

Enforced per-route via middleware. v1 store is in-memory per instance — **move to Redis when the API scales past one instance** (architecture.md §1.2 stateless scale) so limits are accurate across instances.

| Route group | Limit | Rationale |
|---|---|---|
| auth (login, register, refresh, OTP) | 10 / 15 min / IP | brute-force + credential stuffing wall |
| estimate (repair/estimate) | 60 / 10 min / IP | cheap endpoint, abuse-prone (calculator scraping) |
| booking create | 20 / 10 min / IP | spam bookings; complements honeypot + idempotency |
| review submit | 5 / hour / IP | review spam + astroturfing mitigation |
| upload sign | 30 / 10 min / IP | prevents bulk upload-request abuse |
| public tracker reads | 60 / 10 min / IP | enumeration/scraping of the public tracker |

- **Honeypot:** the booking form includes a hidden field (`website`); autofill bots fill it → server drops the request silently.
- **Email/IP reputation hooks:** Phase 2 — blocklist/allowlist, sign-in risk scoring. v1 relies on the limits above + OTP attempt caps.
- Rate-limit responses use the standard error envelope (`429`) with `Retry-After`; limits are keyed by IP + (where sensible) normalized email.

---

## 9. Secrets & infrastructure

| Item | Decision |
|---|---|
| Env vaults | Railway env vault for API + DB; Vercel project env for web/admin. Nothing committed; `.env*` gitignored (only `.env.example` committed with placeholder values) |
| Client bundles | No secrets. API-only env vars are referenced exclusively inside `apps/api`; `import.meta.env` contains only public `VITE_*` values |
| Env schema | zod-validated at boot in `packages/config` — missing/invalid vars fail startup (architecture.md §8); the schema doubles as the env reference doc |
| Rotation policy | `JWT_SECRET`, refresh-signing secret, AES data-encryption key, Cloudinary/Resend keys rotated on staff departure or suspected leak; rotation runbook in [deployment.md](deployment.md) |
| Dependency scanning | `npm audit` gate in CI + Dependabot PRs (§4 A06) |
| Container | Railway Node container runs **non-root**; read-only filesystem where the app permits; health check `/health` (DB ping, version) |
| TLS & headers | TLS at Vercel/Railway; `helmet` defaults applied globally: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options`/frame denial, `Referrer-Policy`, CSP |
| DB access | Prisma migrations run pre-deploy with a **migration service account** (least privilege, no public exposure); Railway-managed Postgres with SSL required |
| Admin session | Refresh cookie as §5.7; admin tokens short-lived; no API-key fallback in v1 |

### 9.1 Log & error redaction allowlist

Fields that must never appear in logs, Sentry, or error envelopes (enforced by the log/error middleware):

| Always redact | Replace with |
|---|---|
| `password`, `passwordHash`, `newPassword` | `[redacted]` |
| Refresh token value, cookie value, `tokenHash` | `[redacted]` |
| `code`, `codeHash`, OTP value | `[redacted]` |
| `devicePassword` | `[redacted]` |
| `Authorization` header | `Bearer [redacted]` |
| Full email/phone/IMEI in log context | first char + `***` (keep joinable via `requestId`, not PII) |
| `Set-Cookie` refresh value | `[redacted]` |

A serializer + middleware unit test enforces this list (testing.md §3.2/§3.3) — a new sensitive field must be added here and to the test in the same PR.

---

## 10. Admin hardening

- **MFA:** Phase 2 (TOTP) — flagged in the security backlog; not in v1.
- **IP allowlist option:** configurable per env for admin-only routes (staff networks); off by default, `GLOBAL` setting.
- **Session audit:** `RefreshToken.ip`/`userAgent` + `AuditLog` of login/logout; admin can revoke any session from the users screen (audited).
- **Privileged-action confirmation:** destructive/admin-scoped actions (role changes, branch/settings edits, refunds in P2) require a typed confirmation or password re-entry; every one writes `AuditLog`.
- `AuditLog` is append-only in practice — no update/delete path exists in the API.

---

## 11. Incident response

| Phase | Actions |
|---|---|
| Detect | Sentry errors, error-rate alerts, auth-failure-spike alert, audit-log review job, rate-limit trip counts |
| Log | Structured JSON with `requestId` (correlates across api instances); redacted PII; event timestamps UTC |
| Respond | Rotate leaked secrets (§9 rotation policy); revoke session family on token-theft signal; disable affected user (`isActive`); restore from encrypted backup if data-corruption path; PR revert via CI |
| Recover | Rollback runbook pointer: [deployment.md](deployment.md) §"Rollback" — redeploy prior release, run `prisma migrate resolve` if a migration was mid-flight, verify `/health` + smoke test |
| Learn | Post-incident write-up appended to this doc + rules.md if a rule gap caused it |

---

## 12. Security verification checklist (DoD)

Run on any PR that touches auth, uploads, admin routes, or the schema:

- [ ] zod schemas updated for every changed API shape; boundary tests added (testing.md §3.1)
- [ ] Sensitive columns absent from every response shape; serializer test green
- [ ] New mutating admin route wrapped in `authorize()` + audit-logged
- [ ] `npm audit` clean; no new transitive dep with a known CVE
- [ ] No secrets or PII added to logs/errors; redaction middleware unaffected
- [ ] Rate limit exists for any new public/unauthenticated route
- [ ] Uploads (if touched) remain signed + type/size-constrained; `dangerouslySetInnerHTML` unchanged or sanitized
- [ ] Security docs updated where behavior changed (this file or rules.md §6)

## 13. Security verification in practice

| Activity | Cadence | Detail |
|---|---|---|
| `npm audit` gate | every PR (CI) | blocks merge on high/critical; reviewed exceptions logged |
| Dependency scan (Dependabot) | continuous | auto-PR on new CVEs; bump policy in rules.md |
| Manual OWASP review pass | per release | walk the §4 table against the diff (A01/A03/A07 first) |
| Security regression tests | every PR touching auth/uploads/admin | automated via testing.md (RBAC, rotation, OTP caps, redaction, upload sign) |
| Secrets scan in CI | every PR | block committed keys/`.env` artifacts; `.env*` gitignored |
| Penetration test | **Phase 2** (annual, external) | v1 relies on the checklist below + review discipline |
| Security review for new deps | on add | transitive peers reviewed before merge (supply chain, §4 A06/A08) |

### 13.1 Payment data boundaries (Phase 2, designed now)
- No card data, PAN, or CVC ever touches `apps/api` or Postgres — Stripe **hosted checkout** keeps PCI scope off the platform; `Booking.paymentStatus` / `Invoice.status` already exist (D-003, no schema change).
- Stripe webhook handler (Phase 2) must verify the `Stripe-Signature` header before processing (A08 integrity) — a v1 placeholder guard prevents processing unverified webhook traffic.
- Test coverage for totals/status transitions is designed in [testing.md](testing.md) §3.4 today; the Stripe integration tests mock the provider, never a live key.

The §12 DoD checklist is the per-PR verification; this section is the standing program around it. Findings from any activity land in rules.md §6 if they reveal a rule gap.

---

Depends on: [architecture.md](architecture.md) (middleware, auth, uploads, rate limits), [rules.md](rules.md) §6, [database.md](database.md) (sensitive columns, indexes), [PRD.md](PRD.md) (NFR-security, FR-AUTH/FR-ADMIN), [deployment.md](deployment.md) (env vaults, rollback).
