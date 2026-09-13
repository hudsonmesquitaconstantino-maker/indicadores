/* Service Worker — Indicadores Guimas v4
   ISOLAMENTO: apaga somente caches com o prefixo deste app.
   O Cache Storage é compartilhado por ORIGEM; a versão anterior apagava
   os caches do Semanal, Despesas, Gestão e Resultados. */
const PREFIX = "guimas-indicadores-shell-v";
const CACHE  = PREFIX + "4";
const SHELL  = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const LEGADO = "indicadores-guimas-v1";   // nome antigo, fora do prefixo novo
    const ks = await caches.keys();
    await Promise.all(
      ks.filter((k) => (k.startsWith(PREFIX) && k !== CACHE) || k === LEGADO)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API do BCB passa direto

  // Navegação/documento: rede primeiro, cache como reserva, fallback HTML só aqui.
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
    );
    return;
  }

  // Demais recursos: cache primeiro, rede depois. NUNCA devolve HTML no lugar.
  e.respondWith(
    caches.match(req).then((m) => m ||
      fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; })
    )
  );
});
