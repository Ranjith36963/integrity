/*
 * public/sw.js — Dharma offline-first service worker.
 *
 * Hand-rolled on the Cache API (no build-time precache manifest, no framework)
 * so it stays readable and maintainable. Strategy:
 *   - navigations  → network-first, fall back to cache, then the cached shell.
 *   - static GETs  → stale-while-revalidate (serve cache instantly, refresh in bg).
 *   - everything else / cross-origin / non-GET → straight to network.
 *
 * Dharma stores all user data in localStorage, so caching the app shell + static
 * assets is enough to launch and run fully offline. Bump CACHE_VERSION to force
 * every client to drop the old cache on the next activate.
 */
const CACHE_VERSION = "dharma-v1";
const APP_SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.add(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/apple-touch-icon") ||
    url.pathname.startsWith("/sounds/") ||
    /\.(?:css|js|woff2?|png|svg|ico|json)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  // Navigations: network-first so the freshest HTML wins online, cache offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(APP_SHELL, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match(APP_SHELL)),
        ),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((res) => {
              if (res && res.status === 200) cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
  }
});
