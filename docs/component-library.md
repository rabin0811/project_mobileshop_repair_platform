# Component Library — MobileFix Pro

> Canonical catalog for `packages/ui` (Storybook-ready), shared by `apps/web` (customer) and `apps/admin`.
> Every component cites [design.md](design.md) tokens by name — no invented colors, fonts, or values.
> Layout reference: [wireframes.md](wireframes.md). Visual direction: **minimal professional / light**.
>
> **Conventions**
> - **Tokens only.** Use `bg-surface`, `text-ink`, `border-line`, `bg-accent`, `bg-accent-soft`,
>   `success/warning/danger/info`, shadows `sm/card/popover`, radius `8/12/16/999px`, Inter, Lucide.
> - **Motion:** Framer Motion per design §7; the app root wraps `<MotionConfig reducedMotion="user">`
>   so all transforms collapse to opacity under `prefers-reduced-motion`. Never bypass it.
> - **A11y baseline:** visible focus ring (`2px accent/40, offset 2`), labels via `htmlFor`/`id`,
>   `aria-invalid` + `aria-describedby` on errors, status never color-only, target size ≥ 44px.
> - **Money:** props are `Int` minor units, rendered via `formatMoney()` (packages/shared, D-005).
> - **Ownership tags:** `SHARED` / `CUSTOMER` (apps/web) / `ADMIN` (apps/admin). New primitives belong
>   in this library, not in a feature slice (rules.md §5.2).

---

## 1. Foundation (tokens recap)

| Group | Tokens |
|---|---|
| Color | `bg-canvas #FFFFFF` · `bg-surface #F7F7F8` · `bg-raised #FFFFFF` · `ink #111111` · `ink-muted #6B7280` · `line #E5E5E7` · `accent #1A5CFF` · `accent-hover #0F4AD9` · `accent-soft #EDF2FF` · `success #16A34A` · `warning #F59E0B` · `danger #DC2626` · `info #0891B2` |
| Type | `display` clamp(2.25,5vw,3.5rem)/700 · `h1` 1.75rem/700 · `h2` 1.375rem/650 · `h3` 1.125rem/600 · `body` 1rem/400 · `body-sm` .875rem/400 · `caption` .75rem/500/uppercase/.06em · `mono` .875rem/500 + tabular-nums |
| Spacing | 4px scale: 0,4,8,12,16,24,32,48,64,96. Section `py-24`, card `p-6`, gap `gap-4` |
| Radius | buttons/inputs 8px · cards 12px · modals 16px · pills 999px |
| Shadow | `sm` `0 1px 2px rgba(17,17,17,.06)` · `card` `0 1px 3px rgba(17,17,17,.08), 0 4px 16px rgba(17,17,17,.05)` · `popover` `0 8px 24px rgba(17,17,17,.12)` |
| Icons | Lucide React, stroke 1.75, 20px default, `size` prop; decorative → `aria-hidden`, meaningful → `aria-label` |
| Motion | page 240ms fade+8px rise · stepper 300ms · modal 180ms · drawer 260ms · hover 150ms · skeleton shimmer 1.2s |

---

## 2. Primitives (SHARED — `packages/ui`)

### Button

**Purpose:** trigger an action — book, submit, advance stage, save.
| Prop | Type | Default |
|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `isLoading` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `asChild` | `boolean` | `false` (render as child element for link-CTAs) |

- **Variants:** primary `bg-accent`/white · secondary `bg-surface`/ink + `border-line` · ghost transparent, hover `bg-surface` · danger `bg-danger`/white.
- **Visual:** radius 8px; `sm h-8 px-3` · `md h-10 px-4` · `lg h-12 px-6`; tabular text.
- **States:** default → hover (`accent-hover`; secondary/ghost `shadow-sm`) → active `scale(0.98)` (150ms) → focus ring `2px accent/40 offset 2` → disabled `opacity-45` + `pointer-events-none` → loading: inline spinner swaps the label (`aria-busy`).
- **A11y:** native `<button type>` or `asChild` onto an `<a>`; focus-visible ring; never disable + hide state without a reason.
- **Usage:** `<Button variant="secondary" size="lg" onClick={…}>Track my repair</Button>`

### Input

**Purpose:** single-line text/number entry (ref, price, phone, search).
| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `helper` | `string?` | — (caption under field) |
| `error` | `string?` | — (danger message, overrides helper) |
| `type` | `string` | `'text'` |
| `prefix`/`suffix` | `ReactNode?` | — (e.g. `₹`, `🔍`, `[Search]`) |

- **Visual:** field `bg-raised`, 1px `border-line`, radius 8px, `body` text; label `body-sm`/`ink` above, helper/error `caption`.
- **States:** focus `2px accent` border + soft ring (`shadow-[0_0_0_4px] accent/15`) · error `border-danger` + `text-danger` message · disabled `opacity-45` · target height ≥ 44px.
- **A11y:** label `htmlFor`/`id`; `aria-invalid` + `aria-describedby` when error; `mono` for ref/IMEI inputs.
- **Usage:** `<Input label="Booking ref" value={ref} onChange={…} placeholder="MF-YYYYMMDD-XXXXX" />`

### Select

**Purpose:** single-choice dropdown — brand, model, branch, status, technician.
| Prop | Type | Default |
|---|---|---|
| `options` | `{ value: string; label: string }[]` | — |
| `placeholder` | `string?` | — |
| `label` / `helper` / `error` | `string?` | — |

- Wraps a native `<select>` (reliable a11y) or headless-combobox; same field tokens/radius/states as Input.
- **States:** default/hover/focus/disabled identical to Input; opens `popover` shadow panel when custom.
- **A11y:** label associated; `aria-invalid`; keyboard arrows; options visible in text (no icon-only status).
- **Usage:** `<Select label="Brand" options={brands} value={brandId} onChange={…} />`

### Textarea

**Purpose:** multi-line text — problem description, notes, review body.
- **Props:** `label`, `helper`, `error`, `rows` (default 3), `maxLength`.
- Same field tokens as Input (radius 8px, `border-line`, focus `accent`); resize `none` in forms, `vertical` in CMS.
- **States:** as Input; character count `caption` right-aligned when `maxLength` set.
- **A11y:** label associated, `aria-invalid`/`aria-describedby`.
- **Usage:** `<Textarea label="Describe the problem" rows={3} maxLength={500} />`

### Checkbox

**Purpose:** multi-select — service list, settings toggles, "closed" flag.
| Prop | Type | Default |
|---|---|---|
| `checked` | `boolean` | `false` |
| `indeterminate` | `boolean` | `false` |
| `label` | `ReactNode` | — |
| `disabled` | `boolean` | `false` |

- **Visual:** 16px box, `border-line`, radius 6px; checked `bg-accent` + white check; row uses `bg-accent-soft` when selected.
- **States:** hover `border-accent` · focus ring `2px accent/40` · disabled `opacity-45`.
- **A11y:** real `<input type="checkbox">` with visible label; `aria-checked` on custom render.
- **Usage:** `<Checkbox checked={sel} onChange={…} label="Screen replacement — ₹4,999" />`

### Radio

**Purpose:** single-choice from a group — time slot, branch, service tier.
| Prop | Type | Default |
|---|---|---|
| `name` | `string` | required |
| `value` | `string` | — |
| `checked` / `disabled` | `boolean` | `false` |

- 16px circle, `border-line`; selected `bg-accent` dot; focus ring; disabled `opacity-45`.
- Group in a `<fieldset>` with `<legend>` (a11y); label wraps the control (44px target).
- **Usage:** `<Radio name="slot" value="10:00" checked={slot==='10:00'} />` inside a legend'd fieldset.

### Badge / StatusPill

**Purpose:** status/lifecycle labels — `BookingStatus`, `RepairStage`, `ReviewStatus`, feature flags.
| Prop | Type | Default |
|---|---|---|
| `tone` | `'accent' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | `'neutral'` |
| `dot` | `boolean` | `true` (6px dot) |
| `children` | `ReactNode` | — |

- **Visual:** radius 6px (999px pill in tight rows), 6px dot + `caption` text; `accent` → `bg-accent-soft`/`accent`; status tones map to their tokens (PENDING `warning`, CONFIRMED `info`, APPROVED/PAID `success`, CANCELLED/REJECTED `danger`).
- **States:** static (no hover).
- **A11y:** text label always present — never color-only (design §9).
- **Usage:** `<StatusPill tone="success">DELIVERED</StatusPill>`

### Card

**Purpose:** content container — service, review, branch, intake sections.
| Prop | Type | Default |
|---|---|---|
| `interactive` | `boolean` | `false` |
| `padding` | `'none' \| 'md' \| 'lg'` | `'lg'` (`p-6`) |
| `as` | `'div' \| 'a' \| 'button'` | `'div'` |

- **Visual:** `bg-raised`, 1px `border-line`, radius 12px, `shadow-card`, `p-6`.
- **States:** interactive only → hover `shadow-popover` + `translateY(-1px)` (150ms), focus ring.
- **A11y:** interactive cards render a real link/button; one focusable target per card.
- **Usage:** `<Card interactive as="a" href={/services/${slug}}>…</Card>`

### Table

**Purpose:** tabular data — bookings, customers, technicians, invoices, audit log.
| Prop | Type | Default |
|---|---|---|
| `columns` | `{ key; header; align?; width? }[]` | — |
| `rows` | `Row[]` (value or render cell) | — |
| `rowKey` | `string` | `'id'` |
| `onRowClick` | `(row) => void?` | — |

- **Visual:** header row `caption` uppercase `text-ink-muted`; 1px `border-line` dividers; row hover `bg-surface`; numeric/amount columns right-aligned + `mono`/tabular (design §6, §3).
- **States:** hover row highlight; selected row `bg-accent-soft`; loading shows `Skeleton` rows; empty → `EmptyState`.
- **A11y:** semantic `<table>`/`<th scope="col">`; caption when useful; keyboard focus on clickable rows.
- **Usage:** `<Table columns={cols} rows={bookings} onRowClick={openBooking} />`

### Modal

**Purpose:** focused task with backdrop — confirm booking, invoice detail, delete confirm.
| Prop | Type | Default |
|---|---|---|
| `open` | `boolean` | — |
| `title` | `ReactNode` | — |
| `footer` | `ReactNode?` | — |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `onClose` | `() => void` | — |

- **Visual:** radius 16px, `shadow-popover`, backdrop `rgba(17,17,17,0.4)` + `blur-sm`; centered, `max-h` scroll.
- **States/Motion:** enter 180ms opacity + `scale 0.98→1`; exit 160ms (design §7); Esc + click-outside close.
- **A11y:** `role="dialog"` + `aria-modal` + labelled by title; focus trap; focus restored to trigger on close.
- **Usage:** `<Modal open={confirming} title="Confirm booking?" footer={<><Button ghost>Cancel</Button><Button>Confirm</Button></>}>…</Modal>`

### Drawer

**Purpose:** side panel for secondary detail — booking intake, filter panel, mobile nav.
| Prop | Type | Default |
|---|---|---|
| `open` / `onClose` | `boolean` / `() => void` | — |
| `side` | `'left' \| 'right'` | `'right'` |
| `title` | `ReactNode?` | — |

- **Visual:** `bg-raised`, radius 16px on the open side, `shadow-popover`, backdrop `rgba(17,17,17,0.4)` + blur-sm.
- **Motion:** slide 260ms (design §7); Esc/backdrop close; focus trap + restore.
- **Usage:** `<Drawer open={intakeOpen} side="right" title="Device intake">…</Drawer>`

### Tooltip

**Purpose:** explain an icon-only control (verified badge, 🔒 note, delta icon).
- **Props:** `label`, `side` (`'top'|'bottom'`), `children`.
- **Visual:** `bg-ink` text-white caption pill, `shadow-popover`, radius 6px; 200ms fade.
- **A11y:** trigger `aria-describedby`; keyboard focus shows tooltip; never the sole source of meaning.
- **Usage:** `<Tooltip label="Encrypted at rest"><Lock className="w-4 h-4" /></Tooltip>`

### Tabs

**Purpose:** switch views — customer detail, catalog sections, CMS content types, settings.
| Prop | Type | Default |
|---|---|---|
| `tabs` | `{ key; label; count? }[]` | — |
| `active` / `onChange` | `string` / `(k) => void` | — |

- **Visual:** underline `accent` on active tab; inactive `text-ink-muted`; optional count pill (PENDING reviews etc.).
- **Motion:** 160ms crossfade of panel content.
- **A11y:** `role="tablist/tab/tabpanel"`, `aria-selected`, arrow-key navigation, `aria-controls`.
- **Usage:** `<Tabs tabs={[{key:'services'},{key:'prices'}]} active={tab} onChange={setTab} />`

### Accordion

**Purpose:** collapsible sections — FAQ, invoice breakdown, settings groups.
| Prop | Type | Default |
|---|---|---|
| `items` | `{ id; title; content }[]` | — |
| `multiple` | `boolean` | `false` |

- **Visual:** 1px `border-line` dividers; chevron rotates 180°; panel height animates (reduced-motion → opacity).
- **A11y:** buttons `aria-expanded` + `aria-controls`; Enter/Space/arrows; focus ring.
- **Usage:** `<Accordion items={faqs} />`

### Avatar

**Purpose:** person identity — admin topbar, technician assign, review cards, customer rows.
| Prop | Type | Default |
|---|---|---|
| `src` | `string?` | — |
| `name` | `string` | — (initials fallback) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |

- **Visual:** circle; fallback `bg-accent-soft` + `accent` initials (`caption`/`body-sm`); no ring unless admin online state.
- **A11y:** `alt`/`aria-label` = name.
- **Usage:** `<Avatar name="Rakesh K." src={user.avatarUrl} size="sm" />`

### Pagination

**Purpose:** paged list navigation — all admin lists, reviews wall.
| Prop | Type | Default |
|---|---|---|
| `page` / `pageSize` / `total` | `number` | `1` / `25` / `0` |
| `onChange` | `(page) => void` | — |

- **Visual:** prev/next ghost buttons + numbered pages; current page `bg-accent`/white; `mono` numerals.
- **A11y:** `aria-current="page"`; buttons labelled Prev/Next; server-driven (pageSize cap 100, rules §3.6).
- **Usage:** `<Pagination page={page} pageSize={25} total={120} onChange={setPage} />`

### Dropdown

**Purpose:** action/menu trigger — row actions, branch switcher, "more" menu.
| Prop | Type | Default |
|---|---|---|
| `trigger` | `ReactNode` | — |
| `items` | `{ key; label; danger?; onClick }[]` | — |
| `align` | `'start' \| 'end'` | `'end'` |

- **Visual:** `bg-raised` menu, `shadow-popover`, radius 8px, item hover `bg-surface`, danger items `text-danger`.
- **Motion:** 160ms fade + 4px rise; Esc/outside close.
- **A11y:** trigger `aria-haspopup="menu"` + `aria-expanded`; `role="menu"/"menuitem"`; arrow keys; focus returns to trigger.
- **Usage:** `<Dropdown trigger={<MoreHorizontal/>} items={[{key:'advance',label:'Advance stage'}]} />`

### Dialog (confirm)

**Purpose:** destructive/irreversible confirmation — cancel booking, reject review, void invoice.
| Prop | Type | Default |
|---|---|---|
| `open` / `onClose` | `boolean` / `() => void` | — |
| `title` / `body` | `ReactNode` | — |
| `confirmLabel` | `string` | `'Confirm'` |
| `tone` | `'danger' \| 'accent'` | `'danger'` |
| `onConfirm` | `() => void` | — |

- Uses `Modal` chrome (radius 16px, `shadow-popover`, backdrop); confirm button `danger` for destructive.
- **A11y:** `role="alertdialog"`; focus trap; Esc cancels; confirm requires deliberate click.
- **Usage:** `<Dialog open={cancel} title="Cancel this booking?" body="The slot will be freed for other customers." onConfirm={doCancel} />`

---

## 3. Domain components

### BookingStepper — CUSTOMER

**Purpose:** 4-step booking progress — Model → Service → Slot → Confirm (W-06).
| Prop | Type | Default |
|---|---|---|
| `steps` | `['model','service','slot','confirm']` | — |
| `current` | `string` | — |
| `onStep` | `(k) => void?` | — (jump to completed steps) |

- **Visual:** numbers in circles + labels; current `bg-accent`/white, completed `bg-accent-soft` + check, pending `text-ink-muted` `border-line`; connectors fill accent (300ms `scaleX`).
- **A11y:** `<ol>` + `aria-current="step"`; step buttons keyboard-navigable.
- **Usage:** `<BookingStepper steps={STEPS} current={step} onStep={goTo} />`

### StageTracker — SHARED (track page + admin pipeline)

**Purpose:** render `RepairStage` progress DEVICE_RECEIVED→DELIVERED (W-07, W-18).
| Prop | Type | Default |
|---|---|---|
| `stages` | `RepairStage[]` | full enum order |
| `current` | `RepairStage?` | — |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` (vertical on mobile) |
| `onAdvance?` | `(stage) => void` | admin only |

- **Visual:** completed = `accent` check (dot 6px), active = `accent` ring pulse, pending = `border-line` circle; connector `border-line`→`bg-accent`.
- **Motion:** connector `scaleX` 0→1 300ms; check `pathLength` draw (design §7).
- **A11y:** `<ol>` + `aria-current="step"`; `aria-label` on each stage; status text alongside (never color-only).
- **Usage:** `<StageTracker stages={STAGES} current={b.repairStage} orientation={mobile ? 'vertical' : 'horizontal'} />`

### PriceCard — CUSTOMER

**Purpose:** price presentation honouring `PriceModel` (FIXED/FROM/RANGE) — service page, calculator, booking summary.
| Prop | Type | Default |
|---|---|---|
| `model` | `PriceModel` | `'FROM'` |
| `price` | `number` (minor units) | — |
| `rangeEnd?` | `number?` | — |
| `tone?` | `'accent'` | — |

- **Visual:** `mono`/tabular price (`₹7,498`); prefix "from"/"–" per model; `text-ink` on `bg-surface` chip.
- **A11y:** full text "from ₹4,999" — not just the number.
- **Usage:** `<PriceCard model={svc.priceModel} price={svc.startingPrice} />`

### ServiceCard — CUSTOMER

**Purpose:** service tile on the grid (W-03): image, name, short description, `from ₹X`, est time, warranty, CTA.
| Prop | Type | Default |
|---|---|---|
| `service` | `Service` | — |
| `onBook` | `() => void` | — |

- **Visual:** `Card interactive`, image (Cloudinary `f_auto,q_auto`), `h3` title, `caption` meta (`45 min · 6 mo`), `PriceCard`, primary Book button.
- **States:** hover lift `shadow-popover` + `translateY(-1px)`.
- **Usage:** `<ServiceCard service={svc} onBook={() => startBooking(svc)} />`

### ReviewCard — CUSTOMER

**Purpose:** approved review on the wall + admin queue (W-09, W-22).
| Prop | Type | Default |
|---|---|---|
| `review` | `Review` | — |
| `verified` | `boolean` | — |
| `onModerate?` | `(action) => void` | admin only |

- **Visual:** `Card`, `RatingStars` static, title/body, photos (3 thumbnails), verified badge `accent-soft`/`accent`, branch, `adminReply` block, featured star when `featured`.
- **Usage:** `<ReviewCard review={r} verified={isVerified(r)} />`

### RatingStars — SHARED (customer forms + wall; admin queue)

**Purpose:** 1–5 star rating, static or interactive.
| Prop | Type | Default |
|---|---|---|
| `value` | `number` (1–5) | — |
| `onChange?` | `(n) => void` | static if omitted |
| `size` | `'sm' \| 'md'` | `'md'` |

- **Visual:** Lucide `Star` filled `accent` for active rating; empty `border-line` stroke.
- **A11y:** interactive = radio-group semantics or buttons; `aria-label` "Rated 4 of 5".
- **Usage:** `<RatingStars value={4} onChange={setRating} />`

### StatTile — ADMIN

**Purpose:** dashboard KPI tile (W-15): bookings today, active repairs, revenue month, review avg.
| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `value` | `string` | — (already formatted) |
| `delta?` | `{ value: string; dir: 'up'\|'down'\|'flat' }` | — |
| `icon` | `LucideIcon` | — |

- **Visual:** `bg-raised` + `border-line`, icon chip `bg-accent-soft`/`accent`, value `mono`/tabular, delta `success`/`danger`.
- **Usage:** `<StatTile label="Bookings today" value="12" delta={{ value:'+2 vs yest', dir:'up' }} icon={CalendarDays} />`

### FilterBar — ADMIN

**Purpose:** list filtering — branch, status, date range, search (W-16).
| Prop | Type | Default |
|---|---|---|
| `filters` | `Filter[]` (keyed controls) | — |
| `search?` | `{ placeholder; value; onChange }` | — |
| `onClear` | `() => void` | — |
| `onApply` | `(state) => void` | — |

- Wraps `Select`/`Input`/`DateRange` in an inline `gap-4` bar; applied via query params; `[Clear]` resets to defaults.
- **Usage:** `<FilterBar filters={filters} search={{…}} onApply={run} onClear={clear} />`

### BranchCard — CUSTOMER

**Purpose:** branch/contact tile (W-10): address, hours table, maps, WhatsApp.
| Prop | Type | Default |
|---|---|---|
| `branch` | `Branch` | — |
| `hours` | `businessHours` JSON | — |

- Hours table derived from `businessHours` JSON keys (mon–sun) in branch timezone; `[Directions]` → `mapsUrl`, WhatsApp button → `wa.me/<whatsapp>`.
- **Visual:** `bg-surface` card, `caption` day labels, `mono`-free times, `bg-accent` Directions + ghost WhatsApp.
- **Usage:** `<BranchCard branch={b} hours={b.businessHours} />`

### ImageUploader — SHARED (booking photos, intake, reviews, CMS gallery)

**Purpose:** multi-image upload via **Cloudinary signed upload** (architecture §5.6, rules §6.6).
| Prop | Type | Default |
|---|---|---|
| `max` | `number` | `3` |
| `maxBytes` | `number` | `5 * 1024 * 1024` |
| `accept` | `string` | `'image/*'` |
| `value` / `onChange` | `string[]` / `(urls) => void` | — |
| `folder?` | `string` | `'bookings'` |

- Flow: client `POST /upload/sign` → one-time constrained signature → direct upload to Cloudinary → URL stored on the model (`Booking.images`, `Review.images`). Files never touch the API.
- **States:** idle → uploading (per-image progress) → success (thumbnails + remove ✕) → error (`danger` text, size/type violation) → `max` reached (picker disabled).
- **A11y:** button labelled "Upload"; removal buttons `aria-label`; thumbnails `alt`.
- **Usage:** `<ImageUploader max={3} value={images} onChange={setImages} />`

### BookingSummaryCard — SHARED (booking confirm + admin detail)

**Purpose:** one-glance booking summary (W-06 step 4, W-17).
| Prop | Type | Default |
|---|---|---|
| `booking` | `Booking` | — |
| `services` | `BookingService[]` | — |
| `coupon?` | `Coupon?` | — |
| `showActions?` | `boolean` | `false` |

- Shows `bookingRef` (`mono`), branch, model, service lines with `quotedPrice`, estimated total (`mono`/tabular), deposit (P2), cancel/confirm actions per status.
- **Usage:** `<BookingSummaryCard booking={b} services={b.services} />`

### InvoiceTable — ADMIN

**Purpose:** invoice line items + tax + totals (W-21).
| Prop | Type | Default |
|---|---|---|
| `items` | `{ name; amount }[]` | — |
| `taxRateBps` | `number` | `1800` |
| `discount` | `number` | `0` |
| `status` | `InvoiceStatus` | — |
| `onMarkPaid?` | `() => void` | — |

- Computes `subtotal + tax − discount = total` from minor units; all amounts `mono`/tabular; `StatusPill` for DRAFT/ISSUED/PAID/VOID; `[Mark paid]` / `[Void]` actions.
- **Usage:** `<InvoiceTable items={lines} taxRateBps={inv.taxRateBps} total={inv.total} />`

### QuoteEstimate — CUSTOMER

**Purpose:** live estimate from `POST /repair/estimate` (W-05).
| Prop | Type | Default |
|---|---|---|
| `params` | `{ brandId; modelId; serviceIds }` | — |
| `onBook` | `(estimate) => void` | — |

- **States:** loading `Skeleton` rows → firm estimate (`PriceCard`) or **from ₹X** when only brand-default prices resolve → error copy + retry when no matrix row (`EmptyState`).
- Rate-limited (60/10min) — show retry, never hammer.
- **Usage:** `<QuoteEstimate params={sel} onBook={startConfirm} />`

---

## 4. Layout

### Container — SHARED
`max-w-7xl` centered, `px-4 sm:px-6 lg:px-8`. **Usage:** `<Container>…</Container>`

### SiteHeader — CUSTOMER
Sticky top bar: `[logo]` left, nav center, `[Book a repair]` right (design §8). On scroll → `bg-canvas/90` + `backdrop-blur` + 1px `border-line`. Mobile: nav collapses into a `Drawer`. A11y: `aria-current` on active nav link; skip-link target.
**Usage:** `<SiteHeader nav={nav} />`

### SiteFooter — CUSTOMER
Brand block, contact, hours summary, links, `{{REG_NO}}`/legal. `bg-surface`, `caption` labels.
**Usage:** `<SiteFooter />`

### StickyFooterCTA — CUSTOMER
Service-page bottom bar: `bg-raised` + `border-line` top, "Get estimate & book — from ₹X" primary CTA; hides when the calculator section is in view (scroll observer).
**Usage:** `<StickyFooterCTA service={svc} onBook={…} />`

### AdminShell — ADMIN
Fixed `lg` sidebar (icon rail at `md`, off-canvas below) + topbar (branch switcher, notifications, avatar). Route-level crossfade 160ms (design §7). RBAC hides MANAGER-forbidden routes. `aria-label` on nav; focus management on mobile open/close.
**Usage:** `<AdminShell route={…}>{content}</AdminShell>`

### PageHeader — SHARED
Page title (`h1`) + actions row (e.g. `[+ New booking]`) + optional description; used on all list/detail pages.
**Usage:** `<PageHeader title="Bookings" action={<Button>New booking</Button>} />`

### Breadcrumbs — SHARED
`caption`/uppercase trail (Services › Screen Repair). `aria-label="Breadcrumb"`, `aria-current="page"` on the last item.
**Usage:** `<Breadcrumbs items={[{label:'Services',to:'/services'},{label:'Screen Repair'}]} />`

---

## 5. Feedback

### Toast — SHARED
Transient result messages — booking confirmed, stage advanced, invoice emailed, errors.
| Prop | Type | Default |
|---|---|---|
| `tone` | `'success' \| 'error' \| 'info'` | `'info'` |
| `duration` | `number?` | 4000ms (error sticky) |

- Slide-up 240ms (design §7); stack top-right (top-center on mobile); success shows check draw + pop.
- **A11y:** container `aria-live="polite"`; error toasts `role="alert"`; dismiss button.
- **Usage:** `toast.success('Booking confirmed')`

### Skeleton — SHARED
Async placeholder, **not a spinner** (design §7): `bg-surface` shimmer 1.2s; block per layout (row/card/chart).
**Usage:** `<Skeleton variant="card" />`

### EmptyState — SHARED
Empty/zero lists (every list needs one, design §6): Lucide illustration, `h3` title, `body-sm` hint, optional CTA. Also the 404 page (W-13).
**Usage:** `<EmptyState icon={SearchX} title="No bookings" hint="Try clearing the filters" cta={<Button>Clear</Button>} />`

### Spinner — SHARED
Inline loading inside buttons only; 20px ring `border-accent/25 border-t-accent`, 700ms rotate, `aria-hidden` (announced via button `aria-busy`).
**Usage:** `<Button isLoading>Save</Button>` (renders Spinner internally)

### ErrorState — SHARED
Failed section/route: `danger` icon + message + retry. Used by `QuoteEstimate`, list queries, admin fetches.
**Usage:** `<ErrorState error={e} onRetry={refetch} />`

---

**Depends on:** design.md (tokens, type, motion, a11y), wireframes.md (layout intent), schema.prisma + packages/db (entity/enum types: BookingStatus, RepairStage, ReviewStatus, PriceModel, InvoiceStatus), packages/shared (zod types, formatMoney), architecture.md (Cloudinary signed upload, TanStack Query patterns).
