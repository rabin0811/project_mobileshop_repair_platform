# Design System — MobileFix Pro

> Direction: **Minimal professional / light** ([memory.md D-004](memory.md)). This is the canonical UI contract. Components implement these tokens — no invented values in app code. Dark mode is Phase 2 (token set reserved below).

---

## 1. Principles

1. **Trust first.** Sharp type, generous whitespace, flat surfaces, one accent. The design must say "professional repair studio", not "flashy tech".
2. **Content-led.** Product photos and status information lead; decoration is minimal.
3. **Calm motion.** Framer Motion micro-interactions that clarify state, never distract. Honor `prefers-reduced-motion`.
4. **One accent, used sparingly.** Blue for actions and the current repair stage; status colors carry meaning (see tokens).
5. **Accessible by default.** WCAG 2.1 AA contrast, visible focus rings, keyboard navigable.

---

## 2. Color tokens

Tailwind config exposes these as semantic tokens (`bg-surface`, `text-ink`, `border-line`, `bg-accent`, …). Never use raw hex in components.

### Light (v1)

| Token | Value | Usage |
|---|---|---|
| `bg-canvas` | `#FFFFFF` | Page background |
| `bg-surface` | `#F7F7F8` | Cards, inputs, muted sections |
| `bg-raised` | `#FFFFFF` | Elevated cards on surface |
| `ink` | `#111111` | Headings & primary text |
| `ink-muted` | `#6B7280` | Secondary text, captions |
| `line` | `#E5E5E7` | Borders, dividers |
| `accent` | `#1A5CFF` *(swap → `{{BRAND_PRIMARY}}`)* | Primary actions, links, active nav, active stage |
| `accent-hover` | `#0F4AD9` | Primary button hover |
| `accent-soft` | `#EDF2FF` | Selected rows, stage badges bg |
| `success` | `#16A34A` | Delivered/paid/approved |
| `warning` | `#F59E0B` | Waiting parts, pending |
| `danger` | `#DC2626` | Errors, cancel/reject, delete |
| `info` | `#0891B2` | Guidance, in-progress |

Contrast: `ink` on `#FFFFFF` = 18.4:1 ✓ · `ink-muted` on white = 4.9:1 ✓ · `accent` white text on `#1A5CFF` = 5.2:1 ✓.

### Dark (Phase 2 — reserved, not built)
`bg-canvas #0C0C0E` · `bg-surface #16161A` · `ink #F5F5F6` · `ink-muted #9CA3AF` · `line #2A2A2F` · `accent #3B7BFF` · `accent-soft #1E2A4A` — same semantics, delivered via CSS variables + `dark:` variant.

---

## 3. Typography

- **Family:** Inter (400/500/600/700). System fallback stack. Loaded with `font-display: swap`. *(Swap for `{{BRAND_FONT}}` in Phase 2.)*
- **Scale** (rem, fluid via `clamp` where useful):

| Token | Size/Weight | Usage |
|---|---|---|
| `display` | `clamp(2.25, 5vw, 3.5rem)` / 700 / -0.03em | Homepage hero |
| `h1` | `1.75rem` / 700 | Page title |
| `h2` | `1.375rem` / 650 | Section title |
| `h3` | `1.125rem` / 600 | Card title |
| `body` | `1rem` / 400 | Default copy |
| `body-sm` | `0.875rem` / 400 | Secondary copy |
| `caption` | `0.75rem` / 500 / `uppercase` / 0.06em | Labels, breadcrumbs |
| `mono` | `0.875rem` / 500 | Booking refs, prices, IDs |

- Line height: 1.5 body, 1.15 headings. Max measure ~68ch for prose.
- Numbers (prices, refs) use tabular figures (`font-variant-numeric: tabular-nums`) so tables don't jump.

---

## 4. Spacing, radius, elevation

- **Spacing:** 4px base scale — `0, 4, 8, 12, 16, 24, 32, 48, 64, 96`. Section padding `py-24`; card padding `p-6`; component gap `gap-4`.
- **Radius:** buttons/inputs `8px` · cards `12px` · modals `16px` · status pills `999px`.
- **Shadows** (flat, minimal per the aesthetic):
  - `sm`: `0 1px 2px rgba(17,17,17,0.06)`
  - `card`: `0 1px 3px rgba(17,17,17,0.08), 0 4px 16px rgba(17,17,17,0.05)`
  - `popover`: `0 8px 24px rgba(17,17,17,0.12)`
- **Borders:** `1px solid var(--color-line)`; cards use border + shadow-sm, not heavy chrome.

---

## 5. Iconography

- **Lucide React** (stroke 1.75, 20px default, `size` prop). Filled variants only for rating stars (`filled` on active).
- Icons are decorative (aria-hidden) unless the meaning isn't in text (then `aria-label` on the control).

---

## 6. Component specs (high level)

> Full inventory, props, and states: [component-library.md](component-library.md). Wireframes: [wireframes.md](wireframes.md).

| Component | Spec |
|---|---|
| **Button** | `primary` (accent bg, white text), `secondary` (surface bg, ink text, line border), `ghost`, `danger`; sizes `sm/md/lg`; radius 8px; active scale 0.98; focus ring `2px accent/40 offset 2px` |
| **Input / Select / Textarea** | 1px line border; focus: 2px accent border + soft ring; label above, `caption` helper below; error: danger border + message; disabled 45% opacity |
| **Card** | white, `border line`, `shadow-card`, radius 12px, `p-6`; hover lift only for interactive cards (`shadow-popover` + translateY(-1px)) |
| **Badge / StatusPill** | 6px radius, `accent-soft` bg + accent text for active stage; success/warning/danger maps to status colors; includes a 6px dot |
| **StageTracker** | Horizontal stepper of repair stages: completed = accent check, active = accent ring pulse, pending = line circle; connectors fill with accent. Vertical variant for mobile |
| **Table** | Header `caption` uppercase muted; row border `line`; hover `bg-surface`; numeric columns right-aligned tabular |
| **Modal / Drawer** | `popover` shadow, radius 16px, backdrop `rgba(17,17,17,0.4)` blur-sm; `Esc` + click-outside close; focus trap |
| **Toast** | Success/error/info, slide-up 240ms, auto-dismiss (error sticky), `aria-live=polite` |
| **Stepper (booking)** | 4 steps — Model → Service → Slot → Confirm; numbers + labels, current state highlighted |
| **StatTile** (admin) | Icon chip + value (tabular) + label + delta; 4-up grid on dashboard |
| **EmptyState** | Lucide illustration icon, title, hint, CTA — every list needs one |
| **Skeleton** | `bg-surface` shimmer 1.2s; every async section has a skeleton, not a spinner |

---

## 7. Motion (Framer Motion)

| Use | Motion |
|---|---|
| Page transition | Fade + 8px rise, 240ms, ease-out; exit 160ms |
| Route-level (admin) | Crossfade 160ms |
| Hero (home) | R3F canvas; optional floating phone with subtle parallax on pointer |
| StageTracker advance | Connector line `scaleX` 0→1, 300ms; check `pathLength` draw |
| Success | Check circle draw + 12px pop on confirm/invoice |
| Modal/Drawer | 180ms opacity + scale 0.98→1; drawer slide 260ms |
| Hover | `translateY(-1px)` + shadow, 150ms |
| List reorder / new row | `layout` animation on key change |
| Loading | Skeleton shimmer, not spinner; spinner only in buttons while submitting |

- Global `<MotionConfig reducedMotion="user">` — all transforms collapse to opacity when the user requests reduced motion.
- Lazy-load R3F (`React.lazy` + `Suspense`), `dpr={[1, 1.5]}`, and cap with a static image fallback on slow devices (`navigator.hardwareConcurrency`).

---

## 8. Layout & breakpoints

- Container `max-w-7xl` centered, `px-4 sm:px-6 lg:px-8`.
- Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280`. Admin uses `lg` sidebar (collapsible to icon rail at `md`, off-canvas below).
- Grid: 12-col. Hero 6/6 split (copy / device image). Service cards 3-up → 2-up → 1-up.
- Sticky header: logo left, nav center, "Book now" button right. Sticky footer CTA on service pages.

---

## 9. Accessibility (baseline)

- Focus ring everywhere (never `outline: none` without a replacement).
- Labels associated (`htmlFor`/`id`); inputs expose `aria-invalid`, `aria-describedby` for errors.
- Modals: focus trap + `role="dialog"` + `aria-modal`; restore focus on close.
- Toasts: `aria-live="polite"`; status pills: `aria-label` text, not color-only meaning.
- Stage tracker: semantic `<ol>` with `aria-current="step"` on the active stage.
- Target size ≥ 44px for touch controls (padding, not just text).

---

## 10. Design tokens (Tailwind)

```ts
// tailwind.config.ts (packages/config)
colors: {
  canvas: 'var(--color-canvas)', surface: 'var(--color-surface)', raised: 'var(--color-raised)',
  ink: { DEFAULT: 'var(--color-ink)', muted: 'var(--color-ink-muted)' },
  line: 'var(--color-line)',
  accent: { DEFAULT: 'var(--color-accent)', hover: 'var(--color-accent-hover)', soft: 'var(--color-accent-soft)' },
  success: '#16A34A', warning: '#F59E0B', danger: '#DC2626', info: '#0891B2',
},
fontFamily: { sans: ['Inter', 'system-ui', ...], mono: ['ui-monospace', 'SFMono-Regular', ...] },
boxShadow: { 'card': '...', 'popover': '...' },
borderRadius: { sm: '6px', md: '8px', lg: '12px', xl: '16px' },
// CSS variables in :root allow the Phase 2 dark-mode swap without retyping themes.
```

---

## 11. Copy voice

- Short, concrete, benefit-first: "Screen replaced in 45 minutes, warranty included" — not "Our services".
- Actions are verbs ("Book a repair", "Track my repair"). Statuses read like a customer would see them ("Being repaired", "Ready for pickup").
- Placeholders `{{SHOP_NAME}}` must never render to users — seed the brand block before any public deploy (see [memory.md](memory.md)).
