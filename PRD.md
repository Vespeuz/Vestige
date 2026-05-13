# Vestige — Product Requirements Document

**Version:** 1.0  
**Status:** Draft  
**Owner:** TBD  
**Last Updated:** May 13, 2026

---

## 1. Overview

### 1.1 Summary
Vestige is a lightweight, fast-deployable web page that surfaces historical events, births, and deaths that occurred on today's date. It fetches data from a free public API and presents it in a clean, readable format — no account required, no backend needed.

### 1.2 Problem Statement
People are curious about history but rarely have a low-friction, visually appealing way to discover what happened on any given day. Wikipedia's "On This Day" exists but is dense and unstructured. There's no simple, shareable, standalone page that does just this one thing well.

### 1.3 Opportunity
A single-purpose, well-designed page with instant load and zero friction can become a daily habit or shareable social artifact. It's also an ideal fast-deploy project that demonstrates API integration, clean UI, and zero-backend architecture.

---

## 2. Goals & Success Metrics

### 2.1 Goals
- Surface 5–15 notable historical events, births, and deaths for today's date
- Load and render content in under 2 seconds with no login or setup
- Be deployable to Vercel/Netlify in under 10 minutes from a blank repo
- Feel polished enough to share on social media

### 2.2 Non-Goals (Out of Scope)
- User accounts, saved history, or personalization
- A browsable calendar to look up other dates (v1 only)
- Editorial curation or custom content
- Mobile app (web only for now)

### 2.3 Success Metrics

| Metric | Target |
|--------|--------|
| Time to first meaningful paint | < 1.5s |
| API data rendered on load | 100% of visits |
| Time to deploy from scratch | < 10 minutes |
| Shareable screenshot quality | Looks good at 1200×630 (OG image size) |

---

## 3. Users & Personas

### Primary User — The Casual Curious
Someone who stumbles on the page via a share link or bookmark. They want a quick, interesting read during a coffee break. Not necessarily a history buff — just a person who enjoys fun facts. Expects it to "just work" with no instructions.

### Secondary User — The Developer
The person building and deploying this (likely you). Cares about clean code, fast setup, free infrastructure, and a project they can ship and show off.

---

## 4. User Stories & Use Cases

### Core User Stories
- As a visitor, I want to see notable events that happened today in history so I can learn something interesting without any effort.
- As a visitor, I want to see which famous people were born or died on this date so the history feels human and relatable.
- As a visitor, I want to easily share the page so I can send it to a friend.
- As the developer, I want to deploy this to a free host in minutes with no backend so I can move on to the next project.

### Key Use Cases

1. **Default Load** — User opens the URL. The page auto-detects today's date, calls the API, and renders events grouped by category (Events / Births / Deaths).
2. **Share** — User copies the URL or clicks a share button. The page has a proper OG title/description so it previews well in Slack, Twitter, iMessage.
3. **Refresh for more** — If the API returns many results, user can click "show more" to see beyond the initial set.

---

## 5. Functional Requirements

### Must Have (P0)
- **FR-01:** On page load, detect today's month and day and pass it to the history API.
- **FR-02:** Fetch and display at least 5 historical events from the API response.
- **FR-03:** Display events in at least one category: Events, Births, or Deaths.
- **FR-04:** Show the year alongside each event. In the P0 build (no category sections), events from the "Events" category are displayed by default with their years.
- **FR-05:** Caching and graceful degradation:
   - On page load, immediately render from localStorage cache (keyed by `{MM}-{DD}`) if available, showing a subtle "[cached]" badge. Simultaneously re-fetch from the API in the background to refresh the data.
   - If the API call succeeds, update the DOM and update the cache for today's date. Remove the "[cached]" badge.
   - If the API call fails and a cache exists, the user stays on the cached content with the badge — no error is shown.
   - If the API call fails and no cache exists, display a static fallback: a message saying "Couldn't load today's history" with a "Retry" button that re-fetches.
   - Cache expires after 24 hours to prevent showing stale data across multiple days.
   - Never show a blank white screen.
- **FR-06:** Page is fully static/client-side — no server or database required.

### Should Have (P1)
- **FR-07:** Display all three categories (Events, Births, Deaths) as separate sections.
- **FR-08:** Show today's full date prominently (e.g. "May 13").
- **FR-09:** Limit initial display to 5 items per category. Each category has its own "Show +N more" button that expands all remaining items in that section only. Once expanded, no "show less" — content stays visible.
- **FR-10:** Loading skeleton or spinner shown while API call is in-flight.
- **FR-11:** Copy/share button that copies the page URL to clipboard.
- **FR-12:** Proper SEO/social metadata: `<meta>` tags for `description`, `og:title`, `og:description`, `og:image`, and `twitter:card`. Include a `robots.txt` and basic `<title>`. The `og:image` tag must point to a static fallback image (a pre-generated banner, e.g. `og-image.png`) that ships with the repo — never leave `og:image` unset.

### Nice to Have (P2)
- **FR-13:** Date picker so users can browse other days.
- **FR-14:** Highlight one "Featured Event" at the top — the most significant item from the API, auto-selected by highest `pages.length` (number of linked Wikipedia articles across all returned events).
- **FR-15:** Animated entrance for cards on load.
- **FR-16:** Auto-generated OG image (e.g. via `@vercel/og` or a static OpenGraph image with today's date) for social previews.

---

## 6. Non-Functional Requirements

- **Performance:** First contentful paint under 1.5s on a standard connection. API call should complete in under 1s (Wikipedia/On This Day API typically responds in ~200ms).
- **Accessibility:** Aim for WCAG 2.1 AA.
   - Semantic HTML: use `<main>`, `<section>`, `<article>`, `<nav>` appropriately.
   - All interactive elements (buttons, links) must be keyboard-focusable with visible `:focus-visible` outlines. Minimum touch target size 44×44px.
   - "Show more" buttons use `aria-expanded` and dynamically-updated `aria-label`.
   - Content regions updated by API fetch use `aria-live="polite"` so screen readers announce new content.
   - Color contrast meets AA minimum (4.5:1 for text, 3:1 for large text) in both light and dark modes.
- **Reliability:** If the API is down, display a cached fallback or a clear error — never a blank white page.
- **Cost:** Zero — no paid APIs, no paid hosting. Free tier only.
- **Browser support:** Latest 2 versions of Chrome, Firefox, Safari, Edge.

---

## 7. UX & Design Considerations

### Layout
- Single-column, centered content. Max width ~700px for readability.
- Large date header at the top: "Vestige — May 13"
- Cards or list rows for each event, with year on the left and description on the right.
- Subtle section headers for Events / Births / Deaths.

### Tone & Feel
- Clean and editorial — think a newspaper's "On This Day" column, not a trivia app.
- Minimal color use. Respect `prefers-color-scheme` media query: the page renders in light or dark mode automatically based on the user's OS/browser setting. Use CSS custom properties for all colors so theming is single-source.
- Typography-forward. The content is the product.

### Key UX Principles
- Zero interaction required to see content — it's all there on load.
- Mobile-first layout — most shares will be opened on phones.
- The page should look good as a screenshot.

---

## 8. Technical Considerations

### Recommended API
**Wikipedia "On This Day" API** — completely free, no key required.

```
GET https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/{MM}/{DD}
```

Returns `events`, `births`, and `deaths` arrays. Each item includes `year`, `text`, and `pages` (Wikipedia article links). No rate limits for reasonable use. No CORS issues when called from browser.

### Tech Stack (suggested)
- **Framework:** Vanilla HTML/CSS/JS. No build step, no framework. Fastest path to deploy and zero dependency overhead. Use a single `index.html` with linked `style.css` and `app.js`; inline `<style>` and `<script>` only if the project stays under ~200 lines total.
- **Hosting:** Vercel or Netlify (free tier, deploy from GitHub in one click)
- **No backend needed** — all API calls happen client-side

### Data Shape (from API)
```json
{
  "events": [{ "year": 1985, "text": "..." }],
  "births": [{ "year": 1950, "text": "..." }],
  "deaths": [{ "year": 1981, "text": "..." }]
}
```

### Notes
- Parse `MM` and `DD` from `new Date()` in JS — no server date needed.
- Add a try/catch around the fetch with a fallback UI.
- Wikipedia API returns 20–50+ items per category; truncate to 5 for default view.
- **API text contains raw HTML:** The `text` field from Wikipedia includes `<a href="/wiki/...">` links. **Sanitization is mandatory** — use DOMPurify (or equivalent) before rendering as HTML, regardless of trust in Wikipedia as a source. Convert relative wiki paths (`/wiki/...`) to absolute URLs (`https://en.wikipedia.org/wiki/...`) as part of the sanitize-and-render pipeline.
- **Edge case — Feb 29:** The API endpoint `02/29` returns results for leap years. On non-leap years the page will never call it (JS `new Date()` won't produce Feb 29). When it does (leap year), results display normally — no special handling needed other than verifying it works during testing.
- **Edge case — sparse / empty API results:** If the API returns zero results for a category, that section renders a single line: "No notable [events/births/deaths] recorded for this date." If all three categories return zero results, a single message: "Nothing notable recorded for this date — check back tomorrow!" with a "Retry" button.
- **Edge case — timezone:** Date detection uses the browser's local `new Date()`. Users in UTC−12 may see tomorrow's date before midnight UTC; this is an acceptable trade-off for a zero-backend architecture. The "[cached]" badge provides transparency if the displayed date doesn't match expectations.

---

## 9. Dependencies & Risks

### Dependencies

| Dependency | Notes |
|------------|-------|
| Wikipedia On This Day API | Free, no key, but third-party — can go down |
| Vercel / Netlify free tier | Zero cost, instant deploy |

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API rate limit or downtime | Low | High | On load, render from localStorage cache immediately; re-fetch in background. If API fails and cache exists, user stays on cached content with "[cached]" badge. If no cache, show fallback with retry button. See FR-05 for full strategy. |
| API returns sparse results for some dates | Low | Medium | Always display whatever is returned; set minimum display threshold |
| CORS issues in some environments | Very Low | High | Wikipedia API supports browser CORS — test early |

---

## 10. Timeline & Milestones

This is a fast-deploy project. Realistic timeline for a solo developer:

| Milestone | Description | Target |
|-----------|-------------|--------|
| Scaffold | Repo created, API call working, raw JSON rendered | Day 1 — 1 hour |
| UI | Cards, sections, date header, basic styling | Day 1 — 2–3 hours |
| Polish | Error state, loading skeleton, share button, mobile layout | Day 1–2 — 1–2 hours |
| Deploy | Pushed to GitHub, deployed to Vercel/Netlify | Day 2 — 10 minutes |
| **Total** | **Shippable version** | **~1 day** |

---

## 11. Open Questions

- [x] **Featured event selection:** Auto-selected by highest `pages.length` (number of linked Wikipedia articles) within the returned results. No manual curation.
- [x] **Date picker scope:** Out of scope for v1. Today-only. The URL is `/` — no query parameter routing.

---

## 12. Appendix

- **API docs:** https://en.wikipedia.org/api/rest_v1/#/Feed/onThisDay
- **Inspired by:** Wikipedia's "On This Day" portal
- **Deploy targets:** https://vercel.com / https://www.netlify.com
- **Similar references:** https://www.onthisday.com (commercial, ad-supported — our version should be cleaner)

---

## 13. Technical Requirements Document (TRD)

### 13.1 File & Asset Structure

```
vestige/
├── index.html          # Entry point, minimal markup shell
├── style.css           # All styles, CSS custom properties for theming
├── app.js              # All JS: API fetch, cache, render, event handlers
├── og-image.png        # Static OpenGraph fallback image (1200×630)
├── robots.txt          # Basic allow-all
└── README.md           # Setup and deploy instructions
```

No `node_modules`, no `package.json`, no build step. The project runs by opening `index.html` in a browser or serving the directory with any static file server.

### 13.2 Architecture Overview

The application follows a simple **fetch → cache → render** pipeline, plus an **event layer** for user interactions.

| Module | File | Responsibility |
|--------|------|----------------|
| Config | `app.js` (top) | Constants: `CACHE_KEY_PREFIX`, `API_BASE_URL`, `EXPIRY_MS`, `ITEMS_PER_SECTION` |
| Date | `app.js` | Extract `MM` and `DD` from `new Date()`; returns `{ month, day }` |
| Cache | `app.js` | `getCached(key)`, `setCached(key, data)`, `isExpired(timestamp)` — thin wrappers over `localStorage` |
| API | `app.js` | `fetchOnThisDay(month, day)` — calls Wikipedia API, returns parsed JSON or throws |
| Sanitize | `app.js` | `sanitizeAndLinkify(rawHtml)` — runs DOMPurify, converts `/wiki/...` to absolute URLs |
| Render | `app.js` | `renderPage(data)`, `renderSection(category, items)`, `renderError()`, `renderSkeleton()` — mutates DOM |
| Events | `app.js` | `setupShowMoreButtons()`, `setupShareButton()`, `setupRetryButton()` — attaches listeners |

### 13.3 Data Flow

```
Page Load
  │
  ├─► 1. Date module computes { month, day }
  │
  ├─► 2. Cache module checks localStorage for key "vestige-{MM}-{DD}"
  │       │
  │       ├─ HIT → 3a. Render cached data immediately with "[cached]" badge
  │       │
  │       └─ MISS → 3b. Render skeleton/spinner
  │
  ├─► 4. API module fetches from Wikipedia (always, even after cache hit)
  │       │
  │       ├─ SUCCESS → 5a. Update DOM, update cache, remove "[cached]" badge
  │       │
  │       └─ FAILURE → 5b. If cache exists: do nothing (user already sees cached content)
  │                     5c. If no cache: render error fallback with Retry button
  │
  └─► 6. Event module attaches "Show more" / "Share" / "Retry" listeners
```

### 13.4 API Integration

**Endpoint:** `GET https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/{MM}/{DD}`

**Request:** Single `fetch()` call per page load. No headers, no auth, no query params beyond the path.

**Response handling:**

```
fetch(url) → response.json() → { events: [...], births: [...], deaths: [...] }
```

- Wrap in `try/catch` — any network or parsing error triggers the failure path.
- On success, extract `events`, `births`, `deaths` arrays and pass to render.
- For each item, `item.text` is run through `sanitizeAndLinkify()` before DOM insertion.

**Rate limits:** Wikipedia imposes no documented rate limits for this endpoint under normal browser usage. No retry logic needed beyond the user-initiated Retry button.

### 13.5 Caching Implementation

**Storage:** `localStorage`, key format `vestige-{MM}-{DD}` (e.g. `vestige-05-14`).

**Cache payload:**
```json
{
  "timestamp": 1715700000000,
  "data": { "events": [...], "births": [...], "deaths": [...] }
}
```

**Expiry:** Entries older than 24 hours (`86_400_000` ms) are treated as stale. Stale entries are still rendered on cache hit but the "[cached]" badge remains even after a successful background refresh — it's replaced when the fresh data overwrites it.

**Cleanup:** On page load, iterate all `vestige-*` keys and remove any with a timestamp older than 24 hours. This prevents unbounded localStorage growth.

### 13.6 Error Handling Matrix

| Scenario | What the user sees | DOM state |
|----------|-------------------|-----------|
| Cache hit, API succeeds | Content, no badge | Fresh render |
| Cache hit, API fails | Cached content with "[cached]" badge | Cached render preserved |
| Cache miss, API succeeds | Content, no badge | Fresh render |
| Cache miss, API fails | "Couldn't load today's history" + Retry button | Error fallback DOM |
| API returns empty category | "No notable [category] recorded for this date." | Section with single message line |
| API returns all-empty | "Nothing notable recorded for this date — check back tomorrow!" + Retry | Full-page message |
| JS disabled or broken | Static `<noscript>` content in `index.html` | Fallback text |

### 13.7 DOM Rendering Strategy

**Initial HTML shell** (`index.html`):
```html
<main id="app">
  <noscript>Vestige requires JavaScript to display today's history.</noscript>
</main>
```

All dynamic content is rendered into `#app` via `innerHTML` (after DOMPurify sanitization) or `createElement`/`appendChild` for structure elements.

**Section rendering order:** Events → Births → Deaths. Skeleton shows three placeholder blocks in this order.

**"Show more" implementation:** Each section renders with 5 items visible and remaining items hidden via `hidden` attribute or `display: none`. A `<button>` with `aria-expanded="false"` toggles visibility.

### 13.8 Theming & CSS Architecture

**Custom properties** (defined in `:root`):
```css
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --text-secondary: #666666;
  --accent: #2b5ea7;
  --border: #e0e0e0;
  --card-bg: #f8f8f8;
  --badge-bg: #fff3cd;
  --badge-text: #856404;
}
```

**Dark mode** via `@media (prefers-color-scheme: dark)` overrides the same properties. No class toggling, no JS theme detection. Skeleton and spinner use the same properties for consistency.

**Mobile-first:** Base styles target viewports ≤ 480px. A single `@media (min-width: 768px)` breakpoint adjusts max-width, font sizes, and padding for desktop.

### 13.9 Deploy Configuration

**Vercel:** No configuration needed for a static site. Connect GitHub repo, Vercel auto-detects static files. Deploys on every push to `main`.

**Netlify:** No configuration needed. Drag-and-drop the directory or connect GitHub repo. Add a `_redirects` file only if using client-side routing (not needed; this is a single-page app at `/`):

```
/*  /index.html  200
```

**Neither requires** a build command, output directory, or environment variables.

### 13.10 Browser Compatibility & Testing

| Browser | Minimum version | Notes |
|---------|----------------|-------|
| Chrome | 120+ | `prefers-color-scheme` support |
| Firefox | 121+ | `prefers-color-scheme` support |
| Safari | 17+ | `prefers-color-scheme` support |
| Edge | 120+ | Shares Chrome engine |

**Test checklist:**
- [ ] Load page → events render within 2s
- [ ] Load page with cached data → cached render appears before API refresh
- [ ] Disconnect network → cached content shown with badge
- [ ] Clear localStorage + disconnect network → error fallback shown
- [ ] Feb 29 test (set system date to 2024-02-29) → events render correctly
- [ ] Toggle OS dark/light mode → page re-themes without reload
- [ ] Keyboard navigation → all buttons reachable via Tab, visible focus ring
- [ ] Screen reader → section headers announced, aria-live on content region
- [ ] Share button → URL copied to clipboard
- [ ] Mobile viewport (375px) → no horizontal scroll, all text readable
