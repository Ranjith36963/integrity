# Changelog — PWA hardening

## [unreleased]

### Added (PWA)

- **Dharma now installs and runs like a native app on a phone.** Three gaps closed:
- **Offline service worker** (`public/sw.js`) — hand-rolled on the Cache API (no framework, no
  build-time precache manifest, so it stays readable). Offline-first strategy: navigations are
  network-first with a cache → app-shell fallback; static assets (`/_next/static`, icons, fonts,
  sounds) are stale-while-revalidate; non-GET and cross-origin requests pass straight through. A
  bumpable `CACHE_VERSION` purges old caches on `activate`; `skipWaiting` + `clients.claim` take
  control immediately. Because all user data lives in localStorage, caching the shell + static
  assets is enough to launch and run fully offline.
- **Registration** (`components/ServiceWorkerRegister.tsx`) — registers `/sw.js` via
  `workbox-window`, **production-gated** so it never fights Next's dev HMR, and dynamically
  imported so it stays out of the initial bundle. Wired into `app/layout.tsx`.
- **Installable icons** (generated from `public/icon.svg` via `sharp`): `icon-192.png`,
  `icon-512.png`, a full-bleed `icon-maskable-512.png` (Android adaptive/maskable safe-zone), and
  a `apple-touch-icon.png` (180×180) so iOS gets a real home-screen icon instead of a blank tile.
  `app/manifest.ts` advertises the PNG + maskable icons alongside the SVG; layout metadata adds
  the apple-touch-icon + manifest link (the `appleWebApp` capable/title/status-bar meta already
  existed).

### Tests (PWA)

- `app/manifest.test.ts` — manifest is standalone/portrait and advertises 192 + 512 PNG icons and
  at least one maskable icon.
- `app/sw.test.ts` — structural guard: the service worker wires install/activate/fetch, takes
  control immediately, carries a bumpable cache version, and handles navigations offline.
- `components/ServiceWorkerRegister.test.tsx` — renders nothing; inert outside a production build.
- `components/Fireworks.test.tsx` — public-asset guard allowlist extended to the known PWA set
  (still fails loudly on any unexpected asset).

### Verification

- Built a production bundle and drove it with Playwright: manifest + apple-touch-icon link in
  `<head>`, the service worker reaches `activated`, the app **reloads OFFLINE and still renders**,
  and an offline navigation to a fresh URL is served from cache (200). 4/4 offline checks green.
- Not yet built: cross-device sync / accounts (Supabase) — a separate, larger piece. This ship is
  the client-side "works on my phone, installs, runs offline" layer only.
