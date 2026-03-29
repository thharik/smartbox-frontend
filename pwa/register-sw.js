// Registro do Service Worker (PWA)
// Adicione este script no final de TODAS as páginas HTML,
// logo antes do </body>, após os outros scripts.

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/pwa/service-worker.js")
      .then((reg) => {
        console.log("SW registrado:", reg.scope);

        // Escuta mensagens do SW (ex: sync-progresso)
        navigator.serviceWorker.addEventListener("message", (e) => {
          if (e.data?.tipo === "sync-progresso") {
            // Reenviar fila offline (a lógica já está em script.js via evento "online")
            window.dispatchEvent(new Event("online"));
          }
        });
      })
      .catch((err) => console.warn("SW falhou:", err));
  });
}

// Prompt de instalação (botão "Instalar app")
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Mostra botão de instalação se existir no HTML
  const btnInstalar = document.getElementById("btnInstalarApp");
  if (btnInstalar) {
    btnInstalar.classList.remove("hidden");
    btnInstalar.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Instalação:", outcome);
      deferredPrompt = null;
      btnInstalar.classList.add("hidden");
    });
  }
});
