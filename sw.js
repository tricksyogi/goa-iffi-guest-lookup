/* Goa IFFI Guest Lookup — app-shell-only service worker.
   Caches ONLY the app shell (the page itself, manifest, icons).
   NEVER intercepts sheet CSV, webhook GET/POST, or CDN fetches —
   all data is network-only, so the tool stays connected/live. */
const CACHE = 'iffi-lookup-shell-v35-2';
const SHELL_FILES = ['/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return; // never cache writes
  const url = new URL(e.request.url);
  const isShell =
    url.origin === self.location.origin &&
    (e.request.mode === 'navigate' || SHELL_FILES.some((f) => url.pathname.endsWith(f)));
  if (!isShell) return; // sheet, webhook, CDN: network-only, untouched
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      });
    })
  );
});
