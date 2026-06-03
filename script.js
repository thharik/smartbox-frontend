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

  // ── CANAIS ABERTOS (55) ──────────────────────
  { id:"sbt-interior", titulo:"SBT Interior", tipo:"AoVivo", categoria:"Canais Abertos", poster:"https://i.imgur.com/IkZfa4j.png", video:"https://cdn.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/playlist.m3u8" },
  { id:"banda-bahia-sd", titulo:"Banda Bahia SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/68l", video:"http://psrv.io:80/9089247/coreurl.me/28060" },
  { id:"banda-sd", titulo:"Banda SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/SV1", video:"http://psrv.io:80/9089247/coreurl.me/22242" },
  { id:"banda-sergipe-hd", titulo:"Banda Sergipe HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/68l", video:"http://psrv.io:80/9089247/coreurl.me/22476" },
  { id:"banda-sp-fhd", titulo:"Banda SP FHD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/iGF", video:"http://psrv.io:80/9089247/coreurl.me/18786" },
  { id:"banda-sp-fhd-h265", titulo:"Banda SP FHD [H265]", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/wHL", video:"http://psrv.io:80/9089247/coreurl.me/25249" },
  { id:"banda-sp-hd", titulo:"Banda SP HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/X0u", video:"http://psrv.io:80/9089247/coreurl.me/18727" },
  { id:"banda-sp-sd", titulo:"Banda SP SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/xaf", video:"http://psrv.io:80/9089247/coreurl.me/18728" },
  { id:"futura-fhd", titulo:"Futura FHD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28198" },
  { id:"futura-fhd-h265", titulo:"Futura FHD [H265]", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/en6", video:"http://psrv.io:80/9089247/coreurl.me/25302" },
  { id:"futura-hd", titulo:"Futura HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/a9U", video:"http://psrv.io:80/9089247/coreurl.me/18655" },
  { id:"futura-sd", titulo:"Futura SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/XaX", video:"http://psrv.io:80/9089247/coreurl.me/18656" },
  { id:"nbr-sd", titulo:"NBR SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/97h", video:"http://psrv.io:80/9089247/coreurl.me/18604" },
  { id:"recordtv-ba-hd", titulo:"RecordTV BA HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/Tv1", video:"http://psrv.io:80/9089247/coreurl.me/18496" },
  { id:"recordtv-df-sd", titulo:"RecordTV DF SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/DDa", video:"http://psrv.io:80/9089247/coreurl.me/18493" },
  { id:"recordtv-mg-hd", titulo:"RecordTV MG HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/m2C", video:"http://psrv.io:80/9089247/coreurl.me/18501" },
  { id:"recordtv-pr-hd", titulo:"RecordTV PR HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/Kvw", video:"http://psrv.io:80/9089247/coreurl.me/22471" },
  { id:"recordtv-rio-fhd", titulo:"RecordTV Rio FHD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/P7d", video:"http://psrv.io:80/9089247/coreurl.me/18748" },
  { id:"recordtv-rio-hd", titulo:"RecordTV Rio HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/iZP", video:"http://psrv.io:80/9089247/coreurl.me/18503" },
  { id:"recordtv-rio-sd", titulo:"RecordTV Rio SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/a0f", video:"http://psrv.io:80/9089247/coreurl.me/18502" },
  { id:"recordtv-rs-hd", titulo:"RecordTV RS HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/IXu", video:"http://psrv.io:80/9089247/coreurl.me/18492" },
  { id:"recordtv-rs-sd", titulo:"RecordTV RS SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/2GL", video:"http://psrv.io:80/9089247/coreurl.me/18491" },
  { id:"recordtv-s-o-jos-rio-preto-hd", titulo:"RecordTV São José Rio Preto HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/Kvw", video:"http://psrv.io:80/9089247/coreurl.me/29021" },
  { id:"recordtv-sd", titulo:"RecordTV SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/qPi", video:"http://psrv.io:80/9089247/coreurl.me/22277" },
  { id:"recordtv-sergipe-hd", titulo:"RecordTV Sergipe HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/vRV", video:"http://psrv.io:80/9089247/coreurl.me/22474" },
  { id:"recordtv-sp-fhd", titulo:"RecordTV SP FHD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/vUq", video:"http://psrv.io:80/9089247/coreurl.me/18765" },
  { id:"recordtv-sp-fhd-h265", titulo:"RecordTV SP FHD [H265]", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/DDD", video:"http://psrv.io:80/9089247/coreurl.me/25221" },
  { id:"recordtv-sp-hd", titulo:"RecordTV SP HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/MsE", video:"http://psrv.io:80/9089247/coreurl.me/18575" },
  { id:"recordtv-sp-sd", titulo:"RecordTV SP SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/BKM", video:"http://psrv.io:80/9089247/coreurl.me/18579" },
  { id:"rede-brasil-sd", titulo:"Rede Brasil SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/RnA", video:"http://psrv.io:80/9089247/coreurl.me/18574" },
  { id:"redetv-fhd", titulo:"RedeTV! FHD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/tkR", video:"http://psrv.io:80/9089247/coreurl.me/18751" },
  { id:"redetv-hd", titulo:"RedeTV! HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/heG", video:"http://psrv.io:80/9089247/coreurl.me/18572" },
  { id:"redetv-sd", titulo:"RedeTV! SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/lHy", video:"http://psrv.io:80/9089247/coreurl.me/18573" },
  { id:"sbt-fhd", titulo:"SBT FHD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/RXH", video:"http://psrv.io:80/9089247/coreurl.me/18764" },
  { id:"sbt-fhd-h265", titulo:"SBT FHD [H265]", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/kUn", video:"http://psrv.io:80/9089247/coreurl.me/25220" },
  { id:"sbt-hd", titulo:"SBT HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/G2I", video:"http://psrv.io:80/9089247/coreurl.me/18569" },
  { id:"sbt-sd", titulo:"SBT SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/MSJ", video:"http://psrv.io:80/9089247/coreurl.me/18570" },
  { id:"sbt-sergipe-hd", titulo:"SBT Sergipe HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/X0C", video:"http://psrv.io:80/9089247/coreurl.me/22473" },
  { id:"terra-viva-sd", titulo:"Terra Viva SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/poc", video:"http://psrv.io:80/9089247/coreurl.me/18540" },
  { id:"tv-aparecida-fhd-h265", titulo:"TV Aparecida FHD [H265]", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/Bti", video:"http://psrv.io:80/9089247/coreurl.me/25199" },
  { id:"tv-aparecida-sd", titulo:"TV Aparecida SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/0Eb", video:"http://psrv.io:80/9089247/coreurl.me/18530" },
  { id:"tv-aratu-sbt-bahia-sd", titulo:"Tv Aratu SBT Bahia SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/XKO", video:"http://psrv.io:80/9089247/coreurl.me/28059" },
  { id:"tv-brasil-sd", titulo:"TV Brasil SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/83l", video:"http://psrv.io:80/9089247/coreurl.me/18529" },
  { id:"tv-c-mara-sd", titulo:"TV Câmara SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/PVk", video:"http://psrv.io:80/9089247/coreurl.me/18528" },
  { id:"tv-cultura-fhd", titulo:"TV Cultura FHD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/MJK", video:"http://psrv.io:80/9089247/coreurl.me/18752" },
  { id:"tv-cultura-fhd-h265", titulo:"TV Cultura FHD [H265]", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/GU9", video:"http://psrv.io:80/9089247/coreurl.me/25198" },
  { id:"tv-cultura-hd", titulo:"TV Cultura HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/BEU", video:"http://psrv.io:80/9089247/coreurl.me/18505" },
  { id:"tv-cultura-sd", titulo:"TV Cultura SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/7FM", video:"http://psrv.io:80/9089247/coreurl.me/18506" },
  { id:"tv-escola-sd", titulo:"TV Escola SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/AME", video:"http://psrv.io:80/9089247/coreurl.me/18527" },
  { id:"tv-gazeta-sp-fhd-h265", titulo:"TV Gazeta SP FHD [H265]", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/zrm", video:"http://psrv.io:80/9089247/coreurl.me/25197" },
  { id:"tv-gazeta-sp-hd", titulo:"TV Gazeta SP HD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/ARG", video:"http://psrv.io:80/9089247/coreurl.me/18526" },
  { id:"tv-justi-a-sd", titulo:"TV Justiça SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/VtA", video:"http://psrv.io:80/9089247/coreurl.me/18531" },
  { id:"tv-senado-sd", titulo:"TV Senado SD", tipo:"AoVivo", categoria:"Canais Abertos", poster:"http://z4.vc/HLw", video:"http://psrv.io:80/9089247/coreurl.me/18532" },
  { id:"tvr-craiova", titulo:"TVR Craiova", tipo:"AoVivo", categoria:"Canais Abertos", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28048" },
  { id:"tvr-iasi", titulo:"TVR IASI", tipo:"AoVivo", categoria:"Canais Abertos", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28046" },

  // ── CANAIS GLOBO (118) ──────────────────────
  { id:"globo-bras-lia-fhd", titulo:"Globo Brasília FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/aZb", video:"http://psrv.io:80/9089247/coreurl.me/28390" },
  { id:"globo-bras-lia-hd", titulo:"Globo Brasília HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Vli", video:"http://psrv.io:80/9089247/coreurl.me/18434" },
  { id:"globo-bras-lia-sd", titulo:"Globo Brasília SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/aZb", video:"http://psrv.io:80/9089247/coreurl.me/18435" },
  { id:"globo-campinas-fhd-h265", titulo:"Globo Campinas FHD [H265]", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/CsO", video:"http://psrv.io:80/9089247/coreurl.me/25210" },
  { id:"globo-eptv-araraquara-sd", titulo:"Globo EPTV Araraquara SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/5XU", video:"http://psrv.io:80/9089247/coreurl.me/18433" },
  { id:"globo-eptv-campinas-sd", titulo:"Globo EPTV Campinas SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/n8G", video:"http://psrv.io:80/9089247/coreurl.me/18431" },
  { id:"globo-eptv-ribeir-o-preto-hd", titulo:"Globo EPTV Ribeirão Preto HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/pqb", video:"http://psrv.io:80/9089247/coreurl.me/18430" },
  { id:"globo-eptv-ribeir-o-preto-sd", titulo:"Globo EPTV Ribeirão Preto SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/5Uj", video:"http://psrv.io:80/9089247/coreurl.me/18429" },
  { id:"globo-eptv-s-o-carlos-sd", titulo:"Globo EPTV São Carlos SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/nrI", video:"http://psrv.io:80/9089247/coreurl.me/18428" },
  { id:"globo-inter-tv-alto-litoral-fhd", titulo:"GLOBO INTER TV ALTO LITORAL FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/pzi", video:"http://psrv.io:80/9089247/coreurl.me/28079" },
  { id:"globo-inter-tv-alto-litoral-hd", titulo:"Globo Inter TV Alto Litoral HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/hmV", video:"http://psrv.io:80/9089247/coreurl.me/18357" },
  { id:"globo-inter-tv-alto-litoral-sd", titulo:"Globo Inter TV Alto Litoral SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/t4S", video:"http://psrv.io:80/9089247/coreurl.me/18356" },
  { id:"globo-inter-tv-dos-vales-fhd", titulo:"Globo Inter TV dos Vales FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/eQR", video:"http://psrv.io:80/9089247/coreurl.me/18355" },
  { id:"globo-inter-tv-dos-vales-hd", titulo:"Globo Inter TV dos Vales HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/42v", video:"http://psrv.io:80/9089247/coreurl.me/18354" },
  { id:"globo-inter-tv-dos-vales-sd", titulo:"Globo Inter TV dos Vales SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/q6B", video:"http://psrv.io:80/9089247/coreurl.me/18353" },
  { id:"globo-inter-tv-grande-minas-fhd", titulo:"Globo Inter TV Grande Minas FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/gfx", video:"http://psrv.io:80/9089247/coreurl.me/18352" },
  { id:"globo-inter-tv-grande-minas-hd", titulo:"Globo Inter TV Grande Minas HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/BEQ", video:"http://psrv.io:80/9089247/coreurl.me/18351" },
  { id:"globo-inter-tv-grande-minas-sd", titulo:"Globo Inter TV Grande Minas SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/6dU", video:"http://psrv.io:80/9089247/coreurl.me/18350" },
  { id:"globo-inter-tv-natal-sd", titulo:"Globo Inter TV Natal SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/mVk", video:"http://psrv.io:80/9089247/coreurl.me/18427" },
  { id:"globo-inter-tv-serra-mar-fhd", titulo:"Globo Inter TV Serra Mar FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/dlF", video:"http://psrv.io:80/9089247/coreurl.me/18349" },
  { id:"globo-inter-tv-serra-mar-hd", titulo:"Globo Inter TV Serra Mar HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/0jO", video:"http://psrv.io:80/9089247/coreurl.me/18348" },
  { id:"globo-inter-tv-serra-mar-sd", titulo:"Globo Inter TV Serra Mar SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/4BA", video:"http://psrv.io:80/9089247/coreurl.me/18347" },
  { id:"globo-mato-grosso-fhd", titulo:"Globo Mato Grosso FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/aZb", video:"http://psrv.io:80/9089247/coreurl.me/28394" },
  { id:"globo-mato-grosso-hd", titulo:"Globo Mato Grosso HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/aZb", video:"http://psrv.io:80/9089247/coreurl.me/28393" },
  { id:"globo-minas-fhd", titulo:"Globo Minas FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/KxL", video:"http://psrv.io:80/9089247/coreurl.me/18377" },
  { id:"globo-minas-fhd-h265", titulo:"Globo Minas FHD [H265]", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/KZ2", video:"http://psrv.io:80/9089247/coreurl.me/25209" },
  { id:"globo-minas-hd", titulo:"Globo Minas HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/4YI", video:"http://psrv.io:80/9089247/coreurl.me/18425" },
  { id:"globo-minas-sd", titulo:"Globo Minas SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/ep1", video:"http://psrv.io:80/9089247/coreurl.me/18426" },
  { id:"globo-nordeste-fhd", titulo:"Globo Nordeste FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/97A", video:"http://psrv.io:80/9089247/coreurl.me/18376" },
  { id:"globo-nordeste-fhd-h265", titulo:"Globo Nordeste FHD [H265]", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/ft1", video:"http://psrv.io:80/9089247/coreurl.me/25208" },
  { id:"globo-nordeste-sd", titulo:"Globo Nordeste SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/p5d", video:"http://psrv.io:80/9089247/coreurl.me/18424" },
  { id:"globo-nsc-tv-blumenau-fhd", titulo:"Globo NSC TV Blumenau FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/gY7", video:"http://psrv.io:80/9089247/coreurl.me/18346" },
  { id:"globo-nsc-tv-blumenau-hd", titulo:"Globo NSC TV Blumenau HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/5W5", video:"http://psrv.io:80/9089247/coreurl.me/18345" },
  { id:"globo-nsc-tv-blumenau-sd", titulo:"Globo NSC TV Blumenau SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/hEE", video:"http://psrv.io:80/9089247/coreurl.me/18344" },
  { id:"globo-nsc-tv-chapec-fhd", titulo:"Globo NSC TV Chapecó FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/svh", video:"http://psrv.io:80/9089247/coreurl.me/18394" },
  { id:"globo-nsc-tv-chapec-hd", titulo:"Globo NSC TV Chapecó HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/JTq", video:"http://psrv.io:80/9089247/coreurl.me/18393" },
  { id:"globo-nsc-tv-chapec-sd", titulo:"Globo NSC TV Chapecó SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/G4s", video:"http://psrv.io:80/9089247/coreurl.me/18392" },
  { id:"globo-nsc-tv-florian-polis-fhd", titulo:"Globo NSC TV Florianópolis FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Vey", video:"http://psrv.io:80/9089247/coreurl.me/18375" },
  { id:"globo-nsc-tv-florian-polis-hd", titulo:"Globo NSC TV Florianópolis HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/5Kj", video:"http://psrv.io:80/9089247/coreurl.me/18421" },
  { id:"globo-nsc-tv-florian-polis-sd", titulo:"Globo NSC TV Florianópolis SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/cHX", video:"http://psrv.io:80/9089247/coreurl.me/18422" },
  { id:"globo-nsc-tv-joinville-fhd", titulo:"Globo NSC TV Joinville FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/urQ", video:"http://psrv.io:80/9089247/coreurl.me/18340" },
  { id:"globo-nsc-tv-joinville-hd", titulo:"Globo NSC TV Joinville HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/ihU", video:"http://psrv.io:80/9089247/coreurl.me/18339" },
  { id:"globo-nsc-tv-joinville-sd", titulo:"Globo NSC TV Joinville SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/e5c", video:"http://psrv.io:80/9089247/coreurl.me/18338" },
  { id:"globo-rbs-porto-alegre-fhd", titulo:"Globo RBS Porto Alegre FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/sLB", video:"http://psrv.io:80/9089247/coreurl.me/18374" },
  { id:"globo-rbs-tv-caxias-do-sul-fhd", titulo:"Globo RBS TV Caxias do Sul FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/kga", video:"http://psrv.io:80/9089247/coreurl.me/18343" },
  { id:"globo-rbs-tv-caxias-do-sul-hd", titulo:"Globo RBS TV Caxias do Sul HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Plw", video:"http://psrv.io:80/9089247/coreurl.me/18342" },
  { id:"globo-rbs-tv-caxias-do-sul-sd", titulo:"Globo RBS TV Caxias do Sul SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/h4k", video:"http://psrv.io:80/9089247/coreurl.me/18341" },
  { id:"globo-rbs-tv-pelotas-fhd", titulo:"Globo RBS TV Pelotas FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Pwb", video:"http://psrv.io:80/9089247/coreurl.me/18337" },
  { id:"globo-rbs-tv-pelotas-hd", titulo:"Globo RBS TV Pelotas HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/iZY", video:"http://psrv.io:80/9089247/coreurl.me/18336" },
  { id:"globo-rbs-tv-pelotas-sd", titulo:"Globo RBS TV Pelotas SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/GMl", video:"http://psrv.io:80/9089247/coreurl.me/18335" },
  { id:"globo-rbs-tv-porto-alegre-hd", titulo:"Globo RBS TV Porto Alegre HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/wJx", video:"http://psrv.io:80/9089247/coreurl.me/18419" },
  { id:"globo-rbs-tv-porto-alegre-sd", titulo:"Globo RBS TV Porto Alegre SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/CX5", video:"http://psrv.io:80/9089247/coreurl.me/18420" },
  { id:"globo-rede-amazonas-manaus-sd", titulo:"Globo Rede Amazonas Manaus SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/X3N", video:"http://psrv.io:80/9089247/coreurl.me/18418" },
  { id:"globo-rj-fhd", titulo:"Globo RJ FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/k7r", video:"http://psrv.io:80/9089247/coreurl.me/18415" },
  { id:"globo-rj-sd", titulo:"Globo RJ SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/FYM", video:"http://psrv.io:80/9089247/coreurl.me/18417" },
  { id:"globo-rpc-curitiba-hd", titulo:"Globo RPC Curitiba HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/8Bl", video:"http://psrv.io:80/9089247/coreurl.me/18413" },
  { id:"globo-rpc-curitiba-sd", titulo:"Globo RPC Curitiba SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/F32", video:"http://psrv.io:80/9089247/coreurl.me/18412" },
  { id:"globo-rpc-foz-do-igua-u-fhd", titulo:"Globo RPC Foz do Iguaçu FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Fwm", video:"http://psrv.io:80/9089247/coreurl.me/18390" },
  { id:"globo-rpc-foz-do-igua-u-hd", titulo:"Globo RPC Foz do Iguaçu HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/acv", video:"http://psrv.io:80/9089247/coreurl.me/18389" },
  { id:"globo-rpc-foz-do-igua-u-sd", titulo:"Globo RPC Foz do Iguaçu SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/4u4", video:"http://psrv.io:80/9089247/coreurl.me/18391" },
  { id:"globo-rpc-maring-fhd", titulo:"GLOBO RPC MARINGÁ FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/JTq", video:"http://psrv.io:80/9089247/coreurl.me/28156" },
  { id:"globo-rpc-maringa-hd", titulo:"GLOBO RPC MARINGA HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/G4s", video:"http://psrv.io:80/9089247/coreurl.me/28155" },
  { id:"globo-rpc-maringa-sd", titulo:"GLOBO RPC MARINGA SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/G4s", video:"http://psrv.io:80/9089247/coreurl.me/28154" },
  { id:"globo-s-o-jos-dos-campos-sd", titulo:"Globo São José dos Campos SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/rtl", video:"http://psrv.io:80/9089247/coreurl.me/22448" },
  { id:"globo-sp-fhd", titulo:"Globo SP FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/pzi", video:"http://psrv.io:80/9089247/coreurl.me/28068" },
  { id:"globo-sp-fhd-h265", titulo:"Globo SP FHD [H265]", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/NDg", video:"http://psrv.io:80/9089247/coreurl.me/25231" },
  { id:"globo-sp-hd", titulo:"Globo SP HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Vlx", video:"http://psrv.io:80/9089247/coreurl.me/18410" },
  { id:"globo-sp-sd", titulo:"Globo SP SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/tlB", video:"http://psrv.io:80/9089247/coreurl.me/18411" },
  { id:"globo-tv-anhanguera-fhd", titulo:"Globo TV Anhanguera FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/9N9", video:"http://psrv.io:80/9089247/coreurl.me/18373" },
  { id:"globo-tv-anhanguera-hd", titulo:"Globo TV Anhanguera HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/o8M", video:"http://psrv.io:80/9089247/coreurl.me/18407" },
  { id:"globo-tv-anhanguera-sd", titulo:"Globo TV Anhanguera SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Lu3", video:"http://psrv.io:80/9089247/coreurl.me/18408" },
  { id:"globo-tv-bahia-fhd", titulo:"Globo TV Bahia FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/TEc", video:"http://psrv.io:80/9089247/coreurl.me/18372" },
  { id:"globo-tv-bahia-hd", titulo:"Globo TV Bahia HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/2HU", video:"http://psrv.io:80/9089247/coreurl.me/18405" },
  { id:"globo-tv-bahia-sd", titulo:"Globo TV Bahia SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/ORA", video:"http://psrv.io:80/9089247/coreurl.me/18406" },
  { id:"globo-tv-c-am-rica-cuiab-sd", titulo:"Globo TV C. América Cuiabá SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Ew0", video:"http://psrv.io:80/9089247/coreurl.me/18404" },
  { id:"globo-tv-cabo-branco-fhd", titulo:"Globo TV Cabo Branco FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/VCk", video:"http://psrv.io:80/9089247/coreurl.me/18334" },
  { id:"globo-tv-cabo-branco-hd", titulo:"Globo TV Cabo Branco HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/jIh", video:"http://psrv.io:80/9089247/coreurl.me/18333" },
  { id:"globo-tv-cabo-branco-sd", titulo:"Globo TV Cabo Branco SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/V9M", video:"http://psrv.io:80/9089247/coreurl.me/18332" },
  { id:"globo-tv-clube-teresina-fhd", titulo:"Globo TV Clube Teresina FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/GNp", video:"http://psrv.io:80/9089247/coreurl.me/18387" },
  { id:"globo-tv-clube-teresina-hd", titulo:"Globo TV Clube Teresina HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Qhi", video:"http://psrv.io:80/9089247/coreurl.me/18386" },
  { id:"globo-tv-clube-teresina-sd", titulo:"Globo TV Clube Teresina SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/hiL", video:"http://psrv.io:80/9089247/coreurl.me/18388" },
  { id:"globo-tv-di-rio-fortaleza-fhd", titulo:"Globo TV Diário Fortaleza FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/3yp", video:"http://psrv.io:80/9089247/coreurl.me/18740" },
  { id:"globo-tv-di-rio-fortaleza-hd", titulo:"Globo TV Diário Fortaleza HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/JPA", video:"http://psrv.io:80/9089247/coreurl.me/18490" },
  { id:"globo-tv-di-rio-fortaleza-sd", titulo:"Globo TV Diário Fortaleza SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/i2a", video:"http://psrv.io:80/9089247/coreurl.me/18489" },
  { id:"globo-tv-gazeta-alagoas-fhd", titulo:"Globo TV Gazeta Alagoas FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/P3s", video:"http://psrv.io:80/9089247/coreurl.me/18363" },
  { id:"globo-tv-gazeta-alagoas-hd", titulo:"Globo TV Gazeta Alagoas HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/rVZ", video:"http://psrv.io:80/9089247/coreurl.me/18362" },
  { id:"globo-tv-gazeta-alagoas-sd", titulo:"Globo TV Gazeta Alagoas SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/0wh", video:"http://psrv.io:80/9089247/coreurl.me/18364" },
  { id:"globo-tv-gazeta-sul-es-fhd", titulo:"Globo TV Gazeta Sul ES FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/hex", video:"http://psrv.io:80/9089247/coreurl.me/18361" },
  { id:"globo-tv-gazeta-sul-es-hd", titulo:"Globo TV Gazeta Sul ES HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/R14", video:"http://psrv.io:80/9089247/coreurl.me/18360" },
  { id:"globo-tv-gazeta-vit-ria-fhd", titulo:"Globo TV Gazeta Vitória FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Ri9", video:"http://psrv.io:80/9089247/coreurl.me/18384" },
  { id:"globo-tv-gazeta-vit-ria-hd", titulo:"Globo TV Gazeta Vitória HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/pM2", video:"http://psrv.io:80/9089247/coreurl.me/18383" },
  { id:"globo-tv-gazeta-vit-ria-sd", titulo:"Globo TV Gazeta Vitória SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/PMO", video:"http://psrv.io:80/9089247/coreurl.me/18385" },
  { id:"globo-tv-liberal-bel-m-sd", titulo:"Globo TV Liberal Belém SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/y1y", video:"http://psrv.io:80/9089247/coreurl.me/18403" },
  { id:"globo-tv-mirante-s-o-luis-fhd", titulo:"Globo TV Mirante São Luis FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/iWH", video:"http://psrv.io:80/9089247/coreurl.me/18371" },
  { id:"globo-tv-mirante-s-o-luis-hd", titulo:"Globo TV Mirante São Luis HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/XMT", video:"http://psrv.io:80/9089247/coreurl.me/18370" },
  { id:"globo-tv-mirante-s-o-luis-sd", titulo:"Globo TV Mirante São Luis SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/k9T", video:"http://psrv.io:80/9089247/coreurl.me/18369" },
  { id:"globo-tv-moreno-campo-grande-fhd", titulo:"Globo TV Moreno Campo Grande FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Qju", video:"http://psrv.io:80/9089247/coreurl.me/18368" },
  { id:"globo-tv-moreno-campo-grande-hd", titulo:"Globo TV Moreno Campo Grande HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Auq", video:"http://psrv.io:80/9089247/coreurl.me/18367" },
  { id:"globo-tv-moreno-campo-grande-sd", titulo:"Globo TV Moreno Campo Grande SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/jZD", video:"http://psrv.io:80/9089247/coreurl.me/18366" },
  { id:"globo-tv-rio-sul-fhd", titulo:"Globo TV Rio Sul FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/1ax", video:"http://psrv.io:80/9089247/coreurl.me/18331" },
  { id:"globo-tv-rio-sul-hd", titulo:"Globo TV Rio Sul HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/l2H", video:"http://psrv.io:80/9089247/coreurl.me/18330" },
  { id:"globo-tv-rio-sul-sd", titulo:"Globo TV Rio Sul SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/k1z", video:"http://psrv.io:80/9089247/coreurl.me/18329" },
  { id:"globo-tv-santa-cruz-fhd", titulo:"Globo TV Santa Cruz FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/RhF", video:"http://psrv.io:80/9089247/coreurl.me/18328" },
  { id:"globo-tv-santa-cruz-hd", titulo:"Globo TV Santa Cruz HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/jUt", video:"http://psrv.io:80/9089247/coreurl.me/18327" },
  { id:"globo-tv-santa-cruz-sd", titulo:"Globo TV Santa Cruz SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/ZoM", video:"http://psrv.io:80/9089247/coreurl.me/18326" },
  { id:"globo-tv-sergipe-hd", titulo:"Globo TV Sergipe HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/0ho", video:"http://psrv.io:80/9089247/coreurl.me/18381" },
  { id:"globo-tv-sergipe-sd", titulo:"Globo TV Sergipe SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/Pj1", video:"http://psrv.io:80/9089247/coreurl.me/18382" },
  { id:"globo-tv-tem-bauru-sd", titulo:"Globo TV TEM Bauru SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/zfQ", video:"http://psrv.io:80/9089247/coreurl.me/18402" },
  { id:"globo-tv-tem-sj-do-rio-preto-hd", titulo:"Globo TV TEM SJ do Rio Preto HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/c9W", video:"http://psrv.io:80/9089247/coreurl.me/18400" },
  { id:"globo-tv-tem-sj-do-rio-preto-sd", titulo:"Globo TV TEM SJ do Rio Preto SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/tLN", video:"http://psrv.io:80/9089247/coreurl.me/18399" },
  { id:"globo-tv-tem-sj-rio-preto-fhd", titulo:"Globo TV TEM SJ Rio Preto FHD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/5rA", video:"http://psrv.io:80/9089247/coreurl.me/18365" },
  { id:"globo-tv-tem-sorocaba-sd", titulo:"Globo TV TEM Sorocaba SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/F7c", video:"http://psrv.io:80/9089247/coreurl.me/18401" },
  { id:"globo-tv-tribuna-santas-sd", titulo:"Globo TV Tribuna Santas SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/B32", video:"http://psrv.io:80/9089247/coreurl.me/18398" },
  { id:"globo-tv-vanguarda-sj-dos-campos-sd", titulo:"Globo TV Vanguarda SJ dos Campos SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/crH", video:"http://psrv.io:80/9089247/coreurl.me/18397" },
  { id:"globo-tv-verdes-mares-fortaleza-hd", titulo:"Globo TV Verdes Mares Fortaleza HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/osc", video:"http://psrv.io:80/9089247/coreurl.me/28395" },
  { id:"globo-tv-verdes-mares-fortaleza-sd", titulo:"Globo TV Verdes Mares Fortaleza SD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/osc", video:"http://psrv.io:80/9089247/coreurl.me/18396" },
  { id:"tv-anhaguera-fhd-h265", titulo:"TV Anhaguera FHD [H265]", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/76t", video:"http://psrv.io:80/9089247/coreurl.me/22124" },
  { id:"tv-anhaguera-hd", titulo:"TV Anhaguera HD", tipo:"AoVivo", categoria:"Canais Globo", poster:"http://z4.vc/76t", video:"http://psrv.io:80/9089247/coreurl.me/28062" },

  // ── NOTÍCIAS (21) ──────────────────────
  { id:"bandnews", titulo:"BandNews", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18853" },
  { id:"cnn", titulo:"CNN Internacional", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/28054" },
  { id:"rta-news", titulo:"RTA News", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"https://rtatv.akamaized.net/Content/HLS/Live/channel(RTA2)/index.m3u8" },
  { id:"tolo-news", titulo:"Tolo News", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"https://raw.githubusercontent.com/taodicakhia/IPTV_Exception/master/channels/af/tolonews.m3u8" },
  { id:"euronews-albania", titulo:"Euronews Albania", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"https://gjirafa-video-live.gjirafa.net/gjvideo-live/2dw-zuf-1c9-pxu/index.m3u8" },
  { id:"news24-al", titulo:"News 24 Albania", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"https://tv.balkanweb.com/news24/livestream/playlist.m3u8" },
  { id:"ora-news", titulo:"Ora News", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"https://live1.mediadesk.al/oranews.m3u8" },
  { id:"sky-news-arabia", titulo:"Sky News Arabia", tipo:"AoVivo", categoria:"Notícias", poster:"https://i.imgur.com/placeholder.png", video:"https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8" },
  { id:"bandnews-fhd", titulo:"BandNews FHD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/jeQ", video:"http://psrv.io:80/9089247/coreurl.me/18853" },
  { id:"bandnews-fhd-h265", titulo:"BandNews FHD [H265]", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/vx0", video:"http://psrv.io:80/9089247/coreurl.me/22152" },
  { id:"bandnews-hd", titulo:"BandNews HD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/COC", video:"http://psrv.io:80/9089247/coreurl.me/18725" },
  { id:"bandnews-sd", titulo:"BandNews SD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/mps", video:"http://psrv.io:80/9089247/coreurl.me/18726" },
  { id:"globo-news-fhd", titulo:"Globo News FHD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/qOs", video:"http://psrv.io:80/9089247/coreurl.me/18776" },
  { id:"globo-news-fhd-h265", titulo:"Globo News FHD [H265]", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/5tp", video:"http://psrv.io:80/9089247/coreurl.me/22193" },
  { id:"globo-news-hd", titulo:"Globo News HD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/4gV", video:"http://psrv.io:80/9089247/coreurl.me/18651" },
  { id:"globo-news-sd", titulo:"Globo News SD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/lKc", video:"http://psrv.io:80/9089247/coreurl.me/18652" },
  { id:"record-news-fhd", titulo:"Record News FHD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/PJi", video:"http://psrv.io:80/9089247/coreurl.me/18803" },
  { id:"record-news-fhd-h265", titulo:"Record News FHD [H265]", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/s1i", video:"http://psrv.io:80/9089247/coreurl.me/25204" },
  { id:"record-news-hd", titulo:"Record News HD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/Ncd", video:"http://psrv.io:80/9089247/coreurl.me/18577" },
  { id:"record-not-cias-sd", titulo:"Record Notícias SD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/JOU", video:"http://psrv.io:80/9089247/coreurl.me/18578" },
  { id:"recordtv-news-sd", titulo:"RecordTV News SD", tipo:"AoVivo", categoria:"Notícias", poster:"http://z4.vc/xeN", video:"http://psrv.io:80/9089247/coreurl.me/22216" },

  // ── ESPORTES (96) ──────────────────────
  { id:"bandsports", titulo:"BandSports", tipo:"AoVivo", categoria:"Esportes", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18852" },
  { id:"espn", titulo:"ESPN", tipo:"AoVivo", categoria:"Esportes", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18780" },
  { id:"espn-brasil", titulo:"ESPN Brasil", tipo:"AoVivo", categoria:"Esportes", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18781" },
  { id:"combate", titulo:"Combate", tipo:"AoVivo", categoria:"Esportes", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18784" },
  { id:"bandsports-fhd", titulo:"BandSports FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/7yf", video:"http://psrv.io:80/9089247/coreurl.me/18852" },
  { id:"bandsports-fhd-h265", titulo:"BandSports FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/mPu", video:"http://psrv.io:80/9089247/coreurl.me/22151" },
  { id:"bandsports-hd", titulo:"BandSports HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/0ev", video:"http://psrv.io:80/9089247/coreurl.me/18723" },
  { id:"bandsports-sd", titulo:"BandSports SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/ral", video:"http://psrv.io:80/9089247/coreurl.me/18724" },
  { id:"combate-fhd", titulo:"Combate FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/2Bh", video:"http://psrv.io:80/9089247/coreurl.me/18784" },
  { id:"combate-fhd-h265", titulo:"Combate FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/na3", video:"http://psrv.io:80/9089247/coreurl.me/25312" },
  { id:"combate-hd", titulo:"Combate HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/ids", video:"http://psrv.io:80/9089247/coreurl.me/18707" },
  { id:"combate-sd", titulo:"Combate SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/jLd", video:"http://psrv.io:80/9089247/coreurl.me/18708" },
  { id:"copa-libertadores-hd", titulo:"Copa Libertadores HD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28386" },
  { id:"copa-nordeste-1-hd", titulo:"Copa Nordeste 1 HD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28377" },
  { id:"copa-nordeste-2-hd", titulo:"Copa Nordeste 2 HD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28378" },
  { id:"copa-nordeste-3-hd", titulo:"Copa Nordeste 3 HD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28379" },
  { id:"dazn-canal-1", titulo:"DAZN CANAL 1", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/162", video:"http://psrv.io:80/9089247/coreurl.me/26195" },
  { id:"dazn-channel-2", titulo:"DAZN CHANNEL 2", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Pjc", video:"http://psrv.io:80/9089247/coreurl.me/26197" },
  { id:"dazn-channel-3", titulo:"DAZN CHANNEL 3", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Wp3", video:"http://psrv.io:80/9089247/coreurl.me/26196" },
  { id:"dazn-canal-4", titulo:"DAZN CANAL 4", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/162", video:"http://psrv.io:80/9089247/coreurl.me/28387" },
  { id:"dazn-channel-5", titulo:"DAZN CHANNEL 5", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/162", video:"http://psrv.io:80/9089247/coreurl.me/28388" },
  { id:"dazn-channel-6", titulo:"DAZN CHANNEL 6", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/162", video:"http://psrv.io:80/9089247/coreurl.me/28389" },
  { id:"ei-plus-01-liga-dos-campe-es", titulo:"Ei Plus 01 [Liga dos Campeões]", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28380" },
  { id:"ei-plus-02-liga-dos-campe-es", titulo:"Ei Plus 02 [Liga dos Campeões]", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28381" },
  { id:"ei-plus-03-liga-dos-campe-es", titulo:"Ei Plus 03 [Liga dos Campeões]", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28382" },
  { id:"ei-plus-04-liga-dos-campe-es", titulo:"Ei Plus 04 [Liga dos Campeões]", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28383" },
  { id:"ei-plus-05-liga-dos-campe-es", titulo:"Ei Plus 05 [Liga dos Campeões]", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28384" },
  { id:"ei-plus-06-liga-dos-campe-es", titulo:"Ei Plus 06 [Liga dos Campeões]", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28385" },
  { id:"ei-plus-1-hd", titulo:"EI Plus 1 HD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/22978" },
  { id:"espn-2-fhd-h265", titulo:"ESPN 2 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/oUp", video:"http://psrv.io:80/9089247/coreurl.me/25309" },
  { id:"espn-2-hd", titulo:"ESPN 2 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/krr", video:"http://psrv.io:80/9089247/coreurl.me/18678" },
  { id:"espn-2-sd", titulo:"ESPN 2 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/J6U", video:"http://psrv.io:80/9089247/coreurl.me/18679" },
  { id:"espn-brasil-fhd", titulo:"ESPN Brasil FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/a01", video:"http://psrv.io:80/9089247/coreurl.me/18781" },
  { id:"espn-brasil-fhd-h265", titulo:"ESPN Brasil FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/2zo", video:"http://psrv.io:80/9089247/coreurl.me/25238" },
  { id:"espn-brasil-hd", titulo:"ESPN Brasil HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/hvU", video:"http://psrv.io:80/9089247/coreurl.me/18676" },
  { id:"espn-brasil-sd", titulo:"ESPN Brasil SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/S1E", video:"http://psrv.io:80/9089247/coreurl.me/18677" },
  { id:"espn-extra-fhd", titulo:"ESPN Extra FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/TAv", video:"http://psrv.io:80/9089247/coreurl.me/18836" },
  { id:"espn-extra-fhd-h265", titulo:"ESPN Extra FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/2Db", video:"http://psrv.io:80/9089247/coreurl.me/25308" },
  { id:"espn-extra-hd", titulo:"ESPN Extra HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/1xn", video:"http://psrv.io:80/9089247/coreurl.me/18674" },
  { id:"espn-extra-sd", titulo:"ESPN Extra SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/dzo", video:"http://psrv.io:80/9089247/coreurl.me/18675" },
  { id:"espn-fhd", titulo:"ESPN FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/d9B", video:"http://psrv.io:80/9089247/coreurl.me/18780" },
  { id:"espn-fhd-h265", titulo:"ESPN FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/GbD", video:"http://psrv.io:80/9089247/coreurl.me/25237" },
  { id:"espn-hd", titulo:"ESPN HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/gWv", video:"http://psrv.io:80/9089247/coreurl.me/18673" },
  { id:"espn-sd", titulo:"ESPN SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/yGS", video:"http://psrv.io:80/9089247/coreurl.me/18680" },
  { id:"fox-premium-1-sd", titulo:"Fox Premium 1 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/TCc", video:"http://psrv.io:80/9089247/coreurl.me/18664" },
  { id:"fox-premium-2-sd", titulo:"Fox Premium 2 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/cw8", video:"http://psrv.io:80/9089247/coreurl.me/18662" },
  { id:"fox-sports-2-fhd", titulo:"Fox Sports 2 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/dEu", video:"http://psrv.io:80/9089247/coreurl.me/18778" },
  { id:"fox-sports-2-fhd-h265", titulo:"Fox Sports 2 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Qen", video:"http://psrv.io:80/9089247/coreurl.me/22196" },
  { id:"fox-sports-2-hd", titulo:"Fox Sports 2 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/pne", video:"http://psrv.io:80/9089247/coreurl.me/18657" },
  { id:"fox-sports-2-sd", titulo:"Fox Sports 2 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Rei", video:"http://psrv.io:80/9089247/coreurl.me/18658" },
  { id:"fox-sports-fhd", titulo:"Fox Sports FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/H6m", video:"http://psrv.io:80/9089247/coreurl.me/18777" },
  { id:"fox-sports-fhd-h265", titulo:"Fox Sports FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28074" },
  { id:"fox-sports-hd", titulo:"Fox Sports HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/nWk", video:"http://psrv.io:80/9089247/coreurl.me/18659" },
  { id:"fox-sports-sd", titulo:"Fox Sports SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/LEj", video:"http://psrv.io:80/9089247/coreurl.me/18660" },
  { id:"globo-esporte-hd", titulo:"Globo Esporte HD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28376" },
  { id:"guia-de-jogos", titulo:"Guia De Jogos", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/kgB", video:"http://psrv.io:80/9089247/coreurl.me/28396" },
  { id:"premiere-2-fhd", titulo:"Premiere 2 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/B3z", video:"http://psrv.io:80/9089247/coreurl.me/18772" },
  { id:"premiere-2-fhd-h265", titulo:"Premiere 2 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/JZf", video:"http://psrv.io:80/9089247/coreurl.me/22176" },
  { id:"premiere-2-hd", titulo:"Premiere 2 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/7TJ", video:"http://psrv.io:80/9089247/coreurl.me/18594" },
  { id:"premiere-2-sd", titulo:"Premiere 2 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Dw5", video:"http://psrv.io:80/9089247/coreurl.me/18595" },
  { id:"estreia-3-fhd", titulo:"Estreia 3 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/zhT", video:"http://psrv.io:80/9089247/coreurl.me/18771" },
  { id:"premiere-3-fhd-h265", titulo:"Premiere 3 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/3MT", video:"http://psrv.io:80/9089247/coreurl.me/22175" },
  { id:"premiere-3-hd", titulo:"Premiere 3 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Eov", video:"http://psrv.io:80/9089247/coreurl.me/18592" },
  { id:"premiere-3-sd", titulo:"Premiere 3 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/pYW", video:"http://psrv.io:80/9089247/coreurl.me/18593" },
  { id:"premiere-4-fhd", titulo:"Premiere 4 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/l5p", video:"http://psrv.io:80/9089247/coreurl.me/18770" },
  { id:"premiere-4-sd", titulo:"Premiere 4 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/rHH", video:"http://psrv.io:80/9089247/coreurl.me/18591" },
  { id:"estreia-5-fhd", titulo:"Estreia 5 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/9fk", video:"http://psrv.io:80/9089247/coreurl.me/18769" },
  { id:"premiere-5-fhd-h265", titulo:"Premiere 5 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/gzL", video:"http://psrv.io:80/9089247/coreurl.me/22173" },
  { id:"premiere-5-hd", titulo:"Premiere 5 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/mTm", video:"http://psrv.io:80/9089247/coreurl.me/18588" },
  { id:"premiere-5-sd", titulo:"Premiere 5 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/EKB", video:"http://psrv.io:80/9089247/coreurl.me/18589" },
  { id:"estreia-6-fhd", titulo:"Estreia 6 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/MWj", video:"http://psrv.io:80/9089247/coreurl.me/18768" },
  { id:"premiere-6-fhd-h265", titulo:"Premiere 6 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/zX5", video:"http://psrv.io:80/9089247/coreurl.me/22172" },
  { id:"premiere-6-hd", titulo:"Premiere 6 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/6nM", video:"http://psrv.io:80/9089247/coreurl.me/18586" },
  { id:"premiere-6-sd", titulo:"Premiere 6 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/QT6", video:"http://psrv.io:80/9089247/coreurl.me/18587" },
  { id:"premiere-7-fhd", titulo:"Premiere 7 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/hJk", video:"http://psrv.io:80/9089247/coreurl.me/18767" },
  { id:"premiere-7-fhd-h265", titulo:"Premiere 7 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/zwc", video:"http://psrv.io:80/9089247/coreurl.me/22171" },
  { id:"premiere-7-hd", titulo:"Premiere 7 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/xrN", video:"http://psrv.io:80/9089247/coreurl.me/18584" },
  { id:"estreia-7-sd", titulo:"Estreia 7 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/1i8", video:"http://psrv.io:80/9089247/coreurl.me/18585" },
  { id:"estreia-8-sd", titulo:"Estreia 8 SD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28064" },
  { id:"premiere-9-sd", titulo:"Premiere 9 SD", tipo:"AoVivo", categoria:"Esportes", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28063" },
  { id:"premiere-clubes-fhd-h265", titulo:"Premiere Clubes FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Ke5", video:"http://psrv.io:80/9089247/coreurl.me/22170" },
  { id:"premiere-clubes-hd", titulo:"Premiere Clubes HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/CQb", video:"http://psrv.io:80/9089247/coreurl.me/18582" },
  { id:"premiere-clubes-sd", titulo:"Premiere Clubes SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/URo", video:"http://psrv.io:80/9089247/coreurl.me/18583" },
  { id:"sportv-2-fhd", titulo:"SporTV 2 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Fl2", video:"http://psrv.io:80/9089247/coreurl.me/18763" },
  { id:"sportv-2-fhd-h265", titulo:"SporTV 2 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/JSJ", video:"http://psrv.io:80/9089247/coreurl.me/22168" },
  { id:"sportv-2-hd", titulo:"SporTV 2 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/7lY", video:"http://psrv.io:80/9089247/coreurl.me/18561" },
  { id:"sportv-2-sd", titulo:"SporTV 2 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/P0b", video:"http://psrv.io:80/9089247/coreurl.me/18562" },
  { id:"sportv-3-fhd", titulo:"SporTV 3 FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/dyY", video:"http://psrv.io:80/9089247/coreurl.me/18762" },
  { id:"sportv-3-fhd-h265", titulo:"SporTV 3 FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Ya4", video:"http://psrv.io:80/9089247/coreurl.me/22167" },
  { id:"sportv-3-hd", titulo:"SporTV 3 HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/PUQ", video:"http://psrv.io:80/9089247/coreurl.me/18559" },
  { id:"sportv-3-sd", titulo:"SporTV 3 SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/GGG", video:"http://psrv.io:80/9089247/coreurl.me/18560" },
  { id:"sportv-fhd", titulo:"SporTV FHD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/ftu", video:"http://psrv.io:80/9089247/coreurl.me/18761" },
  { id:"sportv-fhd-h265", titulo:"SporTV FHD [H265]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/SlI", video:"http://psrv.io:80/9089247/coreurl.me/22166" },
  { id:"sportv-hd", titulo:"SporTV HD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/ygd", video:"http://psrv.io:80/9089247/coreurl.me/18558" },
  { id:"sportv-sd", titulo:"SporTV SD", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/Ffl", video:"http://psrv.io:80/9089247/coreurl.me/18563" },
  { id:"sportv-4k", titulo:"SPORTV [4K]", tipo:"AoVivo", categoria:"Esportes", poster:"http://z4.vc/tDf", video:"http://psrv.io:80/9089247/coreurl.me/26190" },

  // ── FILMES E SÉRIES (170) ──────────────────────
  { id:"axn", titulo:"AXN", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18854" },
  { id:"cinemax", titulo:"Cinemax", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18848" },
  { id:"animax-jp", titulo:"Animax (Japão)", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"https://i.imgur.com/jO0qUvj.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS236&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"spacetoon-arabic", titulo:"Spacetoon Arabic", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"https://i.imgur.com/placeholder.png", video:"https://shd-gcp-live.edgenextcdn.net/live/bitmovin-spacetoon/d8382fb9ab4b2307058f12c7ea90db54/index.m3u8" },
  { id:"amc-fhd", titulo:"AMC FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/PFh", video:"http://psrv.io:80/9089247/coreurl.me/18857" },
  { id:"amc-fhd-h265", titulo:"AMC FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/GcF", video:"http://psrv.io:80/9089247/coreurl.me/22212" },
  { id:"amc-hd", titulo:"AMC HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/5Gw", video:"http://psrv.io:80/9089247/coreurl.me/18736" },
  { id:"axn-fhd", titulo:"AXN FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/rpV", video:"http://psrv.io:80/9089247/coreurl.me/18854" },
  { id:"axn-fhd-h265", titulo:"AXN FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ItW", video:"http://psrv.io:80/9089247/coreurl.me/22210" },
  { id:"axn-hd", titulo:"AXN HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/j1K", video:"http://psrv.io:80/9089247/coreurl.me/18730" },
  { id:"axn-hd-legendado", titulo:"AXN HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ItW", video:"http://psrv.io:80/9089247/coreurl.me/28339" },
  { id:"axn-sd", titulo:"AXN SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/qfK", video:"http://psrv.io:80/9089247/coreurl.me/18731" },
  { id:"axn-sd-legendado", titulo:"AXN SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ItW", video:"http://psrv.io:80/9089247/coreurl.me/28340" },
  { id:"canal-brasil-fhd", titulo:"Canal Brasil FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/UqA", video:"http://psrv.io:80/9089247/coreurl.me/18753" },
  { id:"canal-brasil-fhd-h265", titulo:"Canal Brasil FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/bUk", video:"http://psrv.io:80/9089247/coreurl.me/25316" },
  { id:"canal-brasil-hd", titulo:"Canal Brasil HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/GsJ", video:"http://psrv.io:80/9089247/coreurl.me/18716" },
  { id:"canal-brasil-sd", titulo:"Canal Brasil SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/kWm", video:"http://psrv.io:80/9089247/coreurl.me/18717" },
  { id:"cinemax-fhd", titulo:"Cinemax FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/IbR", video:"http://psrv.io:80/9089247/coreurl.me/18848" },
  { id:"cinemax-fhd-h265", titulo:"Cinemax FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/i31", video:"http://psrv.io:80/9089247/coreurl.me/25313" },
  { id:"cinemax-hd", titulo:"Cinemax HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Lo1", video:"http://psrv.io:80/9089247/coreurl.me/18709" },
  { id:"cinemax-sd", titulo:"Cinemax SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ZLC", video:"http://psrv.io:80/9089247/coreurl.me/18710" },
  { id:"fox-fhd", titulo:"Fox FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Gcu", video:"http://psrv.io:80/9089247/coreurl.me/18779" },
  { id:"fox-fhd-h265", titulo:"Fox FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/yeh", video:"http://psrv.io:80/9089247/coreurl.me/22197" },
  { id:"fox-hd", titulo:"Fox HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/DUZ", video:"http://psrv.io:80/9089247/coreurl.me/18667" },
  { id:"fox-hd-legendado", titulo:"FOX HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/yeh", video:"http://psrv.io:80/9089247/coreurl.me/28341" },
  { id:"fox-premium-1-fhd", titulo:"Fox Premium 1 FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/efE", video:"http://psrv.io:80/9089247/coreurl.me/18832" },
  { id:"fox-premium-1-fhd-h265", titulo:"Fox Premium 1 FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/C2g", video:"http://psrv.io:80/9089247/coreurl.me/22144" },
  { id:"fox-premium-1-hd", titulo:"Fox Premium 1 HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/AQ5", video:"http://psrv.io:80/9089247/coreurl.me/18663" },
  { id:"fox-premium-2-fhd", titulo:"Fox Premium 2 FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/qoY", video:"http://psrv.io:80/9089247/coreurl.me/18831" },
  { id:"fox-premium-2-fhd-h265", titulo:"Fox Premium 2 FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/O5F", video:"http://psrv.io:80/9089247/coreurl.me/22143" },
  { id:"fox-premium-2-hd", titulo:"Fox Premium 2 HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/g8Q", video:"http://psrv.io:80/9089247/coreurl.me/18661" },
  { id:"fox-sd", titulo:"Fox SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/OcS", video:"http://psrv.io:80/9089247/coreurl.me/18668" },
  { id:"fox-sd-legendado", titulo:"FOX SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/yeh", video:"http://psrv.io:80/9089247/coreurl.me/28342" },
  { id:"fx-fhd", titulo:"FX FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/A4M", video:"http://psrv.io:80/9089247/coreurl.me/18829" },
  { id:"fx-fhd-h265", titulo:"FX FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/TBI", video:"http://psrv.io:80/9089247/coreurl.me/22194" },
  { id:"fx-hd", titulo:"FX HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/OsR", video:"http://psrv.io:80/9089247/coreurl.me/18653" },
  { id:"fx-hd-legendado", titulo:"FX HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/OsR", video:"http://psrv.io:80/9089247/coreurl.me/28361" },
  { id:"fx-sd", titulo:"FX SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/OYf", video:"http://psrv.io:80/9089247/coreurl.me/18654" },
  { id:"fx-sd-legendado", titulo:"FX SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/OsR", video:"http://psrv.io:80/9089247/coreurl.me/28362" },
  { id:"hbo-2-fhd", titulo:"HBO 2 FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/jVz", video:"http://psrv.io:80/9089247/coreurl.me/18774" },
  { id:"hbo-2-fhd-h265", titulo:"HBO 2 FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/8E9", video:"http://psrv.io:80/9089247/coreurl.me/22189" },
  { id:"hbo-2-hd", titulo:"HBO 2 HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/0PM", video:"http://psrv.io:80/9089247/coreurl.me/18640" },
  { id:"hbo-2-sd", titulo:"HBO 2 SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/zwf", video:"http://psrv.io:80/9089247/coreurl.me/18641" },
  { id:"hbo-family-fhd", titulo:"HBO Family FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/VUR", video:"http://psrv.io:80/9089247/coreurl.me/18825" },
  { id:"hbo-family-fhd-h265", titulo:"HBO Family FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/kwk", video:"http://psrv.io:80/9089247/coreurl.me/22140" },
  { id:"hbo-family-hd", titulo:"HBO Family HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/JtC", video:"http://psrv.io:80/9089247/coreurl.me/18638" },
  { id:"hbo-family-sd", titulo:"HBO Family SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/vKg", video:"http://psrv.io:80/9089247/coreurl.me/18639" },
  { id:"hbo-fhd", titulo:"HBO FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/xDI", video:"http://psrv.io:80/9089247/coreurl.me/18773" },
  { id:"hbo-fhd-h265", titulo:"HBO FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Tjb", video:"http://psrv.io:80/9089247/coreurl.me/22139" },
  { id:"hbo-hd", titulo:"HBO HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/z1Y", video:"http://psrv.io:80/9089247/coreurl.me/18637" },
  { id:"hbo-hd-legendado", titulo:"HBO HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/z1Y", video:"http://psrv.io:80/9089247/coreurl.me/28343" },
  { id:"hbo-plus-fhd", titulo:"HBO Plus FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/YOR", video:"http://psrv.io:80/9089247/coreurl.me/18824" },
  { id:"hbo-plus-fhd-h265", titulo:"HBO Plus FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/EFq", video:"http://psrv.io:80/9089247/coreurl.me/22191" },
  { id:"hbo-plus-hd", titulo:"HBO Plus HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/oZI", video:"http://psrv.io:80/9089247/coreurl.me/18635" },
  { id:"hbo-plus-hd-legendado", titulo:"HBO PLUS HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/z1Y", video:"http://psrv.io:80/9089247/coreurl.me/28345" },
  { id:"hbo-plus-sd", titulo:"HBO Plus SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Gg9", video:"http://psrv.io:80/9089247/coreurl.me/18636" },
  { id:"hbo-plus-sd-legendado", titulo:"HBO PLUS SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/z1Y", video:"http://psrv.io:80/9089247/coreurl.me/28346" },
  { id:"hbo-sd", titulo:"HBO SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ncl", video:"http://psrv.io:80/9089247/coreurl.me/18642" },
  { id:"hbo-sd-legendado", titulo:"HBO SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/z1Y", video:"http://psrv.io:80/9089247/coreurl.me/28344" },
  { id:"hbo-signature-fhd", titulo:"HBO Signature FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/97M", video:"http://psrv.io:80/9089247/coreurl.me/18823" },
  { id:"hbo-signature-fhd-h265", titulo:"HBO Signature FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/1lN", video:"http://psrv.io:80/9089247/coreurl.me/22190" },
  { id:"hbo-signature-hd", titulo:"HBO Signature HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ICL", video:"http://psrv.io:80/9089247/coreurl.me/18633" },
  { id:"hbo-signature-sd", titulo:"HBO Signature SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/CPt", video:"http://psrv.io:80/9089247/coreurl.me/18634" },
  { id:"life-time-fhd", titulo:"Life Time FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28401" },
  { id:"life-time-sd", titulo:"Life Time SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28402" },
  { id:"max-fhd", titulo:"Max FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/amW", video:"http://psrv.io:80/9089247/coreurl.me/18819" },
  { id:"max-fhd-h265", titulo:"Max FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cmn", video:"http://psrv.io:80/9089247/coreurl.me/22185" },
  { id:"max-hd", titulo:"Max HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cC5", video:"http://psrv.io:80/9089247/coreurl.me/18623" },
  { id:"max-prime-fhd", titulo:"Max Prime FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/i97", video:"http://psrv.io:80/9089247/coreurl.me/18818" },
  { id:"max-prime-fhd-h265", titulo:"Max Prime FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Zzp", video:"http://psrv.io:80/9089247/coreurl.me/22184" },
  { id:"max-prime-hd", titulo:"Max Prime HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/fwU", video:"http://psrv.io:80/9089247/coreurl.me/18621" },
  { id:"max-prime-sd", titulo:"Max Prime SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cv2", video:"http://psrv.io:80/9089247/coreurl.me/18622" },
  { id:"max-prime-sd-legendado", titulo:"MAX PRIME SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/i97", video:"http://psrv.io:80/9089247/coreurl.me/28347" },
  { id:"max-sd", titulo:"Max SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/CmH", video:"http://psrv.io:80/9089247/coreurl.me/18624" },
  { id:"max-sd-legendado", titulo:"MAX SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cC5", video:"http://psrv.io:80/9089247/coreurl.me/28348" },
  { id:"max-up-fhd", titulo:"Max UP FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/sJf", video:"http://psrv.io:80/9089247/coreurl.me/18817" },
  { id:"max-up-fhd-h265", titulo:"Max UP FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/g5r", video:"http://psrv.io:80/9089247/coreurl.me/22138" },
  { id:"max-up-hd", titulo:"Max UP HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/gZk", video:"http://psrv.io:80/9089247/coreurl.me/18619" },
  { id:"max-up-hd-legendado", titulo:"MAX UP HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/gZk", video:"http://psrv.io:80/9089247/coreurl.me/28363" },
  { id:"max-up-sd", titulo:"Max UP SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/brs", video:"http://psrv.io:80/9089247/coreurl.me/18620" },
  { id:"max-up-sd-legendado", titulo:"MAX UP SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/gZk", video:"http://psrv.io:80/9089247/coreurl.me/28364" },
  { id:"megapix-fhd", titulo:"Megapix FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/jWK", video:"http://psrv.io:80/9089247/coreurl.me/18816" },
  { id:"megapix-fhd-h265", titulo:"Megapix FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/zPy", video:"http://psrv.io:80/9089247/coreurl.me/22137" },
  { id:"megapix-hd", titulo:"Megapix HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/KR2", video:"http://psrv.io:80/9089247/coreurl.me/18617" },
  { id:"megapix-hd-legendado", titulo:"MEGAPIX HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/KR2", video:"http://psrv.io:80/9089247/coreurl.me/28365" },
  { id:"megapix-sd", titulo:"Megapix SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/g9W", video:"http://psrv.io:80/9089247/coreurl.me/18618" },
  { id:"megapix-sd-legendado", titulo:"MEGAPIX SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/KR2", video:"http://psrv.io:80/9089247/coreurl.me/28366" },
  { id:"paramount-channel-fhd", titulo:"Paramount Channel FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/UeA", video:"http://psrv.io:80/9089247/coreurl.me/18805" },
  { id:"paramount-channel-fhd-h265", titulo:"Paramount Channel FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/VL0", video:"http://psrv.io:80/9089247/coreurl.me/22177" },
  { id:"paramount-channel-hd", titulo:"Paramount Channel HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/QY7", video:"http://psrv.io:80/9089247/coreurl.me/18596" },
  { id:"paramount-channel-sd", titulo:"Paramount Channel SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/G8C", video:"http://psrv.io:80/9089247/coreurl.me/18597" },
  { id:"sony-fhd", titulo:"Sony FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/YP8", video:"http://psrv.io:80/9089247/coreurl.me/18850" },
  { id:"sony-fhd-h265", titulo:"Sony FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/FM8", video:"http://psrv.io:80/9089247/coreurl.me/25315" },
  { id:"sony-hd", titulo:"Sony HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/hkn", video:"http://psrv.io:80/9089247/coreurl.me/18714" },
  { id:"sony-hd-legendado", titulo:"SONY HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/hkn", video:"http://psrv.io:80/9089247/coreurl.me/28373" },
  { id:"sony-sd", titulo:"Sony SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/npa", video:"http://psrv.io:80/9089247/coreurl.me/18715" },
  { id:"sony-sd-legendado", titulo:"SONY SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/hkn", video:"http://psrv.io:80/9089247/coreurl.me/28375" },
  { id:"space-fhd", titulo:"Space FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/hBI", video:"http://psrv.io:80/9089247/coreurl.me/18802" },
  { id:"space-fhd-h265", titulo:"Space FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ao2", video:"http://psrv.io:80/9089247/coreurl.me/22169" },
  { id:"space-hd", titulo:"Space HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/EPt", video:"http://psrv.io:80/9089247/coreurl.me/18564" },
  { id:"space-hd-legendado", titulo:"SPACE HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/hBI", video:"http://psrv.io:80/9089247/coreurl.me/28367" },
  { id:"space-sd", titulo:"Space SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/zXZ", video:"http://psrv.io:80/9089247/coreurl.me/18565" },
  { id:"space-sd-legendado", titulo:"SPACE SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/hBI", video:"http://psrv.io:80/9089247/coreurl.me/28368" },
  { id:"studio-universal-fhd", titulo:"Studio Universal FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/8f1", video:"http://psrv.io:80/9089247/coreurl.me/18801" },
  { id:"studio-universal-fhd-h265", titulo:"Studio Universal FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/AiX", video:"http://psrv.io:80/9089247/coreurl.me/22165" },
  { id:"studio-universal-hd", titulo:"Studio Universal HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/IU1", video:"http://psrv.io:80/9089247/coreurl.me/18556" },
  { id:"studio-universal-sd", titulo:"Studio Universal SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/6ft", video:"http://psrv.io:80/9089247/coreurl.me/18557" },
  { id:"syfy-fhd", titulo:"Syfy FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/7Na", video:"http://psrv.io:80/9089247/coreurl.me/18800" },
  { id:"syfy-fhd-h265", titulo:"Syfy FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/j1e", video:"http://psrv.io:80/9089247/coreurl.me/22133" },
  { id:"syfy-hd", titulo:"Syfy HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/yWZ", video:"http://psrv.io:80/9089247/coreurl.me/18566" },
  { id:"syfy-sd", titulo:"Syfy SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/yZB", video:"http://psrv.io:80/9089247/coreurl.me/18567" },
  { id:"tbs-fhd", titulo:"TBS FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/RDY", video:"http://psrv.io:80/9089247/coreurl.me/18799" },
  { id:"tbs-fhd-h265", titulo:"TBS FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/lAu", video:"http://psrv.io:80/9089247/coreurl.me/22164" },
  { id:"tbs-hd", titulo:"TBS HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/lL4", video:"http://psrv.io:80/9089247/coreurl.me/18554" },
  { id:"tbs-sd", titulo:"TBS SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/6rM", video:"http://psrv.io:80/9089247/coreurl.me/18555" },
  { id:"tcm-sd", titulo:"TCM SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/9cn", video:"http://psrv.io:80/9089247/coreurl.me/18553" },
  { id:"telecine-action-fhd", titulo:"Telecine Action FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cyv", video:"http://psrv.io:80/9089247/coreurl.me/18760" },
  { id:"telecine-action-fhd-h265", titulo:"Telecine Action FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/bKl", video:"http://psrv.io:80/9089247/coreurl.me/22163" },
  { id:"telecine-action-hd", titulo:"Telecine Action HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/wYg", video:"http://psrv.io:80/9089247/coreurl.me/18551" },
  { id:"telecine-action-hd-legendado", titulo:"TELECINE ACTION HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/bKl", video:"http://psrv.io:80/9089247/coreurl.me/28349" },
  { id:"telecine-action-sd", titulo:"Telecine Action SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/2ne", video:"http://psrv.io:80/9089247/coreurl.me/18552" },
  { id:"telecine-action-sd-legendado", titulo:"TELECINE ACTION SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/bKl", video:"http://psrv.io:80/9089247/coreurl.me/28350" },
  { id:"telecine-cult-fhd", titulo:"Telecine Cult FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/KyT", video:"http://psrv.io:80/9089247/coreurl.me/18798" },
  { id:"telecine-cult-fhd-h265", titulo:"Telecine Cult FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/JWO", video:"http://psrv.io:80/9089247/coreurl.me/22162" },
  { id:"telecine-cult-hd", titulo:"Telecine Cult HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cuv", video:"http://psrv.io:80/9089247/coreurl.me/18549" },
  { id:"telecine-cult-sd", titulo:"Telecine Cult SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/BeC", video:"http://psrv.io:80/9089247/coreurl.me/18550" },
  { id:"telecine-fun-fhd", titulo:"Telecine Fun FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/d5H", video:"http://psrv.io:80/9089247/coreurl.me/18759" },
  { id:"telecine-fun-fhd-h265", titulo:"Telecine Fun FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/y6K", video:"http://psrv.io:80/9089247/coreurl.me/22161" },
  { id:"telecine-fun-hd", titulo:"Telecine Fun HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/7vJ", video:"http://psrv.io:80/9089247/coreurl.me/18547" },
  { id:"telecine-fun-hd-legendado", titulo:"TELECINE FUN HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/dpl", video:"http://psrv.io:80/9089247/coreurl.me/28351" },
  { id:"telecine-fun-sd", titulo:"Telecine Fun SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/dpl", video:"http://psrv.io:80/9089247/coreurl.me/18548" },
  { id:"telecine-fun-sd-legendado", titulo:"TELECINE FUN SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/dpl", video:"http://psrv.io:80/9089247/coreurl.me/28352" },
  { id:"telecine-pipoca-fhd", titulo:"Telecine Pipoca FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Sq4", video:"http://psrv.io:80/9089247/coreurl.me/18758" },
  { id:"telecine-pipoca-fhd-h265", titulo:"Telecine Pipoca FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/dl3", video:"http://psrv.io:80/9089247/coreurl.me/22160" },
  { id:"telecine-pipoca-hd", titulo:"Telecine Pipoca HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/8dT", video:"http://psrv.io:80/9089247/coreurl.me/18545" },
  { id:"telecine-pipoca-hd-legendado", titulo:"TELECINE PIPOCA HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Sq4", video:"http://psrv.io:80/9089247/coreurl.me/28353" },
  { id:"telecine-pipoca-sd", titulo:"Telecine Pipoca SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/qp8", video:"http://psrv.io:80/9089247/coreurl.me/18546" },
  { id:"telecine-pipoca-sd-legendado", titulo:"TELECINE PIPOCA SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/Sq4", video:"http://psrv.io:80/9089247/coreurl.me/28354" },
  { id:"telecine-premium-fhd", titulo:"Telecine Premium FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ZYg", video:"http://psrv.io:80/9089247/coreurl.me/18757" },
  { id:"telecine-premium-fhd-h265", titulo:"Telecine Premium FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/4S2", video:"http://psrv.io:80/9089247/coreurl.me/22159" },
  { id:"telecine-premium-hd", titulo:"Telecine Premium HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/RwJ", video:"http://psrv.io:80/9089247/coreurl.me/18543" },
  { id:"telecine-premium-hd-legendado", titulo:"TELECINE PREMIUM HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ZYg", video:"http://psrv.io:80/9089247/coreurl.me/28355" },
  { id:"telecine-premium-sd", titulo:"Telecine Premium SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/jgo", video:"http://psrv.io:80/9089247/coreurl.me/18544" },
  { id:"telecine-premium-sd-legendado", titulo:"TELECINE PREMIUM SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/ZYg", video:"http://psrv.io:80/9089247/coreurl.me/28356" },
  { id:"telecine-touch-fhd", titulo:"Telecine Touch FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/lMo", video:"http://psrv.io:80/9089247/coreurl.me/18756" },
  { id:"telecine-touch-fhd-h265", titulo:"Telecine Touch FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/OhL", video:"http://psrv.io:80/9089247/coreurl.me/22158" },
  { id:"telecine-touch-hd", titulo:"Telecine Touch HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/jJj", video:"http://psrv.io:80/9089247/coreurl.me/18541" },
  { id:"telecine-touch-hd-legendado", titulo:"TELECINE TOUCH HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/lMo", video:"http://psrv.io:80/9089247/coreurl.me/28357" },
  { id:"telecine-touch-sd", titulo:"Telecine Touch SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/c1M", video:"http://psrv.io:80/9089247/coreurl.me/18542" },
  { id:"telecine-touch-sd-legendado", titulo:"TELECINE TOUCH SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/lMo", video:"http://psrv.io:80/9089247/coreurl.me/28358" },
  { id:"tnt-fhd", titulo:"TNT FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/RrC", video:"http://psrv.io:80/9089247/coreurl.me/18796" },
  { id:"tnt-fhd-h265", titulo:"TNT FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/94U", video:"http://psrv.io:80/9089247/coreurl.me/22157" },
  { id:"tnt-hd", titulo:"TNT HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/C6Y", video:"http://psrv.io:80/9089247/coreurl.me/18536" },
  { id:"tnt-hd-legendado", titulo:"TNT HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/C6Y", video:"http://psrv.io:80/9089247/coreurl.me/28359" },
  { id:"tnt-sd", titulo:"TNT SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/VGk", video:"http://psrv.io:80/9089247/coreurl.me/18537" },
  { id:"tnt-sd-legendado", titulo:"TNT SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/C6Y", video:"http://psrv.io:80/9089247/coreurl.me/28360" },
  { id:"tnt-s-rie-fhd", titulo:"TNT Série FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cM3", video:"http://psrv.io:80/9089247/coreurl.me/18795" },
  { id:"tnt-s-rie-fhd-h265", titulo:"TNT Série FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/KEC", video:"http://psrv.io:80/9089247/coreurl.me/22156" },
  { id:"tnt-series-sd", titulo:"TNT Series SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/gQ3", video:"http://psrv.io:80/9089247/coreurl.me/18535" },
  { id:"tnt-series-sd-legendado", titulo:"TNT SERIES SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/cM3", video:"http://psrv.io:80/9089247/coreurl.me/28370" },
  { id:"universal-channel-fhd", titulo:"Universal Channel FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/04y", video:"http://psrv.io:80/9089247/coreurl.me/18792" },
  { id:"universal-channel-fhd-h265", titulo:"Universal Channel FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/94M", video:"http://psrv.io:80/9089247/coreurl.me/22155" },
  { id:"universal-canal-hd", titulo:"Universal Canal HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/0j9", video:"http://psrv.io:80/9089247/coreurl.me/18520" },
  { id:"canal-universal-sd", titulo:"Canal Universal SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/wGT", video:"http://psrv.io:80/9089247/coreurl.me/18521" },
  { id:"warner-channel-fhd", titulo:"Warner Channel FHD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/4dc", video:"http://psrv.io:80/9089247/coreurl.me/18790" },
  { id:"warner-channel-fhd-h265", titulo:"Warner Channel FHD [H265]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/i3M", video:"http://psrv.io:80/9089247/coreurl.me/22153" },
  { id:"warner-channel-hd", titulo:"Warner Channel HD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/W7o", video:"http://psrv.io:80/9089247/coreurl.me/18513" },
  { id:"warner-channel-sd", titulo:"Warner Channel SD", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/QRs", video:"http://psrv.io:80/9089247/coreurl.me/18514" },
  { id:"warner-hd-legendado", titulo:"WARNER HD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/W7o", video:"http://psrv.io:80/9089247/coreurl.me/28371" },
  { id:"warner-sd-legendado", titulo:"WARNER SD [Legendado]", tipo:"AoVivo", categoria:"Filmes e Séries", poster:"http://z4.vc/W7o", video:"http://psrv.io:80/9089247/coreurl.me/28372" },

  // ── DOCUMENTÁRIOS (51) ──────────────────────
  { id:"discovery-kids", titulo:"Discovery Kids", tipo:"AoVivo", categoria:"Documentários", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18843" },
  { id:"discovery", titulo:"Discovery Channel", tipo:"AoVivo", categoria:"Documentários", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18783" },
  { id:"animal-planet", titulo:"Animal Planet", tipo:"AoVivo", categoria:"Documentários", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18856" },
  { id:"animal-planet-fhd", titulo:"Animal Planet FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/slU", video:"http://psrv.io:80/9089247/coreurl.me/18856" },
  { id:"animal-planet-fhd-h265", titulo:"Animal Planet FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/aPp", video:"http://psrv.io:80/9089247/coreurl.me/22211" },
  { id:"animal-planet-hd", titulo:"Animal Planet HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/BZz", video:"http://psrv.io:80/9089247/coreurl.me/18734" },
  { id:"animal-planet-sd", titulo:"Animal Planet SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/fjU", video:"http://psrv.io:80/9089247/coreurl.me/18735" },
  { id:"arte-1-fhd", titulo:"Arte 1 FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/I6b", video:"http://psrv.io:80/9089247/coreurl.me/18855" },
  { id:"arte-1-fhd-h265", titulo:"Arte 1 FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/2KF", video:"http://psrv.io:80/9089247/coreurl.me/25196" },
  { id:"arte-1-hd", titulo:"Arte 1 HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/Vfq", video:"http://psrv.io:80/9089247/coreurl.me/27884" },
  { id:"arte-1-sd", titulo:"Arte 1 SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/8td", video:"http://psrv.io:80/9089247/coreurl.me/18733" },
  { id:"discovery-channel-fhd", titulo:"Discovery Channel FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/Y5D", video:"http://psrv.io:80/9089247/coreurl.me/18783" },
  { id:"discovery-channel-fhd-h265", titulo:"Discovery Channel FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/0v1", video:"http://psrv.io:80/9089247/coreurl.me/22204" },
  { id:"discovery-channel-hd", titulo:"Discovery Channel HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/W6B", video:"http://psrv.io:80/9089247/coreurl.me/18701" },
  { id:"discovery-channel-sd", titulo:"Discovery Channel SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/4mU", video:"http://psrv.io:80/9089247/coreurl.me/18702" },
  { id:"discovery-science-fhd", titulo:"Discovery Science FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/bfd", video:"http://psrv.io:80/9089247/coreurl.me/18842" },
  { id:"discovery-science-fhd-h265", titulo:"Discovery Science FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/KAc", video:"http://psrv.io:80/9089247/coreurl.me/22201" },
  { id:"discovery-science-hd", titulo:"Discovery Science HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/rQr", video:"http://psrv.io:80/9089247/coreurl.me/18693" },
  { id:"discovery-science-sd", titulo:"Discovery Science SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/fV1", video:"http://psrv.io:80/9089247/coreurl.me/18694" },
  { id:"teatro-discovery-fhd", titulo:"Teatro Discovery FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/m7Y", video:"http://psrv.io:80/9089247/coreurl.me/18841" },
  { id:"discovery-theatre-fhd-h265", titulo:"Discovery Theatre FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/9eJ", video:"http://psrv.io:80/9089247/coreurl.me/22200" },
  { id:"discovery-theatre-hd", titulo:"Discovery Theatre HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/FSs", video:"http://psrv.io:80/9089247/coreurl.me/18691" },
  { id:"teatro-discovery-sd", titulo:"Teatro Discovery SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/9oW", video:"http://psrv.io:80/9089247/coreurl.me/18692" },
  { id:"discovery-world-fhd", titulo:"Discovery World FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/x0i", video:"http://psrv.io:80/9089247/coreurl.me/18839" },
  { id:"discovery-world-fhd-h265", titulo:"Discovery World FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/4Yx", video:"http://psrv.io:80/9089247/coreurl.me/22130" },
  { id:"discovery-world-hd", titulo:"Discovery World HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/SxE", video:"http://psrv.io:80/9089247/coreurl.me/18687" },
  { id:"discovery-world-sd", titulo:"Discovery World SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/x5l", video:"http://psrv.io:80/9089247/coreurl.me/18688" },
  { id:"h2-fhd", titulo:"H2 FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/Yos", video:"http://psrv.io:80/9089247/coreurl.me/18826" },
  { id:"h2-fhd-h265", titulo:"H2 FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/cwN", video:"http://psrv.io:80/9089247/coreurl.me/22192" },
  { id:"h2-hd", titulo:"H2 HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/prI", video:"http://psrv.io:80/9089247/coreurl.me/18643" },
  { id:"h2-sd", titulo:"H2 SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/Izg", video:"http://psrv.io:80/9089247/coreurl.me/22309" },
  { id:"hgtv-fhd", titulo:"HGTV FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/TDO", video:"http://psrv.io:80/9089247/coreurl.me/18845" },
  { id:"hgtv-fhd-h265", titulo:"HGTV FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/22203" },
  { id:"hgtv-hd", titulo:"HGTV HD", tipo:"AoVivo", categoria:"Documentários", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/18699" },
  { id:"hgtv-sd", titulo:"HGTV SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/3Ee", video:"http://psrv.io:80/9089247/coreurl.me/18700" },
  { id:"history-channel-fhd", titulo:"History Channel FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/YVo", video:"http://psrv.io:80/9089247/coreurl.me/18822" },
  { id:"history-channel-fhd-h265", titulo:"History Channel FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/p68", video:"http://psrv.io:80/9089247/coreurl.me/22188" },
  { id:"history-channel-hd", titulo:"History Channel HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/hEz", video:"http://psrv.io:80/9089247/coreurl.me/18631" },
  { id:"history-channel-sd", titulo:"History Channel SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/GaY", video:"http://psrv.io:80/9089247/coreurl.me/18632" },
  { id:"natgeo-wild-fhd-h265", titulo:"NatGeo Wild FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/Nzf", video:"http://psrv.io:80/9089247/coreurl.me/22179" },
  { id:"natgeo-wild-hd", titulo:"NatGeo Wild HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/Vzb", video:"http://psrv.io:80/9089247/coreurl.me/18606" },
  { id:"natgeo-wild-sd", titulo:"NatGeo Wild SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/qtJ", video:"http://psrv.io:80/9089247/coreurl.me/18605" },
  { id:"national-geographic-fhd", titulo:"National Geographic FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/QKB", video:"http://psrv.io:80/9089247/coreurl.me/18811" },
  { id:"national-geographic-hd", titulo:"National Geographic HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/NlH", video:"http://psrv.io:80/9089247/coreurl.me/18609" },
  { id:"national-geographic-sd", titulo:"National Geographic SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/uNC", video:"http://psrv.io:80/9089247/coreurl.me/18610" },
  { id:"smithsonian-fhd", titulo:"Smithsonian FHD", tipo:"AoVivo", categoria:"Documentários", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26828" },
  { id:"smithsonian-fhd-h265", titulo:"Smithsonian FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/25202" },
  { id:"trutv-fhd", titulo:"TruTV FHD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/EYp", video:"http://psrv.io:80/9089247/coreurl.me/18794" },
  { id:"trutv-fhd-h265", titulo:"TruTV FHD [H265]", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/hf1", video:"http://psrv.io:80/9089247/coreurl.me/25200" },
  { id:"trutv-hd", titulo:"TruTV HD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/SHx", video:"http://psrv.io:80/9089247/coreurl.me/18522" },
  { id:"trutv-sd", titulo:"TruTV SD", tipo:"AoVivo", categoria:"Documentários", poster:"http://z4.vc/67c", video:"http://psrv.io:80/9089247/coreurl.me/18523" },

  // ── VARIEDADES (233) ──────────────────────
  { id:"adesso-tv", titulo:"Adesso TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/KgetM8j.png", video:"https://cdn.jmvstream.com/w/LVW-9715/LVW9715_12B26T62tm/playlist.m3u8" },
  { id:"com-brasil", titulo:"COM Brasil", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/GrjGwKM.png", video:"https://br5093.streamingdevideo.com.br/abc/abc/playlist.m3u8" },
  { id:"conexao-tv", titulo:"Conexão TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/CJ9SPsZ.png", video:"https://5a57bda70564a.streamlock.net/conexaotv/conexaotv.sdp/playlist.m3u8" },
  { id:"eutv", titulo:"EUTV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/8PxpamC.png", video:"https://cdn.jmvstream.com/w/LVW-8719/LVW8719_AcLVAxWy5J/playlist.m3u8" },
  { id:"fala-litoral", titulo:"Fala Litoral", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/NF6PL8O.png", video:"https://5c483b9d1019c.streamlock.net/falalitoraltv/falalitoraltv/playlist.m3u8" },
  { id:"rbatv", titulo:"RBATV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/ZWFxlU1.png", video:"https://cdn.live.br1.jmvstream.com/w/LVW-15748/LVW15748_Yed7yzLuRC/playlist.m3u8" },
  { id:"sertao-tv", titulo:"Sertão TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/b5xOCsC.png", video:"http://wz4.dnip.com.br/sertaotv/sertaotv.sdp/playlist.m3u8" },
  { id:"tv-mais-marica", titulo:"TV Mais Maricá", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/lgCRX7q.png", video:"https://5cf4a2c2512a2.streamlock.net/tvmaismarica/tvmaismarica/playlist.m3u8" },
  { id:"tv-nbn", titulo:"TVNBN", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/zoHBxn1.png", video:"https://cdn.jmvstream.com/w/LVW-8410/LVW8410_uiZOVm6vz1/playlist.m3u8" },
  { id:"tv-passo-fundo", titulo:"TV Passo Fundo", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/QFE6TiV.png", video:"https://5a57bda70564a.streamlock.net/tvpasso/tvpasso.sdp/playlist.m3u8" },
  { id:"tv-sul-minas", titulo:"TV Sul de Minas", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/hPh8cxK.png", video:"https://5cf4a2c2512a2.streamlock.net/tvsuldeminas/tvsuldeminas/playlist.m3u8" },
  { id:"tv-vila-real", titulo:"TV Vila Real", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/Z1uWe7g.png", video:"https://cdn.jmvstream.com/w/LVW-10841/LVW10841_mT77z9o2cP/playlist.m3u8" },
  { id:"tvcom-df", titulo:"TVCOM DF", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/uxefHY3.png", video:"https://5b7f3c45ab7c2.streamlock.net/8008/smil:8008.smil/playlist.m3u8?DVR=" },
  { id:"amc", titulo:"AMC", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18857" },
  { id:"fx", titulo:"FX", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18829" },
  { id:"ae", titulo:"A&E", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18858" },
  { id:"comedy-central", titulo:"Comedy Central", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18847" },
  { id:"bis", titulo:"Bis", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18785" },
  { id:"band", titulo:"Band", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18786" },
  { id:"canal-38", titulo:"Canal 38", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/co7TCWC.png", video:"https://cdn.jmvstream.com/w/LVW-8503/LVW8503_d0V5oduFlK/playlist.m3u8" },
  { id:"plena-tv", titulo:"Plena TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/lH4RT7b.png", video:"https://cdn.jmvstream.com/w/LVW-9591/LVW9591_PmXtgATnaS/playlist.m3u8" },
  { id:"stz-tv", titulo:"STZ TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/SeF2I7q.png", video:"https://cdn.live.br1.jmvstream.com/webtv/AVJ-12952/playlist/playlist.m3u8" },
  { id:"tv-sim-cachoeiro", titulo:"TV Sim Cachoeiro", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/t5oUK3C.png", video:"https://5cf4a2c2512a2.streamlock.net/8104/8104/playlist.m3u8" },
  { id:"tv-sim-colatina", titulo:"TV Sim Colatina", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/t5oUK3C.png", video:"https://5cf4a2c2512a2.streamlock.net/8132/8132/playlist.m3u8" },
  { id:"tv-sim-sao-mateus", titulo:"TV Sim São Mateus", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/t5oUK3C.png", video:"https://5cf4a2c2512a2.streamlock.net/8236/8236/playlist.m3u8" },
  { id:"tv-zoom", titulo:"TV Zoom", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/jCGrjf5.png", video:"https://cdn.jmvstream.com/w/LVW-9730/LVW9730_LmUwslM8jt/playlist.m3u8" },
  { id:"despertar-tv", titulo:"Despertar TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://res.cloudinary.com/dpkehkbpv/image/upload/v1721839192/logo/mixtv/despertar_tv_ieb2l3.png", video:"https://cdn.live.br1.jmvstream.com/webtv/pejexypz/playlist/playlist.m3u8" },
  { id:"fonte-tv", titulo:"Fonte TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/7q2BmNc.png", video:"http://flash.softhost.com.br:1935/fonte/fontetv/live.m3u8" },
  { id:"nova-era-tv", titulo:"Nova Era TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/IK3F9Uq.png", video:"http://wz3.dnip.com.br:1935/novaeratv/novaeratv.sdp/live.m3u8" },
  { id:"tv-cancao-nova", titulo:"TV Canção Nova", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/OaM9hkH.png", video:"https://5c65286fc6ace.streamlock.net/cancaonova/CancaoNova.stream_720p/playlist.m3u8" },
  { id:"tv-terceiro-anjo", titulo:"TV Terceiro Anjo", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/PExKWNv.png", video:"https://streamer1.streamhost.org/salive/GMI3anjoh/playlist.m3u8" },
  { id:"boas-novas", titulo:"Boas Novas", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/ZqhizdP.png", video:"https://cdn.jmvstream.com/w/LVW-9375/LVW9375_6i0wPBCHYc/playlist.m3u8" },
  { id:"chroma-tv", titulo:"Chroma TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/SnaIMgj.png", video:"https://5c483b9d1019c.streamlock.net/8054/8054/playlist.m3u8" },
  { id:"tv-aratu", titulo:"TV Aratu", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/LCETtuk.png", video:"https://cdn.jmvstream.com/w/LVW-8379/LVW8379_rIq6ZYiIiA/playlist.m3u8" },
  { id:"tv-clube", titulo:"TV Clube", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/CpXjcyE.png", video:"https://5c483b9d1019c.streamlock.net/8186/8186/playlist.m3u8" },
  { id:"tv-max", titulo:"TV MAX", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/2Pg0baJ.png", video:"https://5cf4a2c2512a2.streamlock.net/tvmax/tvmax/playlist.m3u8" },
  { id:"tv-pantanal", titulo:"TV Pantanal MS", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/0FOmktl.png", video:"https://5a2b083e9f360.streamlock.net/tvpantanal/tvpantanal.sdp/playlist.m3u8" },
  { id:"tv-vicosa", titulo:"TV Viçosa", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/TZF55f9.png", video:"http://wz4.dnip.com.br/fratevitv/fratevitv.sdp/playlist.m3u8" },
  { id:"1001-noites", titulo:"1001 Noites", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/dWA9y2J.png", video:"https://cdn.jmvstream.com/w/LVW-8155/ngrp:LVW8155_41E1ciuCvO_all/playlist.m3u8" },
  { id:"tv-ufg", titulo:"TV UFG", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/Yp3dbJo.png", video:"http://flash.softhost.com.br:1935/ufg/tvufgweb/playlist.m3u8" },
  { id:"unisul-tv", titulo:"UNISUL TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/N0TvAFz.png", video:"https://sitetv.brasilstream.com.br/hls/sitetv/index.m3u8?token=" },
  { id:"boktv", titulo:"BOK TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://livestream2.bokradio.co.za/hls/Bok5c.m3u8" },
  { id:"gnf-tv", titulo:"GNF TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://oqgdrb8my4rm-hls-live.5centscdn.com/GNF02/bcea197d8b00f79cb716c6288a861000.sdp/playlist.m3u8" },
  { id:"homebase-tv", titulo:"Homebase TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://viewmedia7219.bozztv.com/wmedia/viewmedia100/web_022/Stream/playlist.m3u8" },
  { id:"hope-channel-africa", titulo:"Hope Channel Africa", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://jstre.am/live/jsl:i1onRBELcGV.m3u8" },
  { id:"ln24sa", titulo:"LN24SA", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://cdnstack.internetmultimediaonline.org/ln24/ln24.stream/playlist.m3u8" },
  { id:"loveworld-sat", titulo:"LoveworldSAT", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://cdnstack.internetmultimediaonline.org/lwsat/lwsat.stream/index.m3u8" },
  { id:"nuview-tv", titulo:"NuView TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://viewmedia7219.bozztv.com/wmedia/viewmedia100/web_002/Stream/playlist.m3u8" },
  { id:"redemption-tv", titulo:"Redemption TV Ministry", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.nixsat.com/play/rtm/index.m3u8" },
  { id:"rlw-tv", titulo:"RLW TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://webstreaming-8.viewmedia.tv/web_119/Stream/playlist.m3u8" },
  { id:"rov-tv", titulo:"ROV TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://viewmedia7219.bozztv.com/wmedia/viewmedia100/web_012/Stream/playlist.m3u8" },
  { id:"wildearth", titulo:"WildEarth", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01290-wildearth-oando/playlist.m3u8" },
  { id:"amc-af", titulo:"AMC", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://amchls.wns.live/hls/stream.m3u8" },
  { id:"bahar-tv", titulo:"Bahar TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://59d39900ebfb8.streamlock.net/bahartv/bahartv/playlist.m3u8" },
  { id:"chekad-tv", titulo:"Chekad TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://go5lmqxjyawb-hls-live.5centscdn.com/Chekad/271ddf829afeece44d8732757fba1a66.sdp/chunks.m3u8" },
  { id:"dunya-naw-tv", titulo:"Dunya Naw TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://dunyanhls.wns.live/hls/stream.m3u8" },
  { id:"eslah-tv", titulo:"Eslah TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://eslahtvhls.wns.live/hls/stream.m3u8" },
  { id:"hewad-tv", titulo:"Hewad TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://51.210.199.58/hls/stream.m3u8" },
  { id:"iman-tv", titulo:"Iman TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.relentlessinnovations.net:1936/imantv/imantv/playlist.m3u8" },
  { id:"kayhan-tv", titulo:"Kayhan TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://playout395.livestreamingcdn.com/live/Stream1/playlist.m3u8" },
  { id:"rta", titulo:"RTA", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://rtatv.akamaized.net/Content/HLS/Live/channel(RTA1)/index.m3u8" },
  { id:"rta-education", titulo:"RTA Education", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://rtatv.akamaized.net/Content/HLS/Live/channel(RTA4)/index.m3u8" },
  { id:"rta-sport", titulo:"RTA Sport", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://rtatv.akamaized.net/Content/HLS/Live/channel(RTA3)/index.m3u8" },
  { id:"shams-tv", titulo:"Shams TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://fflive-darya-educationtv.b-cdn.net/master.m3u8" },
  { id:"shamshad-tv", titulo:"Shamshad TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://5a1178b42cc03.streamlock.net/shamshadtelevision/shamshadtelevision/playlist.m3u8" },
  { id:"sharq-radio-tv", titulo:"Sharq Radio TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://59nyqa5elwap-hls-live.5centscdn.com/Sharq/eec89088ee408b80387155272b113256.sdp/playlist.m3u8" },
  { id:"tamadon-tv", titulo:"Tamadon TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://hls.tamadon.live/hls/stream.m3u8" },
  { id:"albkanale-music", titulo:"AlbKanale Music TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://albportal.net/albkanalemusic.m3u8" },
  { id:"cna-al", titulo:"CNA Albania", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live1.mediadesk.al/cnatvlive.m3u8" },
  { id:"report-tv", titulo:"Report TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://deb10stream.duckdns.org/hls/stream.m3u8" },
  { id:"rtsh1", titulo:"RTSH 1", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://178.33.11.6:8696/live/rtsh1ott/playlist.m3u8" },
  { id:"rtsh2", titulo:"RTSH 2", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://178.33.11.6:8696/live/rtsh2/playlist.m3u8" },
  { id:"rtsh24", titulo:"RTSH 24", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://178.33.11.6:8696/live/rtsh24/playlist.m3u8" },
  { id:"rtsh-shqip", titulo:"RTSH Shqip", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://178.33.11.6:8696/live/rtshshqip/playlist.m3u8" },
  { id:"rtsh-sport", titulo:"RTSH Sport", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"http://178.33.11.6:8696/live/rtshsport/playlist.m3u8" },
  { id:"syri-tv", titulo:"Syri TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://stream.syritv.al/live/syritv/playlist.m3u8" },
  { id:"vizion-plus", titulo:"Vizion Plus", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://tringliveviz.akamaized.net/delta/105/out/u/qwaszxerdfcvrtryuy.m3u8" },
  { id:"zjarr-tv", titulo:"Zjarr TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://zjarr.future.al/hls/playlist.m3u8" },
  { id:"abya-yala-tv", titulo:"Abya Yala TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://seo.tv.bo/tv/LIpSEO-TV-8.m3u8" },
  { id:"atb-la-paz", titulo:"ATB La Paz", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://stream.atb.com.bo/live/daniel/index.m3u8" },
  { id:"bolivia-tv72", titulo:"Bolivia TV 7.2", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://video1.getstreamhosting.com:1936/8224/8224/playlist.m3u8" },
  { id:"bolivision", titulo:"Bolivisión", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://alba-bo-bolivision-bolivision.stream.mediatiquestream.com/index.m3u8" },
  { id:"ctv-bo", titulo:"CTV Bolivia", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.ctvbolivia.com/hls/ctv.m3u8" },
  { id:"fap-tv", titulo:"FAP TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://nd106.republicaservers.com/hls/c7284/index.m3u8" },
  { id:"ftv-bo", titulo:"FTV Bolivia", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://master.tucableip.com/ftvhd/index.m3u8" },
  { id:"palenque-tv", titulo:"Palenque TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://tv.bitstreaming.net:3234/live/palenquetvlive.m3u8" },
  { id:"pat-la-paz", titulo:"PAT La Paz", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://www.redpat.tv/proxylpz/index.m3u8" },
  { id:"red-cctv", titulo:"Red CCTV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://solo.disfrutaenlared.com:1936/redcctv/redcctv/playlist.m3u8" },
  { id:"red-tv-shop", titulo:"Red TV Shop", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://master.tucableip.com/redtvshop/index.m3u8" },
  { id:"red-uno-sc", titulo:"Red Uno Santa Cruz", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://master.tucableip.com/muxredunosc/index.m3u8" },
  { id:"rtp-bo", titulo:"RTP Bolivia", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://rtp.noxun.net/hls/stream.m3u8" },
  { id:"tdt-multimedia", titulo:"TDT Multimedia", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://video01.kshost.com.br:4443/juan6318/juan6318/playlist.m3u8" },
  { id:"tv-off", titulo:"TV OFF", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://seo.tv.bo/tv/TV-OFF.m3u8" },
  { id:"unifranz", titulo:"Unifranz", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.enhdtv.com:8081/8192/index.m3u8" },
  { id:"univalle-tv", titulo:"Univalle Televisión", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://master.tucableip.com/univalletv/playlist.m3u8" },
  { id:"zoy-tv-turcas", titulo:"Zoy TV Turcas", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://mio.zoymilton.com/ZoyTurcas/index.m3u8" },
  { id:"zoy-tv-plus", titulo:"ZoyTV Plus", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://mio.zoymilton.com/ZoyPlus/index.m3u8" },
  { id:"nhk-sogo", titulo:"NHK総合 (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/fAZ2BEZ.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS291&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"nhk-etele", titulo:"NHK Eテレ (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/WxtftlO.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS292&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"nippon-tv", titulo:"日本テレビ (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/ecbM7QS.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS294&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"tv-asahi", titulo:"テレビ朝日 (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/5XnMfcR.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS295&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"tbs-tv", titulo:"TBSテレビ (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/jIZ9TlO.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS296&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"tv-tokyo", titulo:"テレビ東京 (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/U8jBxEi.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS297&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"fuji-tv", titulo:"フジテレビ (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/epJYc7P.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS298&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"nhk-bs", titulo:"NHK BS (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/t0uZcSR.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=BS101&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"nhk-world", titulo:"NHK World Japan", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/Mhw1Ihk.png", video:"https://master.nhkworld.jp/nhkworld-tv/playlist/live.m3u8" },
  { id:"shop-channel-jp", titulo:"Shop Channel (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/CCMAF7W.png", video:"https://stream3.shopch.jp/HLS/master.m3u8" },
  { id:"kids-station-jp", titulo:"Kids Station (Japão)", tipo:"AoVivo", categoria:"Variedades", poster:"https://www.lyngsat-logo.com/logo/tv/kk/kidsstation.png", video:"https://stream01.willfonk.com/live_playlist.m3u8?cid=CS330&r=FHD&ccode=JP&m=d0:20:20:04:35:cc&t=0d6938cb3dcf4b79848bc1753a59daf1" },
  { id:"kbs1-kr", titulo:"KBS 1TV (Coreia)", tipo:"AoVivo", categoria:"Variedades", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/KBS_1_logo.svg/512px-KBS_1_logo.svg.png", video:"http://mytv.dothome.co.kr/ch/public/1.php" },
  { id:"ebs1-kr", titulo:"EBS 1 (Coreia)", tipo:"AoVivo", categoria:"Variedades", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/EBS_1TV_Logo.svg/512px-EBS_1TV_Logo.svg.png", video:"https://ebsonair.ebs.co.kr/ebs1familypc/familypc1m/playlist.m3u8" },
  { id:"ebs2-kr", titulo:"EBS 2 (Coreia)", tipo:"AoVivo", categoria:"Variedades", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/EBS_2TV_Logo.svg/512px-EBS_2TV_Logo.svg.png", video:"https://ebsonair.ebs.co.kr/ebs2familypc/familypc1m/playlist.m3u8" },
  { id:"arirang-kr", titulo:"Arirang (Coreia)", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/RuHZ6Dx.png", video:"http://amdlive.ctnd.com.edgesuite.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8" },
  { id:"kbs-world", titulo:"KBS World", tipo:"AoVivo", categoria:"Variedades", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/KBS_World_%282009%29.svg/512px-KBS_World_%282009%29.svg.png", video:"http://ye23.vip/z7z8/2021/kbs2020.php?id=3" },
  { id:"ajman-tv", titulo:"Ajman TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://cdn1.logichost.in/ajmantv/live/playlist.m3u8" },
  { id:"al-arabiya", titulo:"Al Arabiya", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8" },
  { id:"al-arabiya-business", titulo:"Al Arabiya Business", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.alarabiya.net/alarabiapublish/aswaaq.smil/playlist.m3u8" },
  { id:"al-qamar-tv", titulo:"Al Qamar TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://streamer3.premio.link/alqamar/playlist.m3u8" },
  { id:"al-shallal-tv", titulo:"Al Shallal TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://amg01480-alshallalfze-alshallal-ono-q0hfg.amagi.tv/playlist.m3u8" },
  { id:"al-sharqiya-min-kabla", titulo:"Al Sharqiya Min Kabla", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://svs.itworkscdn.net/kablatvlive/kabtv1.smil/playlist.m3u8" },
  { id:"al-wousta-tv", titulo:"Al Wousta TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://svs.itworkscdn.net/alwoustalive/alwoustatv.smil/playlist.m3u8" },
  { id:"al-yaum-tv", titulo:"Al Yaum TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://hlspackager.akamaized.net/live/DB/ALYAUM_TV/HLS/ALYAUM_TV.m3u8" },
  { id:"cnbc-arabiya", titulo:"CNBC Arabiya", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://cnbc-live.akamaized.net/cnbc/master.m3u8" },
  { id:"fujairah-tv", titulo:"Fujairah TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.kwikmotion.com/fujairahlive/fujairah.smil/playlist.m3u8" },
  { id:"mbc1", titulo:"MBC 1", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-1/15cf99af5de54063fdabfefe66adc075/index.m3u8" },
  { id:"mbc4", titulo:"MBC 4", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-4/24f134f1cd63db9346439e96b86ca6ed/index.m3u8" },
  { id:"mbc5", titulo:"MBC 5", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-5/ee6b000cee0629411b666ab26cb13e9b/index.m3u8" },
  { id:"mbc-drama", titulo:"MBC Drama", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-drama/2c28a458e2f3253e678b07ac7d13fe71/index.m3u8" },
  { id:"mbc-persia", titulo:"MBC Persia", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://hls.mbcpersia.live/hls/stream.m3u8" },
  { id:"nour-tv", titulo:"Nour TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://cdn.bestream.io:19360/elfaro4/elfaro4.m3u8" },
  { id:"peace-tv-english", titulo:"Peace TV English", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://dzkyvlfyge.erbvr.com/PeaceTvEnglish/index.m3u8" },
  { id:"sharjah-tv", titulo:"Sharjah TV", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://live.kwikmotion.com/smc1live/smc1tv.smil/playlist.m3u8" },
  { id:"sharjah2", titulo:"Sharjah 2", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://svs.itworkscdn.net/smc2live/smc2tv.smil/playlist.m3u8" },
  { id:"wanasah", titulo:"Wanasah", tipo:"AoVivo", categoria:"Variedades", poster:"https://i.imgur.com/placeholder.png", video:"https://shd-gcp-live.edgenextcdn.net/live/bitmovin-wanasah/13e82ea6232fa647c43b26e8a41f173d/index.m3u8" },
  { id:"a-e-fhd", titulo:"A&E FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/1CP", video:"http://psrv.io:80/9089247/coreurl.me/18858" },
  { id:"a-e-fhd-h265", titulo:"A&E FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/uuz", video:"http://psrv.io:80/9089247/coreurl.me/22213" },
  { id:"a-e-hd", titulo:"A&E HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/SDH", video:"http://psrv.io:80/9089247/coreurl.me/18738" },
  { id:"bis-fhd", titulo:"Bis FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/UIf", video:"http://psrv.io:80/9089247/coreurl.me/18785" },
  { id:"bis-fhd-h265", titulo:"Bis FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/XaE", video:"http://psrv.io:80/9089247/coreurl.me/22150" },
  { id:"bis-hd", titulo:"Bis HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/PAl", video:"http://psrv.io:80/9089247/coreurl.me/18721" },
  { id:"bis-sd", titulo:"Bis SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/ybv", video:"http://psrv.io:80/9089247/coreurl.me/18722" },
  { id:"comedy-central-fhd", titulo:"Comedy Central FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/NWe", video:"http://psrv.io:80/9089247/coreurl.me/18847" },
  { id:"comedy-central-fhd-h265", titulo:"Comedy Central FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/0Ww", video:"http://psrv.io:80/9089247/coreurl.me/25311" },
  { id:"comedy-central-hd", titulo:"Comedy Central HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/qUw", video:"http://psrv.io:80/9089247/coreurl.me/18705" },
  { id:"comedy-central-sd", titulo:"Comedy Central SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/RrZ", video:"http://psrv.io:80/9089247/coreurl.me/18706" },
  { id:"curta-fhd", titulo:"Curta! FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/PYh", video:"http://psrv.io:80/9089247/coreurl.me/18846" },
  { id:"curta-fhd-h265", titulo:"Curta! FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/r7r", video:"http://psrv.io:80/9089247/coreurl.me/25310" },
  { id:"curta-hd", titulo:"Curta! HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/GnA", video:"http://psrv.io:80/9089247/coreurl.me/18703" },
  { id:"curta-sd", titulo:"Curta! SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/fVn", video:"http://psrv.io:80/9089247/coreurl.me/18704" },
  { id:"discovery-h-h-fhd", titulo:"Discovery H&H FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/cEF", video:"http://psrv.io:80/9089247/coreurl.me/18844" },
  { id:"discovery-h-h-sd", titulo:"Discovery H&H SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/91r", video:"http://psrv.io:80/9089247/coreurl.me/18698" },
  { id:"discovery-turbo-hd", titulo:"Discovery Turbo HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/AsO", video:"http://psrv.io:80/9089247/coreurl.me/18689" },
  { id:"discovery-turbo-sd", titulo:"Discovery Turbo SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Vy0", video:"http://psrv.io:80/9089247/coreurl.me/18690" },
  { id:"dog-tv-fhd", titulo:"Dog TV FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/L5h", video:"http://psrv.io:80/9089247/coreurl.me/28001" },
  { id:"dog-tv-hd", titulo:"Dog TV HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/6nk", video:"http://psrv.io:80/9089247/coreurl.me/28000" },
  { id:"e-fhd-h265", titulo:"E! FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/HbJ", video:"http://psrv.io:80/9089247/coreurl.me/22145" },
  { id:"e-hd", titulo:"E! HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/PCy", video:"http://psrv.io:80/9089247/coreurl.me/18681" },
  { id:"e-sd", titulo:"E! SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Z05", video:"http://psrv.io:80/9089247/coreurl.me/18682" },
  { id:"fashion-tv-h265", titulo:"FASHION TV [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/25236" },
  { id:"film-arts-sd", titulo:"Film & Arts SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/T5S", video:"http://psrv.io:80/9089247/coreurl.me/18497" },
  { id:"peixe-tv-fhd", titulo:"Peixe TV FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/7MZ", video:"http://psrv.io:80/9089247/coreurl.me/18835" },
  { id:"fish-tv-fhd-h265", titulo:"Fish TV FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/ILy", video:"http://psrv.io:80/9089247/coreurl.me/22199" },
  { id:"peixe-tv-hd", titulo:"Peixe TV HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/VxE", video:"http://psrv.io:80/9089247/coreurl.me/18671" },
  { id:"fish-tv-sd", titulo:"Fish TV SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Rxi", video:"http://psrv.io:80/9089247/coreurl.me/18672" },
  { id:"food-network-fhd", titulo:"Food Network FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Iv6", video:"http://psrv.io:80/9089247/coreurl.me/18834" },
  { id:"food-network-fhd-h265", titulo:"Food Network FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/rgy", video:"http://psrv.io:80/9089247/coreurl.me/22198" },
  { id:"food-network-hd", titulo:"Food Network HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/fYt", video:"http://psrv.io:80/9089247/coreurl.me/18669" },
  { id:"rede-alimentar-sd", titulo:"Rede Alimentar SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/2cT", video:"http://psrv.io:80/9089247/coreurl.me/18670" },
  { id:"fox-life-fhd", titulo:"Fox Life FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/EsS", video:"http://psrv.io:80/9089247/coreurl.me/18833" },
  { id:"fox-life-fhd-h265", titulo:"Fox Life FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/3nL", video:"http://psrv.io:80/9089247/coreurl.me/25305" },
  { id:"fox-life-hd", titulo:"Fox Life HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/9pz", video:"http://psrv.io:80/9089247/coreurl.me/18665" },
  { id:"fox-life-sd", titulo:"Fox Life SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/E0q", video:"http://psrv.io:80/9089247/coreurl.me/18666" },
  { id:"globosat-fhd-h265", titulo:"GloboSat FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/e4t", video:"http://psrv.io:80/9089247/coreurl.me/22129" },
  { id:"globosat-sd", titulo:"GloboSat SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/KG5", video:"http://psrv.io:80/9089247/coreurl.me/22311" },
  { id:"gnt-fhd", titulo:"GNT FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/ibf", video:"http://psrv.io:80/9089247/coreurl.me/18827" },
  { id:"gnt-fhd-h265", titulo:"GNT FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Z8a", video:"http://psrv.io:80/9089247/coreurl.me/22141" },
  { id:"gnt-hd", titulo:"GNT HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/6ya", video:"http://psrv.io:80/9089247/coreurl.me/18645" },
  { id:"gnt-sd", titulo:"GNT SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Dat", video:"http://psrv.io:80/9089247/coreurl.me/18646" },
  { id:"id-investigacao-discovery-fhd", titulo:"ID: Investigacao Discovery FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/13M", video:"http://psrv.io:80/9089247/coreurl.me/18821" },
  { id:"id-investigacao-discovery-fhd-h265", titulo:"ID: Investigacao Discovery FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/vS4", video:"http://psrv.io:80/9089247/coreurl.me/22187" },
  { id:"id-investigacao-discovery-hd", titulo:"ID: Investigacao Discovery HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/q6F", video:"http://psrv.io:80/9089247/coreurl.me/18629" },
  { id:"lifetime-fhd", titulo:"Lifetime FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/jgf", video:"http://psrv.io:80/9089247/coreurl.me/18820" },
  { id:"lifetime-fhd-h265", titulo:"Lifetime FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/ELX", video:"http://psrv.io:80/9089247/coreurl.me/22186" },
  { id:"lifetime-hd", titulo:"Lifetime HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/a4s", video:"http://psrv.io:80/9089247/coreurl.me/18627" },
  { id:"sd-vital-cio", titulo:"SD vitalício", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Eyw", video:"http://psrv.io:80/9089247/coreurl.me/18628" },
  { id:"mais-globosat-fhd", titulo:"Mais GloboSat FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/DiW", video:"http://psrv.io:80/9089247/coreurl.me/18754" },
  { id:"mais-globosat-fhd-h265", titulo:"Mais GloboSat FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/9d1", video:"http://psrv.io:80/9089247/coreurl.me/25291" },
  { id:"mais-globosat-hd", titulo:"Mais GloboSat HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/0yY", video:"http://psrv.io:80/9089247/coreurl.me/18625" },
  { id:"mais-globosat-sd", titulo:"Mais GloboSat SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/QSP", video:"http://psrv.io:80/9089247/coreurl.me/18626" },
  { id:"mtv-fhd", titulo:"MTV FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/1kJ", video:"http://psrv.io:80/9089247/coreurl.me/18815" },
  { id:"mtv-fhd-h265", titulo:"MTV FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/zg9", video:"http://psrv.io:80/9089247/coreurl.me/22183" },
  { id:"mtv-hd", titulo:"MTV HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/sTl", video:"http://psrv.io:80/9089247/coreurl.me/18615" },
  { id:"mtv-live-fhd", titulo:"MTV Live FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/PWM", video:"http://psrv.io:80/9089247/coreurl.me/18814" },
  { id:"mtv-live-fhd-h265", titulo:"MTV Live FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/1ND", video:"http://psrv.io:80/9089247/coreurl.me/25227" },
  { id:"mtv-live-hd", titulo:"MTV Live HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/u8U", video:"http://psrv.io:80/9089247/coreurl.me/18507" },
  { id:"mtv-live-sd", titulo:"MTV Live SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/JCl", video:"http://psrv.io:80/9089247/coreurl.me/18508" },
  { id:"mtv-sd", titulo:"MTV SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/MWq", video:"http://psrv.io:80/9089247/coreurl.me/18616" },
  { id:"multishow-fhd", titulo:"Multishow FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/7vt", video:"http://psrv.io:80/9089247/coreurl.me/18813" },
  { id:"multishow-fhd-h265", titulo:"Multishow FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/6Yx", video:"http://psrv.io:80/9089247/coreurl.me/22182" },
  { id:"multishow-hd", titulo:"Multishow HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Oev", video:"http://psrv.io:80/9089247/coreurl.me/18613" },
  { id:"multishow-sd", titulo:"Multishow SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/0j3", video:"http://psrv.io:80/9089247/coreurl.me/18614" },
  { id:"music-box-brasil-fhd", titulo:"Music Box Brasil FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/FRj", video:"http://psrv.io:80/9089247/coreurl.me/18812" },
  { id:"music-box-brasil-fhd-h265", titulo:"Music Box Brasil FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/TJW", video:"http://psrv.io:80/9089247/coreurl.me/25285" },
  { id:"music-box-brasil-hd", titulo:"Music Box Brasil HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/odD", video:"http://psrv.io:80/9089247/coreurl.me/18611" },
  { id:"music-box-brasil-sd", titulo:"Music Box Brasil SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/SEn", video:"http://psrv.io:80/9089247/coreurl.me/18612" },
  { id:"off-fhd", titulo:"OFF FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/DH2", video:"http://psrv.io:80/9089247/coreurl.me/18806" },
  { id:"off-fhd-h265", titulo:"OFF FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/F6G", video:"http://psrv.io:80/9089247/coreurl.me/22135" },
  { id:"off-hd", titulo:"OFF HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/L2Z", video:"http://psrv.io:80/9089247/coreurl.me/18598" },
  { id:"off-sd", titulo:"OFF SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/dGv", video:"http://psrv.io:80/9089247/coreurl.me/18599" },
  { id:"play-tv-sd", titulo:"Play TV SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/jN0", video:"http://psrv.io:80/9089247/coreurl.me/22288" },
  { id:"polishoptv-sd", titulo:"PolishopTV SD", tipo:"AoVivo", categoria:"Variedades", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28066" },
  { id:"prime-box-brasil-fhd", titulo:"Prime Box Brasil FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/XRY", video:"http://psrv.io:80/9089247/coreurl.me/18804" },
  { id:"prime-box-brasil-fhd-h265", titulo:"Prime Box Brasil FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/tEj", video:"http://psrv.io:80/9089247/coreurl.me/25273" },
  { id:"prime-box-brasil-hd", titulo:"Prime Box Brasil HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/JY2", video:"http://psrv.io:80/9089247/coreurl.me/18580" },
  { id:"prime-box-brasil-sd", titulo:"Prime Box Brasil SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/3WB", video:"http://psrv.io:80/9089247/coreurl.me/18581" },
  { id:"shop-time-hd", titulo:"Shop Time HD", tipo:"AoVivo", categoria:"Variedades", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28404" },
  { id:"tlc-fhd", titulo:"TLC FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/a9V", video:"http://psrv.io:80/9089247/coreurl.me/18797" },
  { id:"tlc-fhd-h265", titulo:"TLC FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/WoP", video:"http://psrv.io:80/9089247/coreurl.me/22128" },
  { id:"tlc-hd", titulo:"TLC HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/fUs", video:"http://psrv.io:80/9089247/coreurl.me/18538" },
  { id:"tlc-sd", titulo:"TLC SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/r69", video:"http://psrv.io:80/9089247/coreurl.me/18539" },
  { id:"travel-box-brasil-fhd-h265", titulo:"Travel Box Brasil FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/25217" },
  { id:"vh1-fhd", titulo:"VH1 FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/xf5", video:"http://psrv.io:80/9089247/coreurl.me/18791" },
  { id:"vh1-fhd-h265", titulo:"VH1 FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/InM", video:"http://psrv.io:80/9089247/coreurl.me/22154" },
  { id:"vh1-hd", titulo:"VH1 HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/6fr", video:"http://psrv.io:80/9089247/coreurl.me/18518" },
  { id:"vh1-megahits-sd", titulo:"VH1 MegaHits SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Xhe", video:"http://psrv.io:80/9089247/coreurl.me/18517" },
  { id:"vh1-sd", titulo:"VH1 SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/KZh", video:"http://psrv.io:80/9089247/coreurl.me/22252" },
  { id:"viva-fhd", titulo:"Viva FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/VCv", video:"http://psrv.io:80/9089247/coreurl.me/18755" },
  { id:"viva-fhd-h265", titulo:"Viva FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/6NU", video:"http://psrv.io:80/9089247/coreurl.me/25253" },
  { id:"viva-hd", titulo:"Viva HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/LVI", video:"http://psrv.io:80/9089247/coreurl.me/18515" },
  { id:"viva-sd", titulo:"Viva SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/Pte", video:"http://psrv.io:80/9089247/coreurl.me/18516" },
  { id:"uau-fhd", titulo:"Uau FHD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/KZj", video:"http://psrv.io:80/9089247/coreurl.me/18789" },
  { id:"woohoo-fhd-h265", titulo:"Woohoo FHD [H265]", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/HQF", video:"http://psrv.io:80/9089247/coreurl.me/22127" },
  { id:"woohoo-hd", titulo:"Woohoo HD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/6Z3", video:"http://psrv.io:80/9089247/coreurl.me/18511" },
  { id:"woohoo-sd", titulo:"Woohoo SD", tipo:"AoVivo", categoria:"Variedades", poster:"http://z4.vc/fUJ", video:"http://psrv.io:80/9089247/coreurl.me/18512" },

  // ── INFANTIS (102) ──────────────────────
  { id:"cartoon-network", titulo:"Cartoon Network", tipo:"AoVivo", categoria:"Infantis", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18849" },
  { id:"disney", titulo:"Disney Channel", tipo:"AoVivo", categoria:"Infantis", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18782" },
  { id:"boomerang", titulo:"Boomerang", tipo:"AoVivo", categoria:"Infantis", poster:"https://i.imgur.com/placeholder.png", video:"http://psrv.io:80/9089247/coreurl.me/18851" },
  { id:"babytv-sd", titulo:"BabyTV SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/k3q", video:"http://psrv.io:80/9089247/coreurl.me/18729" },
  { id:"boomerang-fhd", titulo:"Boomerang FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/6f2", video:"http://psrv.io:80/9089247/coreurl.me/18851" },
  { id:"boomerang-fhd-h265", titulo:"Boomerang FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/DAg", video:"http://psrv.io:80/9089247/coreurl.me/25317" },
  { id:"cartoon-network-fhd", titulo:"Cartoon Network FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/gGw", video:"http://psrv.io:80/9089247/coreurl.me/18849" },
  { id:"cartoon-network-fhd-h265", titulo:"Cartoon Network FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/6WN", video:"http://psrv.io:80/9089247/coreurl.me/25314" },
  { id:"cartoon-network-hd", titulo:"Cartoon Network HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Brc", video:"http://psrv.io:80/9089247/coreurl.me/18711" },
  { id:"cartoon-network-sd", titulo:"Cartoon Network SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/BjV", video:"http://psrv.io:80/9089247/coreurl.me/18712" },
  { id:"discovery-kids-fhd", titulo:"Discovery Kids FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/oNt", video:"http://psrv.io:80/9089247/coreurl.me/18843" },
  { id:"discovery-kids-fhd-h265", titulo:"Discovery Kids FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Eoe", video:"http://psrv.io:80/9089247/coreurl.me/22202" },
  { id:"discovery-kids-hd", titulo:"Discovery Kids HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/p3E", video:"http://psrv.io:80/9089247/coreurl.me/18695" },
  { id:"discovery-kids-sd", titulo:"Discovery Kids SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/s9P", video:"http://psrv.io:80/9089247/coreurl.me/18696" },
  { id:"disney-fhd", titulo:"Disney FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/eri", video:"http://psrv.io:80/9089247/coreurl.me/18782" },
  { id:"disney-fhd-h265", titulo:"Disney FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/k3R", video:"http://psrv.io:80/9089247/coreurl.me/22147" },
  { id:"disney-hd", titulo:"Disney HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/COA", video:"http://psrv.io:80/9089247/coreurl.me/18685" },
  { id:"disney-junior-fhd", titulo:"Disney Junior FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Cgg", video:"http://psrv.io:80/9089247/coreurl.me/18788" },
  { id:"disney-junior-fhd-h265", titulo:"Disney Junior FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/pw6", video:"http://psrv.io:80/9089247/coreurl.me/22146" },
  { id:"disney-junior-hd", titulo:"Disney Junior HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/67y", video:"http://psrv.io:80/9089247/coreurl.me/18509" },
  { id:"disney-junior-sd", titulo:"Disney Junior SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/3Vd", video:"http://psrv.io:80/9089247/coreurl.me/18684" },
  { id:"disney-sd", titulo:"Disney SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Vjj", video:"http://psrv.io:80/9089247/coreurl.me/18686" },
  { id:"disney-xd-sd", titulo:"Disney XD SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/n2T", video:"http://psrv.io:80/9089247/coreurl.me/22321" },
  { id:"gloob-fhd", titulo:"Gloob FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/dOF", video:"http://psrv.io:80/9089247/coreurl.me/18775" },
  { id:"gloob-fhd-h265", titulo:"Gloob FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/EuT", video:"http://psrv.io:80/9089247/coreurl.me/22142" },
  { id:"gloob-hd", titulo:"Gloob HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/uDI", video:"http://psrv.io:80/9089247/coreurl.me/18649" },
  { id:"gloob-sd", titulo:"Gloob SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/K5g", video:"http://psrv.io:80/9089247/coreurl.me/18650" },
  { id:"gloobinho-fhd", titulo:"Gloobinho FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/IBp", video:"http://psrv.io:80/9089247/coreurl.me/18828" },
  { id:"gloobinho-fhd-h265", titulo:"Gloobinho FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/i0a", video:"http://psrv.io:80/9089247/coreurl.me/25205" },
  { id:"gloobinho-hd", titulo:"Gloobinho HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/sf3", video:"http://psrv.io:80/9089247/coreurl.me/18648" },
  { id:"gloobinho-sd", titulo:"Gloobinho SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/QOP", video:"http://psrv.io:80/9089247/coreurl.me/18647" },
  { id:"natgeo-kids-fhd", titulo:"NatGeo Kids FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/j0A", video:"http://psrv.io:80/9089247/coreurl.me/18810" },
  { id:"natgeo-kids-fhd-h265", titulo:"NatGeo Kids FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/yTi", video:"http://psrv.io:80/9089247/coreurl.me/22180" },
  { id:"natgeo-kids-hd", titulo:"NatGeo Kids HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/4kC", video:"http://psrv.io:80/9089247/coreurl.me/18607" },
  { id:"nick-jr-fhd", titulo:"Nick Jr FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/pI8", video:"http://psrv.io:80/9089247/coreurl.me/18808" },
  { id:"nick-jr-fhd-h265", titulo:"Nick Jr FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/HZk", video:"http://psrv.io:80/9089247/coreurl.me/22178" },
  { id:"nick-jr-hd", titulo:"Nick Jr HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Xp5", video:"http://psrv.io:80/9089247/coreurl.me/18602" },
  { id:"nick-jr-sd", titulo:"Nick Jr SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/kuz", video:"http://psrv.io:80/9089247/coreurl.me/18603" },
  { id:"nickelodeon-fhd", titulo:"Nickelodeon FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/9Ti", video:"http://psrv.io:80/9089247/coreurl.me/18807" },
  { id:"nickelodeon-fhd-h265", titulo:"Nickelodeon FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/NFO", video:"http://psrv.io:80/9089247/coreurl.me/22136" },
  { id:"nickelodeon-hd", titulo:"Nickelodeon HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/6RD", video:"http://psrv.io:80/9089247/coreurl.me/18600" },
  { id:"nickelodeon-sd", titulo:"Nickelodeon SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Ad6", video:"http://psrv.io:80/9089247/coreurl.me/18601" },
  { id:"playkids-fhd", titulo:"PlayKids FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/XYx", video:"http://psrv.io:80/9089247/coreurl.me/18747" },
  { id:"playkids-hd", titulo:"PlayKids HD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/zrG", video:"http://psrv.io:80/9089247/coreurl.me/18499" },
  { id:"playkids-sd", titulo:"PlayKids SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/z3I", video:"http://psrv.io:80/9089247/coreurl.me/18498" },
  { id:"tooncast-sd", titulo:"Tooncast SD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/7YA", video:"http://psrv.io:80/9089247/coreurl.me/18533" },
  { id:"tv-ra-tim-bum-fhd", titulo:"TV Ra-Tim-Bum FHD", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/S4M", video:"http://psrv.io:80/9089247/coreurl.me/18793" },
  { id:"tv-ra-tim-bum-fhd-h265", titulo:"TV Ra-Tim-Bum FHD [H265]", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/I7O", video:"http://psrv.io:80/9089247/coreurl.me/25256" },
  { id:"zoomoo-sd", titulo:"ZooMoo SD", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28199" },
  { id:"24h-3-palavrinhas", titulo:"[24H] 3 Palavrinhas", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19181" },
  { id:"24h-aladdin", titulo:"[24H] Aladdin", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28069" },
  { id:"24h-apenas-um-show", titulo:"[24H] Apenas Um Show", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Alu", video:"http://psrv.io:80/9089247/coreurl.me/27132" },
  { id:"24h-as-aventuras-de-jackie-chan", titulo:"[24H] As aventuras de Jackie Chan", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24980" },
  { id:"24h-as-meninas-superpoderosas", titulo:"[24H] As Meninas Superpoderosas", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/yMm", video:"http://psrv.io:80/9089247/coreurl.me/19222" },
  { id:"24h-as-tartarugas-ninjas", titulo:"[24H] As Tartarugas Ninjas", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/uKe", video:"http://psrv.io:80/9089247/coreurl.me/19221" },
  { id:"24h-ben-10", titulo:"[24H] Ben 10", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/7CL", video:"http://psrv.io:80/9089247/coreurl.me/19219" },
  { id:"24h-bob-esponja", titulo:"[24H] Bob Esponja", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/3VU", video:"http://psrv.io:80/9089247/coreurl.me/19220" },
  { id:"24h-bob-zoom", titulo:"[24H] Bob Zoom", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/Cf6", video:"http://psrv.io:80/9089247/coreurl.me/19223" },
  { id:"24h-quebrando-saco", titulo:"[24H] Quebrando Saco", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28070" },
  { id:"24h-caverna-do-drag-o", titulo:"[24H] Caverna do Dragão", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/wdu", video:"http://psrv.io:80/9089247/coreurl.me/19216" },
  { id:"24h-chapolin-colorado", titulo:"[24H] Chapolin Colorado", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28071" },
  { id:"24h-chaves", titulo:"[24H] Chaves", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/lLk", video:"http://psrv.io:80/9089247/coreurl.me/19218" },
  { id:"24h-cl-ssicos-disney", titulo:"[24H] Clássicos Disney", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24972" },
  { id:"24h-coragem-o-cao-covarde", titulo:"[24H] Coragem - O Cao Covarde", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/OIo", video:"http://psrv.io:80/9089247/coreurl.me/19215" },
  { id:"24h-corrida-maluca", titulo:"[24H] Corrida Maluca", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24981" },
  { id:"24h-dennis-o-pimentinha", titulo:"[24H] Dennis - O Pimentinha", tipo:"AoVivo", categoria:"Infantis", poster:"http://z4.vc/iKx", video:"http://psrv.io:80/9089247/coreurl.me/19214" },
  { id:"24h-desenhos-b-blicos", titulo:"[24H] Desenhos Bíblicos", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28073" },
  { id:"24h-doug", titulo:"[24H] Doug", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28201" },
  { id:"24h-dragon-ball", titulo:"[24H] DRAGON BALL", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28202" },
  { id:"24h-dragon-ball-super", titulo:"[24H] DRAGON BALL SUPER", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28203" },
  { id:"24h-dragon-ball-z", titulo:"[24H] Dragon Ball Z |", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19211" },
  { id:"24h-eu-a-patroa-e-as-crian-as", titulo:"[24H] Eu - A Patroa e as Crianças", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19177" },
  { id:"24h-fam-lia-da-pesada", titulo:"[24H] Família da Pesada", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24973" },
  { id:"24h-formiga-at-mica", titulo:"[24H] Formiga Atômica", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24974" },
  { id:"24h-futurama", titulo:"[24H] Futurama", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24975" },
  { id:"24h-galinha-pintadinha", titulo:"[24H] Galinha Pintadinha", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19210" },
  { id:"24h-he-man", titulo:"[24H] He-Man", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28204" },
  { id:"24h-homem-aranha", titulo:"[24H] HOMEM ARANHA", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28206" },
  { id:"24h-homem-de-ferro", titulo:"[24H] Homem de Ferro", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28207" },
  { id:"24h-homems-de-preto", titulo:"[24H] HOMEMS DE PRETO", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28208" },
  { id:"24h-h-rcules", titulo:"[24H] Hércules", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28205" },
  { id:"24h-incr-vel-hulk", titulo:"[24H] Incrível Hulk", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28209" },
  { id:"24h-jaspion", titulo:"[24H] Jaspion", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19205" },
  { id:"24h-kenan-e-kel", titulo:"[24H] Kenan e Kel", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24982" },
  { id:"24h-luluzinha", titulo:"[24H] Luluzinha", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24976" },
  { id:"24h-naruto", titulo:"[24H] Naruto", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19202" },
  { id:"24h-naruto-shippuden", titulo:"[24H] Naruto Shippuden", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28211" },
  { id:"24h-o-maskara", titulo:"[24H] O Maskara", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24983" },
  { id:"24h-os-cavaleiros-do-zod-aco", titulo:"[24H] Os Cavaleiros do Zodíaco", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19197" },
  { id:"24h-os-flintstones", titulo:"[24H] Os Flintstones", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19196" },
  { id:"24h-os-simpsons", titulo:"[24H] Os Simpsons", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/27897" },
  { id:"24h-os-trapalh-es", titulo:"[24H] Os Trapalhões", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24978" },
  { id:"24h-papa-l-guas", titulo:"[24H] Papa-Léguas", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28212" },
  { id:"24h-peppa-pig", titulo:"[24H] Peppa Pig", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24979" },
  { id:"24h-pernalonga", titulo:"[24H] Pernalonga", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19194" },
  { id:"24h-pica-pau", titulo:"[24H] Pica-Pau", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19192" },
  { id:"24h-pink-e-cerebro", titulo:"[24H] Pink-e-Cerebro", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28213" },
  { id:"24h-scooby-doo", titulo:"[24H] Scooby Doo", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19190" },
  { id:"24h-sobrenatural", titulo:"[24H] Sobrenatural", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28214" },
  { id:"24h-south-park", titulo:"[24H] South Park", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19189" },
  { id:"24h-a-teoria-do-big-bang", titulo:"[24H] A Teoria do Big Bang", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/24984" },
  { id:"24h-thundercats", titulo:"[24H] Thundercats", tipo:"AoVivo", categoria:"Infantis", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/19178" },

  // ── INTERNACIONAIS (34) ──────────────────────
  { id:"al-jazeera", titulo:"Al Jazeera", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28158" },
  { id:"bloomberg-television", titulo:"Bloomberg Television", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28159" },
  { id:"boing-kids-esp", titulo:"Boing Kids [ESP]", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28166" },
  { id:"canal-26-argentina-hd", titulo:"CANAL 26 ARGENTINA HD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26427" },
  { id:"canal-33", titulo:"CANAL 33", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28050" },
  { id:"cnn-internacional-hd", titulo:"CNN INTERNACIONAL HD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28054" },
  { id:"cnn-internacional-sd", titulo:"CNN INTERNACIONAL SD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26438" },
  { id:"digi-24-hd", titulo:"DIGI 24 HD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28042" },
  { id:"dw-alemanha-hd", titulo:"DW ALEMANHA HD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26429" },
  { id:"e-fhd", titulo:"E FHD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28399" },
  { id:"amor-natural-fhd", titulo:"AMOR NATURAL FHD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26697" },
  { id:"miami-tv-hd", titulo:"MIAMI TV HD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26430" },
  { id:"nfl-network-hd-temp", titulo:"NFL Network HD [TEMP]", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28392" },
  { id:"nhk-japao-sd", titulo:"NHK JAPAO SD", tipo:"AoVivo", categoria:"Internacionais", poster:"http://z4.vc/8Qu", video:"http://psrv.io:80/9089247/coreurl.me/26436" },
  { id:"nhk-sd", titulo:"NHK SD", tipo:"AoVivo", categoria:"Internacionais", poster:"http://z4.vc/UKk", video:"http://psrv.io:80/9089247/coreurl.me/22219" },
  { id:"nhk-world-hd", titulo:"NHK WORLD HD", tipo:"AoVivo", categoria:"Internacionais", poster:"http://z4.vc/kon", video:"http://psrv.io:80/9089247/coreurl.me/26435" },
  { id:"canal-ol-mpico-1", titulo:"Canal Olímpico 1", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28160" },
  { id:"canal-ol-mpico-2", titulo:"Canal Olímpico 2", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28161" },
  { id:"canal-ol-mpico-3", titulo:"Canal Olímpico 3", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28162" },
  { id:"canal-ol-mpico-4", titulo:"Canal Olímpico 4", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28163" },
  { id:"canal-ol-mpico-5", titulo:"Canal Olímpico 5", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28164" },
  { id:"profit-ro-hd", titulo:"PROFIT RO HD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28040" },
  { id:"realitatea-tv", titulo:"Realitatea TV", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28043" },
  { id:"red-bull-tv", titulo:"RED BULL TV", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26426" },
  { id:"rpc-py-hd", titulo:"RPC PY HD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26433" },
  { id:"sic-portugal-sd", titulo:"SIC PORTUGAL SD", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26437" },
  { id:"sky-news-uk", titulo:"Sky News UK", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28157" },
  { id:"tvr-1-teste", titulo:"TVR 1 [TESTE]", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/27893" },
  { id:"tvr-2-teste", titulo:"TVR 2 [TESTE]", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/27894" },
  { id:"tvr-3-teste", titulo:"TVR 3 [TESTE]", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/27895" },
  { id:"tvr-cluj", titulo:"TVR CLUJ", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28047" },
  { id:"tvr-direto-teste", titulo:"TVR Direto[TESTE]", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/27892" },
  { id:"tvr-moldova-teste", titulo:"TVR Moldova [TESTE]", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/27896" },
  { id:"tvr-targu-mures", titulo:"TVR Targu Mures", tipo:"AoVivo", categoria:"Internacionais", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28049" },

  // ── RELIGIOSOS (9) ──────────────────────
  { id:"tv-aparecida", titulo:"TV Aparecida", tipo:"AoVivo", categoria:"Religiosos", poster:"https://i.imgur.com/kxrja0X.png", video:"https://cdn.jmvstream.com/w/LVW-9716/LVW9716_HbtQtezcaw/playlist.m3u8" },
  { id:"rede-gospel-fhd", titulo:"Rede Gospel FHD", tipo:"AoVivo", categoria:"Religiosos", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28398" },
  { id:"rede-vida-fhd", titulo:"Rede Vida FHD", tipo:"AoVivo", categoria:"Religiosos", poster:"http://z4.vc/frB", video:"http://psrv.io:80/9089247/coreurl.me/18750" },
  { id:"rede-vida-fhd-h265", titulo:"Rede Vida FHD [H265]", tipo:"AoVivo", categoria:"Religiosos", poster:"http://z4.vc/ytn", video:"http://psrv.io:80/9089247/coreurl.me/25272" },
  { id:"rede-vida-hd", titulo:"Rede Vida HD", tipo:"AoVivo", categoria:"Religiosos", poster:"http://z4.vc/rJP", video:"http://psrv.io:80/9089247/coreurl.me/18504" },
  { id:"rede-vida-sd", titulo:"Rede Vida SD", tipo:"AoVivo", categoria:"Religiosos", poster:"http://z4.vc/DPy", video:"http://psrv.io:80/9089247/coreurl.me/18571" },
  { id:"rit-sd", titulo:"RIT SD", tipo:"AoVivo", categoria:"Religiosos", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28403" },
  { id:"tv-novo-tempo-fhd", titulo:"TV Novo Tempo FHD", tipo:"AoVivo", categoria:"Religiosos", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28076" },
  { id:"tv-novo-tempo-sd", titulo:"TV Novo Tempo SD", tipo:"AoVivo", categoria:"Religiosos", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/28075" },

  // ── 4K (18) ──────────────────────
  { id:"animal-planet-4k", titulo:"ANIMAL PLANET [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/s04", video:"http://psrv.io:80/9089247/coreurl.me/26189" },
  { id:"band-4k", titulo:"BAND [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/ocG", video:"http://psrv.io:80/9089247/coreurl.me/26179" },
  { id:"cartoon-network-4k", titulo:"CARTOON NETWORK [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/Mqt", video:"http://psrv.io:80/9089247/coreurl.me/26408" },
  { id:"combate-4k", titulo:"COMBATE [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/E0D", video:"http://psrv.io:80/9089247/coreurl.me/26180" },
  { id:"discovery-channel-4k", titulo:"DISCOVERY CHANNEL [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/o8B", video:"http://psrv.io:80/9089247/coreurl.me/26185" },
  { id:"fox-sports-2-4k", titulo:"FOX SPORTS 2 [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/Pgs", video:"http://psrv.io:80/9089247/coreurl.me/26406" },
  { id:"fox-sports-4k", titulo:"FOX SPORTS [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/iWc", video:"http://psrv.io:80/9089247/coreurl.me/26187" },
  { id:"globo-sp-4k", titulo:"GLOBO SP [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/rxr", video:"http://psrv.io:80/9089247/coreurl.me/26181" },
  { id:"megapix-4k", titulo:"MEGAPIX [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/asB", video:"http://psrv.io:80/9089247/coreurl.me/26407" },
  { id:"multimostivo-4k", titulo:"MULTIMOSTIVO [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/2VC", video:"http://psrv.io:80/9089247/coreurl.me/26191" },
  { id:"natgeo-4k", titulo:"NATGEO [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/aSn", video:"http://psrv.io:80/9089247/coreurl.me/26695" },
  { id:"premier-club-4k", titulo:"PREMIER CLUB [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/Bxs", video:"http://psrv.io:80/9089247/coreurl.me/26184" },
  { id:"record-4k-teste", titulo:"RECORD 4K [TESTE]", tipo:"AoVivo", categoria:"4K", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/26182" },
  { id:"redetv-4k", titulo:"REDETV! [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/SKJ", video:"http://psrv.io:80/9089247/coreurl.me/26183" },
  { id:"sbt-4k", titulo:"SBT [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/Vpq", video:"http://psrv.io:80/9089247/coreurl.me/26188" },
  { id:"space-4k", titulo:"SPACE [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/t2m", video:"http://psrv.io:80/9089247/coreurl.me/27131" },
  { id:"tnt-series-4k", titulo:"TNT SERIES [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/8Sd", video:"http://psrv.io:80/9089247/coreurl.me/26696" },
  { id:"tnt-4k", titulo:"TNT [4K]", tipo:"AoVivo", categoria:"4K", poster:"http://z4.vc/SDg", video:"http://psrv.io:80/9089247/coreurl.me/26186" },

  // ── REALITY & BBB (1) ──────────────────────
  { id:"big-brother-brasil-cam001-hd", titulo:"Big Brother Brasil [CAM001] HD", tipo:"AoVivo", categoria:"Reality & BBB", poster:"", video:"http://psrv.io:80/9089247/coreurl.me/27861" },


  // ── TV JAPONESA ────────────────────────────────────────────────────────────
  { id:"nhk-g", titulo:"NHK G", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/6/6f/NHK%E7%B7%8F%E5%90%88%E3%83%AD%E3%82%B42020-.png", video:"https://mt01.utako.moe/NHK_G/index.m3u8" },
  { id:"nhk-e", titulo:"NHK E", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/a/aa/NHKE%E3%83%86%E3%83%AC%E3%83%AD%E3%82%B42020-.png", video:"https://mt01.utako.moe/NHK_E/index.m3u8" },
  { id:"ntv", titulo:"NTV", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Nippon_TV_logo_2014.svg/2560px-Nippon_TV_logo_2014.svg.png", video:"https://mt01.utako.moe/Nippon_TV/index.m3u8" },
  { id:"tbs-japan", titulo:"TBS Japan", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Tokyo_Broadcasting_System_logo_2020.svg/2560px-Tokyo_Broadcasting_System_logo_2020.svg.png", video:"https://mt01.utako.moe/TBS/index.m3u8" },
  { id:"fuji-tv", titulo:"Fuji TV", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/fr/thumb/6/65/Fuji_TV_Logo.svg/1049px-Fuji_TV_Logo.svg.png", video:"https://mt01.utako.moe/Fuji_TV/index.m3u8" },
  { id:"tv-asahi", titulo:"TV Asahi", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/TV_Asahi_Logo.svg/2560px-TV_Asahi_Logo.svg.png", video:"https://mt01.utako.moe/TV_Asahi/index.m3u8" },
  { id:"tv-tokyo", titulo:"TV Tokyo", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/TV_Tokyo_logo_2023.svg/2560px-TV_Tokyo_logo_2023.svg.png", video:"https://mt01.utako.moe/TV_Tokyo/index.m3u8" },
  { id:"tokyo-mx1", titulo:"TOKYO MX1", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Tokyo_metropolitan_television_logo_%28rainbow%29.svg/2560px-Tokyo_metropolitan_television_logo_%28rainbow%29.svg.png", video:"https://mt01.utako.moe/Tokyo_MX1/index.m3u8" },
  { id:"mbs", titulo:"MBS", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Mainichi_Broadcasting_System_logo.svg/1920px-Mainichi_Broadcasting_System_logo.svg.png", video:"https://mt01.utako.moe/mbs/index.m3u8" },
  { id:"abc-japan", titulo:"ABC Japan", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Asahi_Broadcasting_Corporation_Logo.svg/261px-Asahi_Broadcasting_Corporation_Logo.svg.png", video:"https://mt01.utako.moe/abc/index.m3u8" },
  { id:"tv-osaka", titulo:"TV Osaka", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Tv_osaka_logo.svg/178px-Tv_osaka_logo.svg.png", video:"https://mt01.utako.moe/tvo/index.m3u8" },
  { id:"nhk-bs", titulo:"NHK BS", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/6/6c/NHK_BS.png", video:"https://mt01.utako.moe/NHK_BS/index.m3u8" },
  { id:"animax-japan", titulo:"Animax Japan", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Animax.svg/1920px-Animax.svg.png", video:"https://ca01.utako.moe/Animax/index.m3u8" },
  { id:"at-x", titulo:"AT-X", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/AT-X_logo.svg/2560px-AT-X_logo.svg.png", video:"https://mt01.utako.moe/AT-X/index.m3u8" },
  { id:"space-shower-tv", titulo:"Space Shower TV", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/0/05/SPACE_SHOWER_TV.jpg", video:"https://ca01.utako.moe/spaceshower/index.m3u8" },
  { id:"mtv-japan", titulo:"MTV Japan", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.lyngsat.com/logo/tv/mm/mtv-us.svg", video:"https://ca01.utako.moe/mtv/index.m3u8" },
  { id:"disney-channel-japan", titulo:"Disney Channel Japan", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/2019_Disney_Channel_logo.svg/250px-2019_Disney_Channel_logo.svg.png", video:"https://ca01.utako.moe/disneychan/index.m3u8" },
  { id:"cartoon-network-japan", titulo:"Cartoon Network Japan", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.lyngsat.com/logo/tv/cc/cartoon-network-us.svg", video:"https://ca01.utako.moe/cartoon_network/index.m3u8" },
  { id:"jsport-1", titulo:"JSport 1", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.starcat.co.jp/ch/upload/channel/69/jsports1_logo.jpg", video:"https://mt01.utako.moe/js1/index.m3u8" },
  { id:"jsport-2", titulo:"JSport 2", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.starcat.co.jp/ch/upload/channel/70/jsports2_logo.jpg", video:"https://mt01.utako.moe/js2/index.m3u8" },
  { id:"jsport-3", titulo:"JSport 3", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.starcat.co.jp/ch/upload/channel/71/jsports3_logo.jpg", video:"https://mt01.utako.moe/js3/index.m3u8" },
  { id:"jsport-4", titulo:"JSport 4", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.starcat.co.jp/ch/upload/channel/74/jsports4_logo.jpg", video:"https://mt01.utako.moe/js4/index.m3u8" },
  { id:"wowow-prime", titulo:"WOWOW Prime", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.lyngsat.com/logo/tv/ww/wowow_prime.png", video:"https://mt01.utako.moe/wprime/index.m3u8" },
  { id:"bs-tbs", titulo:"BS TBS", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/BS-TBS_2020.svg/1920px-BS-TBS_2020.svg.png", video:"https://mt01.utako.moe/bstbs/index.m3u8" },
  { id:"bs-fuji", titulo:"BS Fuji", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/BSFuji2008Symbol.svg/1280px-BSFuji2008Symbol.svg.png", video:"https://mt01.utako.moe/bsfuji/index.m3u8" },

  // ── TV COREANA ────────────────────────────────────────────────────────────
  { id:"tv", titulo:"연합뉴스TV", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBD1400001ED_20230524T004408SQUARE.png", video:"https://jmp2.uk/sam-KRBD1400001ED.m3u8" },
  { id:"ytn", titulo:"YTN", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBD2400001XD_20250811T061417SQUARE.png", video:"https://jmp2.uk/sam-KRBD2400001XD.m3u8" },
  { id:"fifa", titulo:"FIFA+", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KR2900002NO_20250521T005529SQUARE.png", video:"https://jmp2.uk/sam-KR2900002NO.m3u8" },
  { id:"pga-tour-korea", titulo:"PGA Tour Korea", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBD3100007WB_20250402T010407SQUARE.png", video:"https://jmp2.uk/sam-KRBD3100007WB.m3u8" },
  { id:"", titulo:"짱구는 못말려", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KR10000017U_20250402T010134SQUARE.png", video:"https://jmp2.uk/sam-KR10000017U.m3u8" },
  { id:"", titulo:"포켓몬", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBC40000010R_20250514T082325SQUARE.png", video:"https://jmp2.uk/sam-KRBC40000010R.m3u8" },
  { id:"tv", titulo:"뽀요TV", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KR900001U5_20250514T082419SQUARE.png", video:"https://jmp2.uk/sam-KR900001U5.m3u8" },
  { id:"m2", titulo:"M2", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBC3200023BG_20250402T010309SQUARE.png", video:"https://jmp2.uk/sam-KRBC3200023BG.m3u8" },
  { id:"mbc", titulo:"MBC 무한도전", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBB5000069BS_20250827T010035SQUARE.png", video:"https://jmp2.uk/sam-KRBB5000069BS.m3u8" },
  { id:"sbs", titulo:"SBS 런닝맨", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBB4200002MM_20250827T010101SQUARE.png", video:"https://jmp2.uk/sam-KRBB4200002MM.m3u8" },
  { id:"tvn", titulo:"tvN 선재 업고 튀어", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBC3200018FU_20250827T010326SQUARE.png", video:"https://jmp2.uk/sam-KRBC3200018FU.m3u8" },
  { id:"jtbc", titulo:"JTBC 재벌집 막내아들", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KR400003IP_20250514T082415SQUARE.png", video:"https://jmp2.uk/sam-KR400003IP.m3u8" },
  { id:"cj-enm-movie", titulo:"CJ ENM MOVIE", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBC32000191N_20250402T010148SQUARE.png", video:"https://jmp2.uk/sam-KRBC32000191N.m3u8" },
  { id:"", titulo:"우리의식탁", tipo:"AoVivo", categoria:"TV Coreana", poster:"https://tvpnlogopus.samsungcloud.tv/platform/image/sourcelogo/vc/00/02/34/KRBD2200001QD_20250402T010110SQUARE.png", video:"https://jmp2.uk/sam-KRBD2200001QD.m3u8" },
];

const ANIMES_BUILTIN = [
  { id:"spy-x-family-s2", titulo:"Spy x Family 2ª Temporada", tipo:"Anime", categoria:"animes", poster:"https://cdn.discordapp.com/attachments/973615798436368425/1160244595309940826/10_01.mp4", capa:"https://cdn.discordapp.com/attachments/973615798436368425/1160244595309940826/10_01.mp4", temporadas:[{ numero:1, episodios:[{ numero:1, titulo:"Tarefa:26 Siga o Pai e a Mãe", video:"https://cdn.discordapp.com/attachments/973615798436368425/1160244595309940826/10_01.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1160244595309940826/10_01.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1160244595309940826/10_01.mp4" }, { numero:2, titulo:"Tarefa:27 Estratégia de Sobrevivência de Bond", video:"https://cdn.discordapp.com/attachments/973615798436368425/1162779668240420924/10_02.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1162779668240420924/10_02.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1162779668240420924/10_02.mp4" }, { numero:3, titulo:"Tarefa:28 Missão e Família", video:"https://cdn.discordapp.com/attachments/973615798436368425/1165316906505478236/10_03.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1165316906505478236/10_03.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1165316906505478236/10_03.mp4" }, { numero:4, titulo:"Tarefa:29 Doce de Sabedoria", video:"https://cdn.discordapp.com/attachments/973615798436368425/1167855479838486648/10_04.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1167855479838486648/10_04.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1167855479838486648/10_04.mp4" }, { numero:5, titulo:"Tarefa:30 Operação de Travessia", video:"https://cdn.discordapp.com/attachments/973615798436368425/1170427563236134912/10_05.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1170427563236134912/10_05.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1170427563236134912/10_05.mp4" }, { numero:6, titulo:"Tarefa:31 Cruzeiro de Luxo Aterrorizante", video:"https://cdn.discordapp.com/attachments/973615798436368425/1172926852243918868/10_06.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1172926852243918868/10_06.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1172926852243918868/10_06.mp4" }, { numero:7, titulo:"Tarefa:32 Para Quem é Esta Missão", video:"https://cdn.discordapp.com/attachments/973615798436368425/1175464433775018044/10_07.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1175464433775018044/10_07.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1175464433775018044/10_07.mp4" }, { numero:8, titulo:"Tarefa:33 Sinfonia no Navio", video:"https://cdn.discordapp.com/attachments/973615798436368425/1178001872414576750/10_08.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1178001872414576750/10_08.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1178001872414576750/10_08.mp4" }, { numero:9, titulo:"Tarefa:34 Mãos que Sustentam o Futuro", video:"https://cdn.discordapp.com/attachments/973615798436368425/1180545181154562078/10_09.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1180545181154562078/10_09.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1180545181154562078/10_09.mp4" }, { numero:10, titulo:"Tarefa:35 Aproveite o Resort", video:"https://cdn.discordapp.com/attachments/973615798436368425/1183072760407265390/10_10.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1183072760407265390/10_10.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1183072760407265390/10_10.mp4" }, { numero:11, titulo:"Tarefa:36 Romance de Balint", video:"https://cdn.discordapp.com/attachments/973615798436368425/1185608904290353233/10_11.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1185608904290353233/10_11.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1185608904290353233/10_11.mp4" }, { numero:12, titulo:"Tarefa:37 Um Membro da Família", video:"https://cdn.discordapp.com/attachments/973615798436368425/1188163006375403550/10_12.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1188163006375403550/10_12.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1188163006375403550/10_12.mp4" }] }] },
  { id:"frieren", titulo:"Frieren: Beyond Journey's End", tipo:"Anime", categoria:"animes", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Frieren_anime_visual.jpg/300px-Frieren_anime_visual.jpg", capa:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Frieren_anime_visual.jpg/300px-Frieren_anime_visual.jpg", temporadas:[{ numero:1, episodios:[{ numero:1, titulo:"A Aventura Termina", video:"https://cdn.discordapp.com/attachments/973615798436368425/1158127486798942329/10_01.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1158127486798942329/10_01.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1158127486798942329/10_01.mp4" }, { numero:2, titulo:"Não Precisa Ser Magia", video:"https://cdn.discordapp.com/attachments/973615798436368425/1158129185479458987/10_02.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1158129185479458987/10_02.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1158129185479458987/10_02.mp4" }, { numero:3, titulo:"Magia de Matar", video:"https://cdn.discordapp.com/attachments/973615798436368425/1158130977701384364/10_03.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1158130977701384364/10_03.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1158130977701384364/10_03.mp4" }, { numero:4, titulo:"O Lugar Onde as Almas Descansam", video:"https://cdn.discordapp.com/attachments/973615798436368425/1158132793516240966/10_04.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1158132793516240966/10_04.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1158132793516240966/10_04.mp4" }, { numero:5, titulo:"A Ilusão dos Mortos", video:"https://cdn.discordapp.com/attachments/973615798436368425/1159881341983272960/10_05.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1159881341983272960/10_05.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1159881341983272960/10_05.mp4" }, { numero:6, titulo:"O Herói da Vila", video:"https://cdn.discordapp.com/attachments/973615798436368425/1162444875090907188/10_06.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1162444875090907188/10_06.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1162444875090907188/10_06.mp4" }, { numero:7, titulo:"Coisas de Conto de Fadas", video:"https://cdn.discordapp.com/attachments/973615798436368425/1164954926565302352/10_07.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1164954926565302352/10_07.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1164954926565302352/10_07.mp4" }, { numero:8, titulo:"Frieren: A Sepultadora", video:"https://cdn.discordapp.com/attachments/973615798436368425/1167508063926886481/10_08.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1167508063926886481/10_08.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1167508063926886481/10_08.mp4" }, { numero:9, titulo:"Aura, a Guilhotina", video:"https://cdn.discordapp.com/attachments/973615798436368425/1170031108293926962/10_09.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1170031108293926962/10_09.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1170031108293926962/10_09.mp4" }, { numero:10, titulo:"O Poderoso Mago", video:"https://cdn.discordapp.com/attachments/973615798436368425/1172570096334536764/10_10.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1172570096334536764/10_10.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1172570096334536764/10_10.mp4" }, { numero:11, titulo:"O Inverno Severo do Norte", video:"https://cdn.discordapp.com/attachments/973615798436368425/1175110997141364927/10_11.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1175110997141364927/10_11.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1175110997141364927/10_11.mp4" }, { numero:12, titulo:"O Verdadeiro Herói", video:"https://cdn.discordapp.com/attachments/973615798436368425/1177641197196558438/10_12.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1177641197196558438/10_12.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1177641197196558438/10_12.mp4" }, { numero:13, titulo:"Da Mesma Espécie", video:"https://cdn.discordapp.com/attachments/973615798436368425/1180175042865279006/10_13.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1180175042865279006/10_13.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1180175042865279006/10_13.mp4" }, { numero:14, titulo:"O Privilégio da Juventude", video:"https://cdn.discordapp.com/attachments/973615798436368425/1182711570929827991/10_14.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1182711570929827991/10_14.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1182711570929827991/10_14.mp4" }, { numero:15, titulo:"O Cheiro de Problemas", video:"https://cdn.discordapp.com/attachments/973615798436368425/1185248994021101689/10_15.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1185248994021101689/10_15.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1185248994021101689/10_15.mp4" }, { numero:16, titulo:"Amigos de Longa Vida", video:"https://cdn.discordapp.com/attachments/973615798436368425/1187793070062841946/10_16.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1187793070062841946/10_16.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1187793070062841946/10_16.mp4" }, { numero:17, titulo:"Cuide-se Bem", video:"https://cdn.discordapp.com/attachments/973615798436368425/1192862313817051216/10_17.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1192862313817051216/10_17.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1192862313817051216/10_17.mp4" }, { numero:18, titulo:"Seleção do Mago de 1ª Classe", video:"https://cdn.discordapp.com/attachments/973615798436368425/1195400991336562819/10_18.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1195400991336562819/10_18.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1195400991336562819/10_18.mp4" }, { numero:19, titulo:"O Plano Cuidadosamente Elaborado", video:"https://cdn.discordapp.com/attachments/973615798436368425/1197949436823863347/10_19.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1197949436823863347/10_19.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1197949436823863347/10_19.mp4" }, { numero:20, titulo:"O Assassinato Necessário", video:"https://cdn.discordapp.com/attachments/973615798436368425/1200482543116496966/10_20.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1200482543116496966/10_20.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1200482543116496966/10_20.mp4" }, { numero:21, titulo:"O Mundo da Magia", video:"https://cdn.discordapp.com/attachments/973615798436368425/1203030904424108162/10_21.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1203030904424108162/10_21.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1203030904424108162/10_21.mp4" }, { numero:22, titulo:"A Partir de Agora Somos Inimigos", video:"https://cdn.discordapp.com/attachments/973615798436368425/1205542910184001586/10_22.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1205542910184001586/10_22.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1205542910184001586/10_22.mp4" }, { numero:23, titulo:"Conquista do Labirinto", video:"https://cdn.discordapp.com/attachments/973615798436368425/1208080487386447934/10_23.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1208080487386447934/10_23.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1208080487386447934/10_23.mp4" }, { numero:24, titulo:"O Clone Perfeito", video:"https://cdn.discordapp.com/attachments/973615798436368425/1210626420326535209/10_24.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1210626420326535209/10_24.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1210626420326535209/10_24.mp4" }, { numero:25, titulo:"A Fraqueza Fatal", video:"https://cdn.discordapp.com/attachments/973615798436368425/1213149414479241216/10_25.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1213149414479241216/10_25.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1213149414479241216/10_25.mp4" }, { numero:26, titulo:"A Profundidade da Magia", video:"https://cdn.discordapp.com/attachments/973615798436368425/1215685837359030282/10_26.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1215685837359030282/10_26.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1215685837359030282/10_26.mp4" }, { numero:27, titulo:"A Era dos Humanos", video:"https://cdn.discordapp.com/attachments/973615798436368425/1218222575398944828/10_27.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1218222575398944828/10_27.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1218222575398944828/10_27.mp4" }, { numero:28, titulo:"Até a Próxima Vez", video:"https://cdn.discordapp.com/attachments/973615798436368425/1220796880552722504/10_28.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1220796880552722504/10_28.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1220796880552722504/10_28.mp4" }] }] },
  { id:"solo-leveling", titulo:"Solo Leveling", tipo:"Anime", categoria:"animes", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Solo_Leveling_official_cover.jpg/300px-Solo_Leveling_official_cover.jpg", capa:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Solo_Leveling_official_cover.jpg/300px-Solo_Leveling_official_cover.jpg", temporadas:[{ numero:1, episodios:[{ numero:1, titulo:"Já Estou Acostumado", video:"https://cdn.discordapp.com/attachments/973615798436368425/1209562352668901406/1_01.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1209562352668901406/1_01.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1209562352668901406/1_01.mp4" }, { numero:2, titulo:"Se Pudesse Ter Uma Segunda Chance", video:"https://cdn.discordapp.com/attachments/973615798436368425/1209563190166290443/1_02.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1209563190166290443/1_02.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1209563190166290443/1_02.mp4" }, { numero:3, titulo:"Como um Jogo", video:"https://cdn.discordapp.com/attachments/973615798436368425/1209563712898474064/1_03.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1209563712898474064/1_03.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1209563712898474064/1_03.mp4" }, { numero:4, titulo:"Quero Ficar Mais Forte", video:"https://cdn.discordapp.com/attachments/973615798436368425/1209926345002319922/1_04.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1209926345002319922/1_04.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1209926345002319922/1_04.mp4" }, { numero:5, titulo:"Um Negócio Vantajoso", video:"https://cdn.discordapp.com/attachments/973615798436368425/1209926884813705256/1_05.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1209926884813705256/1_05.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1209926884813705256/1_05.mp4" }, { numero:6, titulo:"Hora de Caçar", video:"https://cdn.discordapp.com/attachments/973615798436368425/1209927522553303040/1_06.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1209927522553303040/1_06.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1209927522553303040/1_06.mp4" }, { numero:7, titulo:"Vamos Ver Até Onde Posso Ir", video:"https://cdn.discordapp.com/attachments/973615798436368425/1209928235127668756/1_07.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1209928235127668756/1_07.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1209928235127668756/1_07.mp4" }, { numero:8, titulo:"Que Frustrante", video:"https://cdn.discordapp.com/attachments/973615798436368425/1213606182128717945/1_08.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1213606182128717945/1_08.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1213606182128717945/1_08.mp4" }, { numero:9, titulo:"Você Ainda Estava Guardando Algo", video:"https://cdn.discordapp.com/attachments/973615798436368425/1216131105845940284/1_09.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1216131105845940284/1_09.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1216131105845940284/1_09.mp4" }, { numero:10, titulo:"Isso é um Piquenique?", video:"https://cdn.discordapp.com/attachments/973615798436368425/1218680141446909962/1_10.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1218680141446909962/1_10.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1218680141446909962/1_10.mp4" }, { numero:11, titulo:"O Cavaleiro que Guarda o Trono Sozinho", video:"https://cdn.discordapp.com/attachments/973615798436368425/1221205399898689738/1_11.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1221205399898689738/1_11.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1221205399898689738/1_11.mp4" }, { numero:12, titulo:"Levante-se", video:"https://cdn.discordapp.com/attachments/973615798436368425/1223716591544569896/1_12.mp4", videoDublado:"https://cdn.discordapp.com/attachments/973615798436368425/1223716591544569896/1_12.mp4", videoLegendado:"https://cdn.discordapp.com/attachments/973615798436368425/1223716591544569896/1_12.mp4" }] }] }
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
  // Esconde a section pai se não houver itens
  const section = container.closest("section");
  if (!lista.length) {
    if (section) section.style.display = "none";
    return;
  }
  if (section) section.style.display = "";
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