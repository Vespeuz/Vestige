# Vestige

A single-page web app that surfaces historical events, births, and deaths that occurred on today's date. Fetches data from Wikipedia's free "On This Day" API with zero backend.

## Features

- Events, births, and deaths for today's date, grouped by category
- 5 items shown per category with "Show +N more" expansion
- Instant load from localStorage cache with background refresh
- Offline resilience — cached content shown when network is unavailable
- Auto light/dark mode via `prefers-color-scheme`
- Share button with one-click URL copy
- Fully accessible — keyboard navigation, screen reader support, ARIA annotations

## Tech Stack

- Vanilla HTML, CSS, and JavaScript — no framework, no build step
- DOMPurify (CDN) for HTML sanitization
- Wikipedia On This Day API (no key required)

## Prerequisites

Nothing. A modern web browser and an internet connection.

## Installation

```bash
git clone https://github.com/Vespeuz/Vestige.git
cd vestige
```

Open `index.html` in a browser, or serve with any static file server:

```bash
npx serve .
```

## Usage

Open the page. That's it — the date is auto-detected and content loads immediately.

## Environment Variables

None. This project has no backend, no API keys, and no environment configuration.

## Project Structure

```
vestige/
├── index.html          # HTML shell with OG meta tags
├── style.css           # All styles, CSS custom properties, dark mode
├── app.js              # API fetch, sanitization, caching, rendering, events
├── og-image.png        # OpenGraph social preview image (1200×630)
├── robots.txt          # Allow-all
└── README.md
```

- `app.js` is a single IIFE with modules: date detection, localStorage caching, Wikipedia API fetch, DOMPurify sanitization with link conversion, DOM rendering, and event handling
- `style.css` uses CSS custom properties on `:root` with `prefers-color-scheme` overrides — no JS theming
- Mobile-first: base styles target ≤480px, one breakpoint at 768px for desktop

## Security Notes

- All API text is sanitized through DOMPurify before `innerHTML` rendering
- Relative `/wiki/...` links are converted to absolute `https://en.wikipedia.org/wiki/...` URLs
- No user data is collected, stored, or transmitted
- The DOMPurify CDN is the only third-party dependency; a text-escaping fallback is implemented if the CDN is unavailable

## License

MIT
