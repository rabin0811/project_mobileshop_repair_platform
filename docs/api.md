# API Reference — MobileFix Pro (v1)

> REST API served by `apps/api` under `/api/v1`. Companion docs: [architecture.md](architecture.md), [PRD.md](PRD.md), [flows.md](flows.md).
> Entity names, enums, and field names are taken verbatim from [prisma/schema.prisma](../prisma/schema.prisma) — the schema is the contract.

---

## 1. Overview

| | |
|---|---|
| Base URL (prod) | `https://{{DOMAIN}}/api/v1` |
| Base URL (dev) | `http://localhost:4000/api/v1` |
| Versioning | Path prefix `/api/v1`. Additive, non-breaking changes only within v1; a breaking change ships a new major (e.g. `/api/v2`) |
| Content types | `application/json` for all requests/responses. **No multipart** — file uploads are Cloudinary signed (see `POST /upload/sign`); files never touch the API |
| Time | All timestamps ISO-8601 UTC (`Z`). Slots/business hours are expressed in the branch timezone |
| Money | All amounts are `Int` **minor units** (cents/paise). Tax rate is basis points (`taxRateBps`, e.g. `1800` = 18%) |

### Response envelope

Success — `200/201` (or `204` for void ops):

```json
{ "data": { }, "meta": { } }
```

`meta` is present on list endpoints: `{ "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 }`.

Failure — always `4xx/5xx` with an error envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "Booking not found", "details": { } } }
```

`details` is optional; for validation errors it lists per-field issues. Errors are never `{ data }` and never leak stack traces.

### Auth model

- **Access token** — JWT HS256, **15 min**, claims `{ sub, role }`. Sent as `Authorization: Bearer <token>`.
- **Refresh token** — opaque 256-bit random, `sha256`-hashed at rest in `RefreshToken`, **7-day** expiry, **rotated on every use** (old revoked → new issued), delivered in an `httpOnly`, `SameSite=Lax`, `Secure` cookie named `mfp_refresh`. Reuse of a revoked token revokes the whole session family.
- **Passwords** — bcrypt (cost 12). Password change bumps `passwordChangedAt` and revokes all sessions.
- Roles: `CUSTOMER`, `TECHNICIAN` (v1 data-only, login is Phase 2), `MANAGER`, `ADMIN`.

---

## 2. Error taxonomy

| Code | HTTP | Meaning |
|---|---|---|
| `VAL_001` | 400 | Zod validation failed; `details` lists field errors |
| `AUTH_001` | 401 | Missing or malformed `Authorization` header |
| `AUTH_002` | 401 | Access token expired or invalid |
| `AUTH_003` | 403 | Token valid but lacks required capability/role (or account `isActive: false`) |
| `AUTH_004` | 401 | Invalid credentials (login) or invalid/revoked/expired refresh token or OTP |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | State conflict: unique constraint, slot already taken, idempotency clash, illegal stage transition |
| `RATE_LIMITED` | 429 | Rate limit exceeded; `Retry-After` header set |
| `INTERNAL` | 500 | Unhandled error; reference `requestId` (from `X-Request-Id`) for tracing |

---

## 3. Conventions

- **Pagination** — `?page=1&pageSize=20`, `pageSize` capped at `100`. Lists return `meta`. High-volume reports may use `?cursor=` (opaque) instead.
- **Filtering / sorting** — list endpoints accept `branchId`, status/enum filters, `dateFrom`/`dateTo` (applied to the relevant timestamps), `search` (case-insensitive substring on name/ref/email/phone/IMEI), and `sort` (`field:asc|desc`). Branch-scoped entities are always filterable by `branchId`; a missing `branchId` on a multi-branch list defaults to **all branches the role may see**.
- **Idempotency** — mutations that create business records accept an `Idempotency-Key` header (≤ 128 chars). A replay returns the original result (`200`) instead of duplicating; a different key colliding with an existing unique field returns `409`. Stored on `Booking.idempotencyKey`.
- **Soft delete** — no hard deletes in v1. Catalog/CMS/branch/technician "DELETE" flips `isActive: false`; users are deactivated. Deleted records remain in reports/audit history.
- **Sensitive fields are never returned** — `passwordHash`, `tokenHash` (`RefreshToken`), `codeHash` (`Otp`), `devicePassword`. `devicePassword` may be written by admin (`PATCH /bookings/:id`) but never appears in any response.

### Rate limits (per IP)

| Scope | Limit | Applied to |
|---|---|---|
| Auth | 10 / 15 min | `POST /auth/*` |
| Estimate | 60 / 10 min | `POST /repair/estimate` |
| Booking | 20 / 10 min | `POST /bookings`, `POST /bookings/:id/cancel`, `GET /bookings/slots`, `GET /bookings/track/:ref` |
| Review | 5 / hour | `POST /reviews` |
| Upload sign | 30 / 10 min | `POST /upload/sign` |

Limits are per-IP + per-route; exceeding returns `429 RATE_LIMITED` with `Retry-After`.

---

## 4. Auth & RBAC

`authorize(capability)` runs after `authenticate` on every admin route. Capability map lives in `packages/shared` (`rbac.ts`):

| Capability | Modules | ADMIN | MANAGER |
|---|---|---|---|
| `bookings` | booking lifecycle, intake, assignment | ✓ | ✓ |
| `repairs` | pipeline board, stage machine | ✓ | ✓ |
| `invoices` | generate, list, markPaid, void | ✓ | ✓ |
| `customers` | customer CRUD | ✓ | ✓ |
| `reviews` | moderation | ✓ | ✓ |
| `technicians` | technician CRUD | ✓ | ✓ |
| `catalog` | services, brands, models, price matrix | ✓ | ✓ |
| `coupons` | coupon CRUD | ✓ | ✓ |
| `cms` | FAQ, gallery, blog, testimonials | ✓ | ✓ |
| `analytics` | reports | ✓ | ✓ |
| `branches` | branch CRUD | ✓ | ✗ |
| `settings` | settings, email templates | ✓ | ✗ |
| `users` | staff/roles | ✓ | ✗ |
| `audit` | audit log read | ✓ | ✗ |

Every mutating admin action writes an `AuditLog` row (`actorId`, `action`, `entityType`, `entityId`, `changes` diff, `branchId`, `ip`).

---

## 5. Endpoints

### 5.1 Auth — `POST /api/v1/auth/*`

#### POST /auth/register
| | |
|---|---|
| Auth | Public · rate 10/15min |
| Body | `{ email: string(email), password: string(min 8, max 72), name: string(min 1), phone?: string }` |
| Success `201` | `{ data: { user: { id, email, name, role: "CUSTOMER", emailVerifiedAt: null }, accessToken } }` + `Set-Cookie: mfp_refresh` |
| Errors | `VAL_001` · `409 CONFLICT` email already registered · `RATE_LIMITED` |
| Side effects | Creates `User` (role `CUSTOMER`) + `Customer` profile; sends `email_verification` OTP via Resend |

#### POST /auth/login
| | |
|---|---|
| Auth | Public · rate 10/15min |
| Body | `{ email: string(email), password: string }` |
| Success `200` | `{ data: { user, accessToken } }` + `Set-Cookie: mfp_refresh` (rotated) |
| Errors | `AUTH_004` wrong credentials · `AUTH_003` account disabled · `VAL_001` |
| Side effects | New refresh token stored (hash); `User.lastLoginAt` updated; audit event |

#### POST /auth/refresh
| | |
|---|---|
| Auth | Public — reads `mfp_refresh` cookie |
| Success `200` | `{ data: { accessToken } }` + new `Set-Cookie` (old revoked, `replacedByTokenId` set) |
| Errors | `AUTH_004` missing/revoked/expired → cookie cleared; **reuse detection revokes the entire session family** |

#### POST /auth/logout
| | |
|---|---|
| Auth | Bearer (optional) or `mfp_refresh` cookie |
| Success `204` | No body. Revokes the presented refresh token |

#### POST /auth/verify-email
| | |
|---|---|
| Auth | Public · rate 10/15min |
| Body | `{ code: string(length 6) }` — OTP purpose `EMAIL_VERIFICATION` |
| Success `200` | `{ data: { emailVerifiedAt: string } }` |
| Errors | `AUTH_004` wrong/expired code · `409 CONFLICT` already verified |
| Side effects | Sets `emailVerifiedAt`; sends `welcome` email |

#### POST /auth/resend-verification
| | |
|---|---|
| Auth | Public · rate 10/15min |
| Body | `{ email: string(email) }` |
| Success `200` | `{ data: { sent: true } }` — regenerates OTP, re-sends `email_verification` |

#### POST /auth/forgot-password
| | |
|---|---|
| Auth | Public · rate 10/15min |
| Body | `{ email: string(email) }` |
| Success `200` | `{ data: { sent: true } }` — **always 200** (do not reveal account existence). Creates OTP purpose `PASSWORD_RESET`, sends `password_reset` |

#### POST /auth/reset-password
| | |
|---|---|
| Auth | Public · rate 10/15min |
| Body | `{ code: string(length 6), newPassword: string(min 8, max 72) }` |
| Success `200` | `{ data: { ok: true } }` |
| Errors | `AUTH_004` invalid/expired code |
| Side effects | Sets new `passwordHash`, bumps `passwordChangedAt` → **revokes all refresh tokens** |

### 5.2 Me — `/api/v1/me`

#### GET /me
| | |
|---|---|
| Auth | Customer |
| Success `200` | `{ data: { user: { id, email, name, phone, role, emailVerifiedAt, avatarUrl }, customer: { id, defaultBranchId, savedDevices: [...], addresses: [...] } } }` |

#### PATCH /me
| | |
|---|---|
| Auth | Customer |
| Body | `{ name?: string, phone?: string, avatarUrl?: string }` |
| Success `200` | Updated `{ data: { user } }` |

#### POST /me/change-password
| | |
|---|---|
| Auth | Customer |
| Body | `{ currentPassword: string, newPassword: string(min 8) }` |
| Success `200` | `{ data: { ok: true } }` — verifies current, updates hash, bumps `passwordChangedAt`, revokes all sessions |
| Errors | `AUTH_004` wrong current password |

### 5.3 Branches — `/api/v1/branches`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /branches` | Public | `?search=` — active branches | `{ data: [Branch], meta }` | — |
| `GET /branches/:slug` | Public | — | `{ data: Branch }` (incl. `businessHours`) | `NOT_FOUND` |
| `POST /branches` | ADMIN | `{ name, slug, address, city, state?, postalCode?, country?, lat?, lng?, mapsUrl?, phone?, whatsapp?, email?, timezone?, businessHours: Json }` | `201 { data: Branch }` | `VAL_001` · `409` slug taken |
| `PATCH /branches/:id` | ADMIN | partial fields above | `{ data: Branch }` | `NOT_FOUND` |
| `DELETE /branches/:id` | ADMIN | — | `204` (soft: `isActive=false`; bookings preserved) | `NOT_FOUND` |

`Branch` shape: `{ id, name, slug, address, city, state, postalCode, country, lat, lng, mapsUrl, phone, whatsapp, email, timezone, businessHours, isActive }`.

### 5.4 Brands & models — `/api/v1/brands`, `/api/v1/models`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /brands` | Public | `?search=` — active | `{ data: [{ id, name, slug, logoUrl }], meta }` | — |
| `GET /brands/:slug` | Public | — | `{ data: { ...Brand, models: [DeviceModel] } }` | `NOT_FOUND` |
| `POST /brands` | ADMIN | `{ name, slug, logoUrl?, sortOrder? }` | `201` | `VAL_001` · `409` name/slug taken |
| `PATCH /brands/:id` · `DELETE /brands/:id` | ADMIN | partial / — | `200` / `204` (soft) | `NOT_FOUND` |
| `GET /models` | Public | `?brandId=&brandSlug=` — active | `{ data: [DeviceModel], meta }` | — |
| `GET /models/:id` | Public | — | `{ data: DeviceModel }` (incl. brand) | `NOT_FOUND` |
| `POST /models` | ADMIN | `{ brandId, name, slug, releaseYear?, imageUrl?, sortOrder? }` | `201` | `VAL_001` · `409` unique `(brandId, name)` |
| `PATCH /models/:id` · `DELETE /models/:id` | ADMIN | partial / — | `200` / `204` (soft) | `NOT_FOUND` |

### 5.5 Services — `/api/v1/services`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /services` | Public | `?category=<ServiceCategory>&search=` — active | `{ data: [{ id, slug, name, shortDescription, category, estTimeMin, warrantyDays, priceModel, startingPrice, imageUrl }], meta }` | — |
| `GET /services/:slug` | Public | — | `{ data: Service }` full detail incl. `description` | `NOT_FOUND` |
| `POST /services` | ADMIN | `{ slug, name, shortDescription?, description?, category, estTimeMin, warrantyDays, priceModel, startingPrice, imageUrl?, sortOrder? }` | `201` | `VAL_001` · `409` slug taken |
| `PATCH /services/:id` · `DELETE /services/:id` | ADMIN | partial / — | `200` / `204` (soft) | `NOT_FOUND` |

`ServiceCategory`: `SCREEN · BATTERY · CHARGING_PORT · CAMERA · SPEAKER · MOTHERBOARD · WATER_DAMAGE · SOFTWARE · UNLOCKING · DATA_RECOVERY · ACCESSORY · OTHER`.

### 5.6 Pricing — `/api/v1/repair/estimate`, `/api/v1/pricing`

#### POST /repair/estimate
| | |
|---|---|
| Auth | Public · rate 60/10min |
| Body | `{ branchId: string(cuid), brandId: string(cuid), modelId: string(cuid), serviceIds: string[](min 1) }` |
| Success `200` | `{ data: { lineItems, subtotal, taxRateBps, taxAmount, discount, total, currency, message } }` |

Price resolution per service from the `ServicePrice` matrix `(serviceId, brandId, modelId?)`:

1. **Exact model row** — `modelId` matches → `source: "model"`, `isFirm: true`
2. **Brand default row** — `modelId: null` → `source: "brand"`, `isFirm: true`
3. **Fallback** — `Service.startingPrice` → `source: "fallback"`, `isFirm: false`, `message: "Price starts at ₹X; confirmed after inspection."`

`taxRateBps` comes from branch `Setting` `tax.rateBps` (default `1800`); `taxAmount = round(subtotal × taxRateBps / 10000)`.

```json
{
  "data": {
    "lineItems": [
      { "serviceId": "clx-s1", "slug": "screen-replacement", "basePrice": 120000, "partsCost": 0, "source": "model", "isFirm": true },
      { "serviceId": "clx-s2", "slug": "battery-replacement", "basePrice": 80000, "partsCost": 0, "source": "brand", "isFirm": true }
    ],
    "subtotal": 200000, "taxRateBps": 1800, "taxAmount": 36000, "discount": 0, "total": 236000,
    "currency": "INR", "message": "Final price confirmed at device intake."
  }
}
```

#### Price matrix admin
| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /pricing/matrix` | ADMIN/MANAGER | `?serviceId=&brandId=&modelId=&branchId=` | `{ data: [ServicePrice], meta }` | — |
| `POST /pricing` | ADMIN/MANAGER | `{ serviceId, brandId, modelId?, basePrice, partsCost?, isActive? }` — upsert on unique `(serviceId, brandId, modelId)` | `201` | `VAL_001` · `409` |
| `PATCH /pricing/:id` | ADMIN/MANAGER | `{ basePrice?, partsCost?, isActive? }` | `200` | `NOT_FOUND` |
| `DELETE /pricing/:id` | ADMIN/MANAGER | — | `204` (soft) | `NOT_FOUND` |

### 5.7 Bookings — customer

#### POST /bookings
| | |
|---|---|
| Auth | Public (guest) or Customer (logged-in, omits `customer`) · rate 20/10min |
| Headers | `Idempotency-Key: string(≤128)` **required** |
| Body | `{ branchId, brandId?, modelId?, serviceIds: string[](min 1), scheduledAt: string(datetime), timeSlot?: string, problemDescription?: string, deviceImei?: string, deviceSerial?: string, couponCode?: string, customer?: { name, email, phone? } }` |
| Success `201` | `{ data: BookingCreated }` + confirmation email (template `booking_confirmation`) |
| Errors | `VAL_001` · `409 CONFLICT` slot already taken for `(branchId, scheduledAt, timeSlot)` · `409` coupon invalid · `RATE_LIMITED` |

`BookingCreated`:
```json
{
  "data": {
    "id": "clx-bk1", "bookingRef": "MF-20260805-K3M7X",
    "branchId": "clx-b1", "brandId": "clx-br1", "modelId": "clx-m1",
    "status": "PENDING", "repairStage": null, "paymentStatus": "UNPAID",
    "estimatedCost": 120000, "isWalkIn": false,
    "scheduledAt": "2026-08-05T10:30:00+05:30", "timeSlot": "10:00-11:00",
    "services": [{ "serviceId": "clx-s1", "quotedPrice": 120000, "isPrimary": true }],
    "createdAt": "2026-08-02T09:12:00.000Z"
  }
}
```
Transaction: `Booking` + `BookingService[]` + `BookingEvent` (`actorType: CUSTOMER`, `fromStatus: null`, `toStatus: "PENDING"`). **Idempotency replay** returns `200` with the original booking instead of a new row. `quotedPrice` is snapshotted from the estimate resolution at booking time.

#### GET /bookings/my
| | |
|---|---|
| Auth | Customer |
| Query | `?page=&pageSize=&status=` |
| Success `200` | `{ data: [BookingSummary], meta }` — own bookings (includes `bookingRef`, `repairStage`, `estimatedCost`, `scheduledAt`) |

#### GET /bookings/track/:bookingRef
| | |
|---|---|
| Auth | **Public** (bearer secret is the ref itself) · rate 20/10min |
| Success `200` | `{ data: { bookingRef, status, repairStage, estimatedCost, paymentStatus, scheduledAt, branch: { name, city, phone, address }, services: [{ name, quotedPrice }], events: [{ actorType, fromStatus, toStatus, note, createdAt }] } }` |
| Errors | `NOT_FOUND` unknown ref |

No customer PII, no `cuid` ids, no `devicePassword`/IMEI — the ref is the only key. Timeline = `BookingEvent` rows ascending.

#### POST /bookings/:id/cancel — and POST /bookings/:bookingRef/cancel (guest)
| | |
|---|---|
| Auth | Customer (own booking, by `id`) **or** guest (by `bookingRef` + matching email) · rate 20/10min |
| Body | `{ email?: string }` — guest variant: must match the booking's customer email |
| Success `200` | `{ data: { id, bookingRef, status: "CANCELLED" } }` |
| Errors | `AUTH_003` not your booking · `409 CONFLICT` status not `PENDING`/`CONFIRMED` |
| Side effects | `BookingEvent` (`toStatus: "CANCELLED"`), email `booking_cancelled`. Cancel allowed only while `PENDING`/`CONFIRMED` |

#### POST /bookings/:id/images
| | |
|---|---|
| Auth | Customer (own booking) |
| Body | `{ imageUrls: string[](max 5) }` — Cloudinary `secure_url`s from a signed upload |
| Success `200` | `{ data: { images: string[] } }` — appended to `Booking.images` |

#### GET /bookings/slots
| | |
|---|---|
| Auth | Public · rate 20/10min |
| Query | `?branchId=&date=YYYY-MM-DD` |
| Success `200` | `{ data: { date, businessHours, slots: ["10:00-11:00", "11:00-12:00", ...], taken: ["12:00-13:00"] } }` |

Slots are **derived**, not stored: branch `businessHours` minus `PENDING`/`CONFIRMED` bookings for that `(branchId, date)`. No `Slots` table exists.

### 5.8 Bookings — admin

#### GET /bookings
| | |
|---|---|
| Auth | ADMIN/MANAGER (`bookings`) |
| Query | `?branchId=&status=&repairStage=&technicianId=&dateFrom=&dateTo=&search=&page=&pageSize=&sort=` |
| Success `200` | `{ data: [ { id, bookingRef, status, repairStage, scheduledAt, timeSlot, customerName, phone, estimatedCost, isWalkIn, technicianId, createdAt } ], meta }` |
| `search` | bookingRef / customer name / email / phone / IMEI |

#### POST /bookings/walk-in
| | |
|---|---|
| Auth | ADMIN/MANAGER (`bookings`) |
| Body | `{ branchId, customerId? | customer: { name, email, phone }, brandId?, modelId?, services: [{ serviceId, quotedPrice }](min 1), scheduledAt, timeSlot?, deviceImei?, deviceSerial?, devicePassword?, problemDescription?, notes?, technicianId? }` |
| Success `201` | `{ data: { ...Booking, status: "CONFIRMED", repairStage: "DEVICE_RECEIVED", isWalkIn: true } }` |
| Errors | `VAL_001` · `409` slot conflict · `NOT_FOUND` |

Device is in hand at the counter, so a walk-in is created `CONFIRMED` + `DEVICE_RECEIVED` in one transaction with two events (`PENDING→CONFIRMED`, `→DEVICE_RECEIVED`, both `actorType: ADMIN`). Unknown device → omit `brandId`/`modelId`; pick an "OTHER" service.

#### GET /bookings/:id
| | |
|---|---|
| Auth | ADMIN/MANAGER (`bookings`) |
| Success `200` | `{ data: { ...Booking, services: [BookingService], events: [BookingEvent], invoice?, review?, customer?, technician? } }` |
| Errors | `NOT_FOUND` |

#### PATCH /bookings/:id
| | |
|---|---|
| Auth | ADMIN/MANAGER (`bookings`) |
| Body | `{ deviceImei?, deviceSerial?, devicePassword?, problemDescription?, notes?, scheduledAt?, timeSlot?, technicianId? }` |
| Success `200` | `{ data: Booking }` — device details set at intake; `devicePassword` accepted but **never returned** |

#### POST /bookings/:id/assign-technician
| | |
|---|---|
| Auth | ADMIN/MANAGER (`bookings`, `technicians`) |
| Body | `{ technicianId: string }` — must be active and in the booking's branch |
| Success `200` | `{ data: { technicianId, event: BookingEvent } }` |
| Errors | `NOT_FOUND` · `409` technician inactive/wrong branch |

#### POST /bookings/:id/set-estimate
| | |
|---|---|
| Auth | ADMIN/MANAGER (`bookings`) |
| Body | `{ estimatedCost: int(min 0) }` — minor units |
| Success `200` | `{ data: { estimatedCost } }` + event (`toStatus` unchanged) |

#### POST /bookings/:id/cancel — admin
| | |
|---|---|
| Auth | ADMIN/MANAGER (`bookings`) |
| Body | `{ reason?: string }` |
| Success `200` | `{ data: { id, status: "CANCELLED" } }` |
| Errors | `409` not `PENDING`/`CONFIRMED` |
| Side effects | `BookingEvent` (`actorType: ADMIN`), email `booking_cancelled`, audit log |

#### advanceStage
See `POST /repairs/:bookingId/advance-stage` (§5.9) — the canonical stage-machine endpoint; same operation used from the booking detail UI.

### 5.9 Repairs — `/api/v1/repairs`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /repairs` | ADMIN/MANAGER (`repairs`) | `?branchId=&stage=&technicianId=&dateFrom=&dateTo=` | `{ data: [Booking]` (in pipeline: `repairStage != null`), `meta }` | — |
| `GET /repairs/:bookingId/transitions` | ADMIN/MANAGER (`repairs`) | — | `{ data: { current: "DIAGNOSING", allowed: ["WAITING_PARTS", "REPAIRING"] } }` | `NOT_FOUND` |
| `POST /repairs/:bookingId/advance-stage` | ADMIN/MANAGER (`repairs`) | `{ toStage: RepairStage, note?: string }` | `200 { data: { bookingId, status, repairStage, event } }` | `409` illegal transition |

Allowed transitions follow the `RepairStage` enum order (see [flows.md](flows.md) §2); any other move returns:

```json
{ "error": { "code": "CONFLICT", "message": "Illegal transition REPAIRING → DELIVERED",
             "details": { "from": "REPAIRING", "to": "DELIVERED", "allowed": ["WAITING_PARTS", "QUALITY_CHECK"] } } }
```

Each successful move writes a `BookingEvent` (`actorType: ADMIN`, `fromStatus`→`toStatus`), sends email `repair_stage_update`, and creates a `Notification` for the customer if logged-in.

### 5.10 Invoices — `/api/v1/invoices`

#### POST /invoices
| | |
|---|---|
| Auth | ADMIN/MANAGER (`invoices`) |
| Body | `{ bookingId: string }` |
| Success `200` | `{ data: Invoice }` |
| Errors | `NOT_FOUND` booking · `409` booking not `COMPLETED`/`READY_FOR_PICKUP` · `409` already invoiced |

Generation: `subtotal` = sum of `BookingService.quotedPrice`; `taxRateBps` from branch setting (default `1800`); `discount` from applied coupon/manual; `total = subtotal + taxAmount − discount`. `invoiceNo` = `INV-YYYYMMDD-0001` (per-day sequence). PDF rendered server-side, stored on Cloudinary → `pdfUrl`; email `invoice_ready`; event `actorType: ADMIN`.

```json
{
  "data": {
    "id": "clx-inv1", "invoiceNo": "INV-20260802-0001", "bookingId": "clx-bk1",
    "subtotal": 200000, "taxRateBps": 1800, "taxAmount": 36000, "discount": 0, "total": 236000,
    "status": "ISSUED", "pdfUrl": "https://res.cloudinary.com/mobilefix/raw/inv-20260802-0001.pdf",
    "issuedAt": "2026-08-02T10:00:00.000Z", "dueAt": "2026-08-16T00:00:00.000Z", "paidAt": null
  }
}
```

#### GET /invoices
| | |
|---|---|
| Auth | ADMIN/MANAGER (`invoices`) |
| Query | `?branchId=&status=<InvoiceStatus>&from=&to=&page=&pageSize=` |
| Success `200` | `{ data: [Invoice], meta }` |

#### GET /invoices/:id
| | |
|---|---|
| Auth | ADMIN/MANAGER (`invoices`) |
| Success `200` | `{ data: Invoice }` incl. `pdfUrl` (PDF served from Cloudinary, not the API) |
| Errors | `NOT_FOUND` |

#### POST /invoices/:id/mark-paid
| | |
|---|---|
| Auth | ADMIN/MANAGER (`invoices`) |
| Body | `{ paidAt?: string(datetime) }` |
| Success `200` | `{ data: { status: "PAID", paidAt } }` — also sets `Booking.paymentStatus = "PAID"` |
| Errors | `NOT_FOUND` · `409` already `PAID`/`VOID` |

#### POST /invoices/:id/void
| | |
|---|---|
| Auth | ADMIN/MANAGER (`invoices`) |
| Body | `{ reason?: string }` |
| Success `200` | `{ data: { status: "VOID" } }` |
| Errors | `409` only from `DRAFT`/`ISSUED` (a paid invoice cannot be voided — issue a credit/refund, Phase 2) |

### 5.11 Reviews — `/api/v1/reviews`

#### POST /reviews
| | |
|---|---|
| Auth | Customer · rate 5/hr |
| Body | `{ bookingId: string, rating: int(1..5), title?: string, body: string(min 1), images?: string[](max 3) }` |
| Success `201` | `{ data: { id, bookingId, rating, body, status: "PENDING", createdAt } }` |
| Errors | `AUTH_003` not your booking · `409` booking not `DELIVERED` · `409` booking already reviewed · `VAL_001` |

Verification: the booking must belong to the caller's `Customer`, have `status: "DELIVERED"` (review-request sent after delivery), and have no existing `Review` (`Review.bookingId` is unique). One review per booking.

#### GET /reviews — public
| | |
|---|---|
| Auth | Public |
| Query | `?branchId=&featured=&page=&pageSize=` |
| Success `200` | `{ data: [ { id, rating, title, body, images, branchId, adminReply, createdAt, customerName? } ], meta }` — **only `status: "APPROVED"`**; customer name masked to first name |

#### GET /reviews/admin
| | |
|---|---|
| Auth | ADMIN/MANAGER (`reviews`) |
| Query | `?status=<ReviewStatus>&branchId=&featured=&page=` |
| Success `200` | `{ data: [Review], meta }` — all statuses incl. `PENDING` queue |

#### Moderation
| Endpoint | Auth | Body | Success | Errors |
|---|---|---|---|---|
| `GET /reviews/admin/:id` | ADMIN/MANAGER | — | `{ data: Review }` | `NOT_FOUND` |
| `POST /reviews/:id/approve` | ADMIN/MANAGER | — | `{ data: { status: "APPROVED" } }` | `NOT_FOUND` · `409` already resolved |
| `POST /reviews/:id/reject` | ADMIN/MANAGER | `{ reason?: string }` | `{ data: { status: "REJECTED" } }` | `NOT_FOUND` |
| `POST /reviews/:id/reply` | ADMIN/MANAGER | `{ adminReply: string }` | `{ data: { adminReply, repliedById } }` | `NOT_FOUND` |
| `POST /reviews/:id/feature` | ADMIN/MANAGER | `{ featured: boolean }` | `{ data: { featured } }` | `NOT_FOUND` |

All moderation actions write an `AuditLog` row. Approving/rejecting does not change `Review.rating`/`body`.

### 5.12 Customers — admin `/api/v1/customers`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /customers` | ADMIN/MANAGER (`customers`) | `?search=&page=&pageSize=` (name/email/phone) | `{ data: [Customer], meta }` | — |
| `GET /customers/:id` | ADMIN/MANAGER | — | `{ data: { ...Customer, user: { email, name, phone }, bookings: [...], savedDevices: [...], addresses: [...] } }` | `NOT_FOUND` |
| `POST /customers` | ADMIN/MANAGER | `{ email, name, phone?, password? }` — creates `User` (role `CUSTOMER`) + `Customer`; if `password` omitted, temp password emailed (`welcome`) | `201` | `VAL_001` · `409` email taken |
| `PATCH /customers/:id` | ADMIN/MANAGER | `{ name?, phone?, defaultBranchId?, isActive? }` | `200` | `NOT_FOUND` |
| `POST /customers/:id/deactivate` | ADMIN | — | `204` — sets `User.isActive=false` (blocks login) | `NOT_FOUND` |

### 5.13 Technicians — admin `/api/v1/technicians`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /technicians` | ADMIN/MANAGER (`technicians`) | `?branchId=&isActive=` | `{ data: [Technician], meta }` | — |
| `GET /technicians/:id` | ADMIN/MANAGER | — | `{ data: Technician }` | `NOT_FOUND` |
| `POST /technicians` | ADMIN/MANAGER | `{ email, name, phone?, branchId, specialty?, skills?: string[], hourlyRate? }` — creates `User` (role `TECHNICIAN`) + `Technician`; passwordHash set to a random value (**no login in v1**) | `201` | `VAL_001` · `409` email taken |
| `PATCH /technicians/:id` | ADMIN/MANAGER | `{ name?, phone?, branchId?, specialty?, skills?, hourlyRate?, isActive? }` | `200` | `NOT_FOUND` |
| `POST /technicians/:id/deactivate` | ADMIN | — | `204` (`isActive=false`); **blocked while assigned to open repairs** | `NOT_FOUND` · `409` |

### 5.14 Coupons — admin `/api/v1/coupons`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /coupons` | ADMIN (`coupons`) | `?isActive=` | `{ data: [Coupon], meta }` | — |
| `POST /coupons` | ADMIN | `{ code, type: "PERCENT"\|"FIXED", value: int, minOrderAmount?, maxDiscount?, validFrom, validTo, usageLimit? }` | `201` | `VAL_001` · `409` code taken |
| `PATCH /coupons/:id` | ADMIN | any field above | `200` | `NOT_FOUND` |
| `POST /coupons/:id/toggle` | ADMIN | — | `{ data: { isActive } }` | `NOT_FOUND` |

`PERCENT` value `1..100`; `FIXED` value in minor units. `usedCount` increments on booking creation.

### 5.15 CMS — `/api/v1/cms`

#### Public read
| Endpoint | Auth | Success |
|---|---|---|
| `GET /cms/faqs` | Public | `{ data: [{ id, question, answer, category, sortOrder }] }` — `isActive` only |
| `GET /cms/gallery` | Public | `{ data: [{ id, title, imageUrl, sortOrder, branchId }] }` |
| `GET /cms/blog-posts` | Public | `{ data: [{ id, slug, title, excerpt, coverImage, tags, publishedAt }], meta }` — `status: "PUBLISHED"` only |
| `GET /cms/blog-posts/:slug` | Public | `{ data: BlogPost }` full `content` (markdown) + `seo` |
| `GET /cms/testimonials` | Public | `{ data: [{ id, customerName, rating, content, sortOrder }] }` |

#### Admin CRUD (ADMIN/MANAGER — `cms`)
| Endpoint | Body | Success | Errors |
|---|---|---|---|
| `POST /cms/faqs` | `{ question, answer, category?, sortOrder? }` | `201` | `VAL_001` |
| `PATCH /cms/faqs/:id` · `DELETE /cms/faqs/:id` | partial / — | `200` / `204` (soft) | `NOT_FOUND` |
| `POST /cms/gallery` | `{ title?, imageUrl, branchId?, sortOrder? }` | `201` | `VAL_001` |
| `PATCH /cms/gallery/:id` · `DELETE /cms/gallery/:id` | partial / — | `200` / `204` | `NOT_FOUND` |
| `POST /cms/blog-posts` | `{ slug, title, excerpt?, coverImage?, content, status: "DRAFT"\|"PUBLISHED", publishedAt?, tags?: string[], seo?: Json }` | `201` | `VAL_001` · `409` slug taken |
| `PATCH /cms/blog-posts/:id` · `DELETE /cms/blog-posts/:id` | partial / — | `200` / `204` | `NOT_FOUND` |
| `POST /cms/testimonials` | `{ customerName?, rating, content, isActive?, sortOrder? }` | `201` | `VAL_001` |
| `PATCH /cms/testimonials/:id` · `DELETE /cms/testimonials/:id` | partial / — | `200` / `204` | `NOT_FOUND` |

### 5.16 Settings & email templates — `/api/v1/settings`, `/api/v1/email-templates`

#### GET /settings
| | |
|---|---|
| Auth | ADMIN (`settings`) |
| Query | `?scope=GLOBAL\|BRANCH&branchId=` |
| Success `200` | `{ data: [{ key, value, scope, branchId }] }` — `value` is a JSON-encoded string (e.g. `"{\"rateBps\":1800}"` for `tax.rateBps`) |

#### PUT /settings
| | |
|---|---|
| Auth | ADMIN (`settings`) |
| Body | `{ key: string(dot.path), value: string(json), scope: "GLOBAL"\|"BRANCH", branchId?: string }` — upsert on unique `(key, scope, branchId)` |
| Success `200` | `{ data: Setting }` |
| Errors | `VAL_001` · `NOT_FOUND` branch |

Keys (examples): `branding.shopName`, `tax.rateBps`, `reviews.requestDelayDays`, `booking.warrantyText`, `business.currency`.

#### Email templates (ADMIN — `settings`)
| Endpoint | Success | Errors |
|---|---|---|
| `GET /email-templates` | `{ data: [{ key, subject, active }] }` | — |
| `GET /email-templates/:key` | `{ data: { key, subject, bodyHtml, bodyText, active } }` | `NOT_FOUND` |
| `PUT /email-templates/:key` — body `{ subject, bodyHtml, bodyText?, active? }` | `{ data: EmailTemplate }` | `NOT_FOUND` |

Template keys (fixed): `booking_confirmation · repair_stage_update · invoice_ready · review_request · welcome · email_verification · password_reset · booking_cancelled`.

### 5.17 Notifications — `/api/v1/notifications`

| Endpoint | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|
| `GET /notifications` | any logged-in | `?unreadOnly=&page=&pageSize=` | `{ data: [{ id, type, title, body, data, readAt, createdAt }], meta }` | — |
| `GET /notifications/unread-count` | any logged-in | — | `{ data: { count } }` | — |
| `POST /notifications/:id/read` | owner | — | `{ data: { readAt } }` | `NOT_FOUND` · `AUTH_003` not owner |
| `POST /notifications/read-all` | any logged-in | — | `{ data: { updated: n } }` | — |

`NotificationType`: `BOOKING · REPAIR · INVOICE · REVIEW · SYSTEM`.

### 5.18 Analytics — admin `/api/v1/analytics`

All endpoints: `ADMIN/MANAGER` (`analytics`), query `?branchId=&from=&to=` (defaults: last 30 days, all branches visible to role). Aggregates run over transactional tables (bookings, invoices, BookingService) — no denormalized counters.

#### GET /analytics/overview
```json
{
  "data": {
    "period": { "from": "2026-07-03", "to": "2026-08-02" },
    "bookings": { "total": 412, "pending": 18, "confirmed": 96, "cancelled": 22, "today": 9 },
    "activeRepairs": 41,
    "revenue": { "issued": 24000000, "collected": 19800000, "outstanding": 4200000 },
    "avgTurnaroundDays": 3.4,
    "stageFunnel": [
      { "stage": "DEVICE_RECEIVED", "count": 9 },
      { "stage": "DIAGNOSING", "count": 11 },
      { "stage": "REPAIRING", "count": 14 },
      { "stage": "QUALITY_CHECK", "count": 4 },
      { "stage": "READY_FOR_PICKUP", "count": 3 }
    ]
  }
}
```

#### GET /analytics/bookings
`{ data: { byDay: [{ date, total, confirmed, cancelled }], byStatus: [{ status, count }], byBranch: [{ branchId, count }] } }`

#### GET /analytics/revenue
`{ data: { byDay: [{ date, issued, collected }], byStatus: [{ status: InvoiceStatus, count, sum }] } }`

#### GET /analytics/services
`{ data: { top: [{ serviceId, slug, bookings, revenue }], byCategory: [{ category, bookings }] } }` — joined from `BookingService.quotedPrice` snapshots.

### 5.19 Audit log — `/api/v1/audit`

#### GET /audit
| | |
|---|---|
| Auth | ADMIN (`audit`) — read-only, immutable |
| Query | `?actorId=&action=&entityType=&branchId=&from=&to=&page=&pageSize=` |
| Success `200` | `{ data: [{ id, actorId, actorRole, action, entityType, entityId, changes, branchId, ip, createdAt }], meta }` |
| Note | `changes` is `{ before, after }`. No write endpoints — the log is append-only |

### 5.20 Upload — `/api/v1/upload/sign`

#### POST /upload/sign
| | |
|---|---|
| Auth | any logged-in (Customer or admin) · rate 30/10min |
| Body | `{ folder?: "booking-images"\|"review-images"\|"gallery"\|"cms", contentType?: "image/jpeg"\|"image/png"\|"image/webp" }` |
| Success `200` | `{ data: { uploadUrl, cloudName, apiKey, signature, timestamp, publicId, folder, expiresAt } }` |

```json
{
  "data": {
    "uploadUrl": "https://api.cloudinary.com/v1_1/mobilefix/auto/upload",
    "cloudName": "mobilefix", "apiKey": "79…", "signature": "f0e…", "timestamp": 1789999999,
    "publicId": "booking-images/clx-ab1", "folder": "booking-images", "expiresAt": 1789999999
  }
}
```

Flow: client uploads the file directly to `uploadUrl` with the signature (files never touch the API), Cloudinary returns `secure_url`, then the client attaches it via `POST /bookings/:id/images`, review `images`, or CMS `imageUrl`.

### 5.21 Health — `/api/v1/health`

#### GET /health
| | |
|---|---|
| Auth | Public |
| Success `200` | `{ "data": { "status": "ok", "version": "1.0.0", "db": "up", "uptime": 1234.5 } }` |
| Degraded | `503` when the DB ping fails |

---

## 6. Phase 2 (defined, not shipped)

- **Payments** — `Booking.paymentStatus` and `Invoice.status` (`UNPAID/PARTIAL/PAID/REFUNDED`) are pre-wired; **no checkout endpoints exist in v1**. Payment happens at the counter. Stripe checkout + webhooks land in Phase 2.
- **Technician login** — `UserRole.TECHNICIAN` and `Technician` records exist; there is **no `/auth` route or app for technicians in v1**. Technicians are admin-managed records.
- **Inventory** — `Part`, `PartStock`, `PurchaseOrder`, `Supplier`, `PartMovement` tables exist; no v1 endpoints expose them.

---

**Referenced by:** [architecture.md](architecture.md) §4–§5, [PRD.md](PRD.md) §5, [flows.md](flows.md), [memory.md](memory.md) reference index. **Depends on:** [prisma/schema.prisma](../prisma/schema.prisma) (contract), `packages/shared` zod schemas + `rbac.ts` capability map.
