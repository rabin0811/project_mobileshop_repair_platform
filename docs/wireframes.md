# Wireframes — MobileFix Pro

> ASCII layouts for the v1 surfaces: **customer site** (`apps/web`) and **admin panel** (`apps/admin`).
> These capture layout intent and states, not pixel specs — components and tokens are defined in
> [component-library.md](component-library.md) and [design.md](design.md). Every token below is
> referenced by name (`bg-surface`, `text-ink`, `border-line`, `bg-accent`, …); no raw values are
> invented here.
>
> **Scope guard:** v1 = customer site + admin. No technician login (`UserRole.TECHNICIAN` is a
> record, D-001). Payments are **deferred to Phase 2 (Stripe)** — frames note `P2` where a payment
> control is a placeholder. Amounts are `Int` minor units, rendered via `formatMoney` (D-005).
>
> **Entity shorthand:** `BookingStatus` PENDING/CONFIRMED/CANCELLED · `RepairStage`
> DEVICE_RECEIVED→DELIVERED · `ReviewStatus` PENDING/APPROVED/REJECTED · `PriceModel` FIXED/FROM/RANGE ·
> `ServicePrice(service, brand, model?)` matrix · refs `MF-YYYYMMDD-XXXXX` / `INV-YYYYMMDD-0001` ·
> `Branch.businessHours` JSON.

## Shells (shared chrome)

```
┌──────────────────────────────────────────────────────────┐
│ [logo] Home Services Track Branches                      │
│ [Book a repair]   ← sticky header                        │
├──────────────────────────────────────────────────────────┤
│            page content                                  │
└──────────────────────────────────────────────────────────┘

CUSTOMER SHELL: sticky header — logo left, nav center,
CTA right (design §8). Footer omitted from frames.

┌──────────────────────────────────────────────────────────┐
│ ┌──────────┐  Topbar: [Branch ▾] [🔔] [👤]               │
│ │logo      │  ───────────────────────────────────────────│
│ │Dashboard │                                             │
│ │Bookings  │                                             │
│ │Repairs   │                                             │
│ │Customers │                                             │
│ │Techs     │                                             │
│ │Invoices  │                                             │
│ │Reviews   │                                             │
│ │Catalog   │                                             │
│ │Branches  │                                             │
│ │Coupons   │                                             │
│ │CMS       │                                             │
│ │Settings  │                                             │
│ │Audit     │                                             │
│ └──────────┘                                             │
└──────────────────────────────────────────────────────────┘

ADMIN SHELL: sidebar fixed at lg, icon rail at md,
off-canvas below. Topbar holds the branch switcher,
notifications, avatar. Section B frames show only the
content area.
```

---

# A. Customer site (`apps/web`)

## W-01 · Home — hero

```
┌──────────────────────────────────────────────────────────┐
│  Display: Screen fixed in 45        │   [device image]   │
│  minutes, warranty included.        │   (R3F canvas,     │
│                                     │   lazy + static    │
│  Body: Real technicians. Honest     │   fallback)        │
│  prices. Pick a slot today.         │                    │
│                                     │                    │
│  [Book a repair →]  [Track my repair]                    │
│                                     │                    │
│  Trust strip: ★ 4.9 · 12,400        │                    │
│  repairs · 6-mo warranty · Same-day │                    │
└──────────────────────────────────────────────────────────┘
```
- 6/6 copy/image split (design §8); right side is the R3F hero (lazy `React.lazy` + `Suspense`, static-image fallback on slow devices).
- Primary CTA scrolls to the calculator (W-05); ghost secondary links to `/track`.
- Trust strip is data-driven (avg rating, repair count, warranty days) from settings, not hardcoded copy.
- Tokens: `display` type, `bg-canvas` page, primary `bg-accent`, ghost `border-line`.

## W-02 · Home — how it works (3-step)

```
  How it works
 ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
 │1. Choose device│ │2. Pick a slot  │ │3. Track live   │
 │Model → services│ │Free date & time│ │From intake to  │
 │→ instant price │ │per branch hours│ │delivery        │
 │[Smartphone ▾]  │ │[Wed 14:30]     │ │[MF-…-A1B2C]    │
 └────────────────┘ └────────────────┘ └────────────────┘
  3-up → 2-up → 1-up responsive
```
- Three `Card`s, each: icon chip, `h3` title, `body-sm` copy, an illustrative control.
- Non-interactive cards (no hover lift); a single CTA below links to the calculator.
- Tokens: `bg-surface` cards on `bg-canvas`, `text-ink` titles, `text-ink-muted` copy.

## W-03 · Services grid

```
  Services    [All] [Screen] [Battery] [Camera] [Water]
 ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
 │[image]        │ │[image]        │ │[image]        │
 │Screen         │ │Battery        │ │Charging       │
 │Repair         │ │Replacement    │ │Port Fix       │
 │from ₹1,499    │ │from ₹999      │ │from ₹799      │
 │45 min·6 mo    │ │30 min·6 mo    │ │60 min·3 mo    │
 │[Book]         │ │[Book]         │ │[Book]         │
 └───────────────┘ └───────────────┘ └───────────────┘
  3-up (lg) → 2-up (md) → 1-up (sm)
```
- Interactive cards: hover lift (`shadow-popover` + `translateY(-1px)`); whole card links to the service page, plus a `[Book]` button.
- Category chips (from `ServiceCategory`) filter client-side; list is TanStack Query cached.
- Price from `Service.startingPrice` as **from ₹X**, `mono`/tabular; `estTimeMin` + `warrantyDays` as caption meta.
- Tokens: `border-line`, `shadow-card`, `bg-raised`, `bg-accent` Book button.

## W-04 · Service detail page

```
┌──────────────────────────────────────────────────────────┐
│  Breadcrumbs: Services › Screen Repair                   │
│  h1: Screen Repair                       [image]         │
│  from ₹1,499 · 45 min · 6-month warranty                 │
│  What’s included: labor + premium part + warranty        │
│  Brands supported: [Apple] [Samsung] [OnePlus] [Xiaomi]  │
│  description prose (CMS `Service.description`)…          │
│  [Check price & book]       [Track a repair]             │
├──────────────────────────────────────────────────────────┤
│  [Get estimate & book — from ₹1,499]    ← sticky footer  │
└──────────────────────────────────────────────────────────┘
```
- Header meta from `Service` (`priceModel` → price display, `estTimeMin`, `warrantyDays`); brands = those with an active `ServicePrice` row for this service.
- Sticky footer CTA (design §8) shows the "from" price, hides once the calculator scrolls into view.
- "Check price & book" scrolls to the in-page calculator (W-05) prefilled with this service.
- `priceModel` RANGE → `₹X–₹Y`, FIXED → no "from".
- Tokens: `h1`, `caption` breadcrumbs, `mono` price, sticky bar `bg-raised` + `border-line` top.

## W-05 · Price calculator widget

```
┌──────────────────────────────────────────────────────────┐
│  Get an instant estimate                                 │
│  Brand  [Apple          ▾]   Model  [iPhone 15     ▾]    │
├──────────────────────────────────────────────────────────┤
│  Services                                                │
│  (x) Screen replacement                    ₹4,999        │
│  ( ) Battery replacement                   ₹2,499        │
│  ( ) Back glass replacement                ₹1,999        │
│  ( ) Charging port                         ₹1,299        │
├──────────────────────────────────────────────────────────┤
│  Estimated total                        ₹7,498  firm     │
│  [Book this repair →]                                    │
└──────────────────────────────────────────────────────────┘
```
- Cascading selects: brand → models filtered by `Brand.isActive`/`DeviceModel.isActive`; prices resolve from the `ServicePrice` matrix (exact model → brand default → `startingPrice` fallback).
- Checkboxes toggle `BookingService` rows; estimate posts to `POST /repair/estimate` (rate-limited) and renders via `QuoteEstimate` — `Skeleton` while loading, error copy when no matrix row.
- When any line is only a brand default, the total reads **from ₹X** instead of firm, per `PriceModel`.
- Tokens: inputs `border-line` + focus `accent`, selected rows `bg-accent-soft`, total `mono`/tabular `text-ink`.

## W-06 · Booking flow (Stepper: Model → Service → Slot → Confirm)

```
┌──────────────────────────────────────────────────────────┐
│  ① Model  →  ② Service  →  ③ Slot  →  ④ Confirm          │
│  (BookingStepper — current step highlighted)             │
├──────────────────────────────────────────────────────────┤
│  STEP 3 · Slot                      Branch [Main St ▾]   │
│  Date:  [11] [12] [13] [14]   (from branch hours)        │
│  Time:  ( ) 09:00  ( ) 09:30  ( ) 10:00  [x] 10:30       │
│         (x) 11:00  ( ) 11:30  (✕) 12:00  (✕) 12:30       │
│         (unavailable slots disabled, struck ✕)           │
│  Problem: [_______________________________________]      │
│  Photos (optional, up to 3): [Upload]  ┌──┐ ┌──┐ ┌──┐    │
│  (Cloudinary signed · max 5MB each)    └──┘ └──┘ └──┘    │
│                                          [Back][Next]    │
├──────────────────────────────────────────────────────────┤
│  STEP 4 · Confirm                                        │
│  Main Street · iPhone 15 · Screen ₹4,999                 │
│  Wed 13 Aug, 10:30 · Rakesh K. · r@example.com           │
│  Coupon [WELCOME ▾]   Estimated total  ₹7,498            │
│  [Confirm booking]   → MF-20260813-A1B2C + email         │
└──────────────────────────────────────────────────────────┘
```
- `BookingStepper` renders ①–④ (numbers + labels): current step `bg-accent`, completed steps check, pending `text-ink-muted`. Step 1 = brand/model pickers (W-05), Step 2 = service checkboxes + live estimate.
- Slot step: dates resolve from `Branch.businessHours` JSON in branch timezone; booked/elapsed slots disabled (`opacity-45%`, `✕`); API enforces no double-book on `(branchId, scheduledAt, timeSlot)`.
- Problem description optional textarea; photos via `ImageUploader` (Cloudinary signed — client gets a one-time signature, files never touch the API).
- Confirm submits with `Idempotency-Key` (no double-submit); success shows check-pop + `MF-YYYYMMDD-XXXXX` + "Track this repair". Payment is **at the counter (P2 Stripe)**.

## W-07 · Track page

```
┌──────────────────────────────────────────────────────────┐
│  Track my repair                                         │
│  Booking ref [MF-20260802-A1B2C]  [Track]                │
│  (guest, no login — ref is the only secret, D-006)       │
├──────────────────────────────────────────────────────────┤
│● DEVICE_RECEIVED ─● DIAGNOSING ─○ REPAIRING              │
│○ QUALITY_CHECK ○ COMPLETED ○ READY_FOR_PICKUP ○ DELIVERED│
│  Current: Diagnosing · ETA Thu 4 Aug                     │
│  Timeline (BookingEvent, newest first):                  │
│   02 Aug 16:05  Waiting for part        Admin note       │
│   02 Aug 14:30  → Diagnosing            Admin            │
│   02 Aug 10:12  → Device received       Front desk       │
├──────────────────────────────────────────────────────────┤
│  Need help?  [Call]  [WhatsApp]                          │
└──────────────────────────────────────────────────────────┘
```
- `StageTracker` horizontal stepper: completed = accent check, active = `accent` ring pulse, pending = line circle; connectors fill accent with `scaleX` 0→1 (300ms). Vertical variant on mobile.
- Semantics: `<ol>` with `aria-current="step"`; state never communicated by color alone.
- Timeline renders `BookingEvent` rows (actor, from→to, note, ts) in branch timezone; data from `GET /bookings/track/:ref`.
- Pending data shows `Skeleton`; cancelled/pickup states render `BookingStatus` copy. Tokens: `border-line` connectors, `bg-accent` active.

## W-08 · Review form (booking-verified)

```
┌──────────────────────────────────────────────────────────┐
│  Leave a review — Booking MF-20260802-A1B2C              │
│  How was your repair?                                    │
│        ★ ★ ★ ★ ☆       (tap to rate, 1–5)                │
│  Title   [___________________________________]           │
│  Review  [___________________________________]           │
│          [___________________________________]           │
│  Photos (up to 3): [Upload]  ┌──┐ ┌──┐ ┌──┐              │
│  [Submit review]                                         │
├──────────────────────────────────────────────────────────┤
│  · Booking-verified: reachable only after DELIVERED,     │
│    1 review per booking (Review.bookingId @unique)       │
│  · New reviews are PENDING until a moderator approves    │
└──────────────────────────────────────────────────────────┘
```
- Only a logged-in customer whose booking is DELIVERED for that email can submit (FR-REV-01); the ref arrives in the review-request email.
- `RatingStars` interactive: click + arrow keys/space; announces "Rated 4 of 5".
- Photos via `ImageUploader` (signed Cloudinary, up to 3). Submit writes `Review` `status=PENDING`.
- Tokens: `bg-surface` card, `accent` filled stars, helper `text-ink-muted` `body-sm`.

## W-09 · Reviews wall

```
  Reviews    ★ 4.9 average · 1,240 verified
 ┌────────────────────────────────────────────────────┐
 │★★★★★  "Screen replaced in 40 min, feels new."      │
 │ Rakesh K. · Main Street · Verified ✓  [featured ★] │
 │ [photo] [photo]                                    │
 └────────────────────────────────────────────────────┘
  (featured first, then newest APPROVED)
```
- Query filters `ReviewStatus.APPROVED` + branch; sort = `featured` desc, then `createdAt` desc (index `(status, featured)`).
- `ReviewCard`: stars, title/body, verified badge (links booking ref), branch, photos, `adminReply` when present.
- Summary strip (avg + count) computed from approved reviews only.
- Tokens: `bg-raised` cards + `border-line`, verified badge `accent-soft`/`accent`, `mono` refs.

## W-10 · Branches / contact

```
  Find us
 ┌───────────────────────┐ ┌───────────────────────┐
 │Main Street            │ │Park Avenue            │
 │12 Main Road, Pune     │ │44 Park Lane, Pune     │
 │Mon–Sat 09:00–19:00    │ │Mon–Fri 10:00–18:00    │
 │Sun    Closed          │ │Sat–Sun Closed         │
 │[Directions]           │ │[Directions]           │
 │[WhatsApp]             │ │[WhatsApp]             │
 └───────────────────────┘ └───────────────────────┘
  Hours table rendered from Branch.businessHours JSON
```
- `BranchCard` per active branch: address, contact, hours table built from `businessHours` JSON (`{"mon":["09:00","19:00"],…}`), `mapsUrl` link, WhatsApp button (`whatsapp` number).
- Times localized to `Branch.timezone`; list is a branch-scoped public read.
- Tokens: `bg-surface` cards, `caption` day labels, `bg-accent` Directions, ghost WhatsApp.

## W-11 · FAQ (accordion)

```
┌──────────────────────────────────────────────────────────┐
│  FAQ                                                     │
│  ▸ How long does a screen repair take?                   │
│    Most screens are done in ~45 minutes while you wait   │
│    (expanded — answer under the question)                │
│  ▸ Do I need an appointment?                             │
│  ▸ What warranty do you offer?                           │
│  ▸ Is my data safe during a repair?                      │
│  ▸ Do you repair out-of-warranty phones?                 │
└──────────────────────────────────────────────────────────┘
```
- `Accordion`, one item open at a time; chevron rotates 180°, panel animates height (Framer Motion; reduced-motion collapses to opacity).
- A11y: buttons `aria-expanded` + `aria-controls`, Enter/Space/arrows, focus-visible ring.
- Content from `Faq` rows (`isActive`, `sortOrder`). Tokens: `border-line` dividers, `h3` questions, `text-ink-muted` answers.

## W-12 · Blog — list & detail

```
  Blog                                  [search 🔍]
 ┌───────────────────────┐ ┌───────────────────────┐
 │[cover image]          │ │[cover image]          │
 │How to protect your    │ │Water damage: what     │
 │phone’s battery        │ │to do first            │
 │02 Aug 2026 · 4 min    │ │28 Jul 2026 · 6 min    │
 └───────────────────────┘ └───────────────────────┘
  detail: cover · title · author · date · markdown body
  (sanitized) · tags · related posts
```
- List shows `BlogPost.status=PUBLISHED` sorted by `publishedAt`; `coverImage` via Cloudinary `f_auto,q_auto`.
- Body is markdown rendered with `sanitize-html` (rules.md §6.7) — never raw innerHTML.
- Cards link to `/blog/:slug`; 2-up on lg, 1-up on mobile. Tokens: `bg-raised` cards, `caption` date meta.

## W-13 · 404

```
┌──────────────────────────────────────────────────────────┐
│                     4 0 4                                │
│          [broken phone illustration]                     │
│        "This page took a tumble."                        │
│    The page you’re looking for doesn’t exist.            │
│    [Back to home]       [Track a repair]                 │
└──────────────────────────────────────────────────────────┘
```
- `EmptyState` with Lucide illustration, `h1` copy, body hint, two CTAs; keeps header/footer chrome.
- Tokens: `bg-canvas`, primary `bg-accent` CTA, `text-ink-muted` hint.

---

# B. Admin panel (`apps/admin`)

> Every frame is the **content area** of the ADMIN SHELL (topbar + sidebar). All mutating actions are
> audit-logged (FR-ADMIN-02) and RBAC-gated (MANAGER has no Settings/Branches/Roles, FR-ADMIN-01).

## W-14 · Login

```

              ┌──────────────────────────────┐
              │[logo]                        │
              │Sign in to MobileFix Pro      │
              │Email    [____________]       │
              │Password [____________]       │
              │[Sign in]                     │
              │Forgot password?              │
              └──────────────────────────────┘

  centered card on bg-canvas · no admin shell chrome
```
- Standalone route (no shell); email+password → JWT access + rotating refresh (httpOnly cookie).
- Field errors: `danger` border + message, `aria-invalid`; rate-limited (10/15min/IP).
- Forgot password → OTP flow (`OtpPurpose.PASSWORD_RESET`) via email.

## W-15 · Dashboard

```
  Dashboard
 ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐
 │Bookings │ │Active    │ │Revenue    │ │Reviews    │
 │today    │ │repairs   │ │this month │ │avg 4.9    │
 │12  ▲ 2  │ │8   ▲ 1   │ │₹1,24,500  │ │▲ 0.1      │
 │vs. yest │ │vs. yest  │ │▲ 12%      │ │(n=1,240)  │
 └─────────┘ └──────────┘ └───────────┘ └───────────┘
 ┌───────────────────────┐ ┌───────────────────────┐
 │Bookings last 14d      │ │Stage funnel           │
 │[line/area chart]      │ │[bar per stage]        │
 └───────────────────────┘ └───────────────────────┘
 ┌────────────────────────────────────────────────┐
 │Top services                                    │
 │[horizontal bar chart]                          │
 └────────────────────────────────────────────────┘
```
- Four `StatTile`s: bookings today, active repairs (non-terminal stage), revenue this month, review count/avg. Values `mono`/tabular; delta up/down `success`/`danger`.
- Charts are Recharts (FR-ADMIN-04), lazy-loaded: bookings by day (14d), stage funnel counts per `RepairStage`, top services by booking count.
- All KPIs branch-scoped via the topbar `branchId` switcher; dates in branch tz.
- Tokens: tiles `bg-raised` + `border-line`, icon chips `bg-accent-soft`, chart accent `accent`.

## W-16 · Bookings list

```
  Bookings                           [+ New booking]
  Branch [All ▾]  Status [All ▾]  From [date]  To [date]
  Search [ref / customer / phone]              [Clear]
 │ REF             Customer Model    Slot  Status   │
 │ MF-260802-A1B2C Rakesh   iPhone15 10:00 CONFIRMED│
 │ MF-260802-C3D4E Priya    GalaxyS2 11:30 PENDING  │
 │ MF-260801-F5G6H Arun     Pixel 8  16:00 CANCELLED│
 └───────────────────────────────────────────────────┘
  ‹ 1 2 3 4 › · pageSize 25 · server pagination
```
- FilterBar = branch, `BookingStatus`, date range, text search; all map to query params; list endpoints paginate (cap 100).
- Row click → booking detail (W-17); `StatusPill`: PENDING `warning`, CONFIRMED `info`, CANCELLED `danger`.
- "+ New booking" opens the same intake form in walk-in mode (`isWalkIn=true`).
- Tokens: `Table` per design §6 (caption headers, `border-line` rows, `bg-surface` hover), status pills.

## W-17 · Booking detail / intake form

```
┌──────────────────────────────────────────────────────────┐
│  Booking MF-260802-A1B2C   Status: [CONFIRMED ▾]         │
│  Stage: — (not received)                   [Advance ▾]   │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────┬─────────────────────────┐ │
│ │ Brand/Model: iPhone 15     │ (x) Screen     ₹4,999   │ │
│ │ IMEI    [____________]     │ ( ) Battery     ₹2,499  │ │
│ │ Serial  [____________]     │ ─────────────────────── │ │
│ │ Password [__________] 🔒   │ Estimated total ₹7,498  │ │
│ │  Encrypted at rest         │ [Save estimate]         │ │
│ │ Photos [Upload] ┌──┐┌──┐   │                         │ │
│ ├────────────────────────────┼─────────────────────────┤ │
│ │ "Cracked glass, touch is   │ Branch [Main St ▾]      │ │
│ │  erratic."                 │ Technician [Arun ▾]     │ │
│ │ Notes [____________]       │                         │ │
│ └────────────────────────────┴─────────────────────────┘ │
│  Timeline: 10:02 PENDING→CONFIRMED · Admin (audited)     │
└──────────────────────────────────────────────────────────┘
```
- Intake form shared for walk-ins and online bookings; `devicePassword` written but **never returned** by the API (encrypted AES-256-GCM at rest).
- `estimatedCost` editable; chosen services write `BookingService.quotedPrice` snapshots (price history immutable).
- Stage advance lists only legal transitions (service-layer state machine); each move writes `BookingEvent` + audit + email (`repair_stage_update`).
- Technician dropdown is branch-filtered (`Technician.isActive`); photos via `ImageUploader`.
- Tokens: fields `border-line` + focus `accent`, 🔒 note `text-ink-muted` `caption`, primary/secondary buttons.

## W-18 · Stage pipeline view

```
  Repair pipeline                  Branch [All ▾]
 ┌────────────┐┌────────────┐┌────────────┐┌────────────┐
 │RECEIVED    ││DIAGNOSING  ││WAITING     ││REPAIRING   │
 │3           ││5           ││PARTS 2     ││4           │
 ├────────────┤├────────────┤├────────────┤├────────────┤
 │┌──────────┐││┌──────────┐││┌──────────┐││┌──────────┐│
 ││ MF-…A1B2 ││││ MF-…F5G6 ││││ MF-…X9Y1 ││││ MF-…C3D4 ││
 │└──────────┘││└──────────┘││└──────────┘││└──────────┘│
 └────────────┘└────────────┘└────────────┘└────────────┘
  (columns scroll; 8 stages · cards are mini bookings)
```
- Kanban columns per `RepairStage` (RECEIVED…DELIVERED); card = mini booking (ref, model, technician, time).
- Moving a card = stage advance → same state machine + audit as W-17; illegal moves rejected with an inline `Toast`/error.
- Columns overflow-x on narrow widths; drag-and-drop optional, dropdown fallback on touch.
- Tokens: column headers `accent-soft`/`accent` pills, cards `bg-raised` + `border-line`, empty column `EmptyState`.

## W-19 · Customers — list & detail

```
  Customers   [search name/email/phone]   [+ Customer]
 │ Name      Email         Phone Bookings Since    │
 │ Rakesh K. r@example.com 98…   4        12 Jan 26│
 │ Priya S.  p@example.com 91…   2        02 Mar 26│
 └──────────────────────────────────────────────────┘
  detail: profile · saved devices · addresses ·
  booking history (each row → booking detail)
```
- Detail tabs: Profile / Devices (`SavedDevice`) / Addresses / Bookings; bookings filtered by `customerId`.
- "+ Customer" creates `User`+`Customer`; email verification happens when the customer next signs in.
- Tokens: `Table`, `Avatar` in name cell, `StatusPill` for verified/unverified.

## W-20 · Technicians list

```
  Technicians                          [+ Technician]
 │ Name   Specialty Branch      Rate/hr Active Jobs│
 │ Arun   Screen    Main Street ₹450    ✓      12  │
 │ Beena  Battery   Park Avenue ₹420    ✓      7   │
 │ Chetan All       Main Street ₹500    ✓      9   │
 └──────────────────────────────────────────────────┘
  v1 = records only — no technician login (D-001)
```
- CRUD on `Technician` (branch, specialty, skills, `hourlyRate` minor units, `isActive`); feeds the assign dropdowns in W-17/W-18.
- Attendance/payroll rows exist in schema but are `P2` UI (stubbed, hidden).
- Tokens: `Table`, `Checkbox` toggles, `StatusPill` for active.

## W-21 · Invoices — list & detail

```
  Invoices  [Status ▾] [Branch ▾]       [+ New invoice]
 │ No              Booking    Total  Status│
 │ INV-260802-0001 MF-…-A1B2C ₹8,848 PAID  │
 │ INV-260802-0002 MF-…-C3D4E ₹5,905 ISSUED│
 └──────────────────────────────────────────┘
  detail:
  Invoice INV-260802-0001     [PDF] [Email customer]
  Screen replacement   ₹4,999.00
  Battery replacement  ₹2,499.00
  Subtotal             ₹7,498.00
  GST @ 18% (1800 bps)  ₹1,349.64
  Total                ₹8,847.64
  Status: ISSUED  →  [Mark paid]  [Void]
```
- Invoice generated from a COMPLETED/READY_FOR_PICKUP booking; line items from `BookingService.quotedPrice`.
- Totals: `subtotal + taxAmount(taxRateBps) − discount = total`; tax rate per branch; `InvoiceStatus` DRAFT/ISSUED/PAID/VOID.
- `[Mark paid]` writes `paidAt` + `paymentStatus=PAID` (P2 Stripe only adds `Payment` rows). PDF server-rendered, emailed via Resend + Cloudinary.
- Tokens: `mono`/tabular amounts, `success` PAID pill, `warning` ISSUED.

## W-22 · Reviews moderation queue

```
  Reviews  [Pending 3] [Approved 12] [Rejected 1]
 ┌──────────────────────────────────────────────────┐
 │★★★★☆  "Great service, screen done in 40 min."    │
 │ Rakesh K. · Main Street · Booking MF-…-A1B2C     │
 │ Verified ✓ · photos: [img][img]                  │
 │ [Approve] [Reject] [Reply…] [Feature ★]          │
 └──────────────────────────────────────────────────┘
  tab = ReviewStatus · badge shows booking-verified
```
- Queue lists by `ReviewStatus`; Approve/Reject flips status, Reply opens an inline textarea for `adminReply`, Feature toggles `featured` (homepage order).
- Verified badge derives from `Review.bookingId` → DELIVERED link (not user-asserted).
- All four actions audit-logged (`review.approve` etc.); rejected reviews hidden publicly.
- Tokens: `StatusPill` PENDING `warning`, APPROVED `success`, REJECTED `danger`.

## W-23 · Catalog editors (services + price matrix)

```
┌──────────────────────────────────────────────────────────┐
│  Catalog  [Services | Brands | Models | Prices]          │
│  ─ Services table ───────────────────────────────────────│
│  Name        Category      Est  Warr.  From      On      │
│  Screen      SCREEN        45m  6mo    ₹1,499    ✓       │
│  Battery     BATTERY       30m  6mo    ₹999      ✓       │
│  WaterDamage WATER_DAMAGE  3d   1mo    ₹2,999    ✗       │
│  [+ Add] [Edit] [Deactivate]  (active toggle)            │
│  ─ Price matrix grid editor ─────────────────────────────│
│           iPhone15  GalaxyS24  Pixel8  (brand def.)      │
│  Screen    ₹4,999    ₹3,499    ₹3,999  ₹4,200            │
│  Battery   ₹2,499    ₹1,999    ₹2,199  ₹2,300            │
│  Back glass ₹1,999   ₹1,599    ₹1,799  ₹1,800            │
│  (inline edit; blank cell falls back to brand row)       │
└──────────────────────────────────────────────────────────┘
```
- Services/Brands/Models are CRUD tables with `isActive` toggles + `sortOrder`.
- **Price matrix** edits `ServicePrice`: rows = services, columns = models, last column = brand default (`modelId: null`); blank cell falls back up the chain.
- Save writes many `ServicePrice` upserts in one transaction; every change audit-logged.
- Tokens: grid cells `bg-raised`, focus `accent`, editing cell `bg-accent-soft`.

## W-24 · Branches editor (business hours)

```
┌──────────────────────────────────────────────────────────┐
│  Branches  [Main Street ▾]             [+ New branch]    │
│  General: name · slug · address · city · state           │
│  Contact: phone · whatsapp · email · mapsUrl             │
│  Location: lat · lng · timezone [Asia/Kolkata ▾]         │
│  Business hours editor:                                  │
│    Day    Open    Close   Closed                         │
│    Mon  [09:00] [19:00]   ( )                            │
│    Tue  [09:00] [19:00]   ( )                            │
│    Wed  [09:00] [13:00]   (x) half-day                   │
│    Sun     —       —      (x) closed                     │
│    [Save]   (writes Branch.businessHours JSON)           │
└──────────────────────────────────────────────────────────┘
```
- Branch CRUD; hours editor is a friendly wrapper over the `businessHours` JSON (day rows: open/close + "Closed" toggle).
- `timezone` drives slot generation and local display; save validates open < close, 24h format.
- Branch-scoped settings (`Setting.scope=BRANCH`) hang off this detail page; MANAGER blocked.
- Tokens: inputs `border-line`, `caption` day labels, `success` save.

## W-25 · Coupons

```
  Coupons                           [+ Create coupon]
 │ Code    Type    Value Min    MaxDisc Valid  Used│
 │ WELCOME PERCENT 10%   —      ₹200    31-Dec 120 │
 │ FIXED5  FIXED   ₹500  ₹2,000 —       30-Sep 3   │
 └──────────────────────────────────────────────────┘
  create: code · PERCENT|FIXED · value · minOrder ·
  maxDiscount · validFrom/To · usageLimit
  site-wide in v1 (Coupon is not branch-scoped)
```
- CRUD on `Coupon`; `CouponType` PERCENT (1–100) or FIXED (minor units); `minOrderAmount`, `maxDiscount`, `usageLimit` optional.
- Code validated at booking confirm (there is no checkout — payments are P2).
- Tokens: `Table`, `mono` codes, `warning` pill for soon-expiring.

## W-26 · CMS (gallery / blog / FAQ / testimonials)

```
┌──────────────────────────────────────────────────────────┐
│  CMS  [Gallery | Blog | FAQ | Testimonials]              │
│  ─ FAQ ──────────────────────────────────────────────────│
│  Question                                 On   Sort      │
│  "How long does a screen repair take?"    ✓    1         │
│  "Do you offer same-day service?"         ✓    2         │
│  [+ Add] [Edit] [Reorder ↑↓] [Deactivate]                │
│  ─ Blog ─────────────────────────────────────────────────│
│  Title             Status      Published                 │
│  How to protect…   PUBLISHED   02 Aug 2026               │
│  Water damage…     DRAFT       —                         │
│  (markdown body · cover image · tags · seo JSON)         │
└──────────────────────────────────────────────────────────┘
```
- Tabs per content type; all rows CRUD with `isActive`/`sortOrder` (FAQ, Testimonials, Gallery) or `status` DRAFT|PUBLISHED (Blog).
- Blog body markdown, sanitized before public render; images via `ImageUploader` (signed Cloudinary).
- Tokens: `Table`, `StatusPill`, `ImageUploader` grid for gallery.

## W-27 · Settings

```
┌──────────────────────────────────────────────────────────┐
│  Settings  [Branding | Emails | Notifications | Staff]   │
│  ─ Branding (seed these before launch) ──────────────────│
│  Shop name    [{{SHOP_NAME}}        ]                    │
│  Tagline      [______________________]                   │
│  Phone / WhatsApp / Email [____________________]         │
│  Address / Maps URL [________________________]           │
│  Brand color  [#1A5CFF]  (swaps `accent` token)          │
│  ─ Email templates editor ───────────────────────────────│
│  Template [booking_confirmation ▾]   Active ✓            │
│  Subject  [Your repair is booked MF-…]                   │
│  Body     [ HTML editor (React Email) ]                  │
│  [Save] [Preview] [Send test]                            │
└──────────────────────────────────────────────────────────┘
```
- Branding persists to `Setting` keys (`branding.shopName`, …) scoped GLOBAL; placeholders must be seeded before any public deploy (memory.md — never render a `{{…}}`).
- Email editor targets `EmailTemplate` rows by key (booking_confirmation, repair_stage_update, invoice_ready, review_request, welcome, email_verification, password_reset, booking_cancelled); preview + send-test in dev.
- Staff tab manages `UserRole` (ADMIN/MANAGER); Notifications toggles in-app + email defaults.
- ADMIN-only (MANAGER blocked, FR-ADMIN-01). Tokens: fields `border-line`, `accent` save, `mono` keys.

## W-28 · Audit log

```
  Audit log  [Action ▾] [Actor ▾] [Date range] [Export]
 │ Time         Actor Action               Entity    │
 │ 02 Aug 14:30 Admin booking.stage.update MF-…-A1B2C│
 │                    diff: {→REPAIRING}             │
 │ 02 Aug 14:31 Admin invoice.create       INV-…-0001│
 │ 02 Aug 13:02 Admin review.approve       Review 88 │
 └────────────────────────────────────────────────────┘
  immutable — no edit, no delete (rules.md §6.1)
```
- Reads `AuditLog` (action, entityType/entityId, `changes` diff JSON, actor, ip, createdAt), filterable by action/actor/date/branch.
- Rows render diffs as `from→to` pairs; no delete/update routes exist. ADMIN-only.
- Export CSV (P1) hits the server-side query. Tokens: `Table`, `mono` ids/times, `caption` headers.

---

**Depends on:** design.md (tokens, layout, motion), component-library.md (component contracts), schema.prisma (entity/enum names), PRD.md (flows & acceptance criteria), memory.md (scope D-001/D-003, refs D-006).
