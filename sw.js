/* Service Worker — Indicadores Guimas
   Estratégia: rede primeiro (para pegar atualizações do app),
   cache como reserva (para abrir sem internet).
   Chamadas à API do Banco Central NÃO são cacheadas: dado ao vivo é ao vivo. */
const CACHE = "indicadores-guimas-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Só intercepta arquivos do próprio app (mesmo domínio).
  // API do Banco Central e fontes passam direto — sempre ao vivo.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
          return r;
        })
        .catch(() =>
          caches.match(e.request).then((m) => m || caches.match("./index.html"))
        )
    );
  }
});
