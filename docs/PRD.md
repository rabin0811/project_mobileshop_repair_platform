# Product Requirements Document — {{SHOP_NAME}} Mobile Repair Platform

> Working title: **MobileFix Pro** · Last updated: 2026-08-02 · Status: **v1 locked, Phase 2 defined**
> Brand identity placeholders (`{{SHOP_NAME}}`, `{{CONTACT}}`, etc.) are content tokens — see [memory.md](memory.md).

---

## 1. Product summary

A production-grade web platform for a mobile phone repair business. One customer-facing
website for booking repairs and tracking status, plus a full admin panel to run every
business process: appointments, repairs, technicians, invoicing, reviews, inventory (Phase 2),
CMS, and analytics. Designed multi-branch from day one so a second store opens without a
schema migration.

### Elevator pitch
Customers pick their phone, their problem, and a time slot, get an instant price estimate,
and track the repair live through every stage. The shop gets a single system of record that
turns WhatsApp/notebook chaos into structured bookings, invoices, and reviews.

---

## 2. Goals & non-goals

### Goals (v1)
1. Get a bookable, trustworthy customer website live in under 8 weeks (Phase 0–4).
2. Replace paper/notebook tracking with a real booking → repair → invoice pipeline.
3. Automate email communication (confirmation, stage updates, invoice, review request).
4. Grow reviews through a booking-verified review system with admin moderation.
5. Be **multi-branch ready** — the data model, reports, and settings all scope to a branch.

### Non-goals (explicitly out of v1)
- Online payments (Phase 2 — Stripe, deposit/checkout). Schema pre-wired, no re-modeling needed.
- Dedicated technician login panel (Phase 2). v1 technicians are records managed by admin.
- Customer mobile apps, technician app (roadmap).
- POS / counter checkout (roadmap).
- Full inventory, suppliers, purchase orders (Phase 2; entity stubs exist).
- Accounting / CRM / ERP integrations (roadmap).

---

## 3. Personas

| Persona | Who | Needs |
|---|---|---|
| **Customer** | Someone whose phone is broken | Instant estimate, easy booking, no account required, live repair tracking, invoice download, trust signals (reviews) |
| **Front-desk / Manager (Admin)** | Shop staff | Booking calendar, device intake, technician assignment, repair stage control, invoicing, customer lookup, reports |
| **Technician** (Phase 2 login; data in v1) | Repair bench | Assigned jobs, repair notes/photos, parts used, status updates |
| **Owner / Super-admin** | Business owner | Branches, staff roles, settings, CMS, analytics, audit trail |

---

## 4. Scope

### v1 — Customer website
- **Home**: hero, trust badges, services overview, how-it-works, featured reviews, FAQ, CTA.
- **Services catalog**: per-service detail pages (description, time, warranty, starting price, brands).
- **Brands & models**: supported brand/model pickers used by the booking flow and calculator.
- **Price calculator**: `POST /repair/estimate` → instant estimate from the service×brand×model matrix.
- **Booking flow**: branch → brand → model → problem(s) → date/time → details + optional photos → confirm → email with booking ID.
- **Repair tracker**: public, no-login status page keyed by booking reference (`/track/MF-XXXX`).
- **Reviews**: submit (booking-verified), view approved reviews, photos.
- **Contact & location**: branches with hours, address, maps link, WhatsApp.
- **CMS-driven content**: gallery, blog, FAQ, testimonials, banners (Phase 2 content seeding).
- **Auth (optional but supported)**: customer registration/login to save devices, addresses, view history.

### v1 — Admin panel
- **Dashboard**: KPIs (bookings today, active repairs, revenue, stage funnel), charts.
- **Bookings**: calendar + list, create walk-in booking, intake form (device, IMEI, password, photos), assign technician, set estimate, advance **repair stage**, record part usage, cancel.
- **Repair stage pipeline**: PENDING → CONFIRMED → DEVICE_RECEIVED → DIAGNOSING → WAITING_PARTS → REPAIRING → QUALITY_CHECK → COMPLETED → READY_FOR_PICKUP → DELIVERED (every transition audited).
- **Customers**: list, detail (history, devices, addresses), create/edit.
- **Technicians**: CRUD, specialty, hourly rate, assignment dropdown (no login yet).
- **Invoices**: generate from completed repairs, PDF, mark paid, email to customer.
- **Reviews moderation**: approve/reject/reply/feature; booking-verified flag shown.
- **Branches**: CRUD, hours, contact, settings scoping.
- **Catalog**: services, prices (matrix), brands, models.
- **Coupons**: discount codes (site-wide in v1).
- **CMS**: gallery, blog, FAQ, testimonials.
- **Settings**: website settings, email templates editor, notifications.
- **Audit log & roles**: role-based access (ADMIN/MANAGER), immutable audit trail.

### Phase 2 (defined, not built)
Online payments (Stripe), technician login, full inventory (parts/stock/suppliers/PO), more analytics, dark mode.

---

## 5. Functional requirements (with acceptance criteria)

> ID scheme: `FR-<module>-<n>`. Priority: **P0** launch-blocking, **P1** important, **P2** nice-to-have.

### 5.1 Booking — `FR-BOOK`
- `FR-BOOK-01` **P0** — A guest can create a booking without an account: choose branch, brand, model, one or more services, a free time slot, optional problem photos, and receive a confirmation email containing a unique booking reference (`MF-YYYYMMDD-XXXXX`).
  - *AC:* Email sent via Resend within 5s of confirm; reference unique; booking visible in admin list.
- `FR-BOOK-02` **P0** — Price estimate shown live before confirming, from the `ServicePrice` matrix (brand/model-aware), displayed as "from ₹X" or a firm estimate.
  - *AC:* Calculator endpoint returns consistent values; missing price → admin-configured fallback message.
- `FR-BOOK-03` **P0** — Time slots are per-branch, per-day, configured in branch business hours; a slot can't be double-booked.
  - *AC:* Two customers cannot hold the same `(branchId, scheduledAt, timeSlot)`.
- `FR-BOOK-04` **P0** — Admin can create a walk-in booking at the counter (no online equivalent), including "no model found" handling.
- `FR-BOOK-05` **P1** — Customer can cancel while status is PENDING/CONFIRMED and before DEVICE_RECEIVED; cancellation triggers email + audit event.

### 5.2 Repair tracking — `FR-REPAIR`
- `FR-REPAIR-01` **P0** — Every stage transition is recorded as a `BookingEvent` (actor, from, to, note) and triggers the matching email template (`repair_stage_update`).
- `FR-REPAIR-02` **P0** — Public tracker page `/track/:bookingRef` shows current stage, timeline history, and estimate, without login. Booking reference is the only secret (high-entropy, not guessable IDs).
- `FR-REPAIR-03` **P0** — Admin moves a repair through the allowed stage machine; illegal transitions are rejected server-side.
- `FR-REPAIR-04` **P1** — Technician (record, v1) assigned to a repair is stored on the booking; used in reports.

### 5.3 Invoicing — `FR-INV`
- `FR-INV-01` **P0** — Admin can generate an invoice from a COMPLETED/READY_FOR_PICKUP repair; PDF rendered server-side (Resend + Cloudinary storage), emailed to customer.
- `FR-INV-02` **P1** — Invoice has subtotal, tax (configurable rate per branch), discount, total; amounts stored in minor units (cents).
- `FR-INV-03` **P1** — Payment status tracked (`UNPAID/PARTIAL/PAID/REFUNDED`) — Phase 2 Stripe fills this in without schema change.

### 5.4 Reviews — `FR-REV`
- `FR-REV-01` **P0** — Only a customer with a completed (DELIVERED) booking for that email/account can review that specific booking (booking-verified; 1 review per booking).
- `FR-REV-02` **P0** — New reviews are `PENDING`; admin approves/rejects; approved reviews are public.
- `FR-REV-03` **P1** — Customers can attach up to 3 photos; admin can reply and feature reviews on the homepage.
- `FR-REV-04` **P1** — Review-request email is sent automatically N days after DELIVERED (admin-configurable).

### 5.5 Catalog & pricing — `FR-CAT`
- `FR-CAT-01` **P0** — Admin CRUD for services, brands, models; all have active/inactive toggles.
- `FR-CAT-02` **P0** — Price matrix `ServicePrice(service, brand, model?)`; brand-level default, model-level override.
- `FR-CAT-03` **P1** — Public service pages pull from CMS fields (description, image, est time, warranty days).

### 5.6 Customers & auth — `FR-AUTH`
- `FR-AUTH-01` **P0** — Register/login with email+password; JWT access token (short-lived) + rotating refresh token (httpOnly cookie).
- `FR-AUTH-02` **P0** — Email verification (Resend + OTP/link); unverified users can book but not review.
- `FR-AUTH-03` **P0** — Forgot/reset password flow.
- `FR-AUTH-04` **P1** — Profile management, saved devices, saved addresses.

### 5.7 Admin operations — `FR-ADMIN`
- `FR-ADMIN-01` **P0** — Role-based access control: `ADMIN` (everything), `MANAGER` (bookings, repairs, invoices, customers; not settings/branches/roles).
- `FR-ADMIN-02` **P0** — Every mutating admin action writes an `AuditLog` (who, what, entity, changes diff, IP).
- `FR-ADMIN-03` **P0** — All list endpoints support filtering (branch, status, date range), sorting, and pagination.
- `FR-ADMIN-04` **P1** — Dashboard KPIs and charts (bookings, revenue, stage funnel, top services) via Recharts.

### 5.8 Notifications & email — `FR-EMAIL`
- `FR-EMAIL-01` **P0** — Templates (editable in admin): `booking_confirmation`, `repair_stage_update`, `invoice_ready`, `review_request`, `welcome`, `email_verification`, `password_reset`, `booking_cancelled`.
- `FR-EMAIL-02` **P0** — In-app notifications stored for logged-in users (repair updates, invoice ready).
- `FR-EMAIL-03` **P1** — All email sends retried with exponential backoff; dead-letter logged.

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | p95 API < 300ms (non-report endpoints); Lighthouse ≥ 90 (perf, a11y, SEO); first paint < 1.5s on 4G; images via Cloudinary auto-format |
| Security | OWASP Top 10; bcrypt/argon2 passwords; JWT 15min + rotating refresh (7d); all admin routes authorized; rate limiting on auth/booking/review; input validation (Zod) on every request; audit trail |
| Reliability | Prisma migrate + CI smoke tests; error logging (structured JSON); uptime target 99.5% |
| Scalability | Stateless API → horizontal scale; multi-branch scoped queries; index-heavy read paths; pagination everywhere |
| Accessibility | WCAG 2.1 AA; focus states, aria labels, keyboard nav |
| Localization | All copy through a single i18n dictionary (en + `{{LOCALE_2}}` in Phase 2); dates/times per branch timezone |

---

## 7. KPIs / success metrics

- Booking conversion (visit → confirmed booking) ≥ 2%
- Avg time from booking → DELIVERED ≤ 4 days
- Review capture rate (reviewed / delivered) ≥ 25%
- Stage transitions that are automated email sends = 100%
- Admin time per walk-in intake ≤ 3 minutes
- Zero reported double-bookings

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Model/service catalog too big to curate | Seed with top brands × top services; brand-level default prices; admin batch-import CSV |
| Photo uploads abuse | Cloudinary signed uploads, size/type validation, rate limiting |
| Booking spam | Rate limit by IP/email; honeypot field; admin confirmation gate |
| Email deliverability | Resend with verified `{{DOMAIN}}`; SPF/DKIM; plain-text fallbacks |
| Multi-branch confusion in reports | All queries take `branchId` filter; `scope` column on settings |
| Repair stage mistakes | Strict transition state machine + audit trail + undo within a stage |

---

## 9. Open questions (content placeholders)

Filled later — replace in [memory.md](memory.md) → **Brand identity** block, then propagate:
`{{SHOP_NAME}}`, `{{TAGLINE}}`, `{{OWNER}}`, `{{EST_YEAR}}`, `{{PHONE}}`, `{{WHATSAPP}}`, `{{EMAIL}}`,
`{{DOMAIN}}`, `{{REG_NO}}`, `{{ADDRESS}}`, `{{MAPS_URL}}`, `{{CURRENCY}}`, `{{LOCALE_1}}`, `{{TIMEZONE}}`,
`{{BRAND_PRIMARY}}`, default service catalog, supported brands list.
