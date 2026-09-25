/* ═══════════════ FlixPlay v4 — app.js ═══════════════
   Lecture intégrée (serveur auto), langues, transfert Wi-Fi, AniList+Jikan, MangaDex, Cinemeta, iptv-org */
"use strict";

/* ─────────── Couche API (bridge natif : GET + POST, sans CORS) ─────────── */
let __cbN = 0;
function api(url, tries){
  tries = tries || 0;
  return new Promise((res, rej) => {
    const id = "__cb" + (++__cbN);
    window[id] = (resp) => {
      delete window[id];
      // Robustesse : limite de débit (429), serveur en panne (5xx) ou coupure réseau (0)
      // → une seule nouvelle tentative 2,5 s plus tard (MangaDex anon = 60 req/min)
      if ((resp.status === 429 || resp.status >= 500 || resp.status === 0) && tries < 1) {
        setTimeout(() => api(url, tries + 1).then(res, rej), 2500);
        return;
      }
      let body = null;
      try { body = JSON.parse(resp.body); } catch(e){ body = resp.body; }
      (resp.status >= 400) ? rej({status: resp.status, body}) : res(body);
    };
    App.fetch(url, id);
  });
}
function apiPost(url, obj){
  return new Promise((res, rej) => {
    const id = "__cb" + (++__cbN);
    window[id] = (resp) => {
      delete window[id];
      let body = null;
      try { body = JSON.parse(resp.body); } catch(e){ body = resp.body; }
      (resp.status >= 400) ? rej({status: resp.status, body}) : res(body);
    };
    App.fetchPost(url, JSON.stringify(obj), id);
  });
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const q = (s) => esc(s == null ? "" : s).replace(/'/g, "\\'");
const stripHtml = (s) => String(s == null ? "" : s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "");
const relTime = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return "il y a " + Math.max(1, s/60|0) + " min";
  if (s < 86400) return "il y a " + (s/3600|0) + " h";
  if (s < 86400*30) return "il y a " + (s/86400|0) + " j";
  return new Date(iso).toLocaleDateString("fr-FR");
};
function toast(msg){ const t = document.getElementById("toast"); t.textContent = msg;
  t.classList.remove("hidden"); clearTimeout(t.__to);
  t.__to = setTimeout(() => t.classList.add("hidden"), 2800); }
const $ = (sel) => document.querySelector(sel);
const view = () => document.getElementById("view");
function el(html){ const t = document.createElement("template"); t.innerHTML = html; return t.content.firstElementChild; }
function frag(html){ const t = document.createElement("template"); t.innerHTML = html; return t.content; }
/* Accepte un OU un élément DOM (evite le bug "[object HTMLDivElement]" en innerHTML) */
function mount(container, content){
  if (typeof content === "string") container.innerHTML = content;
  else { container.innerHTML = ""; container.appendChild(content); }
}
function setView(html){ const v = view(); v.innerHTML = ""; if (typeof html === "string") v.appendChild(frag(html)); else v.appendChild(html); }
const store = {
  get(k, d){ try { const v = localStorage.getItem("fx_" + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem("fx_" + k, JSON.stringify(v)); } catch(e){} },
};

/* ─────────── Icônes SVG (aucun émoji) ─────────── */
function ic(name){
  const P = {
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    tv: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M17 2l-5 5-5-5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    book: '<path d="M2 4h6a4 4 0 014 4v12a3 3 0 00-3-3H2z"/><path d="M22 4h-6a4 4 0 00-4 4v12a3 3 0 013-3h7z"/>',
    cast: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M4.9 19.1a10 10 0 010-14.2M7.8 16.2a6 6 0 010-8.4M16.2 7.8a6 6 0 010 8.4M19.1 4.9a10 10 0 010 14.2"/>',
    dl: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    play: '<path fill="currentColor" stroke="none" d="M8 5.5v13l11-6.5z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/>',
    share: '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
    ext: '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
    retry: '<path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 102.1-9.4L1 10"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
  };
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || "") + "</svg>";
}
function errBox(msg, retryFn, sub){
  const d = el(`<div class="errbox">${ic("retry")}
    <div class="t">${esc(msg || "Erreur de chargement")}</div>
    <div class="s">${esc(sub || "Vérifie ta connexion, puis réessaie.")}</div>
    <button class="btn ghost">Réessayer</button></div>`);
  d.querySelector("button").onclick = retryFn || (() => {});
  return d;
}

/* ─────────── Réglages / Historique / Favoris / Téléchargements ─────────── */
let SETTINGS = Object.assign({ tvcat:"bj.m3u", lang:"fr" }, store.get("settings", {}));
const saveSettings = () => store.set("settings", SETTINGS);
let HISTORY = store.get("history", []);
function addHistory(entry){
  HISTORY = HISTORY.filter(h => !(h.title === entry.title && h.ref === entry.ref));
  HISTORY.unshift(Object.assign({ts: Date.now()}, entry));
  HISTORY = HISTORY.slice(0, 50);
  store.set("history", HISTORY);
}
let FAVORITES = store.get("favorites", []);
function toggleFavorite(item){
  const i = FAVORITES.findIndex(f => f.ref === item.ref);
  if (i >= 0) { FAVORITES.splice(i, 1); toast("Retiré des favoris"); }
  else { FAVORITES.unshift(item); toast("Ajouté aux favoris"); }
  FAVORITES = FAVORITES.slice(0, 100);
  store.set("favorites", FAVORITES);
  return i < 0;
}
let DOWNLOADS = store.get("downloads", []);
function addDownload(entry){
  DOWNLOADS.unshift(Object.assign({ts: Date.now(), status:"run"}, entry));
  DOWNLOADS = DOWNLOADS.slice(0, 100);
  store.set("downloads", DOWNLOADS);
}
function markDownloadOk(id, path){
  const d = DOWNLOADS.find(x => x.id === id);
  if (d) { d.status = "ok"; d.path = path; store.set("downloads", DOWNLOADS); }
  renderDL();
}
function markDownloadErr(id){
  const d = DOWNLOADS.find(x => x.id === id);
  if (d) { d.status = "err"; store.set("downloads", DOWNLOADS); }
  renderDL();
}
window.__dlDone = function(id, path){
  if (id.endsWith(":err") || path === "err") markDownloadErr(String(id).replace(/:err$/, ""));
  else markDownloadOk(id, path);
};

/* ─────────── Lecture intégrée : le meilleur serveur est choisi automatiquement ─────────── */
function startPlayback(title, kind, imdb, tmdb, s, e, mal, ext){
  const u = "player.html?t=" + encodeURIComponent(title) + "&kind=" + encodeURIComponent(kind || "film") +
    "&imdb=" + (imdb || "") +
    "&tmdb=" + (tmdb || "") + "&s=" + (s == null ? "" : s) + "&e=" + (e == null ? "" : e) +
    "&mal=" + (mal || "") + (ext ? "&ext=" + encodeURIComponent(ext) : "");
  if (window.FXLOG) FXLOG.log("NAV", "Lecture : « " + title + " » [" + (kind || "film") + "] imdb=" + (imdb || "-") + " mal=" + (mal || "-"));
  addHistory({title, kind, imdb, tmdb, s, e, mal: mal || "", type:"video", url: u,
    ref: (imdb || tmdb || mal || "") + (s != null ? ":" + s + ":" + e : "")});
  location.href = u;
}
/* Anime-Sama : titre → ID AniList (pour les serveurs par ID) + stream officiel en secours */
async function asamaPlay(title){
  if (window.FXLOG) FXLOG.log("NAV", "Anime-Sama : « " + title + " » → recherche AniList…");
  toast("Préparation de la lecture…");
  let mal = "", ext = "";
  try {
    const d = (await anilist(`Page(perPage:1){ media(search: $q, type: ANIME){ idMal streamingEpisodes{ url } } }`, {q: title})).Page.media;
    if (d && d.length) {
      mal = d[0].idMal || "";
      ext = (d[0].streamingEpisodes && d[0].streamingEpisodes[0] && d[0].streamingEpisodes[0].url) || "";
      if (window.FXLOG) FXLOG.log("INFO", "AniList : mal=" + (mal || "introuvable") + (ext ? " + stream officiel" : ""));
    }
  } catch(e) { if (window.FXLOG) FXLOG.log("ERREUR", "AniList : " + e.message); }
  startPlayback(title, "anime", "", "", null, null, mal, ext);
}
/* Lecture NATIVE d'un flux direct (Internet Archive) : <video> + hls.js, aucun intermédiaire */
function startDirect(url, kind, title){
  const u = "player.html?t=" + encodeURIComponent(title || "Lecture") + "&kind=film" +
    "&direct=" + encodeURIComponent(url) + "&directKind=" + (kind || "mp4");
  addHistory({title: title || "Lecture", kind: "film", type: "video", url: u, ref: "direct:" + title});
  location.href = u;
}
async function archivePlay(identifier){
  toast("Préparation de la lecture…");
  try {
    const meta = await api(`https://archive.org/metadata/${identifier}`);
    const files = (meta.files || []).filter(f => /\.(mp4|m3u8|webm|ogv)$/i.test(f.name));
    if (!files.length) { toast("Aucun flux vidéo disponible pour ce titre"); return; }
    const mp4 = files.filter(f => /\.mp4$/i.test(f.name)).sort((a, b) => (parseInt(a.size) || 0) - (parseInt(b.size) || 0));
    const hls = files.filter(f => /\.m3u8$/i.test(f.name));
    const f = mp4.length ? mp4[0] : (hls.length ? hls[0] : files[0]);
    const kind = /\.m3u8$/i.test(f.name) ? "hls" : "mp4";
    const url = `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`;
    startDirect(url, kind, meta.title || identifier);
  } catch(e) { toast("Impossible de préparer la lecture"); }
}

/* ─────────── Constantes ─────────── */
const CINEMETA = "https://v3-cinemeta.strem.io";
const CINEMETA2 = "https://cinemeta-catalogs.strem.io/top"; // repli direct (le 1er domaine redirige en 307)
async function cinemeta(path){
  try { return await api(CINEMETA + path); }
  catch(e) { return api(CINEMETA2 + path); }
}
/* Image à double source : principale → repli → placeholder */
function imgTag(src, alt, extra){
  if (!src) return "";
  return `<img loading="lazy" src="${esc(src)}"${alt ? ` data-alt="${esc(alt)}"` : ""} onerror="fxImgFail(this)"${extra || ""}>`;
}
function fxImgFail(img){
  if (img.dataset.alt) { const a = img.dataset.alt; img.dataset.alt = ""; img.src = a; }
  else img.remove();
}
/* Catalogue de base (base.js) : affiché instantanément à l'arrivée, sans attendre les API */
const BASE = (typeof window !== "undefined" && window.BASE) ? window.BASE : { films: [], series: [], anime: [], manga: [] };
const baseHero = () => BASE.films.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;
function baseMovieCard(m, ftype){
  return `<div class="card" data-ftype="${ftype || "movie"}" data-imdb="${m.imdb}" data-tmdb="">
    <div class="poster">${imgTag(m.poster, m.alt)}<div class="ph">${ic(ftype === "series" ? "tv" : "film")}</div>
      ${m.score ? `<span class="badge gray">IMDb ${m.score}</span>` : ""}
    </div>
    <div class="info"><div class="t">${esc(m.name)}</div><div class="s">${esc(m.year || "")}</div></div></div>`;
}
function heroHTML(m){
  return `<img class="bg" src="${esc(m.poster)}"${m.alt ? ` data-alt="${esc(m.alt)}"` : ""} onerror="fxImgFail(this)">
    <div class="ov"></div>
    <div class="c"><span class="tag">À la une</span>
      <div class="t">${esc(m.name)}</div>
      <div class="s">${esc(m.year || "")}${m.genres && m.genres.length ? " · " + esc(m.genres.slice(0, 3).join(" · ")) : ""}${m.score || m.imdbRating ? " · IMDb " + (m.score || m.imdbRating) : ""}</div>
    </div>
    <button onclick="movieDetail('${m.imdb}','${m.tmdb || ""}')">${ic("play")}Voir</button>`;
}
function setHeroContent(heroEl, m){
  heroEl.innerHTML = heroHTML(m);
  heroEl.onclick = (ev) => { if (!ev.target.closest("button")) movieDetail(m.imdb, m.tmdb || ""); };
}
/* Sur le web : MangaDex ne permet que son propre domaine (CORS) → passe par notre proxy.
   Dans l'app Android : direct. */
const MDX = (typeof App !== "undefined" && App.platform && App.platform() === "web")
  ? location.origin + "/proxy/mangadex"
  : "https://api.mangadex.org";
const IPTV = "https://iptv-org.github.io/iptv";
/* API publique d'Anime-Sama (sans auth, extraite de l'app Kibo) :
   /animes?action=searchByCategory&categories=... + /caching (planning).
   Pas de CORS → proxy sur le web. */
const ASAMA = (typeof App !== "undefined" && App.platform && App.platform() === "web")
  ? location.origin + "/proxy/animesama"
  : "https://europe-west1-anime-sama-1464a.cloudfunctions.net";
const RAILS = [["28","Action"],["35","Comédie"],["16","Animation"],["878","Sci-Fi"],["53","Thriller"],["10749","Romance"]];
const IPTV_CATS = [
  ["bj.m3u","Bénin",`${IPTV}/countries/bj.m3u`],
  ["fra.m3u","Francophone",`${IPTV}/languages/fra.m3u`],
  ["ng.m3u","Nigeria",`${IPTV}/countries/ng.m3u`],
  ["kids.m3u","Enfants",`${IPTV}/categories/kids.m3u`],
  ["movies.m3u","Cinéma",`${IPTV}/categories/movies.m3u`],
  ["classic.m3u","Feuilletons",`${IPTV}/categories/classic.m3u`],
  ["entertainment.m3u","Divertissement",`${IPTV}/categories/entertainment.m3u`],
];
let CURRENT_TAB = "films";

/* ─────────── Navigation ─────────── */
document.querySelectorAll(".tab").forEach(b => b.onclick = () => switchTab(b.dataset.tab));
function switchTab(t){
  CURRENT_TAB = t;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === t));
  document.getElementById("searchbox").classList.add("hidden");
  document.getElementById("searchBtn").classList.remove("hidden");
  renderTab(t);
}
document.getElementById("searchBtn").onclick = () => {
  document.getElementById("searchbox").classList.remove("hidden");
  document.getElementById("searchBtn").classList.add("hidden");
  document.getElementById("searchInput").focus();
};
document.getElementById("searchCancel").onclick = () => {
  document.getElementById("searchbox").classList.add("hidden");
  document.getElementById("searchBtn").classList.remove("hidden");
  renderTab(CURRENT_TAB);
};
document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch(e.target.value.trim());
});
document.getElementById("settingsBtn").onclick = renderSettings;
function doSearch(qs){
  if (!qs) return renderTab(CURRENT_TAB);
  if (CURRENT_TAB === "films")    renderFilmsSearch(qs);
  else if (CURRENT_TAB === "series") renderSeriesSearch(qs);
  else if (CURRENT_TAB === "anime")  renderAnimeSearch(qs);
  else if (CURRENT_TAB === "manga")  renderMangaSearch(qs);
  else if (CURRENT_TAB === "dl")     toast("Données : aucun moteur de recherche ici");
  else toast("TV Direct : utilise les catégories et le filtre ci-dessous");
}

/* ─────────── Modale / confirmation ─────────── */
function openModal(html){
  const b = document.getElementById("modalBody");
  mount(b, html);
  b.scrollTop = 0;
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal(){ document.getElementById("modal").classList.add("hidden"); }
document.getElementById("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
function askConfirm(msg, onYes){
  openModal(`<div class="section-title" style="margin-top:4px">Confirmer</div>
    <div class="desc" style="display:block;-webkit-line-clamp:unset">${esc(msg)}</div>
    <div class="btnrow">
      <button class="btn ghost" id="cfNo">Annuler</button>
      <button class="btn" id="cfYes" style="background:#E5484D">Confirmer</button>
    </div>`);
  document.getElementById("cfNo").onclick = closeModal;
  document.getElementById("cfYes").onclick = () => { closeModal(); onYes(); };
}

/* ─────────── Clics délégués sur les cartes ─────────── */
document.addEventListener("click", (ev) => {
  const c = ev.target.closest ? ev.target.closest(".card") : null;
  if (!c || !c.dataset.ftype) return;
  const t = c.dataset.ftype;
  if (t === "movie") movieDetail(c.dataset.imdb, c.dataset.tmdb);
  else if (t === "series") seriesDetail(c.dataset.imdb, c.dataset.tmdb);
  else if (t === "anime") animeDetail(c.dataset.mal);
  else if (t === "manga") mangaDetail(c.dataset.mid);
  else if (t === "asama") asamaPlay(c.dataset.title);
  else if (t === "fav") fAvOpen(c.dataset.ref, c.dataset.name, c.dataset.kind, c.dataset.tmdb);
  else if (t === "histp") startPlayback(c.dataset.title, c.dataset.kind || "film", c.dataset.imdb || "", c.dataset.tmdb || "",
    c.dataset.s === "" || c.dataset.s == null ? null : +c.dataset.s,
    c.dataset.e === "" || c.dataset.e == null ? null : +c.dataset.e);
  else if (t === "hist") location.href = c.dataset.url;
});
function fAvOpen(ref, name, kind, tmdb){
  if (kind === "movie") movieDetail(ref, tmdb);
  else if (kind === "series") seriesDetail(ref, tmdb);
  else if (kind === "anime") animeDetail(ref);
  else if (kind === "manga") mangaDetail(ref);
}
window.favToggle = function(ref, name, kind, tmdb, sub, poster){
  toggleFavorite({ref, name, kind, tmdb: tmdb || "", sub: sub || "", poster: poster || ""});
  renderTab(CURRENT_TAB);
};

/* ─────────── Rendu par onglet ─────────── */
function renderTab(t){
  if (t === "films") renderFilms();
  else if (t === "series") renderSeries();
  else if (t === "anime") renderAnime();
  else if (t === "manga") renderManga();
  else if (t === "tv") renderTV();
  else if (t === "dl") renderDL();
}

/* ═══════════════ FILMS ═══════════════ */
async function renderFilms(){
  setView('<div class="hero" id="hero"></div><div id="rails"></div>');
  const heroEl = document.getElementById("hero");
  const rails = document.getElementById("rails");
  // 1) Catalogue de base : affiché immédiatement (pas d'attente d'API)
  const bh = baseHero();
  if (bh) setHeroContent(heroEl, bh);
  // Continuer la lecture
  const hist = HISTORY.filter(h => (h.imdb || h.tmdb) && h.type === "video").slice(0, 10);
  const oldHist = HISTORY.filter(h => !h.imdb && !h.tmdb && h.type === "video" && h.url && h.url.indexOf("player.html") < 0).slice(0, 10);
  if (hist.length || oldHist.length) {
    rails.appendChild(el(`<div class="section-title">Continuer la lecture</div>`));
    rails.appendChild(el(`<div class="rail">` + hist.map(h => `
      <div class="card" data-ftype="histp" data-title="${esc(h.title)}" data-kind="${esc(h.kind||"film")}"
        data-imdb="${esc(h.imdb||"")}" data-tmdb="${esc(h.tmdb||"")}" data-s="${h.s==null?"":h.s}" data-e="${h.e==null?"":h.e}">
        <div class="poster"><div class="ph">${ic("play")}</div><span class="badge grad">${h.kind === "série" ? "Série" : h.kind === "anime" ? "Anime" : "Film"}</span></div>
        <div class="info"><div class="t">${esc(h.title)}</div><div class="s">${h.s != null ? "S" + h.s + "E" + h.e : ""} · ${new Date(h.ts).toLocaleDateString("fr-FR")}</div></div>
      </div>`).join("") + oldHist.map(h => `
      <div class="card" data-ftype="hist" data-url="${esc(h.url)}">
        <div class="poster"><div class="ph">${ic("play")}</div><span class="badge grad">Film</span></div>
        <div class="info"><div class="t">${esc(h.title)}</div><div class="s">${new Date(h.ts).toLocaleDateString("fr-FR")}</div></div>
      </div>`).join("") + `</div>`));
  }
  // Favoris
  if (FAVORITES.length) {
    rails.appendChild(el(`<div class="section-title">Favoris</div>`));
    rails.appendChild(el(`<div class="rail">${FAVORITES.slice(0, 15).map(f => {
      const ico = f.kind === "anime" ? "star" : f.kind === "manga" ? "book" : f.kind === "series" ? "tv" : "film";
      return `<div class="card" data-ftype="fav" data-ref="${esc(f.ref)}" data-name="${esc(f.name||"")}" data-kind="${esc(f.kind||"movie")}" data-tmdb="${esc(f.tmdb||"")}">
        <div class="poster">${imgTag(f.poster)}<div class="ph">${ic(ico)}</div></div>
        <div class="info"><div class="t">${esc(f.name)}</div><div class="s">${esc(f.sub || "")}</div></div></div>`;
    }).join("")}</div>`));
  }
  // 2) Populaires : sélection de base, toujours visible
  if (BASE.films.length) {
    rails.appendChild(el(`<div class="section-title">Populaires <small>sélection FlixPlay</small></div>`));
    rails.appendChild(el(`<div class="rail">${BASE.films.map(m => baseMovieCard(m, "movie")).join("")}</div>`));
  }
  // 3) Tendances en ligne (Cinemeta) — remplace le hero si le live arrive
  const trHead = el(`<div class="section-title">Tendances en ligne <small>Cinemeta</small></div>`);
  const trRail = el('<div class="rail"><div class="spin sm" style="margin:14px"></div></div>');
  rails.appendChild(trHead); rails.appendChild(trRail);
  cinemeta("/catalog/movie/top.json").then(d => {
    const metas = d.metas || [];
    if (!metas.length) {
      trRail.replaceWith(el('<div class="empty" style="padding:10px 0">Tendances en ligne indisponibles — la sélection « Populaires » reste consultable.</div>'));
      return;
    }
    const hero = metas.slice().sort((a,b) => (b.imdbRating||0) - (a.imdbRating||0))[0];
    if (hero && hero.imdb_id) setHeroContent(heroEl, Object.assign({}, hero, {imdb: hero.imdb_id, tmdb: hero.moviedb_id || "", score: hero.imdbRating}));
    trRail.innerHTML = metas.slice(0, 15).map(movieCard).join("");
  }).catch(() => {
    trRail.replaceWith(el('<div class="empty" style="padding:10px 0">Tendances en ligne indisponibles — la sélection « Populaires » reste consultable.</div>'));
  });
  for (const [gid, gname] of RAILS) genreRail(rails, gid, gname);
  rails.appendChild(el(`<div class="foot">Source : Cinemeta (Stremio) — 197 000+ titres<br>
    Recherche = tous les films (recherche par titre, lecture intégrée) + domaine public (MP4 légal)<br>
    Les flux proviennent de serveurs tiers (zone grise) — usage personnel</div>`));
}
function genreRail(container, gid, gname){
  const wrap = el("<div></div>");
  const head = el(`<div class="section-title">${gname}</div>`);
  const rail = el('<div class="rail"><div class="spin sm" style="margin:14px"></div></div>');
  const load = () => {
    rail.innerHTML = '<div class="spin sm" style="margin:14px"></div>';
    cinemeta(`/catalog/movie/genre:${gid}.json`).then(d => {
      const m = (d.metas || []).slice(0, 15);
      rail.innerHTML = m.length ? m.map(movieCard).join("")
        : '<div class="empty" style="padding:16px 0">Aucun titre dans ce genre.</div>';
    }).catch(() => { rail.replaceWith(errBox("Chargement impossible", load)); });
  };
  load();
  wrap.appendChild(head); wrap.appendChild(rail);
  container.appendChild(wrap);
}
function movieCard(m){
  return `<div class="card" data-ftype="movie" data-imdb="${m.imdb_id}" data-tmdb="${m.moviedb_id||""}">
    <div class="poster">${imgTag(m.poster)}<div class="ph">${ic("film")}</div>
      ${m.imdbRating ? `<span class="badge gray">IMDb ${m.imdbRating}</span>` : ""}
    </div>
    <div class="info"><div class="t">${esc(m.name)}</div><div class="s">${esc(m.year||"")}</div></div></div>`;
}
async function movieDetail(imdb, tmdb){
  openModal('<div class="spin"></div>');
  try {
    const d = (await cinemeta(`/meta/movie/${imdb}.json`)).meta;
    openModal(`
      <div class="m-head">
        <div class="m-cover"><div class="ph">${ic("film")}</div>${d.poster ? `<img src="${esc(d.poster)}" onerror="this.remove()">` : ""}</div>
        <div><div class="t">${esc(d.name)}</div>
          <div class="s">${esc(d.year||"")}${d.runtime ? " · " + d.runtime + " min" : ""}${d.imdbRating ? " · IMDb " + d.imdbRating : ""}<br>
          ${esc((d.cast||[]).slice(0,5).join(", "))}</div></div>
      </div>
      <div class="m-meta">${(d.genres||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}
        ${d.awards ? `<span class="tag gold">${esc(String(d.awards).slice(0,60))}</span>` : ""}</div>
      <div class="desc">${esc(d.description||"")}</div>
      <div class="btnrow">
        <button class="btn play" onclick="startPlayback('${q(d.name)}','film','${imdb}','${tmdb||""}',null,null)">${ic("play")}Lecture</button>
        <button class="btn ghost icon-only" title="Favori" onclick="favToggle('${imdb}','${q(d.name)}','movie','${tmdb||""}','${q(d.year||"")}','${q(d.poster||"")}')">${ic("heart")}</button>
        <button class="btn ghost icon-only" title="Partager" onclick="App.share('https://www.imdb.com/title/${imdb}/','${q(d.name)}')">${ic("share")}</button>
      </div>`);
  } catch(e) { openModal(errBox("Impossible de charger la fiche", () => movieDetail(imdb, tmdb))); }
}
function renderFilmsSearch(qs){
  setView('<div class="spin"></div><div id="srchBox"></div>');
  const box = document.getElementById("srchBox");
  // 1) Recherche tous les films par titre → ID IMDb (Wikidata, sans clé)
  api(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(qs)}&language=en&format=json&limit=10`)
    .then(s => {
      const qids = (s.search || []).map(r => r.id);
      if (!qids.length) return Promise.resolve(null);
      return api(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join("|")}&props=claims%7Clabels%7Cdescriptions&language=en&format=json`)
        .then(g => {
          const rows = [];
          for (const e of Object.values(g.entities || {})) {
            const c = e.claims || {};
            const imdb = c.P345 && c.P345[0] && c.P345[0].mainsnak && c.P345[0].mainsnak.datavalue && c.P345[0].mainsnak.datavalue.value;
            if (!imdb) continue;
            const year = c.P577 && c.P577[0] && c.P577[0].mainsnak && c.P577[0].mainsnak.datavalue ? String(c.P577[0].mainsnak.datavalue.value.time || "").slice(1, 5) : "";
            const name = (e.labels && e.labels.en && e.labels.en.value) || imdb;
            const desc = (e.descriptions && e.descriptions.en && e.descriptions.en.value) || "";
            rows.push({imdb, name, desc, year});
          }
          return rows.slice(0, 12);
        });
    })
    .then(rows => {
      rows = rows || [];
      box.innerHTML = `<div class="section-title">Films <small>recherche « ${esc(qs)} » · lecture intégrée</small></div>` +
        (rows.length
          ? `<div class="rows">${rows.map(x => `
            <div class="row" data-imdb="${x.imdb}">
              <img class="thumb" loading="lazy" src="https://images.metahub.space/poster/small/${x.imdb}/img" onerror="this.style.visibility='hidden'">
              <div class="grow"><div class="t">${esc(x.name)}</div><div class="s">${esc(x.year || "")}${x.desc ? " · " + esc(x.desc) : ""}</div></div>
              <button class="rowbtn" title="Lecture">${ic("play")}</button>
            </div>`).join("")}</div>`
          : '<div class="empty">Aucun film identifiable pour cette recherche.<br>Essaie le titre anglais (ex. « Interstellar »).</div>');
      box.querySelectorAll(".row[data-imdb]").forEach(r => { r.onclick = () => movieDetail(r.dataset.imdb, ""); });
      renderArchiveSection(qs, box);
    })
    .catch(() => {
      box.innerHTML = `<div class="section-title">Films <small>recherche « ${esc(qs)} »</small></div>
        <div class="empty">Recherche en ligne indisponible — résultats en domaine public ci-dessous.</div>`;
      renderArchiveSection(qs, box);
    });
}
function renderArchiveSection(qs, box){
  const sec = el('<div></div>');
  box.appendChild(sec);
  api(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(qs + " AND mediatype:movies")}&fl[]=identifier&fl[]=title&fl[]=year&rows=15&output=json`)
    .then(d => {
      const docs = d.docs || [];
      sec.innerHTML = `<div class="section-title" style="margin-top:18px">Domaine public <small>Internet Archive · MP4 légal, lecture directe</small></div>
        <div class="rows">${docs.map(x => `
          <div class="row" data-id="${esc(x.identifier)}">
            <img class="thumb" src="https://archive.org/services/img/${esc(x.identifier)}" onerror="this.style.visibility='hidden'">
            <div class="grow"><div class="t">${esc(x.title||x.identifier)}</div><div class="s">${esc(x.year||"")}</div></div>
            <button class="rowbtn" data-act="play" title="Lire">${ic("play")}</button>
            <button class="rowbtn" data-act="dl" title="Télécharger">${ic("dl")}</button>
            <button class="rowbtn" data-act="open" title="Voir">${ic("ext")}</button>
          </div>`).join("") || '<div class="empty">Aucun film en domaine public trouvé.<br>Essaie un titre ancien (avant 1964) ou un mot anglais.</div>'}</div>
        <div class="foot">Lire = flux MP4 direct (lecteur intégré) · Télécharger = MP4 légal · Voir = page archive.org</div>`;
      sec.querySelectorAll(".row[data-id]").forEach(r => {
        r.querySelector('[data-act="play"]').onclick = (ev) => { ev.stopPropagation(); archivePlay(r.dataset.id); };
        r.querySelector('[data-act="dl"]').onclick = (ev) => { ev.stopPropagation(); archiveDownload(r.dataset.id); };
        r.querySelector('[data-act="open"]').onclick = (ev) => { ev.stopPropagation(); App.openUrl("https://archive.org/details/" + r.dataset.id); };
        r.onclick = () => archivePlay(r.dataset.id);
      });
    })
    .catch(() => { sec.innerHTML = ""; });
}
function archiveDownload(identifier){
  addDownload({id: identifier, title: identifier, type: "film", icon: "film", path: ""});
  renderDL();
  api(`https://archive.org/metadata/${identifier}`).then(meta => {
    const files = (meta.files || []).filter(f => /\.(mp4|mkv|webm)$/i.test(f.name));
    if (!files.length) throw new Error("aucun fichier vidéo");
    const f = files.sort((a,b) => (parseInt(a.size)||0) - (parseInt(b.size)||0))[0];
    const url = `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`;
    toast("Téléchargement : " + f.name);
    App.download(url, f.name, identifier);
  }).catch(e => { markDownloadErr(identifier); toast("Échec : " + e.message); });
}

/* ═══════════════ SÉRIES ═══════════════ */
let serGenre = "";
function renderSeries(){
  const labels = ["Toutes","Action","Animation","Comédie","Drame","Sci-Fi","Thriller","Romance","Fantastique","Mystère"];
  setView(`<div class="chips">${["","28","16","35","18","878","53","10749","10765","964"]
      .map((v,i) => `<button class="chip ${serGenre===v?"on":""}" data-g="${v}">${labels[i]}</button>`).join("")}</div><div class="spin"></div>`);
  view().querySelectorAll("[data-g]").forEach(c => c.onclick = () => { serGenre = c.dataset.g; renderSeries(); });
  const box = view().querySelector(".spin");
  // Sélection de base : affichée immédiatement
  if (!serGenre && BASE.series.length) {
    const head = el(`<div class="section-title">Populaires <small>sélection FlixPlay</small></div>`);
    const grid = el(`<div class="grid">${BASE.series.map(m => baseMovieCard(m, "series")).join("")}</div>`);
    view().insertBefore(grid, box);
    view().insertBefore(head, box);
  }
  const cat = serGenre ? "genre:" + serGenre : "top";
  cinemeta(`/catalog/series/${cat}.json`).then(d => {
    const metas = d.metas || [];
    box.replaceWith(frag(`<div class="section-title">${serGenre ? "Séries" : "Toutes les séries"} <small>${metas.length} titres · Cinemeta</small></div>
      <div class="grid">${metas.map(movieCard).join("") || '<div class="empty">Aucune série.</div>'}</div>
      <div class="foot">Recherche en haut = TVmaze · Lecture intégrée automatique</div>`));
  }).catch(() => box.replaceWith(frag(`<div class="empty">Séries en ligne indisponibles — la sélection « Populaires » reste consultable.</div>
      <div class="foot">Recherche en haut = TVmaze · Lecture intégrée automatique</div>`)));
}
async function seriesDetail(imdb, tmdb){
  openModal('<div class="spin"></div>');
  try {
    const d = (await cinemeta(`/meta/series/${imdb}.json`)).meta;
    const vids = d.videos || [];
    const seasons = {};
    vids.forEach(v => { (seasons[v.season] = seasons[v.season] || []).push(v); });
    const sels = Object.keys(seasons).sort((a,b) => a-b);
    let epHTML = "";
    sels.forEach(s => {
      epHTML += `<div class="section-title" style="font-size:13px;margin-top:12px">Saison ${esc(s)}</div>`;
      epHTML += seasons[s].map(v => `
        <div class="ep" onclick="startPlayback('${q(d.name)}','série','${imdb}','${tmdb||""}',${v.season},${v.seasonNumber||1})">
          <div class="n">E${v.seasonNumber||""}</div>
          <div class="t">${esc(v.name || ("Episode " + (v.seasonNumber||"")))}</div>
          ${v.thumbnail ? `<img loading="lazy" src="${esc(v.thumbnail)}" onerror="this.remove()">` : ""}
        </div>`).join("");
    });
    openModal(`
      <div class="m-head">
        <div class="m-cover"><div class="ph">${ic("tv")}</div>${d.poster ? `<img src="${esc(d.poster)}" onerror="this.remove()">` : ""}</div>
        <div><div class="t">${esc(d.name)}</div>
          <div class="s">${esc(d.year||"")}${d.status ? " · " + esc(d.status) : ""}${d.imdbRating ? " · IMDb " + d.imdbRating : ""}<br>
          ${esc((d.cast||[]).slice(0,5).join(", "))}</div></div>
      </div>
      <div class="m-meta">${(d.genres||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>
      <div class="desc">${esc(d.description||"")}</div>
      <div class="btnrow" style="margin-bottom:6px">
        <button class="btn play" onclick="startPlayback('${q(d.name)}','série','${imdb}','${tmdb||""}',1,1)">${ic("play")}Lecture</button>
        <button class="btn ghost icon-only" title="Favori" onclick="favToggle('${imdb}','${q(d.name)}','series','${tmdb||""}','${q(d.year||"")}','${q(d.poster||"")}')">${ic("heart")}</button>
      </div>
      <div class="m-eps">${epHTML || '<div class="empty">Aucun episode indexé.</div>'}</div>`);
  } catch(e) { openModal(errBox("Impossible de charger la fiche", () => seriesDetail(imdb, tmdb))); }
}
function renderSeriesSearch(qs){
  setView('<div class="spin"></div>');
  api(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(qs)}`).then(d => {
    const shows = (d || []).slice(0, 15).map(x => x.show);
    setView(`<div class="section-title">Recherche « ${esc(qs)} » <small>TVmaze</small></div>
      <div class="rows">${shows.map(s => `
        <div class="row" data-tid="${s.id}">
          <img class="thumb" src="${esc((s.image&&s.image.original)||"")}" onerror="this.style.visibility='hidden'">
          <div class="grow"><div class="t">${esc(s.name)}</div>
          <div class="s">${esc(s.genre||"")}${s.premiered ? " · " + s.premiered.slice(0,4) : ""}${s.rating ? " · " + s.rating.average + "/10" : ""}</div></div>
        </div>`).join("") || '<div class="empty">Aucune série trouvée.</div>'}</div>`);
    view().querySelectorAll("[data-tid]").forEach(r => r.onclick = () => tvmazeShow(r.dataset.tid));
  }).catch(() => setView(errBox("Recherche impossible", () => renderSeriesSearch(qs))));
}
async function tvmazeShow(id){
  openModal('<div class="spin"></div>');
  try {
    const s = await api(`https://api.tvmaze.com/shows/${id}`);
    const imdb = (s.externals && s.externals.imdb) || "";
    openModal(`
      <div class="m-head">
        <div class="m-cover"><div class="ph">${ic("tv")}</div>${s.image ? `<img src="${esc(s.image.original)}" onerror="this.remove()">` : ""}</div>
        <div><div class="t">${esc(s.name)}</div>
          <div class="s">${esc(s.genre||"")}${s.premiered ? " · " + s.premiered.slice(0,4) : ""}${s.status ? " · " + esc(s.status) : ""}<br>
          ${esc(stripHtml(s.summary||"").slice(0,120))}</div></div>
      </div>
      <div class="btnrow">
        <button class="btn play" onclick="startPlayback('${q(s.name)}','série','${imdb}','',1,1)">${ic("play")}Lecture</button>
      </div>
      <div class="foot">${imdb ? "" : "Sans ID IMDb : lecture indisponible pour ce titre."}</div>`);
  } catch(e) { openModal(errBox("Impossible de charger la série", () => tvmazeShow(id))); }
}

/* ═══════════════ ANIME (AniList principal + Jikan en secours) ═══════════════ */
const ANI_MEDIA = `id idMal title{romaji native} coverImage{large} episodes averageScore format status`;
async function anilist(query, variables){
  return (await apiPost("https://graphql.anilist.co", {query, variables: variables || {}})).data;
}
function curSeasonAni(){
  const m = new Date().getMonth() + 1, y = new Date().getFullYear();
  if (m <= 3) return ["WINTER", "Hiver", y];
  if (m <= 6) return ["SPRING", "Printemps", y];
  if (m <= 9) return ["SUMMER", "Été", y];
  return ["FALL", "Automne", y];
}
async function animeListData(mode){
  try {
    if (mode === "top")
      return (await anilist(`Page(perPage:24){ media(type: ANIME, sort: POPULARITY_DESC){ ${ANI_MEDIA} } }`)).Page.media;
    const [season, , year] = curSeasonAni();
    return (await anilist(`Page(perPage:24){ media(type: ANIME, season: ${season}, seasonYear: ${year}, sort: POPULARITY_DESC){ ${ANI_MEDIA} } }`)).Page.media;
  } catch(e) {}
  // Secours : Jikan (MyAnimeList)
  const url = mode === "top" ? `${JIKAN}/top/anime?limit=24` : `${JIKAN}/anime?status=airing&limit=24`;
  const d = await api(url);
  return (d.data || []).map(a => ({
    id: a.mal_id, idMal: a.mal_id,
    title: {romaji: a.title, native: a.title_japanese},
    coverImage: {large: (a.images && a.images.jpg && a.images.jpg.large_image_url) || ""},
    episodes: a.episodes, averageScore: a.score ? a.score * 10 : null,
    format: a.type, status: a.status
  }));
}
let animeMode = "top";
async function renderAnime(){
  const [, seasonName, year] = curSeasonAni();
  setView(`<div class="chips">
    <button class="chip ${animeMode==="top"?"on":""}" data-m="top">Top</button>
    <button class="chip ${animeMode==="season"?"on":""}" data-m="season">${seasonName} ${year}</button>
  </div><div class="spin"></div>`);
  view().querySelectorAll("[data-m]").forEach(c => c.onclick = () => { animeMode = c.dataset.m; renderAnime(); });
  const box = view().querySelector(".spin");
  // Incontournables : affichés immédiatement
  if (BASE.anime.length) {
    const head = el(`<div class="section-title">Incontournables <small>sélection FlixPlay</small></div>`);
    const grid = el(`<div class="grid">${BASE.anime.map(animeCardBase).join("")}</div>`);
    view().insertBefore(grid, box);
    view().insertBefore(head, box);
  }
  let data = [];
  try { data = await animeListData(animeMode); } catch(e) {}
  data = data || [];
  box.replaceWith(data.length
    ? frag(`<div class="section-title">Anime en ligne <small>${data.length} titres · AniList / MyAnimeList</small></div>
         <div class="grid">${data.map(animeCard).join("")}</div>
         <div class="foot">Lecture intégrée automatique, ou lecteur officiel si nécessaire</div>`)
    : frag(`<div class="empty">Anime en ligne indisponibles — la sélection « Incontournables » reste consultable.</div>`));
  renderAsamaSection();
}
/* Catalogue francophone (API Anime-Sama, sans auth) + planning des sorties de la semaine */
function renderAsamaSection(){
  const head = el(`<div class="section-title" style="margin-top:18px">Anime-Sama <small>catalogue francophone · sans inscription</small></div>`);
  const rail = el('<div class="rail"><div class="spin sm" style="margin:14px"></div></div>');
  // L'API Anime-Sama renvoie 0 résultat avec 3 catégories ou plus dans l'URL :
  // 5 appels parallèles par catégorie, fusion dedupée en round-robin (diversité)
  const CATS = ["Action","Aventure","Drame","Romance","Comedie"];
  Promise.all(CATS.map(cat =>
    api(`${ASAMA}/animes?action=searchByCategory&categories=${encodeURIComponent(cat)}`)
      .then(d => (d.data && d.data.results) || []).catch(() => [])
  )).then(lists => {
    const seen = new Set();
    const res = [];
    let i = 0;
    while (res.length < 15) {
      let added = false;
      for (const l of lists) {
        const x = l[i];
        if (!x) continue;
        const k = (x.name || "").toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        res.push(x);
        added = true;
        if (res.length >= 15) break;
      }
      if (!added) break;
      i++;
    }
    rail.innerHTML = res.length ? res.map(x => `
      <div class="card" data-ftype="asama" data-title="${esc(x.name)}">
        <div class="poster">${imgTag(x.imageurl)}<div class="ph">${ic("star")}</div>
          ${x.vote ? `<span class="badge gray">${Math.round((x.vote || 0) / 1000)}k votes</span>` : ""}
        </div>
        <div class="info"><div class="t">${esc(x.name)}</div><div class="s">Touche pour lire</div></div></div>`).join("")
      : '<div class="empty" style="padding:10px 0">Catalogue indisponible.</div>';
  }).catch(() => { rail.replaceWith(el('<div class="empty" style="padding:10px 0">Catalogue Anime-Sama indisponible pour le moment.</div>')); });
  view().appendChild(head);
  view().appendChild(rail);
  const h2 = el(`<div class="section-title" style="margin-top:18px">Sorties de la semaine <small>Anime-Sama · VF / VOSTFR</small></div>`);
  const box2 = el('<div class="rows"><div class="spin sm" style="margin:14px"></div></div>');
  api(`${ASAMA}/caching`).then(d => {
    const days = d.data || {};
    const order = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const rows = [];
    order.forEach(day => { (days[day] || []).forEach(it => rows.push(Object.assign({ day }, it))); });
    box2.innerHTML = rows.length ? rows.slice(0, 35).map(x => `
      <div class="row" data-title="${esc(x.title)}">
        <div class="thumb" style="background:#14171F;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#8A919C">${ic("star")}</div>
        <div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${esc(x.day)}${x.hour && x.hour !== "?" ? " · " + esc(x.hour) : ""}</div></div>
        ${x.lang ? `<span class="badge ${x.lang === "VF" ? "grad" : "gray"}">${esc(x.lang)}</span>` : ""}
      </div>`).join("") : '<div class="empty">Aucune sortie listée cette semaine.</div>';
    box2.querySelectorAll(".row[data-title]").forEach(r => { r.onclick = () => asamaPlay(r.dataset.title); });
    view().appendChild(el(`<div class="foot">Touche sur un titre = lecture directe (serveur par titre) · Source : Anime-Sama (site tiers, zone grise)</div>`));
  }).catch(() => { box2.replaceWith(el('<div class="empty">Planning indisponible pour le moment.</div>')); });
  view().appendChild(h2);
  view().appendChild(box2);
}
function animeCardBase(a){
  return `<div class="card" data-ftype="anime" data-mal="${a.mal}">
    <div class="poster">${imgTag(a.poster, a.alt)}<div class="ph">${ic("star")}</div>
      ${a.score ? `<span class="badge gray">${a.score}/10</span>` : ""}
    </div>
    <div class="info"><div class="t">${esc(a.name)}</div>
      <div class="s">${a.ep ? a.ep + " ep" : ""}${String(a.status||"").toUpperCase() === "RELEASING" ? " · en cours" : ""}</div></div></div>`;
}
function animeCard(a){
  const img = (a.coverImage && a.coverImage.large) || "";
  const alt = img.indexOf("/large/") >= 0 ? img.replace("/large/", "/small/") : "";
  const score = a.averageScore ? Math.round(a.averageScore/10*10)/10 : null;
  return `<div class="card" data-ftype="anime" data-mal="${a.idMal}">
    <div class="poster">${imgTag(img, alt)}<div class="ph">${ic("star")}</div>
      ${score ? `<span class="badge gray">${score}/10</span>` : ""}
    </div>
    <div class="info"><div class="t">${esc(a.title.romaji)}</div>
      <div class="s">${a.episodes ? a.episodes + " ep" : (a.format || "")}${a.status === "RELEASING" || a.status === "releasing" ? " · en cours" : ""}</div></div></div>`;
}
function aniStatus(s){
  const u = String(s || "").toUpperCase();
  if (u === "RELEASING") return "En cours";
  if (u === "FINISHED" || u === "completed" || u === "COMPLETE") return "Termine";
  if (u === "NOT_YET_RELEASED" || u === "not_released") return "A venir";
  return esc(s || "");
}
async function animeDetail(mal){
  openModal('<div class="spin"></div>');
  try {
    const d = (await anilist(`Media(idMal: ${mal}){ ${ANI_MEDIA} description genres streamingEpisodes{ title url } }`)).Media;
    window.__aniTitle = d.title.romaji;
    window.__aniNative = d.title.native || "";
    window.__aniExt = (d.streamingEpisodes && d.streamingEpisodes[0] && d.streamingEpisodes[0].url)
      ? d.streamingEpisodes[0].url : "";
    aniModal(mal, {
      romaji: d.title.romaji, english: d.title.native || "",
      cover: (d.coverImage && d.coverImage.large) || "",
      score: d.averageScore ? (d.averageScore/10).toFixed(1) : null,
      episodes: d.episodes, status: aniStatus(d.status),
      genres: d.genres || [], desc: stripHtml(d.description || "")
    });
  } catch(e) {
    // Secours : Jikan
    try {
      const j = (await api(`${JIKAN}/anime/${mal}`)).data;
      window.__aniTitle = j.title;
      window.__aniNative = j.title_japanese || "";
      window.__aniExt = "";
      aniModal(mal, {
        romaji: j.title, english: j.title_english || "",
        cover: (j.images && j.images.jpg && j.images.jpg.large_image_url) || "",
        score: j.score ? j.score + "" : null,
        episodes: j.episodes, status: aniStatus(j.status),
        genres: (j.genres || []).map(g => g.name), desc: stripHtml(j.synopsis || "")
      });
    } catch(e2) { openModal(errBox("Impossible de charger la fiche", () => animeDetail(mal))); }
  }
}
function aniModal(mal, d){
  openModal(`
    <div class="m-head">
      <div class="m-cover"><div class="ph">${ic("star")}</div>${d.cover ? `<img src="${esc(d.cover)}" onerror="this.remove()">` : ""}</div>
      <div><div class="t">${esc(d.romaji)}</div>
        <div class="s">${d.score ? d.score + "/10 · " : ""}${d.episodes ? d.episodes + " episodes · " : ""}${d.status}<br>
        ${esc((d.genres||[]).slice(0,4).join(" · "))}</div></div>
    </div>
    <div class="m-meta">${(d.genres||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>
    <div class="desc">${esc(d.desc)}</div>
    <div class="btnrow">
      <button class="btn play" onclick="animeWatch(${mal})">${ic("play")}Lecture</button>
      <button class="btn ghost icon-only" title="Favori" onclick="favToggle('${mal}','${q(d.romaji)}','anime','','${q(d.status)}','${q(d.cover)}')">${ic("heart")}</button>
      <button class="btn ghost icon-only" title="MyAnimeList" onclick="App.openUrl('https://myanimelist.net/anime/${mal}')">${ic("ext")}</button>
    </div>`);
}
async function animeWatch(mal){
  openModal('<div class="spin"></div>');
  // 1) Si TVmaze connaît l'anime → ID IMDb (serveurs complémentaires)
  const t1 = window.__aniTitle || "", t2 = window.__aniNative || "";
  let imdb = "";
  try {
    let res = await api(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(t1)}`);
    if ((!res || !res.length) && t2) res = await api(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(t2)}`);
    const show = res && res[0] && res[0].show;
    if (show && show.externals && show.externals.imdb) imdb = show.externals.imdb;
  } catch(e) {}
  // 2) Lecteur par titre (VidSrc anime) — fonctionne sans aucun ID,
  //    avec le lecteur officiel AniList (Crunchyroll…) en secours
  const ext = window.__aniExt ? "&ext=" + encodeURIComponent(window.__aniExt) : "";
  const u = "player.html?t=" + encodeURIComponent(t1) + "&kind=anime" + (imdb ? "&imdb=" + imdb : "") + "&mal=" + (mal || "") + ext;
  addHistory({title: t1, kind: "anime", imdb, type: "video", url: u, ref: (imdb || "anime:" + t1)});
  closeModal();
  location.href = u;
}
function renderAnimeSearch(qs){
  setView('<div class="spin"></div>');
  (async () => {
    let data = [];
    try { data = (await anilist(`Page(perPage:24){ media(search: $q, type: ANIME){ ${ANI_MEDIA} } }`, {q: qs})).Page.media; }
    catch(e) {}
    if (!data.length) {
      try {
        const d = await api(`${JIKAN}/anime?q=${encodeURIComponent(qs)}&limit=24`);
        data = (d.data || []).map(a => ({
          id: a.mal_id, idMal: a.mal_id,
          title: {romaji: a.title},
          coverImage: {large: (a.images && a.images.jpg && a.images.jpg.large_image_url) || ""},
          episodes: a.episodes, averageScore: a.score ? a.score * 10 : null,
          format: a.type, status: a.status
        }));
      } catch(e) {}
    }
    setView(`<div class="section-title">Recherche « ${esc(qs)} » <small>AniList / MyAnimeList</small></div>
      <div class="grid">${data.map(animeCard).join("") || '<div class="empty">Aucun anime trouvé.</div>'}</div>`);
  })().catch(() => setView(errBox("Recherche impossible", () => renderAnimeSearch(qs))));
}

/* ═══════════════ MANGA (MangaDex v5 — à jour + langue) ═══════════════ */
let mangaMode = "latest";
let mangaLang = "all";
const LANG_CHIPS = [["all","Tous"],["fr","Français"],["en","English"],["ja","Japonais"]];
/* MangaDex feed : la LANGUE d'un chapitre est dans translatedLanguage —
   version est un numéro de version (int), pas une langue ! */
const mdLang = (c) => {
  const v = (c && c.attributes) ? c.attributes.translatedLanguage : "";
  return Array.isArray(v) ? (v[0] || "") : (v || "");
};
/* Nom d'un champ MangaDex multi-langues : {en:"…", fr:"…"} ou string */
const mdName = (v) => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.en || Object.values(v)[0] || "";
  return "";
};
/* Tag MangaDex : {id, type:"tag", attributes:{name:{en:"…"}}} */
const mdTagName = (t) => {
  if (!t) return "";
  if (typeof t === "string") return t;
  if (t.attributes && t.attributes.name != null) return mdName(t.attributes.name);
  if (t.name != null) return mdName(t.name);
  return "";
};
function mdTitle(a){
  const t = a.title;
  if (typeof t === "string") return t;
  return (t && (t.en || Object.values(t)[0])) || "(sans titre)";
}
function mangaCard(m){
  const a = m.attributes;
  return `<div class="card" data-ftype="manga" data-mid="${m.id}">
    <div class="poster"><div class="ph">${ic("book")}</div>
      <span class="badge grad">À jour</span>
    </div>
    <div class="info"><div class="t">${esc(mdTitle(a))}</div>
      <div class="s">${a.status === "ongoing" ? "En cours" : (a.status || "")} · ${relTime(a.updatedAt)}</div></div></div>`;
}
function renderManga(){
  setView(`<div class="chips">
    <button class="chip ${mangaMode==="latest"?"on":""}" data-m="latest">À jour (dernières sorties)</button>
    <button class="chip ${mangaMode==="trending"?"on":""}" data-m="trending">Tendances</button>
  </div><div class="spin"></div>`);
  view().querySelectorAll("[data-m]").forEach(c => c.onclick = () => { mangaMode = c.dataset.m; renderManga(); });
  const box = view().querySelector(".spin");
  // Incontournables : affichés immédiatement (couvertures incluses)
  if (BASE.manga.length) {
    const head = el(`<div class="section-title">Incontournables <small>sélection FlixPlay</small></div>`);
    const grid = el(`<div class="grid">${BASE.manga.map(m => mangaCardBase(m)).join("")}</div>`);
    view().insertBefore(grid, box);
    view().insertBefore(head, box);
  }
  const url = mangaMode === "latest"
    ? `${MDX}/manga?limit=24&order[latestUploadedChapter]=desc&hasAvailableChapters=true`
    : `${MDX}/manga?limit=24&order[followedCount]=desc&hasAvailableChapters=true`;
  api(url).then(d => {
    box.replaceWith(el(`<div class="section-title">Manga en ligne <small>${(d.data||[]).length} titres · MangaDex, mises à jour en continu</small></div>`));
    loadMangaCovers(d.data || []);
  }).catch(() => box.replaceWith(el(`<div class="empty">Manga en ligne indisponibles — la sélection « Incontournables » reste consultable.</div>`)));
}
function mangaCardBase(m){
  return `<div class="card" data-ftype="manga" data-mid="${m.mid}">
    <div class="poster">${imgTag(m.poster, m.alt)}<div class="ph">${ic("book")}</div>
      <span class="badge grad">Sélection</span>
    </div>
    <div class="info"><div class="t">${esc(m.name)}</div></div></div>`;
}
async function loadMangaCovers(items){
  const holder = el(`<div class="grid">${items.map(mangaCard).join("") || '<div class="empty">Aucun manga.</div>'}</div>`);
  view().appendChild(holder);
  view().appendChild(el(`<div class="foot">Chapitres filtrables par langue (Français / English / Japonais)<br>Lecture intégrée · Téléchargement de chapitre disponible</div>`));
  const queue = items.slice(0, 24).map(m => {
    const cov = (m.relationships || []).find(r => r.type === "cover_art");
    return { id: m.id, cov: cov ? cov.id : null };
  });
  let i = 0;
  async function worker(){
    while (i < queue.length) {
      const it = queue[i++];
      if (!it.cov) continue;
      try {
        const c = await api(`${MDX}/cover/${it.cov}`);
        const fn = c.data.attributes.fileName;
        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = `https://uploads.mangadex.org/covers/${it.id}/${fn}`;
        img.onerror = () => img.remove();
        const card = holder.querySelector(`.card[data-mid="${it.id}"] .poster`);
        if (card) card.prepend(img);
      } catch(e) {}
    }
  }
  for (let w = 0; w < 6; w++) worker();
}
function mangaChaptersList(chs, lang, pref){
  let l = chs;
  if (lang !== "all") {
    const f = l.filter(c => mdLang(c).toLowerCase() === lang);
    if (f.length) l = f;
  }
  if (pref !== "all") {
    l = l.slice().sort((a,b) =>
      (mdLang(b).toLowerCase() === pref ? 1 : 0) -
      (mdLang(a).toLowerCase() === pref ? 1 : 0));
  }
  return l;
}
async function mangaDetail(mid){
  openModal('<div class="spin"></div>');
  try {
    const [m, feed] = await Promise.all([
      api(`${MDX}/manga/${mid}`),
      api(`${MDX}/manga/${mid}/feed?limit=200`),
    ]);
    const a = m.data.attributes;
    const cov = (m.data.relationships || []).find(r => r.type === "cover_art");
    let coverImg = "";
    if (cov) {
      try {
        const c = await api(`${MDX}/cover/${cov.id}`);
        coverImg = `https://uploads.mangadex.org/covers/${mid}/${c.data.attributes.fileName}`;
      } catch(e) {}
    }
    const chs = (feed.data || []).slice().sort((x,y) =>
      (y.attributes.publishAt || "").localeCompare(x.attributes.publishAt || ""));
    window.__mangaTitle = mdTitle(a);
    mangaLang = (SETTINGS.lang && SETTINGS.lang !== "all") ? SETTINGS.lang : "all";
    window.__mangaCtx = {mid, a, coverImg, chs};
    mangaRender(mid, chs, a, coverImg);
  } catch(e) { openModal(errBox("Impossible de charger le manga", () => mangaDetail(mid))); }
}
function mangaRender(mid, chs, a, coverImg){
  const pref = (SETTINGS.lang && SETTINGS.lang !== "all") ? SETTINGS.lang : "all";
  const viewChs = mangaChaptersList(chs, mangaLang, pref);
  window.__mangaChs = viewChs;
  const isFav = FAVORITES.some(f => f.ref === mid && f.kind === "manga");
  const filtered = mangaLang !== "all" && viewChs.length !== chs.length;
  const emptyFilter = mangaLang !== "all" && chs.filter(c => mdLang(c).toLowerCase() === mangaLang).length === 0;
  openModal(`
    <div class="m-head">
      <div class="m-cover"><div class="ph">${ic("book")}</div>${coverImg ? `<img src="${esc(coverImg)}" onerror="this.remove()">` : ""}</div>
      <div><div class="t">${esc(mdTitle(a))}</div>
        <div class="s">${a.status === "ongoing" ? "En cours" : (a.status || "")}
        ${a.lastVolume ? " · Vol. " + a.lastVolume : ""}
        ${a.lastChapter ? " · Ch. " + a.lastChapter : ""}<br>
        ${a.availableTranslatedLanguages ? "Trad. : " + esc(a.availableTranslatedLanguages.join(", ")) : ""}</div></div>
    </div>
    <div class="m-meta">${(a.tags||[]).map(mdTagName).filter(Boolean).slice(0,6).map(n=>`<span class="tag">${esc(n)}</span>`).join("")}</div>
    <div class="desc">${esc(stripHtml((typeof a.description === "string" ? a.description : (a.description && a.description.en)) || ""))}</div>
    <div class="btnrow" style="margin-bottom:8px">
      <button class="btn play" onclick="openChapter(0)">${ic("book")}Lecture</button>
      <button class="btn ghost icon-only" title="Favori" onclick="favToggle('${mid}','${q(mdTitle(a))}','manga','','${q(a.status||"")}','')">${ic("heart")}</button>
    </div>
    <div class="chips" style="padding-top:0">${LANG_CHIPS.map(([v,n]) =>
      `<button class="chip ${mangaLang===v?"on":""}" data-lang="${v}">${n}</button>`).join("")}</div>
    ${emptyFilter ? '<div class="empty" style="padding:10px 4px">Aucun chapitre dans cette langue — tous les chapitres sont affichés ci-dessous.</div>' : ""}
    <div class="section-title" style="font-size:14px">Chapitres <small>${viewChs.length}${filtered ? " (filtrés)" : ""} — plus récents d'abord</small></div>
    <div class="m-eps">${viewChs.slice(0, 80).map((c, idx) => {
      const ca = c.attributes;
      const ver = mdLang(c).toUpperCase();
      return `<div class="ep chap" onclick="openChapter(${idx})">
        <div class="n">Ch.${ca.chapter != null ? ca.chapter : (ca.volume != null ? "V"+ca.volume : "?")}</div>
        <div class="t">${esc(ca.title || "")}</div>
        ${ver ? `<span class="badge-mini ${ver === (SETTINGS.lang||"").toUpperCase() ? "badge-mini-on" : ""}">${ver}</span>` : ""}
        <div class="d">${relTime(ca.publishAt)}</div>
      </div>`;
    }).join("") || '<div class="empty">Aucun chapitre.</div>'}</div>`);
  document.querySelectorAll("#modalBody [data-lang]").forEach(b => b.onclick = () => {
    mangaLang = b.dataset.lang;
    const ctx = window.__mangaCtx;
    mangaRender(mid, ctx.chs, ctx.a, ctx.coverImg);
  });
}
let __readerCh = -1, __readerData = null;
async function openChapter(idx){
  const ch = (window.__mangaChs || [])[idx];
  if (!ch) return;
  __readerCh = idx;
  closeModal();
  document.getElementById("reader").classList.remove("hidden");
  const ca = ch.attributes;
  document.getElementById("readerTitle").textContent = (window.__mangaTitle || "") + " — Ch." + (ca.chapter != null ? ca.chapter : "");
  const pages = document.getElementById("readerPages");
  pages.innerHTML = '<div class="spin" style="border-color:#333;border-top-color:var(--green)"></div>';
  pages.scrollTop = 0;
  try {
    const at = await api(`${MDX}/at-home/server/${ch.id}`);
    __readerData = {base: at.baseUrl, hash: at.chapter.hash, data: at.chapter.data, chId: ch.id};
    pages.innerHTML = at.chapter.data.map(p =>
      `<img loading="lazy" src="${esc(at.baseUrl)}/data/${esc(at.chapter.hash)}/${esc(p)}" onerror="this.outerHTML='<div class=errbox><div class=s>Page indisponible</div></div>'">`).join("");
  } catch(e) {
    pages.innerHTML = `<div class="errbox" style="color:#ccc"><div class="t">Impossible de charger le chapitre</div><div class="s">${esc(e.body || e.status)}</div></div>`;
    __readerData = null;
  }
  updateReaderNav();
}
function updateReaderNav(){
  const chs = window.__mangaChs || [];
  document.getElementById("readerPrev").style.visibility = __readerCh > 0 ? "visible" : "hidden";
  document.getElementById("readerNext").style.visibility = __readerCh < chs.length - 1 ? "visible" : "hidden";
}
document.getElementById("readerBack").onclick = () => document.getElementById("reader").classList.add("hidden");
document.getElementById("readerPrev").onclick = () => { if (__readerCh > 0) openChapter(--__readerCh); };
document.getElementById("readerNext").onclick = () => { openChapter(++__readerCh); };
document.getElementById("readerShare").onclick = () => App.share(location.href, document.getElementById("readerTitle").textContent);
document.getElementById("readerDl").onclick = () => {
  if (!__readerData) { toast("Chargement du chapitre en cours…"); return; }
  const urls = __readerData.data.map(p => `${__readerData.base}/data/${__readerData.hash}/${p}`);
  const folder = document.getElementById("readerTitle").textContent.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  addDownload({id: "mdx_" + __readerData.chId, title: folder, type: "manga", icon: "book", path: folder, pages: urls.length});
  renderDL();
  toast("Téléchargement de " + urls.length + " pages…");
  App.downloadMany(JSON.stringify(urls), folder, "mdx_" + __readerData.chId);
};
function renderMangaSearch(qs){
  setView('<div class="spin"></div>');
  api(`${MDX}/manga?limit=24&title=${encodeURIComponent(qs)}&order[relevance]=desc`).then(d => {
    setView(`<div class="section-title">Recherche « ${esc(qs)} » <small>MangaDex</small></div>`);
    loadMangaCovers(d.data || []);
  }).catch(() => setView(errBox("Recherche impossible", () => renderMangaSearch(qs))));
}

/* ═══════════════ TV DIRECT (iptv-org) ═══════════════ */
function renderTV(){
  setView(`<div class="chips">${IPTV_CATS.map(([f,n]) =>
    `<button class="chip ${SETTINGS.tvcat===f?"on":""}" data-f="${f}">${n}</button>`).join("")}</div><div class="spin"></div>`);
  view().querySelectorAll("[data-f]").forEach(c => c.onclick = () => {
    SETTINGS.tvcat = c.dataset.f; saveSettings();
    loadTVPlaylist(iptvUrl(c.dataset.f), c.dataset.f);
  });
  const def = IPTV_CATS.find(c => c[0] === SETTINGS.tvcat) || IPTV_CATS[0];
  loadTVPlaylist(def[2], def[0]);
}
function iptvUrl(f){ return IPTV_CATS.find(c => c[0] === f)[2]; }
function parseM3U(txt){
  const lines = String(txt).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith("#EXTINF")) {
      const name = (l.split(",").pop() || "").trim();
      const logo = (l.match(/tvg-logo="([^"]*)"/) || [])[1] || "";
      const group = (l.match(/group-title="([^"]*)"/) || [])[1] || "";
      const url = (lines[i+1] || "").trim();
      if (url && !url.startsWith("#")) out.push({name, logo, group, url});
    }
  }
  return out;
}
function loadTVPlaylist(url, fileKey){
  const box = el('<div class="spin"></div>');
  view().appendChild(box);
  const label = (IPTV_CATS.find(c => c[0] === fileKey) || ["","?"])[1];
  api(url).then(txt => {
    box.remove();
    const chans = parseM3U(typeof txt === "string" ? txt : JSON.stringify(txt));
    const search = el(`<div class="m3u-search"><input id="tvFilter" placeholder="Filtrer les chaînes (${chans.length})" autocomplete="off"></div>`);
    const holder = el('<div id="tvlist"></div>');
    view().appendChild(search);
    view().appendChild(holder);
    const doFilter = (qq) => {
      const f = (qq || "").toLowerCase();
      holder.innerHTML = `<div class="section-title">${label} <small>${f ? "" : chans.length + " chaînes · iptv-org"}</small></div>
        <div class="rows">${chans.filter(c => !f || (c.name + " " + c.group).toLowerCase().includes(f)).slice(0, 300).map(c => `
          <div class="row" data-u="${esc(c.url)}" data-n="${esc(c.name)}" data-l="${esc(c.logo)}">
            <img class="thumb" src="${esc(c.logo)}" onerror="this.style.visibility='hidden'">
            <div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${esc(c.group)}</div></div>
            <div class="rowbtn" style="color:var(--green)">${ic("play")}</div>
          </div>`).join("") || '<div class="empty">Aucune chaîne ne correspond au filtre.</div>'}</div>
        <div class="foot">Listes communautaires iptv-org — qualité variable selon le moment</div>`;
      holder.querySelectorAll(".row[data-u]").forEach(r => r.onclick = () =>
        location.href = "tv.html?u=" + encodeURIComponent(r.dataset.u) + "&n=" + encodeURIComponent(r.dataset.n) + "&l=" + encodeURIComponent(r.dataset.l || ""));
    };
    doFilter("");
    search.querySelector("input").oninput = e => doFilter(e.target.value);
  }).catch(() => { box.remove(); view().appendChild(errBox("Impossible de charger la playlist", () => loadTVPlaylist(url, fileKey))); });
}

/* ═══════════════ DONNÉES : transfert Wi-Fi + téléchargements + historique ═══════════════ */
function renderDL(){
  setView(`<div class="section-title" style="margin-top:2px">Transfert Wi-Fi <small>même réseau</small></div>
    <div id="trf"></div>
    <div class="section-title">Téléchargements</div>
    <div id="dlList"></div>
    <div class="section-title">Historique de lecture <small id="histCount"></small></div>
    <div id="histList"></div>`);
  document.getElementById("histCount").textContent = HISTORY.length;
  renderTrf();
  document.getElementById("dlList").innerHTML = DOWNLOADS.length ? DOWNLOADS.map(d => {
    const st = d.status === "ok" ? '<span class="st ok">Terminé</span>'
      : d.status === "err" ? '<span class="st err">Échec</span>'
      : '<span class="st run">En cours</span>';
    return `<div class="dl-item">
      <div class="ico">${ic(d.icon || "film")}</div>
      <div class="grow"><div class="t">${esc(d.title)}</div>
        <div class="s">${d.pages ? d.pages + " pages · " : ""}${esc(d.path || "…")}</div></div>
      ${st}</div>`;
  }).join("") : '<div class="empty">Aucun téléchargement.<br>Dans la recherche Films (domaine public), le lecteur manga (chapitre) ou via Transfert Wi-Fi.</div>';
  document.getElementById("histList").innerHTML = HISTORY.length ? HISTORY.slice(0, 20).map(h => `
    <div class="dl-item" ${h.imdb || h.tmdb
      ? `data-ftype-hp="1" data-title="${esc(h.title)}" data-kind="${esc(h.kind||"film")}" data-imdb="${esc(h.imdb||"")}" data-tmdb="${esc(h.tmdb||"")}" data-s="${h.s==null?"":h.s}" data-e="${h.e==null?"":h.e}"`
      : `data-url="${esc(h.url||"")}"`}>
      <div class="ico" style="background:var(--grad2)">${ic("play")}</div>
      <div class="grow"><div class="t">${esc(h.title)}</div>
        <div class="s">${h.kind === "série" ? "Série" : h.kind === "anime" ? "Anime" : "Film"} · ${new Date(h.ts).toLocaleString("fr-FR")}</div></div>
      <span class="st ok">Rejouer</span>
    </div>`).join("") : '<div class="empty">Aucun historique pour le moment.</div>';
  document.querySelectorAll("#histList .dl-item[data-ftype-hp]").forEach(r => r.onclick = () =>
    startPlayback(r.dataset.title, r.dataset.kind || "film", r.dataset.imdb || "", r.dataset.tmdb || "",
      r.dataset.s === "" || r.dataset.s == null ? null : +r.dataset.s,
      r.dataset.e === "" || r.dataset.e == null ? null : +r.dataset.e));
  document.querySelectorAll("#histList .dl-item[data-url]").forEach(r => r.onclick = () => location.href = r.dataset.url);
}
function trfState(){
  try { return JSON.parse(App.getShareState()); } catch(e){ return {running:false,url:"",files:[]}; }
}
function renderTrf(){
  const elT = document.getElementById("trf");
  if (!elT) return;
  if (App.platform && App.platform() === "web") {
    elT.innerHTML = '<div class="trf-intro">Le transfert Wi-Fi entre téléphones est réservé à l\'app Android.<br>' +
      'Sur le site, les téléchargements directs sont disponibles : recherche Films (domaine public, MP4) et chapitres manga (fichier ZIP).</div>';
    return;
  }
  const st = trfState();
  const fileRows = st.files.length ? st.files.map(f =>
    `<div class="trf-file"><span class="t">${esc(f.name)}</span><span class="s">${Math.max(1, f.size/1024|0)} Ko</span>
     <button class="trf-x" data-f="${esc(f.name)}">Retirer</button></div>`).join("") : "";
  const remote = `<div class="trf-remote"><input id="trfUrl" placeholder="Lien reçu : http://192.168.x.x:8123" autocomplete="off"><button class="chip" id="trfOpen">Ouvrir</button></div><div id="trfRemote"></div>`;
  elT.innerHTML = st.running
    ? `<div class="trf-urlbox"><span class="trf-url">${esc(st.url)}</span><button class="chip" id="trfCopy">Copier</button></div>
       <div class="trf-note">Sur l'autre téléphone (même Wi-Fi) : ouvre ce lien dans n'importe quel navigateur — ou colle-le dans « Ouvrir » ci-dessous pour télécharger dans FlixPlay.</div>
       ${fileRows}
       <div class="btnrow" style="margin-top:10px"><button class="btn ghost" id="trfStop">Arrêter le partage</button></div>
       ${remote}`
    : `<div class="trf-intro">Transfère des fichiers entre deux téléphones sur le même Wi-Fi : choisis des fichiers ici, un lien s'affiche, et l'autre téléphone télécharge directement depuis ce lien (aucune app à installer de son côté).</div>
       <div class="btnrow" style="margin-top:10px"><button class="btn green" id="trfPick">${ic("dl")}Choisir des fichiers à partager</button></div>
       ${remote}`;
  const bind = (id, fn) => { const b = elT.querySelector(id); if (b) b.onclick = fn; };
  bind("#trfStop", () => App.stopShareServer());
  bind("#trfPick", () => App.pickShareFiles());
  bind("#trfCopy", () => copyText(st.url));
  bind("#trfOpen", trfOpen);
  elT.querySelectorAll(".trf-x").forEach(b => b.onclick = () => App.removeShareFile(b.dataset.f));
}
window.__shareState = function(j){ try { JSON.parse(j); } catch(e){ return; } renderTrf(); };
function copyText(t){
  try {
    const ta = document.createElement("textarea");
    ta.value = t; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
    toast("Lien copié");
  } catch(e) { toast(t); }
}
async function trfOpen(){
  let base = (document.getElementById("trfUrl").value || "").trim().replace(/\/+$/, "");
  if (!base) { toast("Colle le lien du partage d'abord"); return; }
  if (!/^https?:\/\//i.test(base)) base = "http://" + base;
  const box = document.getElementById("trfRemote");
  box.innerHTML = '<div class="spin sm"></div>';
  try {
    const d = await api(base + "/api/list.json");
    const files = d.files || [];
    if (!files.length) { box.innerHTML = '<div class="empty" style="padding:14px">Aucun fichier sur ce partage pour l\'instant.</div>'; return; }
    box.innerHTML = `<div class="rows">${files.map(f => `
      <div class="row trf-row" data-n="${esc(f.name)}">
        <div class="rowbtn" style="width:40px;height:40px">${ic("film")}</div>
        <div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${(f.size/1024/1024).toFixed(2)} Mo</div></div>
        <div class="rowbtn" style="color:var(--green)">${ic("dl")}</div>
      </div>`).join("")}</div>`;
    box.querySelectorAll(".trf-row").forEach(r => r.onclick = () => {
      addDownload({id: "trf_" + r.dataset.n, title: r.dataset.n, type: "transfert", icon: "dl", path: ""});
      renderDL();
      App.download(base + "/" + encodeURIComponent(r.dataset.n), r.dataset.n, "trf_" + r.dataset.n);
    });
  } catch(e) {
    box.innerHTML = '<div class="empty" style="padding:14px">Impossible de joindre ce partage.<br>Les deux téléphones doivent être sur le même Wi-Fi.</div>';
  }
}

/* ═══════════════ RÉGLAGES ═══════════════ */
function renderSettings(){
  openModal(`
    <div class="section-title" style="margin-top:4px">Réglages</div>
    <div class="set-item"><div class="grow"><div class="t">Langue du contenu</div><div class="s">Chapitres de manga : filtrés et triés dans cette langue. Les sous-titres des vidéos sont fournis par les serveurs de lecture.</div></div>
      <select id="setLang"><option value="fr" ${SETTINGS.lang==="fr"?"selected":""}>Français</option><option value="en" ${SETTINGS.lang==="en"?"selected":""}>English</option><option value="all" ${SETTINGS.lang==="all"?"selected":""}>Tous</option></select></div>
    <div class="set-item"><div class="grow"><div class="t">Catégorie TV par défaut</div><div class="s">Ouverte à l'entrée dans TV Direct</div></div>
      <select id="setTv">${IPTV_CATS.map(c=>`<option value="${c[0]}" ${c[0]===SETTINGS.tvcat?"selected":""}>${c[1]}</option>`).join("")}</select></div>
    <div class="set-item"><div class="grow"><div class="t">Dossier de téléchargement</div><div class="s" id="dlDir">…</div></div></div>
    <div class="set-item"><div class="grow"><div class="t">Historique de lecture</div><div class="s">${HISTORY.length} entrées conservées</div></div>
      <button class="rowbtn danger" id="setClearHist">Vider</button></div>
    <div class="set-item"><div class="grow"><div class="t">Cache de l'application</div><div class="s">Favoris, réglages, historique et téléchargements</div></div>
      <button class="rowbtn danger" id="setClearCache">Vider</button></div>
    <div class="set-item"><div class="grow"><div class="t">À propos</div>
      <div class="s">FlixPlay v4 · Lecture intégrée : le serveur qui répond en premier est choisi automatiquement.<br>
      Transfert Wi-Fi : partage de fichiers entre téléphones (même réseau).<br>
      APIs gratuites : Cinemeta, TVmaze, AniList, MyAnimeList, MangaDex, iptv-org, Internet Archive.<br>
      Police Mulish (Google Fonts) · Style inspiré de MovieBox.<br>
      Les flux de lecture intégrés proviennent de serveurs tiers (zone grise) — usage personnel.</div></div></div>`);
  document.getElementById("setLang").onchange = e => { SETTINGS.lang = e.target.value; saveSettings(); toast("Langue : " + e.target.value); };
  document.getElementById("setTv").onchange = e => { SETTINGS.tvcat = e.target.value; saveSettings(); toast("TV par défaut : " + e.target.value); };
  try { document.getElementById("dlDir").textContent = App.getDownloadDir(); } catch(e) {}
  document.getElementById("setClearHist").onclick = () => {
    HISTORY = []; store.set("history", HISTORY);
    openModal('<div class="empty">Historique vidé.<br><br><button class="btn ghost" onclick="closeModal()">Fermer</button></div>');
  };
  document.getElementById("setClearCache").onclick = () => askConfirm(
    "Vider favoris, réglages, historique et téléchargements ? Cette action est définitive.", () => {
      FAVORITES = []; HISTORY = []; DOWNLOADS = [];
      SETTINGS = {tvcat:"bj.m3u", lang:"fr"};
      store.set("favorites", []); store.set("history", []); store.set("downloads", []); store.set("settings", SETTINGS);
      toast("Cache vidé");
      renderTab(CURRENT_TAB);
    });
}

/* ─────────── Démarrage ─────────── */
switchTab("films");
