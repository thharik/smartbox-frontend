// ─── Helpers ─────────────────────────────────────────────────────────────────
const ls = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k),
};

const API = "https://tvxbox-backend-1.onrender.com";

function getToken()    { return ls.get("sb_token"); }
function getPerfilId() { return ls.get("sb_perfil_id"); }

function headers(comPerfil = false) {
  const h = { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` };
  if (comPerfil) h["x-perfil-id"] = getPerfilId();
  return h;
}

async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(API + path, opts);
    if (r.status === 401) { logout(); return null; }
    return await r.json();
  } catch { return null; }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function logout() {
  ls.del("sb_token"); ls.del("sb_perfil_id"); ls.del("sb_perfil_nome");
  window.location.href = "login.html";
}

function verificarLogin() {
  const pagina = window.location.pathname;
  const livres = ["/login.html", "/cadastro.html"];
  if (!getToken() && !livres.some(p => pagina.endsWith(p))) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
verificarLogin();

// ─── Estado global ────────────────────────────────────────────────────────────
let catalogoData = null;
let userData = { favoritos: [], continuarAssistindo: [] };

// ─── Carregamento de dados ────────────────────────────────────────────────────
async function carregarCatalogo() {
  const online = navigator.onLine;
  if (online) {
    const data = await apiFetch("/catalogo", { headers: headers() });
    if (data) {
      catalogoData = data;
      ls.set("sb_catalogo_cache", data);
      return;
    }
  }
  // fallback offline: cache local, depois data.js legado
  catalogoData = ls.get("sb_catalogo_cache");
  if (!catalogoData && typeof catalogo !== "undefined") catalogoData = catalogo;
  if (!catalogoData) catalogoData = { destaques:[], animes:[], series:[], aoVivo:[], youtube:[] };
}

async function carregarUserData() {
  if (!getPerfilId()) return;
  const [favs, continuar] = await Promise.all([
    apiFetch("/favoritos", { headers: headers(true) }),
    apiFetch("/progresso/continuar", { headers: headers(true) }),
  ]);
  if (favs)     userData.favoritos = favs.map(f => f.id || f.conteudo_id);
  if (continuar) userData.continuarAssistindo = continuar;
}

// ─── Múltiplos perfis ─────────────────────────────────────────────────────────
const AVATARES = ["🎬","🎮","🎵","🌟","🦊","🐼","🚀","👾"];

async function mostrarTelaPerfis() {
  const perfis = await apiFetch("/perfis", { headers: headers() });
  if (!perfis) return;

  // Se só tem 1 perfil e sem PIN, entra direto
  if (perfis.length === 1 && !perfis[0].tem_pin) {
    selecionarPerfil(perfis[0]);
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "perfilOverlay";
  overlay.style.cssText = `
    position:fixed;inset:0;background:#111;z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;
  `;

  overlay.innerHTML = `
    <h1 style="font-size:28px;color:#fff;font-weight:500">Quem está assistindo?</h1>
    <div id="perfilGrid" style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center"></div>
    <button id="btnGerenciarPerfis" style="
      background:transparent;border:1px solid #555;color:#aaa;
      padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;
    ">Gerenciar perfis</button>
  `;

  const grid = overlay.querySelector("#perfilGrid");
  perfis.forEach(p => {
    const btn = document.createElement("button");
    btn.style.cssText = `
      background:none;border:none;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;gap:10px;
    `;
    btn.innerHTML = `
      <div style="
        width:90px;height:90px;border-radius:10px;background:#222;
        font-size:36px;display:flex;align-items:center;justify-content:center;
        border:2px solid transparent;transition:border-color .2s;
      " class="perfil-avatar">${p.avatar.length === 1 || p.avatar.startsWith("avat") ? "🎬" : p.avatar}</div>
      <span style="color:#ccc;font-size:14px">${p.nome}</span>
      ${p.tem_pin ? '<span style="color:#777;font-size:12px">🔒 PIN</span>' : ""}
    `;
    btn.addEventListener("mouseenter", () =>
      btn.querySelector(".perfil-avatar").style.borderColor = "#e50914"
    );
    btn.addEventListener("mouseleave", () =>
      btn.querySelector(".perfil-avatar").style.borderColor = "transparent"
    );
    btn.addEventListener("click", () => {
      if (p.tem_pin) pedirPin(p, overlay);
      else { selecionarPerfil(p); overlay.remove(); }
    });
    grid.appendChild(btn);
  });

  // Botão criar novo perfil
  if (perfis.length < 4) {
    const btnNovo = document.createElement("button");
    btnNovo.style.cssText = `
      background:none;border:none;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;gap:10px;
    `;
    btnNovo.innerHTML = `
      <div style="
        width:90px;height:90px;border-radius:10px;background:#1a1a1a;border:2px dashed #333;
        font-size:36px;display:flex;align-items:center;justify-content:center;color:#555;
      ">+</div>
      <span style="color:#777;font-size:14px">Novo perfil</span>
    `;
    btnNovo.addEventListener("click", () => abrirModalCriarPerfil(overlay));
    grid.appendChild(btnNovo);
  }

  overlay.querySelector("#btnGerenciarPerfis").addEventListener("click", () =>
    abrirModalCriarPerfil(overlay)
  );

  document.body.appendChild(overlay);
}

function pedirPin(perfil, overlay) {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position:absolute;inset:0;background:rgba(0,0,0,.8);
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
  `;
  modal.innerHTML = `
    <h2 style="color:#fff;font-size:20px">PIN do perfil ${perfil.nome}</h2>
    <input id="pinInput" type="password" maxlength="4" placeholder="••••" style="
      background:#222;border:1px solid #444;color:#fff;font-size:28px;
      text-align:center;padding:12px 20px;border-radius:10px;width:140px;letter-spacing:8px;
    ">
    <div style="display:flex;gap:10px">
      <button id="btnConfirmarPin" style="
        background:#e50914;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:15px;
      ">Entrar</button>
      <button id="btnCancelarPin" style="
        background:#222;color:#aaa;border:1px solid #333;padding:12px 24px;border-radius:8px;cursor:pointer;
      ">Cancelar</button>
    </div>
    <p id="pinErro" style="color:#ff6b6b;font-size:14px;min-height:18px"></p>
  `;

  modal.querySelector("#btnCancelarPin").addEventListener("click", () => modal.remove());
  modal.querySelector("#btnConfirmarPin").addEventListener("click", async () => {
    const pin = modal.querySelector("#pinInput").value;
    const ok = await apiFetch(`/perfis/${perfil.id}/pin`, {
      method: "POST", headers: headers(), body: JSON.stringify({ pin })
    });
    if (ok?.ok) { selecionarPerfil(perfil); overlay.remove(); }
    else modal.querySelector("#pinErro").textContent = "PIN incorreto. Tente novamente.";
  });

  overlay.appendChild(modal);
}

function abrirModalCriarPerfil(overlay) {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position:absolute;inset:0;background:rgba(0,0,0,.85);
    display:flex;align-items:center;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="background:#1a1a1a;border-radius:16px;padding:32px;width:100%;max-width:380px;border:1px solid #2a2a2a">
      <h2 style="color:#fff;font-size:20px;margin-bottom:20px">Novo perfil</h2>
      <label style="color:#ccc;font-size:13px">Nome</label>
      <input id="nomePerfilInput" placeholder="Ex: Família" style="
        width:100%;padding:12px;margin:6px 0 14px;border-radius:8px;
        border:1px solid #333;background:#111;color:#fff;font-size:15px;box-sizing:border-box;
      ">
      <label style="color:#ccc;font-size:13px">PIN (opcional, 4 dígitos)</label>
      <input id="pinPerfilInput" type="password" maxlength="4" placeholder="••••" style="
        width:100%;padding:12px;margin:6px 0 14px;border-radius:8px;
        border:1px solid #333;background:#111;color:#fff;font-size:15px;box-sizing:border-box;
      ">
      <label style="display:flex;align-items:center;gap:8px;color:#ccc;font-size:13px;margin-bottom:18px;cursor:pointer">
        <input type="checkbox" id="infantilCheck"> Perfil infantil
      </label>
      <div style="display:flex;gap:10px">
        <button id="btnSalvarPerfil" style="flex:1;background:#e50914;color:#fff;border:none;padding:13px;border-radius:8px;cursor:pointer;font-size:15px">Criar</button>
        <button id="btnFecharModalPerfil" style="background:#222;color:#aaa;border:1px solid #333;padding:13px 18px;border-radius:8px;cursor:pointer">Cancelar</button>
      </div>
      <p id="perfilModalErro" style="color:#ff6b6b;font-size:13px;margin-top:10px;min-height:16px"></p>
    </div>
  `;

  modal.querySelector("#btnFecharModalPerfil").addEventListener("click", () => modal.remove());
  modal.querySelector("#btnSalvarPerfil").addEventListener("click", async () => {
    const nome    = modal.querySelector("#nomePerfilInput").value.trim();
    const pin     = modal.querySelector("#pinPerfilInput").value;
    const infantil= modal.querySelector("#infantilCheck").checked;
    if (!nome) { modal.querySelector("#perfilModalErro").textContent = "Nome obrigatório"; return; }

    const res = await apiFetch("/perfis", {
      method: "POST", headers: headers(),
      body: JSON.stringify({ nome, pin: pin||undefined, infantil })
    });
    if (res?.id) { modal.remove(); overlay.remove(); mostrarTelaPerfis(); }
    else modal.querySelector("#perfilModalErro").textContent = res?.mensagem || "Erro ao criar perfil";
  });

  overlay.appendChild(modal);
}

function selecionarPerfil(perfil) {
  ls.set("sb_perfil_id", perfil.id);
  ls.set("sb_perfil_nome", perfil.nome);
}

// ─── Cards com preview ao passar o mouse ─────────────────────────────────────
let previewTimeout = null;
let previewEl = null;

function criarPreview(item, cardEl) {
  removerPreview();

  previewEl = document.createElement("div");
  previewEl.className = "card-preview";

  const temVideo = item.temporadas?.[0]?.episodios?.[0]?.video;
  previewEl.innerHTML = `
    <div class="preview-media">
      ${temVideo
        ? `<video src="${temVideo}" muted autoplay playsinline loop style="width:100%;height:100%;object-fit:cover;border-radius:10px 10px 0 0"></video>`
        : `<img src="${item.poster}" style="width:100%;height:100%;object-fit:cover;border-radius:10px 10px 0 0">`
      }
    </div>
    <div class="preview-info">
      <strong>${item.titulo}</strong>
      <div class="preview-meta">
        <span class="preview-tipo">${item.tipo||""}</span>
        ${item.classificacao ? `<span class="preview-class">${item.classificacao}</span>` : ""}
        ${item.ano ? `<span>${item.ano}</span>` : ""}
      </div>
      ${item.descricao ? `<p class="preview-desc">${item.descricao.slice(0,100)}${item.descricao.length>100?"…":""}</p>` : ""}
    </div>
  `;

  document.body.appendChild(previewEl);
  posicionarPreview(cardEl);
}

function posicionarPreview(cardEl) {
  if (!previewEl) return;
  const rect = cardEl.getBoundingClientRect();
  const scrollY = window.scrollY;
  const pw = 260;
  let left = rect.left + (rect.width - pw) / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  let top = rect.bottom + scrollY + 6;
  previewEl.style.cssText = `left:${left}px;top:${top}px;width:${pw}px;`;
}

function removerPreview() {
  if (previewEl) { previewEl.remove(); previewEl = null; }
  clearTimeout(previewTimeout);
}

// ─── Criar card ───────────────────────────────────────────────────────────────
function criarCard(item, onClick) {
  const card = document.createElement("div");
  card.className = "poster-card";
  card.dataset.titulo = (item.titulo || "").toLowerCase();
  card.dataset.tipo   = item.tipo || "";

  card.innerHTML = `
    <img src="${item.poster || "assets/posters/placeholder.jpg"}" alt="${item.titulo}" loading="lazy">
    <div class="info"><h3>${item.titulo}</h3><p>${item.tipo||""}</p></div>
  `;

  card.addEventListener("click", onClick);

  // Preview hover (apenas desktop)
  if (window.matchMedia("(hover:hover)").matches) {
    card.addEventListener("mouseenter", () => {
      previewTimeout = setTimeout(() => criarPreview(item, card), 500);
    });
    card.addEventListener("mouseleave", removerPreview);
  }

  return card;
}

// ─── Renderizar rows ──────────────────────────────────────────────────────────
function renderRow(idContainer, lista, tipoClique) {
  const container = document.getElementById(idContainer);
  if (!container) return;
  container.innerHTML = "";

  lista.forEach(item => {
    let acao = () => {
      const cat = idContainer;
      window.location.href = `detalhe.html?id=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(cat)}`;
    };
    if (tipoClique === "aoVivo")  acao = () => item.video ? (window.location.href=`assistir.html?canal=${encodeURIComponent(item.id)}`) : alert("Vídeo não configurado.");
    if (tipoClique === "youtube") acao = () => abrirYoutube(item);
    container.appendChild(criarCard(item, acao));
  });
}

function buscarListaPorCategoria(cat) {
  if (!catalogoData) return [];
  if (cat === "rowDestaques") return catalogoData.destaques || [];
  if (cat === "rowAnimes")    return catalogoData.animes    || [];
  if (cat === "rowSeries")    return catalogoData.series    || [];
  return [];
}

// ─── Favoritos ────────────────────────────────────────────────────────────────
function itemEhFavorito(id) { return userData.favoritos.includes(id); }

async function alternarFavorito(itemId) {
  const res = await apiFetch("/favoritos/toggle", {
    method: "POST", headers: headers(true), body: JSON.stringify({ conteudoId: itemId })
  });
  if (res !== null) {
    if (res.favoritado) userData.favoritos.push(itemId);
    else userData.favoritos = userData.favoritos.filter(x => x !== itemId);
  } else {
    // fallback offline: localStorage
    const favs = ls.get("sb_fav_cache") || [];
    const idx = favs.indexOf(itemId);
    if (idx === -1) favs.push(itemId); else favs.splice(idx, 1);
    ls.set("sb_fav_cache", favs);
    userData.favoritos = favs;
  }
  atualizarBotaoFavorito(itemId);
  renderFavoritos();
}

function atualizarBotaoFavorito(id) {
  const btn = document.getElementById("btnFavoritoDetalhe");
  if (!btn) return;
  if (itemEhFavorito(id)) { btn.classList.add("active"); btn.textContent = "✓ Na minha lista"; }
  else                    { btn.classList.remove("active"); btn.textContent = "+ Minha lista"; }
}

function renderFavoritos() {
  const box = document.getElementById("favoritosBox");
  const row = document.getElementById("favoritosRow");
  if (!box || !row) return;

  const todos = [
    ...(catalogoData?.destaques||[]),
    ...(catalogoData?.animes||[]),
    ...(catalogoData?.series||[]),
  ];
  const itens = todos.filter(i => userData.favoritos.includes(i.id));
  row.innerHTML = "";
  if (!itens.length) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  itens.forEach(item => {
    const cat = (catalogoData.destaques||[]).find(x=>x.id===item.id) ? "rowDestaques"
              : (catalogoData.animes||[]).find(x=>x.id===item.id)    ? "rowAnimes" : "rowSeries";
    row.appendChild(criarCard(item, () =>
      window.location.href = `detalhe.html?id=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(cat)}`
    ));
  });
}

// ─── Salvar progresso ─────────────────────────────────────────────────────────
async function salvarProgresso(payload) {
  // Tenta servidor; se offline guarda no localStorage para sincronizar depois
  const res = await apiFetch("/progresso", {
    method: "POST", headers: headers(true), body: JSON.stringify(payload)
  });
  if (!res) {
    const fila = ls.get("sb_fila_sync") || [];
    fila.push({ ...payload, ts: Date.now() });
    ls.set("sb_fila_sync", fila);
  }
}

// Sincroniza fila offline quando voltar a ficar online
window.addEventListener("online", async () => {
  const fila = ls.get("sb_fila_sync") || [];
  if (!fila.length) return;
  for (const item of fila) {
    await apiFetch("/progresso", {
      method: "POST", headers: headers(true), body: JSON.stringify(item)
    });
  }
  ls.del("sb_fila_sync");
});

// ─── Continuar assistindo ────────────────────────────────────────────────────
function renderContinuarAssistindo() {
  const box  = document.getElementById("continuarBox");
  const card = document.getElementById("continuarCard");
  if (!box || !card) return;

  const lista = userData.continuarAssistindo || [];
  if (!lista.length) { box.classList.add("hidden"); return; }

  card.innerHTML = "";
  lista.forEach(item => {
    const pct = item.duration > 0 ? Math.min(100, Math.round((item.current_time / item.duration) * 100)) : 0;
    const link = item.link || `assistir.html?serie=${encodeURIComponent(item.conteudo_id || item.itemId)}&episodio=${encodeURIComponent(item.episodio_id)}&autoplay=1`;
    const bloco = document.createElement("div");
    bloco.className = "continuar-card";
    bloco.innerHTML = `
      <img src="${item.poster||item.capa||""}" alt="${item.titulo}">
      <div class="continuar-info">
        <h3>${item.titulo}</h3>
        <p>${item.ep_titulo||item.descricao||""}</p>
        <a href="${link}">▶ Continuar</a>
        <div class="continuar-progress"><div class="continuar-progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
    card.appendChild(bloco);
  });
  box.classList.remove("hidden");
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function renderHome() {
  if (!catalogoData) return;
  renderRow("rowDestaques", catalogoData.destaques||[], "detalhe");
  renderRow("rowAnimes",    catalogoData.animes||[],    "detalhe");
  renderRow("rowSeries",    catalogoData.series||[],    "detalhe");
  renderRow("rowAoVivo",    catalogoData.aoVivo||[],    "aoVivo");
  renderRow("rowYoutube",   catalogoData.youtube||[],   "youtube");
  iniciarBusca();
  iniciarFiltros();
  renderContinuarAssistindo();
  renderFavoritos();
}

// ─── Detalhe ─────────────────────────────────────────────────────────────────
function renderDetalhe() {
  const box = document.getElementById("detalheConteudo");
  if (!box) return;

  const id  = new URLSearchParams(location.search).get("id");
  const cat = new URLSearchParams(location.search).get("categoria");
  const lista = buscarListaPorCategoria(cat);
  const item  = lista.find(c => c.id === id);

  if (!item) { box.innerHTML = "<h1>Não encontrado.</h1>"; return; }

  box.innerHTML = `
    <img src="${item.poster||""}" alt="${item.titulo}">
    <div><h1>${item.titulo}</h1><p>${item.descricao||""}</p></div>
  `;

  const btnFav = document.getElementById("btnFavoritoDetalhe");
  const btnPlay= document.getElementById("btnAssistirDetalhe");
  const tempBox= document.getElementById("temporadaBox");
  const tempSel= document.getElementById("temporadaSelect");
  const epGrid = document.getElementById("episodiosGrid");

  atualizarBotaoFavorito(item.id);
  if (btnFav) btnFav.onclick = () => alternarFavorito(item.id);

  const primeiraTemp = item.temporadas?.[0];
  const primeiroEp   = primeiraTemp?.episodios?.[0];

  if (btnPlay) {
    btnPlay.onclick = () => {
      if (!primeiroEp?.video) { alert("Adicione um vídeo."); return; }
      window.location.href = `assistir.html?serie=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(cat)}&temporada=1&episodio=${encodeURIComponent(primeiroEp.id)}&autoplay=1`;
    };
  }

  if (item.tipo === "Filme" || item.tipo === "Anime") {
    if (tempBox) tempBox.style.display = "none";
    if (epGrid) epGrid.innerHTML = "";
    return;
  }

  if (tempBox) tempBox.style.display = "block";
  if (tempSel) {
    tempSel.innerHTML = "";
    item.temporadas.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.numero; opt.textContent = `Temporada ${t.numero}`;
      tempSel.appendChild(opt);
    });
  }

  function mostrarEps(num) {
    const temp = item.temporadas.find(t => t.numero == num);
    if (!epGrid || !temp) return;
    epGrid.innerHTML = "";
    temp.episodios.forEach((ep, idx) => {
      const c = document.createElement("div");
      c.className = "ep-card";
      c.innerHTML = `<h3>EP ${idx+1}</h3><p>${ep.titulo}</p><div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>`;
      c.addEventListener("click", () => {
        if (!ep.video) { alert("Sem vídeo."); return; }
        window.location.href = `assistir.html?serie=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(cat)}&temporada=${num}&episodio=${encodeURIComponent(ep.id)}&autoplay=1`;
      });
      epGrid.appendChild(c);
    });
  }

  mostrarEps(item.temporadas[0]?.numero);
  if (tempSel) tempSel.addEventListener("change", e => mostrarEps(e.target.value));
}

// ─── Player ───────────────────────────────────────────────────────────────────
function renderPlayer() {
  const playerInfo   = document.getElementById("playerInfo");
  const videoPlayer  = document.getElementById("videoPlayer");
  const btnSkip      = document.getElementById("btnSkipIntro");
  const btnNext      = document.getElementById("btnNextEpisode");
  const clickZone    = document.getElementById("videoClickZone");
  const btnFullscreen= document.getElementById("btnFullscreen");

  if (!playerInfo || !videoPlayer) return;

  // Pause/play ao clicar na área do vídeo
  if (clickZone) {
    clickZone.addEventListener("click", () => {
      if (videoPlayer.paused) videoPlayer.play().catch(()=>{});
      else videoPlayer.pause();
    });
  }

  // Botão tela cheia
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", () => {
      const shell = document.querySelector(".player-shell");
      if (!document.fullscreenElement) {
        (shell || videoPlayer).requestFullscreen?.().catch(()=>{});
      } else {
        document.exitFullscreen?.();
      }
    });
    document.addEventListener("fullscreenchange", () => {
      btnFullscreen.textContent = document.fullscreenElement ? "⛶ Sair" : "⛶ Tela cheia";
    });
  }

  const params      = new URLSearchParams(location.search);
  const canalId     = params.get("canal");
  const serieId     = params.get("serie");
  const categoria   = params.get("categoria");
  const tempNum     = parseInt(params.get("temporada"));
  const episodioId  = params.get("episodio");
  const autoplay    = params.get("autoplay") === "1";

  // Canal ao vivo
  if (canalId) {
    const canal = (catalogoData?.aoVivo||[]).find(c => c.id === canalId);
    if (!canal) { playerInfo.innerHTML = "<h1>Canal não encontrado.</h1>"; return; }
    playerInfo.innerHTML = `<h1>${canal.titulo}</h1><p>${canal.descricao||""}</p>`;
    videoPlayer.src = canal.video;
    videoPlayer.load();
    return;
  }

  const lista = buscarListaPorCategoria(categoria);
  const item  = lista.find(c => c.id === serieId);
  if (!item) { playerInfo.innerHTML = "<h1>Não encontrado.</h1>"; return; }

  const temporada = item.temporadas.find(t => t.numero === tempNum);
  const episodio  = temporada?.episodios.find(e => e.id === episodioId);
  if (!episodio)  { playerInfo.innerHTML = "<h1>Episódio não encontrado.</h1>"; return; }

  playerInfo.innerHTML = `<h1>${item.titulo}</h1><p>${episodio.titulo} — ${episodio.descricao||""}</p>`;
  videoPlayer.src = episodio.video;
  videoPlayer.load();

  videoPlayer.addEventListener("loadedmetadata", () => {
    if (autoplay) videoPlayer.play().catch(()=>{});
  }, { once: true });

  // Skip intro: pula +60s a partir do momento atual
  if (btnSkip) {
    btnSkip.classList.remove("hidden");
    btnSkip.onclick = () => {
      videoPlayer.currentTime = Math.min(videoPlayer.currentTime + 60, videoPlayer.duration - 1);
    };
  }

  // Próximo episódio
  const proximo = encontrarProximo(item, tempNum, episodio.id);
  if (btnNext) {
    if (proximo) {
      btnNext.onclick = () => {
        window.location.href = `assistir.html?serie=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(categoria)}&temporada=${proximo.temporada}&episodio=${encodeURIComponent(proximo.episodio.id)}&autoplay=1`;
      };
    } else {
      btnNext.style.display = "none";
    }
  }

  // Salvar progresso a cada 10s e ao pausar
  let saveTimer = null;
  function salvar() {
    if (!videoPlayer.duration || isNaN(videoPlayer.duration)) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      salvarProgresso({
        episodioId: episodio.id, conteudoId: item.id,
        currentTime: Math.floor(videoPlayer.currentTime),
        duration:    Math.floor(videoPlayer.duration),
      });
    }, 500);
  }

  videoPlayer.addEventListener("timeupdate", () => {
    salvar();
    // Skip intro: visível se ainda há +60s restantes
    if (btnSkip) {
      const restante = videoPlayer.duration - videoPlayer.currentTime;
      btnSkip.classList.toggle("hidden", restante <= 60);
    }
    // Próximo episódio: aparece nos últimos 60s
    if (btnNext && proximo) {
      const restante = videoPlayer.duration - videoPlayer.currentTime;
      btnNext.classList.toggle("hidden", restante > 60);
    }
  });

  videoPlayer.addEventListener("pause", salvar);
}

function encontrarProximo(item, tempNum, epId) {
  const temp = item.temporadas.find(t => t.numero === tempNum);
  if (!temp) return null;
  const idx = temp.episodios.findIndex(e => e.id === epId);
  if (idx < temp.episodios.length - 1)
    return { temporada: tempNum, episodio: temp.episodios[idx+1] };
  const proxTemp = item.temporadas.find(t => t.numero === tempNum + 1);
  if (proxTemp?.episodios.length)
    return { temporada: proxTemp.numero, episodio: proxTemp.episodios[0] };
  return null;
}

// ─── Ao Vivo / YouTube ────────────────────────────────────────────────────────
function renderAoVivoPage() {
  const grid = document.getElementById("canaisGrid");
  if (!grid) return;
  (catalogoData?.aoVivo||[]).forEach(item =>
    grid.appendChild(criarCard(item, () =>
      item.video ? (window.location.href=`assistir.html?canal=${encodeURIComponent(item.id)}`) : alert("Vídeo não configurado.")
    ))
  );
}

function abrirYoutube(item) {
  if (!item.embed) { alert("ID do YouTube não configurado."); return; }
  const box   = document.getElementById("youtubePlayerBox");
  const frame = document.getElementById("youtubeFrame");
  if (!box || !frame) return;
  frame.src = `https://www.youtube.com/embed/${item.embed}?autoplay=1`;
  box.classList.remove("hidden");
  window.scrollTo({ top: document.body.scrollHeight, behavior:"smooth" });
}

function renderYoutubePage() {
  const grid = document.getElementById("youtubeGrid");
  if (!grid) return;
  (catalogoData?.youtube||[]).forEach(item =>
    grid.appendChild(criarCard(item, () => abrirYoutube(item)))
  );
}

// ─── Busca e filtros ──────────────────────────────────────────────────────────
function iniciarBusca() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  input.addEventListener("input", () => {
    const t = input.value.toLowerCase().trim();
    document.querySelectorAll(".poster-card").forEach(c =>
      c.classList.toggle("hidden", !!(t && !c.dataset.titulo?.includes(t)))
    );
  });
}

function iniciarFiltros() {
  const botoes = document.querySelectorAll(".filter-btn");
  if (!botoes.length) return;
  botoes.forEach(btn => btn.addEventListener("click", () => {
    botoes.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    document.querySelectorAll("#rowDestaques .poster-card,#rowAnimes .poster-card,#rowSeries .poster-card")
      .forEach(c => c.classList.toggle("hidden", f !== "todos" && c.dataset.tipo !== f));
  }));
}

// ─── Menu mobile ─────────────────────────────────────────────────────────────
function iniciarMenuMobile() {
  const toggle = document.getElementById("menuToggle");
  const nav    = document.getElementById("mainNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const aberto = nav.classList.toggle("nav-aberto");
    toggle.setAttribute("aria-expanded", aberto);
    toggle.innerHTML = aberto ? "✕" : "☰";
  });

  // Fechar ao clicar fora
  document.addEventListener("click", e => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove("nav-aberto");
      toggle.innerHTML = "☰";
    }
  });
}

// ─── Usuário no header ────────────────────────────────────────────────────────
function configurarUsuario() {
  const nome   = document.getElementById("usuarioNome");
  const btnSair= document.getElementById("btnSair");
  if (nome)    nome.textContent = ls.get("sb_perfil_nome") || localStorage.getItem("usuarioEmail") || "";
  if (btnSair) btnSair.addEventListener("click", logout);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  await carregarCatalogo();

  const temPerfil = !!getPerfilId();
  const naHome    = !!(document.getElementById("rowDestaques"));

  if (!temPerfil && naHome) {
    await mostrarTelaPerfis();
  }

  await carregarUserData();
  configurarUsuario();
  renderHome();
  renderDetalhe();
  renderPlayer();
  renderAoVivoPage();
  renderYoutubePage();
  iniciarMenuMobile();
})();
