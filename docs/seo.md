# SEO Plan — MobileFix Pro

> Local-service SEO: win "phone repair + city" intent, make every public page crawler-safe, and connect structured data to the booking funnel. Companion docs: [performance.md](performance.md) (Core Web Vitals), [architecture.md](architecture.md), [database.md](database.md).

---

## 1. Strategy (Vercel-first)

- `apps/web` is the only indexable app. **`apps/admin` is `noindex`** — robots meta + `X-Robots-Tag: noindex` on all admin responses; no admin route is prerendered.
- Public marketing routes are **prerendered/SSG**, not client-only renders:
  - `home`, `services` (+ per-service pages), `branches` (+ per-branch pages), `blog` (+ per-post pages), `FAQ`.
  - Implemented via a Vite SSR/prerender step at build (or sitemap-driven revalidation on content change). Result is static HTML at the edge — crawlers and real users get the same first paint.
- Interactive pages (`booking`, `track`) remain SPA-rendered but ship a static shell + fallback content (booking needs JS; tracker content hydrates).
- Every prerendered page links back to the booking flow (`/book`) — SEO traffic converts into the booking funnel.

---

## 2. Technical foundation

| Item | Decision |
|---|---|
| `sitemap.xml` | Generated dynamically from the live catalog + CMS (services, branches, blog) at build/revalidate; includes `lastmod`; submitted to Search Console. Public URL: `/sitemap.xml` |
| `robots.txt` | Public allowlist; disallow `/book*`-internal steps, `/track` params, admin paths; reference sitemap URL |
| Canonical URLs | Every public page sets `<link rel="canonical">` to the `{{DOMAIN}}` absolute URL (trailing-slash convention fixed); no duplicate-content split across query params |
| OG + Twitter cards | `og:title/description/image/url/type`, `twitter:card=summary_large_image`; per-page overrides (blog cover, branch photo) from CMS fields |
| Favicon / apple-touch | Favicon set + `apple-touch-icon`; served locally, preloaded on home |
| hreflang | Phase 2 when `{{LOCALE_2}}` ships (memory.md); en-only in v1 |
| 404 handling | Custom 404 page with search + top-services links; crawlers get HTTP 404 (not 200 soft-404) |

### 2.1 URL conventions
- All public routes lowercase, hyphenated, no query strings in sitemap entries.
- `Service.slug` and `Branch.slug` are the URL segments — they are stable, never renumbered; a rename is a redirect, not a rewrite.
- Booking refs (`MF-...`) appear in `/track/:ref` only; they are never part of indexed content.
- Canonical URLs are the `{{DOMAIN}}` + path form (trailing slash fixed); admin and SPA-only routes never get canonicals.

### 2.2 Page inventory (route → prerender → index)

| Route | Prerendered | Indexable | Purpose |
|---|---|---|---|
| `/` (home) | ✓ | ✓ | LocalBusiness + featured reviews, services overview |
| `/services` | ✓ | ✓ | Service catalog index |
| `/services/:slug` | ✓ | ✓ | Per-service page (price, warranty, brands, FAQ, CTA) |
| `/branches` | ✓ | ✓ | Branch index |
| `/branches/:slug` | ✓ | ✓ | Per-branch LocalBusiness (hours, geo, services) |
| `/blog` | ✓ | ✓ | Paginated post list (`rel=prev/next`) |
| `/blog/:slug` | ✓ | ✓ | BlogPosting |
| `/faq` | ✓ | ✓ | FAQPage |
| `/book` + steps | shell only | noindex | Booking flow — JS required |
| `/track/:ref` | SPA | noindex | Public tracker (auth-free, ref-keyed) |
| `/login`, `/profile` | SPA | noindex | Authenticated |
| `apps/admin/*` | — | **noindex** | Never indexable |

### 2.3 robots.txt & sitemap examples

```
User-agent: *
Allow: /
Disallow: /book
Disallow: /track
Disallow: /login
Disallow: /profile
Disallow: /admin
Sitemap: {{DOMAIN}}/sitemap.xml
```
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{{DOMAIN}}/</loc><lastmod>2026-08-01</lastmod><changefreq>weekly</changefreq></url>
  <url><loc>{{DOMAIN}}/services/screen-replacement</loc><lastmod>2026-08-01</lastmod></url>
  <url><loc>{{DOMAIN}}/branches/city-name</loc><lastmod>2026-08-01</lastmod></url>
</urlset>
```
- `lastmod` comes from the entity's `updatedAt`/`publishedAt`; entries are regenerated on catalog/CMS change.
- Sitemap includes only **prerendered, indexable** URLs (never `/book` internals, tracker, or admin).

---

## 3. Structured data (JSON-LD)

| Schema | Where | Source fields |
|---|---|---|
| `LocalBusiness` (per branch) | branch page + global contact footer | `name` (`{{SHOP_NAME}}`), `address` (`{{ADDRESS}}` + `postalCode`, `city`), `geo` from `Branch.lat/lng`, `telephone` (`{{PHONE}}`), `openingHours` derived from `Branch.businessHours` JSON, `image`, `url`, `sameAs` (Google Business Profile) |
| `Service` (+ `OfferCatalog`) | service page | `serviceType` from `Service.name/category`, `offerCatalog` with `offers` price from `Service.startingPrice` minor units → decimal, `priceCurrency "{{CURRENCY}}"`, `priceValidUntil` from catalog freshness, `areaServed` = branch city |
| `Review` / `AggregateRating` | home + service pages | **Approved reviews only** (`Review.status == APPROVED`); aggregate `ratingValue/count` computed from approved set per page; `itemReviewed` references the service/branch |
| `FAQPage` | FAQ page + per-service FAQ | `Faq` rows (question/answer), active only |
| `BlogPosting` | blog post pages | title, `datePublished` (`publishedAt`), cover image, author, excerpt |
| `BreadcrumbList` | all public pages | Home → Services → Service / Branches → Branch / Blog → Post |

Rules:
- Structured data must match visible content (a `Review` never shows an unapproved rating).
- Prices from `Service.startingPrice`/`ServicePrice` — kept in sync with the public pricing display; `priceCurrency` uses `{{CURRENCY}}` from memory.md.
- JSON-LD is injected into the prerendered HTML at build time (not client-side).

### 3.1 Example — service page
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Screen Replacement in {{CITY}}",
  "provider": { "@type": "LocalBusiness", "name": "{{SHOP_NAME}}", "telephone": "{{PHONE}}" },
  "areaServed": "{{CITY}}",
  "offers": { "@type": "Offer", "price": "1200", "priceCurrency": "{{CURRENCY}}", "priceValidUntil": "<catalogFreshness>" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "<avgApproved>", "reviewCount": "<countApproved>" }
}
```
> `{{CITY}}` is a per-branch placeholder resolved at prerender time from the branch's city — never a literal string in the template (memory.md hygiene).

### 3.2 Example — LocalBusiness (per branch)
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "{{SHOP_NAME}}",
  "address": { "@type": "PostalAddress", "streetAddress": "{{ADDRESS}}", "addressLocality": "{{CITY}}", "postalCode": "<branch.postalCode>" },
  "geo": { "@type": "GeoCoordinates", "latitude": "<branch.lat>", "longitude": "<branch.lng>" },
  "telephone": "{{PHONE}}",
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday"], "opens": "09:00", "closes": "19:00" }
  ],
  "url": "{{DOMAIN}}",
  "sameAs": ["<googleBusinessProfileUrl>"]
}
```
> `openingHoursSpecification` is derived from `Branch.businessHours` JSON per day; days with no hours are omitted.

### 3.3 Example — FAQPage & BreadcrumbList
```json
{ "@context": "https://schema.org", "@type": "FAQPage",
  "mainEntity": [ { "@type": "Question", "name": "How long does a screen repair take?", "acceptedAnswer": { "@type": "Answer", "text": "<from Faq answer>" } } ] }
{ "@context": "https://schema.org", "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "{{DOMAIN}}/" },
    { "@type": "ListItem", "position": 2, "name": "Services", "item": "{{DOMAIN}}/services" },
    { "@type": "ListItem", "position": 3, "name": "Screen Replacement", "item": "{{DOMAIN}}/services/screen-replacement" } ] }
```

---

## 4. On-page SEO

### 4.1 Title & meta conventions
- Format: `{Page keyword} | {Service} in {CITY} — {{SHOP_NAME}}` (≤ 60 chars); `meta description` ≤ 155 chars with CTA ("Book {service} today").
- `{{CITY}}` resolves from the branch/service-area city per branch — propagated centrally, never hard-coded per file (memory.md).
- H1 unique per page, matches the title's primary keyword; one H1 only.
- Per-page `seo` JSON override on `BlogPost` (title/description/canonical); generated pages get deterministic conventions, CMS content can override.

### 4.1.1 Meta description generator

| Page type | Title pattern (≤ 60 chars) | Description pattern (≤ 155 chars) |
|---|---|---|
| Home | `Phone Repair in {CITY} — {{SHOP_NAME}}` | `Fast, warranty-backed phone repair in {CITY}. Book a slot, get an instant price, track live. {{PHONE}}` |
| Service | `{Service} Repair in {CITY} — {{SHOP_NAME}}` | `{Service} from {price} in {CITY}. {estTime} turnaround, {warranty}-day warranty. Book online now.` |
| Branch | `{Branch name} | {City} Mobile Repair — {{SHOP_NAME}}` | `Visit {Branch name} in {City} for {services}. {hours summary}. {maps} directions.` |
| Blog | `{Post title} — {{SHOP_NAME}}` | `{Post excerpt} — tips from the {CITY} repair bench.` |
| FAQ | `Phone Repair FAQs — {{SHOP_NAME}}` | `Answers on pricing, time, warranty, and data safety for repairs in {CITY}.` |

### 4.2 Keyword targets (template)
- **Primary:** `phone repair {CITY}` and per-service `{service} repair {CITY}` (screen, battery, charging port, water damage, data recovery).
- **Secondary:** brand+model pairs from the catalog (`iPhone screen replacement {CITY}`, `Samsung battery replacement {CITY}`) — service pages + blog cover these.
- **Local:** `phone repair near me`, `{CITY} mobile repair shop`, branch name + address terms on branch pages.
- **Long-tail (blog):** "how much does X cost", "X vs Y", "how to know if Z" — each targets a service keyword.

### 4.3 Internal linking
- Home → services grid → each service page; service pages link the booking CTA + related services + the branch pages.
- Branch pages link services offered at that branch; blog posts link to relevant service/branch pages (topic clusters).
- Every service/branch/blog page has a visible path back to `/book`.
- Anchor text is descriptive and keyword-bearing; no orphan public pages (each indexable route reachable within 2 clicks of home).

### 4.4 Blog strategy
- Long-tail topics mapped to service keywords (see §4.2); posts are `BlogPost` CMS rows with `seo` JSON overrides.
- Topical clusters: each pillar service page links its supporting posts; posts link back to the pillar.
- Publish cadence + editorial guidance in the CMS admin guide; freshness signals via `lastmod` on sitemap.

### 4.5 Blog topic seed list (long-tail, `{CITY}` placeholders)

| Topic | Targets |
|---|---|
| How much does an iPhone screen replacement cost in {CITY}? | screen repair {CITY}, pricing |
| Samsung battery replacement — signs you need one | battery repair {CITY} |
| Water-damaged phone: what to do (and not do) | water damage repair {CITY} |
| Charging port repair vs wireless charging | charging port {CITY} |
| Is phone data recovery worth it? | data recovery {CITY} |
| Original vs copy screens — the warranty difference | screen replacement, trust |

Each post is a `BlogPost` row (tags, `seo` overrides) and links back to its pillar service page + the branch pages (internal-link rule §4.3).

### 4.6 Duplicate content & thin pages
- A service or branch page with **no description, no price, and no hours** is `noindex` until CMS content exists — never index a thin page.
- One branch per city → one LocalBusiness; identical content across branches is parameterized by city/branch fields, not copied.
- `seo` overrides on `BlogPost` prevent two posts from sharing title/description; a publish check blocks duplicate slugs.
- Paginated blog pages keep unique content on page 1; canonical stays the list root.

---

## 5. Technical SEO & Core Web Vitals

| Concern | Handling |
|---|---|
| SPA crawlability | Prerendered HTML for public routes (interactive parts hydrate); sitemap lists only prerendered URLs |
| Pagination | `rel="prev/next"` on blog list pages; page 1 canonical stays the list; no `noindex` on paginated lists |
| Mobile-friendliness | Responsive Tailwind layouts; viewport meta; tap targets ≥ 44 px; no horizontal scroll (Lighthouse a11y + SEO audits) |
| Core Web Vitals | Budgets + monitoring in [performance.md](performance.md); LCP image preloaded, `display:swap` fonts, CLS-safe dimensions — SEO CI gates on the same Lighthouse runs |
| HTTPS + HSTS | Vercel edge; no mixed content |
| Google Business Profile | `sameAs` + NAP consistency (name/address/phone) across LocalBusiness JSON-LD, GBP, and footer — identical `{{SHOP_NAME}}`/`{{ADDRESS}}`/`{{PHONE}}` values |
| Query-param hygiene | Canonical on params; `robots.txt` disallows internal/step query strings; sitemap excludes them |

### 5.1 Local SEO signals (beyond structured data)

| Signal | Action |
|---|---|
| NAP consistency | Identical `{{SHOP_NAME}}` / `{{ADDRESS}}` / `{{PHONE}}` in JSON-LD, footer, and Google Business Profile; verified at launch and on any edit |
| Citations | Same NAP on directory listings (Phase 2 content work); no conflicting variants |
| GBP | Location linked via `sameAs`; regular posts/updates on the profile; category aligned to "mobile phone repair shop" |
| Reviews | Approved Google-style reviews surfaced on site via `Review` schema (approved only); reply policy in admin |
| Maps/geo | `geo` from `Branch.lat/lng`; `mapsUrl` link on branch pages and in confirmation emails |

---

## 6. Measurement

| Tool | Use |
|---|---|
| Google Search Console | Submit sitemap; monitor coverage, Core Web Vitals report, query performance per city/service |
| GA4 | Events: `booking_start`, `booking_estimate_viewed`, `booking_confirmed`, `track_view`, `review_submitted`; **bookings funnel** (visit → estimate → confirm) as the primary goal; attribution to source/medium (organic, GBP) |
| Goal tracking | Confirmed bookings as a conversion event; funnel drop-off per page reported in the ops dashboard |
| Lighthouse CI | SEO + perf audits on every public-route change (per [performance.md](performance.md)) |

### 6.1 Reporting cadence
- Monthly: Search Console coverage + queries report, GA4 funnel (visit → estimate → confirm), top 10 service/city keywords, blog post performance.
- Quarterly: compare against booking KPI (PRD §7), identify under-target services/cities for new blog topics or landing-page work.
- Change-driven: rerun the structured-data validator + crawl test whenever catalog/CMS structure changes (new service, branch, or JSON-LD source field).

### 6.2 Launch checklist
- [ ] Search Console property verified + sitemap submitted
- [ ] Google Business Profile verified; NAP identical to LocalBusiness JSON-LD + footer
- [ ] GA4 tags live on `apps/web`; funnel events wired
- [ ] `noindex` verified on `apps/admin` and `/book`/`/track` (curl + test)
- [ ] Prerender job producing all public routes; sitemap regenerates on catalog/CMS change
- [ ] Structured-data validator passes for LocalBusiness, Service, Review, FAQPage, BlogPosting, BreadcrumbList

---

Depends on: [memory.md](memory.md) ({{SHOP_NAME}}, {{CITY}}, {{CURRENCY}}, {{DOMAIN}} tokens), [performance.md](performance.md) (prerender + CWV budgets), [database.md](database.md) (Branch.businessHours/geo, Service.startingPrice, Review/FAQ/BlogPost fields), [architecture.md](architecture.md) (Vercel edge, admin noindex).
