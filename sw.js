/* FaceRace service worker — offline support + installability.
   Bump CACHE_VERSION whenever site files change so clients pick up the new build. */
const CACHE_VERSION = "v4";
const CACHE_NAME = `facerace-${CACHE_VERSION}`;
const PRECACHE = [
  "./",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png",
  "apple-touch-icon.png",
  "favicon-32.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Only handle same-origin GETs — analytics and other third-party requests pass through.
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (e.request.mode === "navigate") {
    // Network-first for the page itself so deploys reach users, cache when offline.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("./", copy));
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest) — they change with CACHE_VERSION.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
