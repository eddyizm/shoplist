/* ============================================================
   Service Worker - PWA Cache for the Shopping List app
   ============================================================ */

// Bump this whenever the cached static assets change so clients pick up
// the new files.
const CACHE_NAME = "shopping-list-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/pico.pumpkin.css",
  "/css/styles.css",
  "/js/app.js",
  "/js/pocketbase.umd.js",
  "/static/icons/icon-512.svg",
  "/static/icons/icon-192.svg",
  "/static/icons/icon-32.svg",
  "/static/icons/icon-128.svg",
  "/static/icons/icon-64.svg",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
  "/static/icons/icon-32.png",
  "/static/icons/icon-128.png",
  "/static/icons/icon-64.png",
  "/static/icons/icon-180.png",
  "/static/icons/favicon.ico",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets...");
      // Cache each asset independently so one missing file cannot abort the
      // whole install.
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] Failed to cache", url, err);
          })
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Leave cross-origin requests (e.g. the Alpine CDN) to the browser.
  if (url.origin !== self.location.origin) return;

  // Never cache PocketBase API or admin requests. They are user-specific and
  // must always reflect the current server state.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_/")) {
    return;
  }

  // Network-first for navigations so new deployments are picked up; fall back
  // to the cached app shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Only cache successful same-origin responses.
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});
