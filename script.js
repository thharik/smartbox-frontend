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
    if (r.status === 402) { window.location.href = "login.html?sem_assinatura=1"; return null; }
    if (r.status === 403) return null; // sem perfil selecionado ou sem permissão
    if (!r.ok) return null;            // qualquer outro erro HTTP
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
  { id:"ebs1-kr", titulo:"EBS 1 (Coreia)", tipo:"AoVivo", categoria:"Variedades", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/EBS_1TV_Logo.svg/512px-EBS_1TV_Logo.svg.png", video:"https://ebsonair.ebs.co.kr/ebs1familypc/familypc1m/playlist.m3u8" },
  { id:"ebs2-kr", titulo:"EBS 2 (Coreia)", tipo:"AoVivo", categoria:"Variedades", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/EBS_2TV_Logo.svg/512px-EBS_2TV_Logo.svg.png", video:"https://ebsonair.ebs.co.kr/ebs2familypc/familypc1m/playlist.m3u8" },

  // ── TV JAPONESA ────────────────────────────────────────────────────────────
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
  
  { id:"at-x", titulo:"AT-X", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/AT-X_logo.svg/2560px-AT-X_logo.svg.png", video:"https://mt01.utako.moe/AT-X/index.m3u8" },
  { id:"space-shower-tv", titulo:"Space Shower TV", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://upload.wikimedia.org/wikipedia/commons/0/05/SPACE_SHOWER_TV.jpg", video:"https://ca01.utako.moe/spaceshower/index.m3u8" },
  { id:"mtv-japan", titulo:"MTV Japan", tipo:"AoVivo", categoria:"TV Japonesa", poster:"https://www.lyngsat.com/logo/tv/mm/mtv-us.svg", video:"https://ca01.utako.moe/mtv/index.m3u8" },
 
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
  // Carrega sempre do cache local primeiro (garante dados offline)
  const favCache      = ls.get("sb_fav_cache");
  const continuarCache = ls.get("sb_continuar_cache") || [];
  if (favCache) userData.favoritos = favCache;
  if (continuarCache.length) userData.continuarAssistindo = continuarCache;

  if (!getPerfilId()) return;
  const [favs, continuar] = await Promise.all([
    apiFetch("/favoritos",           { headers: headers(true) }),
    apiFetch("/progresso/continuar", { headers: headers(true) }),
  ]);
  if (favs && Array.isArray(favs)) {
    userData.favoritos = favs.map(f => f.id || f.conteudo_id);
    const local = ls.get("sb_fav_cache") || [];
    local.forEach(id => { if (!userData.favoritos.includes(id)) userData.favoritos.push(id); });
    ls.set("sb_fav_cache", userData.favoritos);
  }
  if (continuar && Array.isArray(continuar) && continuar.length) {
    // Mescla: API pode não ter capa/poster, usa cache local para preencher os campos que faltam
    const cache = ls.get("sb_continuar_cache") || [];
    userData.continuarAssistindo = continuar.map(apiItem => {
      const local = cache.find(c => c.episodio_id === (apiItem.episodio_id || apiItem.episodioId));
      return {
        ...apiItem,
        capa:      apiItem.capa      || local?.capa      || local?.poster || "",
        poster:    apiItem.poster    || local?.poster    || "",
        titulo:    apiItem.titulo    || local?.titulo    || "",
        ep_titulo: apiItem.ep_titulo || local?.ep_titulo || "",
        updated_at: apiItem.updated_at || local?.updated_at || 0,
      };
    });
    // Atualiza cache local com dados mesclados
    ls.set("sb_continuar_cache", userData.continuarAssistindo.slice(0, 20));
  }
}

// ─── Múltiplos perfis ─────────────────────────────────────────────────────────
function mostrarTelaPerfis() {
  return new Promise(async (resolve) => {
    const perfis = await apiFetch("/perfis", { headers: headers() });
    if (!perfis || !Array.isArray(perfis) || !perfis.length) { resolve(); return; }

    // 1 perfil sem PIN: seleciona direto e resolve imediatamente
    if (perfis.length === 1 && !perfis[0].tem_pin) {
      selecionarPerfil(perfis[0]);
      resolve();
      return;
    }

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
    btn.addEventListener("click", () => {
      if (p.tem_pin) pedirPin(p, overlay, resolve);
      else { selecionarPerfil(p); overlay.remove(); resolve(); }
    });
    grid.appendChild(btn);
  });
  if (perfis.length < 4) {
    const btnNovo = document.createElement("button");
    btnNovo.style.cssText = "background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;";
    btnNovo.innerHTML = `<div style="width:90px;height:90px;border-radius:10px;background:#1a1a1a;border:2px dashed #333;font-size:36px;display:flex;align-items:center;justify-content:center;color:#555;">+</div><span style="color:#777;font-size:14px">Novo perfil</span>`;
    btnNovo.addEventListener("click", () => abrirModalCriarPerfil(overlay));
    grid.appendChild(btnNovo);
  }
  overlay.querySelector("#btnGerenciarPerfis").addEventListener("click", () => abrirModalCriarPerfil(overlay, resolve));
  document.body.appendChild(overlay);
  })
}

function pedirPin(perfil, overlay, resolve) {
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
    if (ok?.ok) { selecionarPerfil(perfil); overlay.remove(); resolve(); }
    else modal.querySelector("#pinErro").textContent = "PIN incorreto. Tente novamente.";
  });
  overlay.appendChild(modal);
}

function abrirModalCriarPerfil(overlay, resolve) {
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
    if (res?.id) { modal.remove(); overlay.remove(); resolve(); }
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
    if (res.favoritado) {
      if (!userData.favoritos.includes(itemId)) userData.favoritos.push(itemId);
    } else {
      userData.favoritos = userData.favoritos.filter(x => x !== itemId);
    }
    ls.set("sb_fav_cache", userData.favoritos);
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

  // Ordena: mais recente primeiro
  const lista = [...(userData.continuarAssistindo || [])].sort((a, b) => {
    return (b.updated_at || b.ts || 0) > (a.updated_at || a.ts || 0) ? 1 : -1;
  });
  if (!lista.length) { box.classList.add("hidden"); return; }

  row.innerHTML = "";
  row.className = "continuar-row";

  lista.forEach(item => {
    const pct = item.duration > 0 ? Math.min(100, Math.round((item.current_time / item.duration) * 100)) : 0;
    const { cat } = buscarItemEmTodoCatalogo(item.conteudo_id);
    const catUrl  = cat || "rowAnimes";
    const link    = `assistir.html?serie=${encodeURIComponent(item.conteudo_id)}&categoria=${encodeURIComponent(catUrl)}&temporada=1&episodio=${encodeURIComponent(item.episodio_id)}&autoplay=1`;

    const restanteSeg = item.duration - item.current_time;
    const restanteMin = Math.max(0, Math.round(restanteSeg / 60));
    const restanteTxt = restanteMin > 1 ? `${restanteMin} min` : "Finalizado";

    // Busca dados do catálogo em memória como fallback
    const { item: catalogItem } = buscarItemEmTodoCatalogo(item.conteudo_id);
    const epCatalog = catalogItem?.temporadas?.flatMap(t => t.episodios || []).find(e => e.id === item.episodio_id);

    // Usa capa do episódio (cena onde parou), senão poster da série
    const imgSrc = item.capa || epCatalog?.capa || item.poster || catalogItem?.poster || "assets/posters/placeholder.jpg";
    const tituloExib  = item.titulo    || catalogItem?.titulo    || "Sem título";
    const epTituloExib = item.ep_titulo || epCatalog?.titulo     || "";

    const bloco = document.createElement("div");
    bloco.className = "continuar-card-h";
    bloco.innerHTML = `
      <a href="${link}" class="continuar-card-h-link">
        <div class="continuar-card-h-thumb">
          <img src="${imgSrc}" alt="${tituloExib}">
          <div class="continuar-play-icon">▶</div>
          <div class="continuar-card-h-bar"><div class="continuar-card-h-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="continuar-card-h-info">
          <p class="continuar-card-h-titulo">${tituloExib}</p>
          <p class="continuar-card-h-ep">${epTituloExib}</p>
          <p class="continuar-card-h-resto">${restanteTxt}</p>
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
  const tempBox = document.getElementById("temporadaBox");
  const tempSel = document.getElementById("temporadaSelect");
  const epGrid  = document.getElementById("episodiosGrid");

  const catReal      = cat || buscarItemEmTodoCatalogo(item.id).cat || "rowAnimes";
  const primeiraTemp = item.temporadas?.[0];
  const primeiroEp   = primeiraTemp?.episodios?.[0];

  atualizarBotaoFavorito(item.id);
  if (btnFav)  btnFav.onclick = () => alternarFavorito(item.id);
  if (btnPlay) btnPlay.onclick = () => {
    if (!primeiroEp) { alert("Nenhum episódio disponível."); return; }
    if (!primeiroEp.video) { alert("Vídeo não configurado."); return; }
    window.location.href = `assistir.html?serie=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(catReal)}&temporada=${primeiraTemp.numero}&episodio=${encodeURIComponent(primeiroEp.id)}&autoplay=1`;
  };

  // Filmes com 1 ep não precisam de grade
  const totalEps = item.temporadas?.reduce((s, t) => s + (t.episodios?.length || 0), 0) || 0;
  if (item.tipo === "Filme" && totalEps <= 1) {
    if (tempBox) tempBox.style.display = "none";
    if (epGrid)  epGrid.style.display  = "none";
    // Esconde também o h2 "Episódios"
    const epSection = epGrid?.closest("section");
    if (epSection) epSection.style.display = "none";
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
        if (!ep.video) { alert("Sem vídeo configurado."); return; }
        window.location.href = `assistir.html?serie=${encodeURIComponent(item.id)}&categoria=${encodeURIComponent(catReal)}&temporada=${num}&episodio=${encodeURIComponent(ep.id)}&autoplay=1`;
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

  // Tela cheia automática + play automático ao carregar
  const shell = document.querySelector(".player-shell");

  function entrarFullscreenEPlay() {
    const alvo = shell || videoPlayer;
    const fsPromise = alvo.requestFullscreen?.() ?? alvo.webkitRequestFullscreen?.();
    Promise.resolve(fsPromise).catch(() => {}).finally(() => {
      videoPlayer.play().catch(() => {});
    });
  }

  // Dispara assim que o vídeo estiver pronto para tocar
  videoPlayer.addEventListener("canplay", entrarFullscreenEPlay, { once: true });

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
    // Play automático sempre (fullscreen já tratado acima via canplay)
    videoPlayer.addEventListener("canplay", () => videoPlayer.play().catch(() => {}), { once:true });
    return;
  }

  // ── Série/Anime/Filme ─────────────────────────────────────────────────────
  let item = buscarListaPorCategoria(categoria).find(c => c.id === serieId);
  // CORRIGIDO: fallback caso categoria da URL não bata
  if (!item) item = buscarItemEmTodoCatalogo(serieId).item;
  if (!item) { playerInfo.innerHTML = "<h1>Não encontrado.</h1>"; return; }

  let tempNumAtual    = parseInt(params.get("temporada")) || item.temporadas?.[0]?.numero || 1;
  let episodioIdAtual = params.get("episodio") || item.temporadas?.[0]?.episodios?.[0]?.id;

  function getEpisodioAtual() {
    return item.temporadas.find(t => t.numero === tempNumAtual)?.episodios.find(e => e.id === episodioIdAtual) || null;
  }
  function carregarVideo(ep) {
    if (!ep) {
        playerInfo.innerHTML = "<h1>Episódio não encontrado.</h1>";
        return;
    }

    const videoUrl = ep.video;

    console.log("EP =", ep);
    console.log("VIDEO URL =", videoUrl);

    playerInfo.innerHTML =
      `<h1>${item.titulo}</h1><p>${ep.titulo}${ep.descricao ? " — " + ep.descricao : ""}</p>`;

    carregarVideoHLS(videoPlayer, videoUrl);

    // Restaurar posição salva
    videoPlayer.addEventListener("loadedmetadata", () => {
      const cache = ls.get("sb_continuar_cache") || [];
      const salvo = cache.find(x => x.episodio_id === ep.id);
      // Só retoma se tiver progresso e não tiver terminado (< 95%)
      if (salvo?.current_time && salvo?.duration && (salvo.current_time / salvo.duration) < 0.95) {
        videoPlayer.currentTime = salvo.current_time;
      }
    }, { once: true });

    // Play automático (fullscreen já tratado acima via canplay)
    videoPlayer.addEventListener("canplay", () => videoPlayer.play().catch(() => {}), { once: true });
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

  // Garante que os botões flutuantes aparecem dentro do fullscreen element
  function moverBotoesFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const shell = document.querySelector(".player-shell");
    [btnSkip, btnNext].forEach(btn => {
      if (!btn) return;
      if (fsEl && shell && fsEl === shell) {
        shell.appendChild(btn);
      }
    });
  }
  document.addEventListener("fullscreenchange",       moverBotoesFullscreen);
  document.addEventListener("webkitfullscreenchange", moverBotoesFullscreen);

  // Zoom por pinça no vídeo (mobile) e scroll (desktop) — só na tela cheia
  // scale=1 → object-fit:contain (padrão), scale>1 → aumenta via transform
  let videoScale = 1;
  let lastDist   = null;
  let pinchActive = false;

  function aplicarZoom(novoScale) {
    videoScale = Math.min(3, Math.max(1, novoScale));
    if (videoScale <= 1) {
      videoPlayer.style.transform  = "";
      videoPlayer.style.objectFit  = "contain";
    } else {
      videoPlayer.style.transform  = `scale(${videoScale})`;
      videoPlayer.style.objectFit  = "cover";
    }
  }

  // Touch — pinça
  videoPlayer.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      pinchActive = true;
      lastDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      e.preventDefault(); // evita scroll da página durante pinça
    }
  }, { passive: false });

  videoPlayer.addEventListener("touchmove", e => {
    if (!pinchActive || e.touches.length !== 2 || !lastDist) return;
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    aplicarZoom(videoScale * (dist / lastDist));
    lastDist = dist;
  }, { passive: false });

  videoPlayer.addEventListener("touchend", e => {
    if (e.touches.length < 2) { pinchActive = false; lastDist = null; }
  });

  // Scroll com Ctrl no desktop — só se estiver em fullscreen
  videoPlayer.addEventListener("wheel", e => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) return;
    e.preventDefault();
    aplicarZoom(videoScale + (e.deltaY < 0 ? 0.15 : -0.15));
  }, { passive: false });

  // Reset zoom ao sair do fullscreen
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) aplicarZoom(1);
  });
  document.addEventListener("webkitfullscreenchange", () => {
    if (!document.webkitFullscreenElement) aplicarZoom(1);
  });

  // ── Salvar progresso ────────────────────────────────────────────────────────
  // Usa setInterval para salvar a cada 5s enquanto toca, + no pause e ao fechar
  let saveInterval = null;

  function salvarAgora() {
    if (!videoPlayer.duration || isNaN(videoPlayer.duration)) return;
    if (!videoPlayer.currentTime || videoPlayer.currentTime < 1) return;

    const epAtual = getEpisodioAtual();
    const payload = {
      episodioId:  episodioIdAtual,
      conteudoId:  item.id,
      currentTime: Math.floor(videoPlayer.currentTime),
      duration:    Math.floor(videoPlayer.duration),
      titulo:      item.titulo    || "",
      ep_titulo:   epAtual?.titulo || "",
      poster:      item.poster    || "",
      capa:        epAtual?.capa  || item.poster || "",
    };

    // Salva no localStorage imediatamente
    const cache = ls.get("sb_continuar_cache") || [];
    const idx   = cache.findIndex(x => x.episodio_id === episodioIdAtual);
    const entry = {
      episodio_id:  episodioIdAtual,
      conteudo_id:  item.id,
      current_time: payload.currentTime,
      duration:     payload.duration,
      titulo:       payload.titulo,
      ep_titulo:    payload.ep_titulo,
      poster:       payload.poster,
      capa:         payload.capa,
      updated_at:   Date.now(),
    };
    if (idx >= 0) cache.splice(idx, 1);
    cache.unshift(entry);
    ls.set("sb_continuar_cache", cache.slice(0, 20));

    // Atualiza memória
    const idxMem = (userData.continuarAssistindo || []).findIndex(x => x.episodio_id === episodioIdAtual);
    if (idxMem >= 0) userData.continuarAssistindo.splice(idxMem, 1);
    userData.continuarAssistindo = [entry, ...(userData.continuarAssistindo || [])];

    // Envia para API (sem bloquear)
    salvarProgresso(payload);
  }

  function iniciarSaveInterval() {
    clearInterval(saveInterval);
    saveInterval = setInterval(salvarAgora, 5000); // salva a cada 5s
  }
  function pararSaveInterval() {
    clearInterval(saveInterval);
    saveInterval = null;
  }

  videoPlayer.addEventListener("play",  iniciarSaveInterval);
  videoPlayer.addEventListener("pause", () => { pararSaveInterval(); salvarAgora(); });
  videoPlayer.addEventListener("ended", () => { pararSaveInterval(); salvarAgora(); });

  // Salva ao fechar/sair da página
  window.addEventListener("beforeunload", salvarAgora);
  window.addEventListener("pagehide",     salvarAgora);

  // Atualiza botões skip/próximo no timeupdate (sem salvar aqui)
  videoPlayer.addEventListener("timeupdate", () => {
    if (btnSkip) {
      const r = videoPlayer.duration - videoPlayer.currentTime;
      btnSkip.classList.toggle("hidden", r <= 60);
    }
    const proximo = encontrarProximo(item, tempNumAtual, episodioIdAtual);
    if (btnNext && proximo) {
      const r = videoPlayer.duration - videoPlayer.currentTime;
      btnNext.classList.toggle("hidden", r > 60);
    }
  });
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
  // Botão de lupa (mobile) — redireciona para busca em qualquer página
  const searchIconBtn = document.getElementById("searchIconBtn");
  if (searchIconBtn) {
    searchIconBtn.addEventListener("click", () => { window.location.href = "busca.html"; });
  }

  const input = document.getElementById("searchInput");
  if (!input) return;
  // Na home, o clique no campo redireciona para a tela de busca
  const naHome = !!document.getElementById("rowDestaques");
  if (naHome) {
    input.addEventListener("focus", () => { window.location.href = "busca.html"; });
    input.addEventListener("click",  () => { window.location.href = "busca.html"; });
    return;
  }
  // Na tela de busca usa normalmente
  input.addEventListener("input", () => {
    const t = input.value.toLowerCase().trim();
    document.querySelectorAll(".poster-card, .busca-card").forEach(c => {
      c.closest(".busca-item")
        ? c.closest(".busca-item").classList.toggle("hidden", !!(t && !c.dataset.titulo?.includes(t)))
        : c.classList.toggle("hidden", !!(t && !c.dataset.titulo?.includes(t)));
    });
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

// ─── Proteção de conteúdo — bloquear clique direito em imagens ────────────────
document.addEventListener("contextmenu", e => {
  if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") e.preventDefault();
});
document.addEventListener("dragstart", e => {
  if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") e.preventDefault();
});

// ─── Bloquear zoom da página (Ctrl+scroll, Ctrl+/-/0, pinça fora do vídeo) ────
(function bloquearZoomPagina() {
  // Bloqueia Ctrl+scroll em todas as páginas
  document.addEventListener("wheel", e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  // Bloqueia Ctrl + / - / 0
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) e.preventDefault();
  });
  // Bloqueia pinça na página (exceto no próprio elemento #videoPlayer tratado separadamente)
  document.addEventListener("touchmove", e => {
    if (e.touches.length >= 2) {
      const video = document.getElementById("videoPlayer");
      if (!video || !video.contains(e.target)) e.preventDefault();
    }
  }, { passive: false });
})();

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
  iniciarBusca();
})();