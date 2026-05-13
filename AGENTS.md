# AGENTS.md — Vestige

## Project type
Zero-build static site. Vanilla HTML/CSS/JS only — no framework, no `package.json`, no `node_modules`.

## File structure (target)
```
vestige/
├── index.html          # Minimal HTML shell (<main id="app">)
├── style.css           # All styles, CSS custom properties for theming
├── app.js              # All JS: fetch, cache, render, events
├── og-image.png        # Static OG fallback (1200×630)
├── robots.txt          # Allow-all
└── README.md
```

## Key commands
- **Run locally:** `npx serve .` or open `index.html` directly in a browser (no build step)
- **Deploy:** Connect GitHub repo to Vercel or Netlify — zero config needed, auto-detects static site

## Hard constraints from the PRD
- DOMPurify is mandatory before rendering API text as HTML (Wikipedia API returns raw `<a>` links)
- Convert relative `/wiki/...` links to absolute `https://en.wikipedia.org/wiki/...` during sanitization
- `prefers-color-scheme` auto theming — no JS theme toggle, no class-based dark mode
- Mobile-first CSS: base styles for ≤480px, one `@media (min-width: 768px)` for desktop
- No backend, no database, no environment variables, no API keys
- API text content must never be rendered without sanitization

## Caching behavior (critical to get right)
On page load:
1. Check localStorage for `vestige-{MM}-{DD}` key
2. If cached: render immediately with "[cached]" badge; then ALWAYS re-fetch in background
3. On fetch success: update DOM, remove badge, update cache
4. On fetch failure + cache exists: do nothing (user stays on cached view with badge)
5. On fetch failure + no cache: show error fallback with Retry button
6. Clean up `vestige-*` keys older than 24h on each page load

## Rendering rules
- Initial display: 5 items per category (Events, Births, Deaths)
- "Show +N more" per category — expands remaining items in that section only, no collapse
- If a category returns zero results, show "No notable [category] recorded" — never hide the section or show a blank screen
- Use `aria-live="polite"` on the content region so screen readers announce updates
- "Show more" buttons use `aria-expanded` and dynamic `aria-label`

## CSS conventions
- All colors defined as CSS custom properties on `:root`
- Dark mode: override same properties inside `@media (prefers-color-scheme: dark)`
- Max content width: 700px
- Touch targets: minimum 44×44px
- Visible `:focus-visible` outlines on all interactive elements

## API
- Endpoint: `GET https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/{MM}/{DD}`
- No auth, no rate limits for browser use
- Response: `{ events: [...], births: [...], deaths: [...] }` — each item has `year`, `text` (raw HTML), `pages` (array)

## Testing checklist (manual, no test framework)
1. Page loads and renders events within 2s
2. Cached data renders before API response on reload
3. Network disconnect → cached content with "[cached]" badge
4. Clear localStorage + network disconnect → error fallback with Retry
5. Feb 29 test: set system date to 2024-02-29, verify events render
6. Toggle OS dark/light mode → page re-themes without reload
7. Keyboard: all buttons reachable via Tab with visible focus ring
8. Screen reader: section headers announced, `aria-live` fires on content update
9. Share button copies URL to clipboard
10. 375px viewport: no horizontal scroll, readable text
