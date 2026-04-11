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
    // 402 = sem assinatura ativa: redireciona para login mostrando banner
    if (r.status === 402) {
      window.location.href = "login.html?sem_assinatura=1";
      return null;
    }
    return await r.json();
  } catch {
    return null;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function logout() {
  ls.del("sb_token");
  ls.del("sb_perfil_id");
  ls.del("sb_perfil_nome");
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

// ─── Normalizar dados do backend ──────────────────────────────────────────────
function normalizarCatalogo(data) {
  function normEp(ep) {
    if (!ep.video && ep.video_url) ep.video = ep.video_url;
    if (!ep.videoDublado && ep.video_url_dub) ep.videoDublado = ep.video_url_dub;
    if (!ep.videoLegendado && ep.video_url_leg) ep.videoLegendado = ep.video_url_leg;
    if (!ep.videoDublado && !ep.videoLegendado) {
      ep.videoDublado   = ep.video;
      ep.videoLegendado = ep.video;
    }
    return ep;
  }
  function normItem(item) {
    if (item.temporadas) {
      item.temporadas = item.temporadas.map(t => ({
        ...t,
        episodios: (t.episodios || []).map(normEp)
      }));
    }
    return item;
  }
  const cats = ['destaques','animes','series','aulas','mangas','aoVivo'];
  cats.forEach(cat => { if (data[cat]) data[cat] = data[cat].map(normItem); });
  return data;
}

// ─── Canais ao vivo embutidos ─────────────────────────────────────────────────
const CANAIS_BUILTIN = [
  { id:"trt-spor",        titulo:"TRT Spor (Turquia)",     tipo:"AoVivo", poster:"https://i.imgur.com/N2wGZyf.png",    video:"https://tv-trtspor1.medya.trt.com.tr/master.m3u8" },
  { id:"trt-spor2",       titulo:"TRT Spor 2 (Turquia)",   tipo:"AoVivo", poster:"https://i.imgur.com/ysKteM8.png",    video:"https://tv-trtspor2.medya.trt.com.tr/master.m3u8" },
  { id:"orf-sport",       titulo:"ORF Sport+ (Áustria)",   tipo:"AoVivo", poster:"https://i.imgur.com/MVNZ4gf.png",    video:"https://orfs.mdn.ors.at/out/u/orfs/q8c/manifest.m3u8" },
  { id:"sportitalia",     titulo:"Sportitalia Plus",       tipo:"AoVivo", poster:"https://i.imgur.com/hu56Ya5.png",    video:"https://sportsitalia-samsungitaly.amagi.tv/playlist.m3u8" },
  { id:"stadium-us",      titulo:"Stadium (EUA)",          tipo:"AoVivo", poster:"https://i.imgur.com/6ae9E8d.png",    video:"https://bcovlive-a.akamaihd.net/e64d564b9275484f85981d8c146fb915/us-east-1/5994000126001/profile_1/976f34cf5a614518b7b539cbf9812080/chunklist_ssaiV.m3u8" },
  { id:"sport-pluto",     titulo:"Sport (Pluto TV)",       tipo:"AoVivo", poster:"https://i.imgur.com/o2psAYW.png",    video:"https://service-stitcher.clusters.pluto.tv/v1/stitch/embed/hls/channel/608030eff4b6f70007e1684c/master.m3u8?deviceId=channel&deviceModel=web&deviceVersion=1.0&appVersion=1.0&deviceType=rokuChannel&deviceMake=rokuChannel&deviceDNT=1" },
  { id:"deport-tv",       titulo:"DeporTV (Argentina)",    tipo:"AoVivo", poster:"https://i.imgur.com/iyYLNRt.png",    video:"https://5fb24b460df87.streamlock.net/live-cont.ar/deportv/playlist.m3u8" },
  { id:"alkass-one",      titulo:"Alkass One (Catar)",     tipo:"AoVivo", poster:"https://i.imgur.com/10mmlha.png",    video:"https://www.tvkaista.net/stream-forwarder/get.php?x=AlkassOne" },
  { id:"alkass-two",      titulo:"Alkass Two (Catar)",     tipo:"AoVivo", poster:"https://i.imgur.com/8w61kFX.png",    video:"https://www.tvkaista.net/stream-forwarder/get.php?x=AlkassTwo" },
  { id:"cbc-sport-az",    titulo:"CBC Sport (Azerbaijão)", tipo:"AoVivo", poster:"https://upload.wikimedia.org/wikipedia/az/0/04/CBC_Sport_TV_loqo.png", video:"https://mn-nl.mncdn.com/cbcsports_live/cbcsports/playlist.m3u8" },
  { id:"anime-pluto",     titulo:"Anime (Pluto TV)",       tipo:"AoVivo", poster:"https://i.imgur.com/rhVF0eC.png",    video:"https://service-stitcher.clusters.pluto.tv/v1/stitch/embed/hls/channel/65b90daed77d450008a43345/master.m3u8?deviceId=channel&deviceModel=web&deviceVersion=1.0&appVersion=1.0&deviceType=rokuChannel&deviceMake=rokuChannel&deviceDNT=1" },
  { id:"animax-jp",       titulo:"Animax (Japão)",         tipo:"AoVivo", poster:"https://i.imgur.com/jO0qUvj.png",    video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS236&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"dubai-sport1",    titulo:"Dubai Sports 1",         tipo:"AoVivo", poster:"https://www.lyngsat.com/logo/tv/dd/dubai-sports-ae.png", video:"https://dmitnthfr.cdn.mgmlcdn.com/dubaisports/smil:dubaisports.stream.smil/chunklist.m3u8" },
  { id:"abu-dhabi-sport1",titulo:"Abu Dhabi Sports 1",     tipo:"AoVivo", poster:"https://i.imgur.com/7cNke07.png",    video:"https://vo-live.cdb.cdn.orange.com/Content/Channel/AbuDhabiSportsChannel1/HLS/index.m3u8" },
  { id:"racing-com-au",   titulo:"Racing.com (Austrália)", tipo:"AoVivo", poster:"https://i.imgur.com/pma0OCf.png",    video:"https://racingvic-i.akamaized.net/hls/live/598695/racingvic/1500.m3u8" },
  { id:"pfl-mma",         titulo:"PFL MMA",                tipo:"AoVivo", poster:"https://i.imgur.com/zScgLTv.png",    video:"https://service-stitcher.clusters.pluto.tv/v1/stitch/embed/hls/channel/654a299cab05240008a12639/master.m3u8?deviceId=channel&deviceModel=web&deviceVersion=1.0&appVersion=1.0&deviceType=rokuChannel&deviceMake=rokuChannel&deviceDNT=1" },
];

function mesclarCanais(base, extras) {
  const ids = new Set(base.map(c => c.id));
  return [...base, ...extras.filter(c => !ids.has(c.id))];
}

async function carregarCatalogo() {
  if (navigator.onLine) {
    const data = await apiFetch("/catalogo", { headers: headers() });
    if (data) {
      catalogoData = normalizarCatalogo(data);
      // Canais builtin só aparecem com assinatura ativa (data != null)
      catalogoData.aoVivo = mesclarCanais(catalogoData.aoVivo || [], CANAIS_BUILTIN);
      try {
        const canaisExt = await apiFetch("/canais", { headers: headers() });
        const extras = Array.isArray(canaisExt) ? canaisExt : [];
        catalogoData.aoVivo = mesclarCanais(catalogoData.aoVivo, extras);
      } catch { /* ignora */ }
      ls.set("sb_catalogo_cache", catalogoData);
      return;
    }
    // data==null: pode ser 402 (sem assinatura) — redirecionamento já feito no apiFetch
    return;
  }
  // Fallback offline: só usa cache salvo de sessão anterior (usuário já tinha assinatura)
  const cache = ls.get("sb_catalogo_cache");
  if (cache) {
    catalogoData = cache;
    catalogoData.aoVivo = mesclarCanais(catalogoData.aoVivo || [], CANAIS_BUILTIN);
  } else {
    catalogoData = { destaques:[], animes:[], series:[], aoVivo:[], mangas:[], aulas:[] };
  }
}

async function carregarUserData() {
  if (!getPerfilId()) return;
  const [favs, continuar] = await Promise.all([
    apiFetch("/favoritos",           { headers: headers(true) }),
    apiFetch("/progresso/continuar", { headers: headers(true) }),
  ]);
  if (favs)     userData.favoritos            = favs.map(f => f.id || f.conteudo_id);
  if (continuar) userData.continuarAssistindo = continuar;
}

// ─── Múltiplos perfis ─────────────────────────────────────────────────────────
async function mostrarTelaPerfis() {
  const perfis = await apiFetch("/perfis", { headers: headers() });
  if (!perfis) return;
  if (perfis.length === 1 && !perfis[0].tem_pin) { selecionarPerfil(perfis[0]); return; }

  const overlay = document.createElement("div");
  overlay.id = "perfilOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:#111;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;";
  overlay.innerHTML = `
    <h1 style="font-size:28px;color:#fff;font-weight:500">Quem está assistindo?</h1>
    <div id="perfilGrid" style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center"></div>
    <button id="btnGerenciarPerfis" style="background:transparent;border:1px solid #555;color:#aaa;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;">Gerenciar perfis</button>
  `;
  const grid = overlay.querySelector("#perfilGrid");
  perfis.forEach(p => {
    const btn = document.createElement("button");
    btn.style.cssText = "background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;";
    btn.innerHTML = `
      <div style="width:90px;height:90px;border-radius:10px;background:#222;font-size:36px;display:flex;align-items:center;justify-content:center;border:2px solid transparent;transition:border-color .2s;" class="perfil-avatar">${p.avatar.length === 1 || p.avatar.startsWith("avat") ? "🎬" : p.avatar}</div>
      <span style="color:#ccc;font-size:14px">${p.nome}</span>
      ${p.tem_pin ? '<span style="color:#777;font-size:12px">🔒 PIN</span>' : ""}
    `;
    btn.addEventListener("mouseenter", () => btn.querySelector(".perfil-avatar").style.borderColor = "#e50914");
    btn.addEventListener("mouseleave", () => btn.querySelector(".perfil-avatar").style.borderColor = "transparent");
    btn.addEventListener("click", () => { if (p.tem_pin) pedirPin(p, overlay); else { selecionarPerfil(p); overlay.remove(); } });
    grid.appendChild(btn);
  });
  if (perfis.length < 4) {
    const btnNovo = document.createElement("button");
    btnNovo.style.cssText = "background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;";
    btnNovo.innerHTML = `<div style="width:90px;height:90px;border-radius:10px;background:#1a1a1a;border:2px dashed #333;font-size:36px;display:flex;align-items:center;justify-content:center;color:#555;">+</div><span style="color:#777;font-size:14px">Novo perfil</span>`;
    btnNovo.addEventListener("click", () => abrirModalCriarPerfil(overlay));
    grid.appendChild(btnNovo);
  }
  overlay.querySelector("#btnGerenciarPerfis").addEventListener("click", () => abrirModalCriarPerfil(overlay));
  document.body.appendChild(overlay);
}

function pedirPin(perfil, overlay) {
  const modal = document.createElement("div");
  modal.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,.8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;";
  modal.innerHTML = `
    <h2 style="color:#fff;font-size:20px">PIN do perfil ${perfil.nome}</h2>
    <input id="pinInput" type="password" maxlength="4" placeholder="••••" style="background:#222;border:1px solid #444;color:#fff;font-size:28px;text-align:center;padding:12px 20px;border-radius:10px;width:140px;letter-spacing:8px;">
    <div style="display:flex;gap:10px">
      <button id="btnConfirmarPin" style="background:#e50914;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:15px">Entrar</button>
      <button id="btnCancelarPin"  style="background:#222;color:#aaa;border:1px solid #333;padding:12px 24px;border-radius:8px;cursor:pointer">Cancelar</button>
    </div>
    <p id="pinErro" style="color:#ff6b6b;font-size:14px;min-height:18px"></p>
  `;
  modal.querySelector("#btnCancelarPin").addEventListener("click", () => modal.remove());
  modal.querySelector("#btnConfirmarPin").addEventListener("click", async () => {
    const pin = modal.querySelector("#pinInput").value;
    const ok  = await apiFetch(`/perfis/${perfil.id}/pin`, { method:"POST", headers:headers(), body:JSON.stringify({ pin }) });
    if (ok?.ok) { selecionarPerfil(perfil); overlay.remove(); }
    else modal.querySelector("#pinErro").textContent = "PIN incorreto. Tente novamente.";
  });
  overlay.appendChild(modal);
}

function abrirModalCriarPerfil(overlay) {
  const modal = document.createElement("div");
  modal.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;";
  modal.innerHTML = `
    <div style="background:#1a1a1a;border-radius:16px;padding:32px;width:100%;max-width:380px;border:1px solid #2a2a2a">
      <h2 style="color:#fff;font-size:20px;margin-bottom:20px">Novo perfil</h2>
      <label style="color:#ccc;font-size:13px">Nome</label>
      <input id="nomePerfilInput" placeholder="Ex: Família" style="width:100%;padding:12px;margin:6px 0 14px;border-radius:8px;border:1px solid #333;background:#111;color:#fff;font-size:15px;box-sizing:border-box;">
      <label style="color:#ccc;font-size:13px">PIN (opcional, 4 dígitos)</label>
      <input id="pinPerfilInput" type="password" maxlength="4" placeholder="••••" style="width:100%;padding:12px;margin:6px 0 14px;border-radius:8px;border:1px solid #333;background:#111;color:#fff;font-size:15px;box-sizing:border-box;">
      <label style="display:flex;align-items:center;gap:8px;color:#ccc;font-size:13px;margin-bottom:18px;cursor:pointer"><input type="checkbox" id="infantilCheck"> Perfil infantil</label>
      <div style="display:flex;gap:10px">
        <button id="btnSalvarPerfil"      style="flex:1;background:#e50914;color:#fff;border:none;padding:13px;border-radius:8px;cursor:pointer;font-size:15px">Criar</button>
        <button id="btnFecharModalPerfil" style="background:#222;color:#aaa;border:1px solid #333;padding:13px 18px;border-radius:8px;cursor:pointer">Cancelar</button>
      </div>
      <p id="perfilModalErro" style="color:#ff6b6b;font-size:13px;margin-top:10px;min-height:16px"></p>
    </div>
  `;
  modal.querySelector("#btnFecharModalPerfil").addEventListener("click", () => modal.remove());
  modal.querySelector("#btnSalvarPerfil").addEventListener("click", async () => {
    const nome     = modal.querySelector("#nomePerfilInput").value.trim();
    const pin      = modal.querySelector("#pinPerfilInput").value;
    const infantil = modal.querySelector("#infantilCheck").checked;
    if (!nome) { modal.querySelector("#perfilModalErro").textContent = "Nome obrigatório"; return; }
    const res = await apiFetch("/perfis", { method:"POST", headers:headers(), body:JSON.stringify({ nome, pin: pin || undefined, infantil }) });
    if (res?.id) { modal.remove(); overlay.remove(); mostrarTelaPerfis(); }
    else modal.querySelector("#perfilModalErro").textContent = res?.mensagem || "Erro ao criar perfil";
  });
  overlay.appendChild(modal);
}

function selecionarPerfil(perfil) {
  ls.set("sb_perfil_id",   perfil.id);
  ls.set("sb_perfil_nome", perfil.nome);
}

// ─── Preview hover nos cards ──────────────────────────────────────────────────
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
        : `<img src="${item.poster}" style="width:100%;height:100%;object-fit:cover;border-radius:10px 10px 0 0">`}
    </div>
    <div class="preview-info">
      <strong>${item.titulo}</strong>
      <div class="preview-meta">
        <span class="preview-tipo">${item.tipo || ""}</span>
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
  const pw   = 260;
  let left   = rect.left + (rect.width - pw) / 2;
  left       = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  previewEl.style.cssText = `left:${left}px;top:${rect.bottom + window.scrollY + 6}px;width:${pw}px;`;
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
    <div class="info"><h3>${item.titulo}</h3><p>${item.tipo || ""}</p></div>
  `;
  card.addEventListener("click", onClick);
  if (window.matchMedia("(hover:hover)").matches) {
    card.addEventListener("mouseenter", () => { previewTimeout = setTimeout(() => criarPreview(item, card), 500); });
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
    let acao = () => window.location.href = `detalhe.html?id=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(idContainer)}`;
    if (tipoClique === "aoVivo") {
      acao = () => item.video ? (window.location.href = `assistir.html?canal=${encodeURIComponent(item.id)}`) : alert("Vídeo não configurado.");
    }
    container.appendChild(criarCard(item, acao));
  });
}

function buscarListaPorCategoria(cat) {
  if (!catalogoData) return [];
  const mapa = { rowDestaques:"destaques", rowAnimes:"animes", rowSeries:"series", rowAulas:"aulas", rowMangas:"mangas" };
  return catalogoData[mapa[cat]] || [];
}

// CORRIGIDO: busca em todas as categorias para montar links corretos mesmo sem saber a categoria
function buscarItemEmTodoCatalogo(id) {
  if (!catalogoData) return { item:null, cat:null };
  const categorias = [
    { key:"destaques", cat:"rowDestaques" },
    { key:"animes",    cat:"rowAnimes"    },
    { key:"series",    cat:"rowSeries"    },
    { key:"aulas",     cat:"rowAulas"     },
    { key:"mangas",    cat:"rowMangas"    },
  ];
  for (const { key, cat } of categorias) {
    const item = (catalogoData[key] || []).find(x => x.id === id);
    if (item) return { item, cat };
  }
  return { item:null, cat:null };
}

// ─── Favoritos ────────────────────────────────────────────────────────────────
function itemEhFavorito(id) { return userData.favoritos.includes(id); }

async function alternarFavorito(itemId) {
  const res = await apiFetch("/favoritos/toggle", { method:"POST", headers:headers(true), body:JSON.stringify({ conteudoId: itemId }) });
  if (res !== null) {
    if (res.favoritado) userData.favoritos.push(itemId);
    else userData.favoritos = userData.favoritos.filter(x => x !== itemId);
  } else {
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
  else { btn.classList.remove("active"); btn.textContent = "+ Minha lista"; }
}

function renderFavoritos() {
  const box = document.getElementById("favoritosBox");
  const row = document.getElementById("favoritosRow");
  if (!box || !row) return;
  const todos = [...(catalogoData?.destaques||[]),...(catalogoData?.animes||[]),...(catalogoData?.series||[]),...(catalogoData?.aulas||[]),...(catalogoData?.aoVivo||[])];
  const itens = todos.filter(i => userData.favoritos.includes(i.id));
  row.innerHTML = "";
  if (!itens.length) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  itens.forEach(item => {
    const ehCanal = (catalogoData?.aoVivo || []).find(x => x.id === item.id);
    if (ehCanal) {
      row.appendChild(criarCard(item, () => item.video ? (window.location.href=`assistir.html?canal=${encodeURIComponent(item.id)}`) : alert("Vídeo não configurado.")));
      return;
    }
    const { cat } = buscarItemEmTodoCatalogo(item.id);
    row.appendChild(criarCard(item, () => window.location.href=`detalhe.html?id=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(cat||"rowAnimes")}`));
  });
}

// ─── Salvar progresso ─────────────────────────────────────────────────────────
async function salvarProgresso(payload) {
  const res = await apiFetch("/progresso", { method:"POST", headers:headers(true), body:JSON.stringify(payload) });
  if (!res) {
    const fila = ls.get("sb_fila_sync") || [];
    fila.push({ ...payload, ts: Date.now() });
    ls.set("sb_fila_sync", fila);
  }
}

window.addEventListener("online", async () => {
  const fila = ls.get("sb_fila_sync") || [];
  if (!fila.length) return;
  for (const item of fila) await apiFetch("/progresso", { method:"POST", headers:headers(true), body:JSON.stringify(item) });
  ls.del("sb_fila_sync");
});

// ─── Continuar assistindo ─────────────────────────────────────────────────────
function renderContinuarAssistindo() {
  const box  = document.getElementById("continuarBox");
  const row  = document.getElementById("continuarCard");
  if (!box || !row) return;

  // Ordena: mais recente primeiro (o backend já retorna assim, mas garantimos)
  const lista = [...(userData.continuarAssistindo || [])];
  if (!lista.length) { box.classList.add("hidden"); return; }

  row.innerHTML = "";

  lista.forEach(item => {
    const pct = item.duration > 0 ? Math.min(100, Math.round((item.current_time / item.duration) * 100)) : 0;
    const { cat } = buscarItemEmTodoCatalogo(item.conteudo_id);
    const catUrl  = cat || "rowAnimes";
    const link    = `assistir.html?serie=${encodeURIComponent(item.conteudo_id)}&categoria=${encodeURIComponent(catUrl)}&temporada=1&episodio=${encodeURIComponent(item.episodio_id)}&autoplay=1`;

    const restanteSeg = item.duration - item.current_time;
    const restanteMin = Math.max(0, Math.round(restanteSeg / 60));
    const restanteTxt = restanteMin > 1 ? `${restanteMin}min restantes` : "Quase finalizado";

    const bloco = document.createElement("div");
    bloco.className = "continuar-mini-card";
    bloco.innerHTML = `
      <a href="${link}" class="continuar-mini-link">
        <div class="continuar-mini-thumb">
          <img src="${item.poster || item.capa || "assets/posters/placeholder.jpg"}" alt="${item.titulo || ""}">
          <div class="continuar-mini-overlay">▶</div>
        </div>
        <div class="continuar-mini-info">
          <div class="continuar-mini-progress"><div class="continuar-mini-fill" style="width:${pct}%"></div></div>
          <p class="continuar-mini-titulo">${item.titulo || "Sem título"}</p>
          <p class="continuar-mini-ep">${item.ep_titulo || ""}</p>
          <p class="continuar-mini-resto">${restanteTxt}</p>
        </div>
      </a>
    `;
    row.appendChild(bloco);
  });
  box.classList.remove("hidden");
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function renderHome() {
  if (!catalogoData) return;
  renderRow("rowDestaques", catalogoData.destaques || [], "detalhe");
  renderRow("rowAnimes",    catalogoData.animes    || [], "detalhe");
  renderRow("rowSeries",    catalogoData.series    || [], "detalhe");
  renderCanaisAoVivo("lista-canais", catalogoData.aoVivo || []);
  iniciarBusca();
  iniciarFiltros();
  renderContinuarAssistindo();
  renderFavoritos();
}

function renderAulasPage() {
  if (!document.getElementById("rowAulas")) return;
  renderRow("rowAulas", catalogoData?.aulas || [], "detalhe");
}

function renderMangasPage() {
  const row = document.getElementById("rowMangas");
  if (!row) return;
  (catalogoData?.mangas || []).forEach(manga => row.appendChild(criarCard(manga, () => abrirCapitulosManga(manga))));
}

async function abrirCapitulosManga(manga) {
  const capBox    = document.getElementById("capitulosBox");
  const capGrid   = document.getElementById("capitulosGrid");
  const titulo    = document.getElementById("mangaSelecionadoTitulo");
  const btnVoltar = document.getElementById("btnVoltarMangas");
  if (!capBox || !capGrid) return;
  titulo.textContent = manga.titulo;
  capGrid.innerHTML  = "<p style='color:#888'>Carregando capítulos...</p>";
  capBox.classList.remove("hidden");
  window.scrollTo({ top: capBox.offsetTop - 80, behavior:"smooth" });
  const capitulos = await apiFetch(`/mangas/${manga.id}/capitulos`, { headers: headers() });
  const lista     = capitulos || manga.capitulos || [];
  capGrid.innerHTML = "";
  if (!lista.length) { capGrid.innerHTML = "<p style='color:#888'>Nenhum capítulo disponível.</p>"; return; }
  lista.forEach(cap => {
    const card = document.createElement("div");
    card.className = "capitulo-card";
    card.innerHTML = `<h3>Cap. ${cap.numero}</h3><p>${cap.titulo}</p>`;
    card.addEventListener("click", () => abrirLeitorManga(cap, manga));
    capGrid.appendChild(card);
  });
  btnVoltar.addEventListener("click", () => { capBox.classList.add("hidden"); window.scrollTo({ top:0, behavior:"smooth" }); }, { once:true });
}

function abrirLeitorManga(cap, manga) {
  const overlay   = document.getElementById("mangaReaderOverlay");
  const frame     = document.getElementById("readerFrame");
  const titulo    = document.getElementById("readerTitulo");
  const btnFechar = document.getElementById("btnReaderFechar");
  if (!overlay || !frame) return;
  const pdfUrl = cap.pdfUrl?.startsWith("http") ? cap.pdfUrl : `${API}/video/pdf/${cap.pdfUrl}`;
  titulo.textContent = `${manga.titulo} — Cap. ${cap.numero}: ${cap.titulo}`;
  frame.src = pdfUrl;
  overlay.classList.add("ativo");
  document.body.style.overflow = "hidden";
  overlay.requestFullscreen?.().catch(() => {});
  btnFechar.onclick = () => { overlay.classList.remove("ativo"); frame.src=""; document.body.style.overflow=""; if (document.fullscreenElement) document.exitFullscreen?.(); };
}

// ─── Detalhe ─────────────────────────────────────────────────────────────────
function renderDetalhe() {
  const box = document.getElementById("detalheConteudo");
  if (!box) return;

  const params = new URLSearchParams(location.search);
  const id     = params.get("id");
  const cat    = params.get("categoria");

  let item = buscarListaPorCategoria(cat).find(c => c.id === id);
  if (!item) item = buscarItemEmTodoCatalogo(id).item;
  if (!item) { box.innerHTML = "<h1>Não encontrado.</h1>"; return; }

  box.innerHTML = `
    <img src="${item.poster || ""}" alt="${item.titulo}">
    <div><h1>${item.titulo}</h1><p>${item.descricao || ""}</p></div>
  `;

  const btnFav  = document.getElementById("btnFavoritoDetalhe");
  const btnPlay = document.getElementById("btnAssistirDetalhe");
  const audioBox= document.getElementById("audioSelectorBox");
  const tempBox = document.getElementById("temporadaBox");
  const tempSel = document.getElementById("temporadaSelect");
  const epGrid  = document.getElementById("episodiosGrid");

  const catReal      = cat || buscarItemEmTodoCatalogo(item.id).cat || "rowAnimes";
  const primeiraTemp = item.temporadas?.[0];
  const primeiroEp   = primeiraTemp?.episodios?.[0];

  // Detecta se o conteúdo tem áudio separado (dub ≠ leg)
  const temAudio = (item.temporadas || []).some(t =>
    (t.episodios || []).some(e => e.videoDublado && e.videoLegendado && e.videoDublado !== e.videoLegendado)
  );

  // Selector de áudio
  let audioModo = ls.get("sb_audio_modo") || "dublado";
  if (audioBox) {
    if (temAudio) {
      audioBox.style.display = "flex";
      audioBox.querySelectorAll(".audio-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.audio === audioModo);
        btn.addEventListener("click", () => {
          audioModo = btn.dataset.audio;
          ls.set("sb_audio_modo", audioModo);
          audioBox.querySelectorAll(".audio-btn").forEach(b => b.classList.toggle("active", b.dataset.audio === audioModo));
        });
      });
    } else {
      audioBox.style.display = "none";
    }
  }

  atualizarBotaoFavorito(item.id);
  if (btnFav)  btnFav.onclick = () => alternarFavorito(item.id);
  if (btnPlay) btnPlay.onclick = () => {
    if (!primeiroEp) { alert("Nenhum episódio disponível."); return; }
    const src = audioModo === "legendado" ? primeiroEp.videoLegendado : primeiroEp.videoDublado;
    if (!src && !primeiroEp.video) { alert("Vídeo não configurado."); return; }
    window.location.href = `assistir.html?serie=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(catReal)}&temporada=${primeiraTemp.numero}&episodio=${encodeURIComponent(primeiroEp.id)}&audio=${audioModo}&autoplay=1`;
  };

  // Filmes com 1 ep não precisam de grade
  const totalEps = item.temporadas?.reduce((s, t) => s + (t.episodios?.length || 0), 0) || 0;
  if (item.tipo === "Filme" && totalEps <= 1) {
    if (tempBox) tempBox.style.display = "none";
    if (epGrid)  epGrid.innerHTML = "";
    return;
  }

  const tempsComEps = (item.temporadas || []).filter(t => t.episodios?.length > 0);
  if (!tempsComEps.length) {
    if (tempBox) tempBox.style.display = "none";
    if (epGrid)  epGrid.innerHTML = "<p style='color:#888;padding:16px 0'>Nenhum episódio cadastrado ainda.</p>";
    return;
  }

  if (tempBox) tempBox.style.display = "block";
  if (tempSel) {
    tempSel.innerHTML = "";
    tempsComEps.forEach(t => {
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
      const prog = (userData.continuarAssistindo || []).find(p => p.episodio_id === ep.id);
      const pct  = prog?.duration > 0 ? Math.min(100, Math.round((prog.current_time / prog.duration) * 100)) : 0;
      c.innerHTML = `
        <h3>EP ${ep.numero || idx + 1}</h3>
        <p>${ep.titulo}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      `;
      c.addEventListener("click", () => {
        const src = audioModo === "legendado" ? ep.videoLegendado : ep.videoDublado;
        if (!src && !ep.video) { alert("Sem vídeo configurado."); return; }
        window.location.href = `assistir.html?serie=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(catReal)}&temporada=${num}&episodio=${encodeURIComponent(ep.id)}&audio=${audioModo}&autoplay=1`;
      });
      epGrid.appendChild(c);
    });
  }

  mostrarEps(tempsComEps[0]?.numero);
  if (tempSel) tempSel.addEventListener("change", e => mostrarEps(e.target.value));
}

// ─── Player ───────────────────────────────────────────────────────────────────
let hlsInstance = null;

function carregarVideoHLS(videoEl, src) {
  if (!src) return;
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  const ehHLS = src.includes(".m3u8");
  if (ehHLS && typeof Hls !== "undefined" && Hls.isSupported()) {
    hlsInstance = new Hls({ enableWorker:true, lowLatencyMode:true });
    hlsInstance.loadSource(src);
    hlsInstance.attachMedia(videoEl);
  } else {
    videoEl.src = src;
    videoEl.load();
  }
}

// ── NOVO: Preview na barra de progresso do vídeo ─────────────────────────────
// Mostra um tooltip com o tempo quando o usuário passa o mouse na região dos controles
function instalarPreviewProgressbar(videoEl) {
  const anterior = document.getElementById("progressTooltip");
  if (anterior) anterior.remove();

  const shell = videoEl.closest(".player-shell") || videoEl.parentElement;

  const tooltip = document.createElement("div");
  tooltip.id = "progressTooltip";
  tooltip.style.cssText = `
    position:absolute; bottom:62px; pointer-events:none; display:none; z-index:30;
    background:rgba(0,0,0,.88); color:#fff; padding:5px 12px; border-radius:6px;
    font-size:13px; font-weight:700; white-space:nowrap;
    box-shadow:0 2px 10px rgba(0,0,0,.6); transform:translateX(-50%);
  `;
  shell.appendChild(tooltip);

  function formatarTempo(seg) {
    const s  = Math.floor(Math.max(0, seg));
    const h  = Math.floor(s / 3600);
    const m  = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`
      : `${m}:${String(ss).padStart(2,"0")}`;
  }

  videoEl.addEventListener("mousemove", e => {
    if (!videoEl.duration || isNaN(videoEl.duration)) return;
    const rect   = videoEl.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    // A progressbar nativa fica nos últimos ~48px do elemento vídeo
    if (mouseY < rect.height - 48) { tooltip.style.display = "none"; return; }
    const mouseX  = e.clientX - rect.left;
    const pct     = Math.max(0, Math.min(1, mouseX / rect.width));
    tooltip.textContent   = formatarTempo(pct * videoEl.duration);
    tooltip.style.display = "block";
    tooltip.style.left    = `${mouseX}px`;
  });

  videoEl.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
}

function renderPlayer() {
  const playerInfo  = document.getElementById("playerInfo");
  const videoPlayer = document.getElementById("videoPlayer");
  const btnSkip     = document.getElementById("btnSkipIntro");
  const btnNext     = document.getElementById("btnNextEpisode");
  const clickZone   = document.getElementById("videoClickZone");

  if (!playerInfo || !videoPlayer) return;

  // Instala preview na progressbar
  instalarPreviewProgressbar(videoPlayer);

  if (clickZone) {
    clickZone.addEventListener("click", () => {
      if (videoPlayer.paused) videoPlayer.play().catch(() => {}); else videoPlayer.pause();
    });
  }

  // Tela cheia automática no primeiro play
  const shell = document.querySelector(".player-shell");
  videoPlayer.addEventListener("play", () => {
    const alvo = shell || videoPlayer;
    if (!document.fullscreenElement) alvo.requestFullscreen?.().catch(() => alvo.webkitRequestFullscreen?.());
  }, { once:true });

  const params    = new URLSearchParams(location.search);
  const canalId   = params.get("canal");
  const serieId   = params.get("serie");
  const categoria = params.get("categoria");
  const autoplay  = params.get("autoplay") === "1";

  // ── Canal ao vivo ─────────────────────────────────────────────────────────
  if (canalId) {
    const canal = (catalogoData?.aoVivo || []).find(c => c.id === canalId);
    if (!canal) { playerInfo.innerHTML = "<h1>Canal não encontrado.</h1>"; return; }
    function renderInfoCanal() {
      const favAtivo = itemEhFavorito(canal.id);
      playerInfo.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div><h1>${canal.titulo}</h1><p>${canal.descricao || ""}</p></div>
          <button id="btnFavCanal" style="padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:bold;background:${favAtivo?"#e50914":"#2a2a2a"};color:#fff;border:1px solid ${favAtivo?"#e50914":"#444"};font-size:14px;transition:all .2s;">${favAtivo?"✓ Na minha lista":"+ Minha lista"}</button>
        </div>`;
      document.getElementById("btnFavCanal")?.addEventListener("click", async () => { await alternarFavorito(canal.id); renderInfoCanal(); renderFavoritos(); });
    }
    renderInfoCanal();
    carregarVideoHLS(videoPlayer, canal.video);
    if (autoplay) videoPlayer.addEventListener("canplay", () => videoPlayer.play().catch(() => {}), { once:true });
    return;
  }

  // ── Série/Anime/Filme ─────────────────────────────────────────────────────
  let item = buscarListaPorCategoria(categoria).find(c => c.id === serieId);
  // CORRIGIDO: fallback caso categoria da URL não bata
  if (!item) item = buscarItemEmTodoCatalogo(serieId).item;
  if (!item) { playerInfo.innerHTML = "<h1>Não encontrado.</h1>"; return; }

  let tempNumAtual    = parseInt(params.get("temporada")) || item.temporadas?.[0]?.numero || 1;
  let episodioIdAtual = params.get("episodio") || item.temporadas?.[0]?.episodios?.[0]?.id;
  let audioModo = params.get("audio") || ls.get("sb_audio_modo") || "dublado";
  ls.set("sb_audio_modo", audioModo);

  function getEpisodioAtual() {
    return item.temporadas.find(t => t.numero === tempNumAtual)?.episodios.find(e => e.id === episodioIdAtual) || null;
  }

  function carregarVideo(ep) {
    if (!ep) { playerInfo.innerHTML = "<h1>Episódio não encontrado.</h1>"; return; }
    let videoUrl = ep.video;
    if (audioModo === "legendado" && ep.videoLegendado) videoUrl = ep.videoLegendado;
    else if (audioModo === "dublado" && ep.videoDublado) videoUrl = ep.videoDublado;
    playerInfo.innerHTML = `<h1>${item.titulo}</h1><p>${ep.titulo}${ep.descricao?" — "+ep.descricao:""}</p>`;
    carregarVideoHLS(videoPlayer, videoUrl);
    videoPlayer.addEventListener("loadedmetadata", () => { if (autoplay) videoPlayer.play().catch(() => {}); }, { once:true });
    renderEpisodiosBar();
    atualizarBotaoProximo();
  }

  function injetarControlesPlayer() {
    document.getElementById("playerControlesBar")?.remove();
    const bar = document.createElement("div");
    bar.id = "playerControlesBar";
    bar.style.cssText = "background:#111;padding:20px 24px;border-top:1px solid #222;max-width:1400px;margin:0 auto;";

    // Linha 1: temporada + próximo + áudio
    const linha1 = document.createElement("div");
    linha1.style.cssText = "display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px;";

    if (item.temporadas.length > 1) {
      const labelTemp  = document.createElement("span");
      labelTemp.textContent = "Temporada:";
      labelTemp.style.cssText = "color:#aaa;font-size:14px;font-weight:600;";
      const selectTemp = document.createElement("select");
      selectTemp.id = "playerTempSelect";
      selectTemp.style.cssText = "background:#222;color:#fff;border:1px solid #444;padding:8px 14px;border-radius:8px;font-size:14px;cursor:pointer;";
      item.temporadas.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.numero; opt.textContent = `Temporada ${t.numero}`;
        if (t.numero === tempNumAtual) opt.selected = true;
        selectTemp.appendChild(opt);
      });
      selectTemp.addEventListener("change", () => {
        tempNumAtual = parseInt(selectTemp.value);
        episodioIdAtual = item.temporadas.find(t => t.numero === tempNumAtual)?.episodios?.[0]?.id;
        carregarVideo(getEpisodioAtual());
      });
      linha1.appendChild(labelTemp);
      linha1.appendChild(selectTemp);
    }

    linha1.appendChild(Object.assign(document.createElement("div"), { style:"flex:1" }));

    // ── NOVO: Botão próximo episódio na barra de controles ─────────────────
    const btnProximoBar = document.createElement("button");
    btnProximoBar.id = "btnProximoBar";
    btnProximoBar.textContent = "Próximo ▶";
    btnProximoBar.style.cssText = "padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;border:1px solid #e50914;background:#e50914;color:#fff;display:none;transition:opacity .2s;";
    btnProximoBar.addEventListener("click", () => {
      const proximo = encontrarProximo(item, tempNumAtual, episodioIdAtual);
      if (!proximo) return;
      episodioIdAtual = proximo.episodio.id;
      tempNumAtual    = proximo.temporada;
      const sel = document.getElementById("playerTempSelect");
      if (sel) sel.value = tempNumAtual;
      carregarVideo(proximo.episodio);
      window.scrollTo({ top:0, behavior:"smooth" });
    });
    linha1.appendChild(btnProximoBar);

    // Botões dublado/legendado
    const audioBtns = document.createElement("div");
    audioBtns.style.cssText = "display:flex;gap:8px;";
    ["dublado","legendado"].forEach(modo => {
      const btn = document.createElement("button");
      btn.dataset.audio = modo;
      btn.textContent   = modo === "dublado" ? "🔊 Dublado" : "💬 Legendado";
      btn.style.cssText = `padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;border:1px solid #444;transition:all .2s;background:${audioModo===modo?"#e50914":"#222"};color:#fff;border-color:${audioModo===modo?"#e50914":"#444"};`;
      btn.addEventListener("click", () => {
        audioModo = modo; ls.set("sb_audio_modo", audioModo);
        audioBtns.querySelectorAll("button").forEach(b => {
          const a = b.dataset.audio === audioModo;
          b.style.background = a ? "#e50914" : "#222";
          b.style.borderColor = a ? "#e50914" : "#444";
        });
        const ep = getEpisodioAtual(); if (!ep) return;
        const t  = videoPlayer.currentTime;
        let url  = ep.video;
        if (audioModo === "legendado" && ep.videoLegendado) url = ep.videoLegendado;
        else if (audioModo === "dublado" && ep.videoDublado) url = ep.videoDublado;
        videoPlayer.src = url; videoPlayer.load();
        videoPlayer.addEventListener("loadedmetadata", () => { videoPlayer.currentTime = t; videoPlayer.play().catch(() => {}); }, { once:true });
      });
      audioBtns.appendChild(btn);
    });
    linha1.appendChild(audioBtns);
    bar.appendChild(linha1);

    // Linha 2: grade de episódios
    const linha2 = document.createElement("div");
    linha2.id = "playerEpisodiosGrid";
    linha2.style.cssText = "display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin;scrollbar-color:#333 transparent;";
    bar.appendChild(linha2);

    document.querySelector(".player-main")?.insertAdjacentElement("afterend", bar);
  }

  function renderEpisodiosBar() {
    const grid = document.getElementById("playerEpisodiosGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const temp = item.temporadas.find(t => t.numero === tempNumAtual);
    if (!temp) return;
    temp.episodios.forEach((ep, idx) => {
      const btn   = document.createElement("button");
      const ativo = ep.id === episodioIdAtual;
      btn.style.cssText = `min-width:120px;max-width:150px;padding:10px 12px;border-radius:10px;cursor:pointer;text-align:left;border:2px solid ${ativo?"#e50914":"#2a2a2a"};background:${ativo?"#2a0a0a":"#1a1a1a"};color:${ativo?"#fff":"#ccc"};flex-shrink:0;transition:all .2s;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      btn.innerHTML = `<div style="font-weight:bold;margin-bottom:3px;color:${ativo?"#e50914":"#888"}">EP ${ep.numero||idx+1}</div><div style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ep.titulo}</div>`;
      btn.addEventListener("click", () => { episodioIdAtual = ep.id; carregarVideo(ep); window.scrollTo({top:0,behavior:"smooth"}); });
      btn.addEventListener("mouseenter", () => { if (ep.id !== episodioIdAtual) { btn.style.borderColor="#555"; btn.style.background="#222"; } });
      btn.addEventListener("mouseleave", () => { if (ep.id !== episodioIdAtual) { btn.style.borderColor="#2a2a2a"; btn.style.background="#1a1a1a"; } });
      grid.appendChild(btn);
    });
    setTimeout(() => {
      const btns = grid.querySelectorAll("button");
      const idx  = temp.episodios.findIndex(e => e.id === episodioIdAtual);
      if (btns[idx]) btns[idx].scrollIntoView({ inline:"center", behavior:"smooth" });
    }, 100);
  }

  function atualizarBotaoProximo() {
    const proximo = encontrarProximo(item, tempNumAtual, episodioIdAtual);
    // Botão flutuante
    if (btnNext) {
      if (proximo) {
        btnNext.classList.remove("hidden");
        btnNext.onclick = () => {
          episodioIdAtual = proximo.episodio.id; tempNumAtual = proximo.temporada;
          const sel = document.getElementById("playerTempSelect"); if (sel) sel.value = tempNumAtual;
          carregarVideo(proximo.episodio); window.scrollTo({top:0,behavior:"smooth"});
        };
      } else { btnNext.classList.add("hidden"); }
    }
    // Botão na barra de controles
    const btnBar = document.getElementById("btnProximoBar");
    if (btnBar) btnBar.style.display = proximo ? "block" : "none";
  }

  injetarControlesPlayer();
  const epInicial = getEpisodioAtual();
  if (!epInicial) { playerInfo.innerHTML = "<h1>Episódio não encontrado.</h1>"; return; }
  carregarVideo(epInicial);

  if (btnSkip) {
    btnSkip.classList.remove("hidden");
    btnSkip.onclick = () => { videoPlayer.currentTime = Math.min(videoPlayer.currentTime + 60, videoPlayer.duration - 1); };
  }

  let saveTimer = null;
  function salvar() {
    if (!videoPlayer.duration || isNaN(videoPlayer.duration)) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => salvarProgresso({ episodioId: episodioIdAtual, conteudoId: item.id, currentTime: Math.floor(videoPlayer.currentTime), duration: Math.floor(videoPlayer.duration) }), 500);
  }

  videoPlayer.addEventListener("timeupdate", () => {
    salvar();
    if (btnSkip) { const r = videoPlayer.duration - videoPlayer.currentTime; btnSkip.classList.toggle("hidden", r <= 60); }
    const proximo = encontrarProximo(item, tempNumAtual, episodioIdAtual);
    if (btnNext && proximo) { const r = videoPlayer.duration - videoPlayer.currentTime; btnNext.classList.toggle("hidden", r > 60); }
  });
  videoPlayer.addEventListener("pause", salvar);
}

function encontrarProximo(item, tempNum, epId) {
  const temp = item.temporadas.find(t => t.numero === tempNum);
  if (!temp) return null;
  const idx = temp.episodios.findIndex(e => e.id === epId);
  if (idx < temp.episodios.length - 1) return { temporada:tempNum, episodio:temp.episodios[idx+1] };
  const proxTemp = item.temporadas.find(t => t.numero === tempNum + 1);
  if (proxTemp?.episodios.length) return { temporada:proxTemp.numero, episodio:proxTemp.episodios[0] };
  return null;
}

// ─── Ao Vivo ──────────────────────────────────────────────────────────────────
function renderCanaisAoVivo(containerId, lista) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = "";
  lista.forEach(item => {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;display:inline-block;";
    const card = criarCard(item, () => item.video ? (window.location.href=`assistir.html?canal=${encodeURIComponent(item.id)}`) : alert("Vídeo não configurado."));
    const btnFav = document.createElement("button");
    btnFav.className = "canal-fav-btn";
    btnFav.title = "Adicionar à minha lista";
    atualizarEstiloBtnFavCanal(btnFav, item.id);
    btnFav.addEventListener("click", async e => {
      e.stopPropagation();
      const jaNosCat = (catalogoData?.aoVivo||[]).find(c => c.id === item.id);
      if (!jaNosCat && catalogoData) { catalogoData.aoVivo = catalogoData.aoVivo||[]; catalogoData.aoVivo.push(item); }
      await alternarFavorito(item.id);
      atualizarEstiloBtnFavCanal(btnFav, item.id);
      renderFavoritos();
    });
    wrap.appendChild(card); wrap.appendChild(btnFav); grid.appendChild(wrap);
  });
}

function atualizarEstiloBtnFavCanal(btn, id) {
  const fav = itemEhFavorito(id);
  btn.textContent = fav ? "✓" : "+";
  btn.style.cssText = `position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;border:none;cursor:pointer;font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center;background:${fav?"#e50914":"rgba(0,0,0,.65)"};color:#fff;z-index:10;transition:background .2s,transform .15s;box-shadow:0 2px 8px rgba(0,0,0,.5);`;
}

function renderAoVivoPage() { renderCanaisAoVivo("canaisGrid", catalogoData?.aoVivo || []); }

// ─── Busca e filtros ──────────────────────────────────────────────────────────
function iniciarBusca() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  input.addEventListener("input", () => {
    const t = input.value.toLowerCase().trim();
    document.querySelectorAll(".poster-card").forEach(c => c.classList.toggle("hidden", !!(t && !c.dataset.titulo?.includes(t))));
  });
}

function iniciarFiltros() {
  const botoes = document.querySelectorAll(".filter-btn");
  if (!botoes.length) return;
  botoes.forEach(btn => btn.addEventListener("click", () => {
    botoes.forEach(b => b.classList.remove("active")); btn.classList.add("active");
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
  toggle.addEventListener("click", () => { const a = nav.classList.toggle("nav-aberto"); toggle.setAttribute("aria-expanded", a); toggle.innerHTML = a ? "✕" : "☰"; });
  document.addEventListener("click", e => { if (!toggle.contains(e.target) && !nav.contains(e.target)) { nav.classList.remove("nav-aberto"); toggle.innerHTML = "☰"; } });
}

// ─── Usuário no header ────────────────────────────────────────────────────────
function configurarUsuario() {
  const nome    = document.getElementById("usuarioNome");
  const btnSair = document.getElementById("btnSair");
  if (nome)    nome.textContent = ls.get("sb_perfil_nome") || localStorage.getItem("usuarioEmail") || "";
  if (btnSair) btnSair.addEventListener("click", logout);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  await carregarCatalogo();
  const temPerfil = !!getPerfilId();
  const naHome    = !!(document.getElementById("rowDestaques"));
  if (!temPerfil && naHome) await mostrarTelaPerfis();
  await carregarUserData();
  configurarUsuario();
  renderHome();
  renderDetalhe();
  renderPlayer();
  renderAoVivoPage();
  renderAulasPage();
  renderMangasPage();
  iniciarMenuMobile();
})();