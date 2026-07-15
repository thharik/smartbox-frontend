const CACHE_NAME = "smartbox-v4";
const CACHE_STATIC = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/data.js",
  "/login.html",
  "/cadastro.html",
  "/assistir.html",
  "/detalhe.html",
  "/ao-vivo.html",
  "/pwa/manifest.json",
];

// Instalar: cacheia arquivos estáticos (individualmente, sem derrubar tudo se um falhar)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        CACHE_STATIC.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] Falha ao cachear:", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Ativar: remove caches antigos
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para estáticos, network-first para API
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isAPI = url.pathname.startsWith("/auth") ||
                url.pathname.startsWith("/catalogo") ||
                url.pathname.startsWith("/favoritos") ||
                url.pathname.startsWith("/progresso") ||
                url.pathname.startsWith("/perfis") ||
                url.pathname.startsWith("/video");

  if (isAPI) {
    // Network-first: tenta servidor, cai no cache se offline
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // Cacheia resposta do catálogo para uso offline
          if (url.pathname === "/catalogo" && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first para tudo mais (HTML, CSS, JS, imagens)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        // Cacheia imagens e posters automaticamente
        if (e.request.method === "GET" && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Fallback para HTML: retorna index.html (SPA offline)
        if (e.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/index.html").then(
            (fallback) => fallback || new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
        // Fallback genérico para imagens/outros recursos: nunca deixa undefined
        return new Response("", { status: 504, statusText: "Recurso indisponível" });
      });
    })
  );
});

// Background sync: reenviar progresso salvo offline
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-progresso") {
    e.waitUntil(sincronizarProgresso());
  }
});

async function sincronizarProgresso() {
  // O script.js já cuida disso via evento "online",
  // mas o background sync garante mesmo com a aba fechada
  const clients = await self.clients.matchAll();
  clients.forEach((c) => c.postMessage({ tipo: "sync-progresso" }));
}