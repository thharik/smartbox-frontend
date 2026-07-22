const CACHE_NAME = "smartbox-v8";

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
  "/mangas.html",
  "/planos.html",
  "/pwa/manifest.json",
];

// ==================== INSTALL ====================

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CACHE_STATIC.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] Não foi possível cachear:", url, err);
          })
        )
      )
    )
  );

  self.skipWaiting();
});

// ==================== ACTIVATE ====================

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

// ==================== FETCH ====================

self.addEventListener("fetch", (e) => {

  // Ignora extensões do navegador
  if (!e.request.url.startsWith("http")) {
    return;
  }

  const url = new URL(e.request.url);

  // O Cloudflare Worker (vídeos, posters, capas) já cuida do próprio cache
  // do jeito certo, por trecho de arquivo. O Service Worker aqui não tem
  // nada a acrescentar nesse tráfego — só atrapalha, mascarando erros reais
  // com uma resposta genérica de fallback. Deixa passar direto pra rede.
  if (url.hostname.endsWith("workers.dev")) {
    return; // não chama e.respondWith() — o navegador cuida sozinho
  }

  const isAPI =
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/catalogo") ||
    url.pathname.startsWith("/favoritos") ||
    url.pathname.startsWith("/progresso") ||
    url.pathname.startsWith("/perfis") ||
    url.pathname.startsWith("/video") ||
    url.pathname.startsWith("/assinatura");

  // Nunca cacheia requisições Range (vídeos servidos pelo próprio backend,
  // caso ainda existam — hoje a maioria já foi migrada pro Worker acima)
  if (e.request.headers.has("range")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // ==================== API ====================

  if (isAPI) {

    e.respondWith(

      fetch(e.request, {
        cache: "no-store",
      })

        .then((res) => {

          if (
            url.pathname === "/catalogo" &&
            res.ok &&
            e.request.url.startsWith("http")
          ) {

            const clone = res.clone();

            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(e.request, clone));

          }

          return res;

        })

        .catch(() => caches.match(e.request))

    );

    return;

  }

  // ==================== CACHE FIRST ====================

  e.respondWith(

    caches.match(e.request).then((cached) => {

      if (cached) return cached;

      return fetch(e.request)

        .then((res) => {

          if (
            e.request.method === "GET" &&
            res.ok &&
            e.request.url.startsWith("http")
          ) {

            const clone = res.clone();

            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(e.request, clone));

          }

          return res;

        })

        .catch(() => {

          if (
            e.request.headers
              .get("accept")
              ?.includes("text/html")
          ) {

            return caches.match("/index.html").then(
              (fallback) =>
                fallback ||
                new Response("Offline", {
                  status: 503,
                  statusText: "Offline",
                })
            );

          }

          return new Response("", {
            status: 504,
            statusText: "Recurso indisponível",
          });

        });

    })

  );

});

// ==================== BACKGROUND SYNC ====================

self.addEventListener("sync", (e) => {

  if (e.tag === "sync-progresso") {
    e.waitUntil(sincronizarProgresso());
  }

});

async function sincronizarProgresso() {

  const clients = await self.clients.matchAll();

  clients.forEach((client) => {
    client.postMessage({
      tipo: "sync-progresso",
    });
  });

}