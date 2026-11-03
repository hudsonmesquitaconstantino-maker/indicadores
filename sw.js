/* Service Worker — Indicadores Guimas v5.0
   Isolado: gerencia apenas caches com o prefixo deste app.
   O app é praticamente autocontido; somente a navegação/index.html usa fallback offline. */
const PREFIX = "guimas-indicadores-shell-v";
const CACHE  = PREFIX + "5-2";
const LEGACY = "indicadores-guimas-v1";
const INDEX  = new URL("./index.html", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(INDEX, { cache: "no-store" });
      if (fresh && fresh.ok) await cache.put(INDEX, fresh.clone());
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => (k.startsWith(PREFIX) && k !== CACHE) || k === LEGACY)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function isHtml(req, url) {
  return req.mode === "navigate" || req.destination === "document" ||
    url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!isHtml(req, url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      if (fresh && fresh.ok) {
        event.waitUntil(cache.put(INDEX, fresh.clone()));
      }
      return fresh;
    } catch (err) {
      const hit = await cache.match(INDEX);
      if (hit) return hit;
      throw err;
    }
  })());
});
