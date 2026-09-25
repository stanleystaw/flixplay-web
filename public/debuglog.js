/* ═══════════════ FlixPlay — Panneau de diagnostic (logs de toutes les actions) ═══════════════ */
(function () {
  "use strict";
  if (window.FXLOG) return;
  var entries = [];
  var MAX = 300;

  function ts() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  function push(type, msg) {
    entries.push({ t: ts(), type: type, msg: String(msg).slice(0, 240) });
    if (entries.length > MAX) entries.splice(0, entries.length - MAX);
    paint();
  }

  var COLORS = { CLIQ: "#2166E5", API: "#1DD171", "API-KO": "#E5484D", ERREUR: "#E5484D", NAV: "#F5A623", INFO: "#6E7781" };

  function paint() {
    var list = document.getElementById("fxlogList");
    if (!list) return;
    list.innerHTML = entries.map(function (e) {
      return '<div class="fxlog-line"><span class="fxlog-t">' + e.t + '</span>' +
        '<span class="fxlog-k" style="color:' + (COLORS[e.type] || "#6E7781") + '">' + e.type + '</span> ' +
        e.msg.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</div>";
    }).join("");
    list.scrollTop = list.scrollHeight;
  }

  function buildUI() {
    var st = document.createElement("style");
    st.textContent =
      "#fxlog{position:fixed;right:10px;bottom:10px;z-index:9999;width:340px;max-width:92vw;font-family:ui-monospace,Menlo,Consolas,monospace;background:#10131A;color:#DDE3EC;border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.5);overflow:hidden;font-size:11px}" +
      "#fxlogMin{position:fixed;right:10px;bottom:10px;z-index:9999;width:auto;display:none}" +
      "#fxlog header{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#171B24;font-weight:700;font-size:11px;letter-spacing:.4px}" +
      "#fxlog header .sp{flex:1}" +
      "#fxlog button{background:#222836;color:#DDE3EC;border:0;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;font-family:inherit}" +
      "#fxlog button:hover{background:#2C3444}" +
      "#fxlogList{max-height:34vh;overflow-y:auto;padding:6px 10px;line-height:1.55}" +
      ".fxlog-line{white-space:pre-wrap;word-break:break-all}" +
      ".fxlog-t{color:#6E7781;margin-right:6px}" +
      ".fxlog-k{font-weight:700;margin-right:6px}";
    document.head.appendChild(st);

    var box = document.createElement("div");
    box.id = "fxlog";
    box.innerHTML = '<header>FXLOG <span class="sp"></span><button id="fxlogCopy">Copier</button><button id="fxlogClear">Vider</button><button id="fxlogMin">—</button></header><div id="fxlogList"></div>';
    document.body.appendChild(box);

    var stored = "1";
    try { stored = localStorage.getItem("fxlog_open") || "1"; } catch (e) {}
    var minBtn = document.getElementById("fxlogMin");
    if (stored === "0") minBox();

    function minBox() {
      box.style.display = "none";
      box.id = "fxlog";
      box.className = "fxlog-mini";
      box.innerHTML = '<button id="fxlogOpen" style="background:#2166E5;color:#fff;border:0;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45)">LOG</button>';
      box.id = "fxlogMin";
      document.getElementById("fxlogOpen").onclick = function () {
        try { localStorage.setItem("fxlog_open", "1"); } catch (e) {}
        box.remove();
        buildUI();
      };
    }
    minBtn.onclick = function () {
      try { localStorage.setItem("fxlog_open", "0"); } catch (e) {}
      minBox();
    };
    document.getElementById("fxlogClear").onclick = function () { entries.length = 0; paint(); };
    document.getElementById("fxlogCopy").onclick = function () {
      var txt = entries.map(function (e) { return "[" + e.t + "] " + e.type + " " + e.msg; }).join("\n");
      function done() {
        var b = document.getElementById("fxlogCopy");
        b.textContent = "Copié !";
        setTimeout(function () { b.textContent = "Copier"; }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallback(); });
      else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        ta.remove();
      }
    };
  }

  /* ── Suivi des CLICS ─────────────────────────────────────────── */
  function describe(e) {
    var t = e.target;
    if (!t || !t.closest) return "clic";
    var el, s;
    if ((el = t.closest(".tab[data-tab]"))) return "Onglet : " + el.textContent.trim();
    if ((el = t.closest("input#searchInput"))) return "Recherche : " + (el.value || "(vide)");
    if ((el = t.closest(".card")) && (s = el.querySelector(".t"))) {
      var kind = el.getAttribute("data-ftype") || (el.getAttribute("data-mid") ? "manga" : el.getAttribute("data-mal") ? "anime" : "film/serie");
      return "Carte [" + kind + "] : " + s.textContent.trim().slice(0, 60);
    }
    if ((el = t.closest(".row")) && (s = el.querySelector(".t"))) return "Ligne : " + s.textContent.trim().slice(0, 60);
    if ((el = t.closest(".ep.chap"))) return "Chapitre : " + (el.querySelector(".n") || {}).textContent;
    if ((el = t.closest("button")) && el.textContent.trim()) return "Bouton : " + el.textContent.trim().slice(0, 60);
    if ((el = t.closest("[data-title]"))) return "Titre : " + (el.dataset.title || "").slice(0, 60);
    if (t.id) return "Élément #" + t.id;
    if (t.className && typeof t.className === "string" && t.className.trim()) return t.tagName.toLowerCase() + "." + t.className.trim().split(/\s+/)[0];
    return t.tagName ? t.tagName.toLowerCase() : "clic";
  }
  document.addEventListener("click", function (e) {
    try { push("CLIQ", describe(e)); } catch (err) {}
  }, true);
  var si = document.getElementById("searchInput");
  if (si) si.addEventListener("keydown", function (e) {
    if (e.key === "Enter") push("CLIQ", "Recherche lancée : " + (si.value || "(vide)"));
  });

  /* ── Suivi des appels API (fetch natif + App.fetch) ──────────── */
  var of = window.fetch;
  if (of) window.fetch = function (u, o) {
    var t0 = Date.now();
    var uu = String(u).replace(/https?:\/\/[^\/]+\//, "");
    var p = of.apply(this, arguments);
    p.then(function (r) {
      push(r.status >= 400 ? "API-KO" : "API", uu.slice(0, 110) + " → " + r.status + " (" + (Date.now() - t0) + " ms)");
      return r;
    }, function (err) {
      push("API-KO", uu.slice(0, 110) + " → réseau : " + err.message);
      throw err;
    });
    return p;
  };
  if (window.App && window.App.fetch) {
    var ofA = window.App.fetch;
    /* Protocole pont : cb est une CHAÎNE (clé), le handler vit dans window[cb].
       On enveloppe le handler pour lire le statut, sans casser le protocole. */
    window.App.fetch = function (url, cb) {
      var t0 = Date.now();
      var uu = String(url).replace(/https?:\/\/[^\/]+\//, "");
      var origFn = window[cb];
      if (typeof origFn === "function") {
        window[cb] = function (resp) {
          try { push(resp.status >= 400 ? "API-KO" : "API", uu.slice(0, 110) + " → " + resp.status + " (" + (Date.now() - t0) + " ms)"); } catch (e) {}
          return origFn(resp);
        };
      }
      ofA.call(window.App, url, cb);
    };
  }

  /* ── Erreurs JS ──────────────────────────────────────────────── */
  window.addEventListener("error", function (e) { push("ERREUR", (e.message || "erreur") + (e.filename ? " (" + String(e.filename).split("/").pop() + ":" + e.lineno + ")" : "")); });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    push("ERREUR", "Promise : " + (r && r.message ? r.message : (r && r.status ? "HTTP " + r.status : String(r).slice(0, 120))));
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildUI);
  else buildUI();

  window.FXLOG = { log: push, clear: function () { entries.length = 0; paint(); }, entries: entries };
  push("INFO", "FXLOG démarré — " + location.pathname + (location.search || ""));
})();
