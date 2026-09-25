/* ═══════════════ FlixPlay — bridge navigateur (remplace le pont natif Android) ═══════════════ */
(function () {
  "use strict";
  // Si le pont natif existe déjà (app Android), on ne fait rien
  if (typeof window.App === "object" && window.App && window.App.platform) return;

  function done(id, path) { try { window.__dlDone && window.__dlDone(id, path); } catch (e) {} }
  function cleanName(n) { return String(n || "fichier").replace(/[\\/:*?"<>|]/g, "_").slice(0, 120); }
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
  }
  function toastWeb(m) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.remove("hidden");
    clearTimeout(t.__to);
    t.__to = setTimeout(function () { t.classList.add("hidden"); }, 2800);
  }

  window.App = {
    /* GET (sans CORS : tout passe ici) */
    fetch: function (url, cb) {
      try {
        fetch(url, { method: "GET" })
          .then(function (r) { return r.text().then(function (t) { window[cb]({ status: r.status, body: t }); }); })
          .catch(function (e) { window[cb]({ status: 0, body: "FETCH_ERROR: " + e }); });
      } catch (e) { window[cb]({ status: 0, body: "FETCH_ERROR: " + e }); }
    },
    /* POST JSON (GraphQL AniList) */
    fetchPost: function (url, body, cb) {
      try {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "*/*" }, body: body })
          .then(function (r) { return r.text().then(function (t) { window[cb]({ status: r.status, body: t }); }); })
          .catch(function (e) { window[cb]({ status: 0, body: "FETCH_ERROR: " + e }); });
      } catch (e) { window[cb]({ status: 0, body: "FETCH_ERROR: " + e }); }
    },
    /* Téléchargement fichier unique (blob → dossier Téléchargements du navigateur) */
    download: function (url, filename, dlId) {
      const name = cleanName(filename);
      toastWeb("Téléchargement : " + name + "…");
      fetch(url).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      }).then(function (b) {
        saveBlob(b, name);
        done(dlId, name);
        toastWeb("Téléchargé : " + name);
      }).catch(function () {
        done((dlId || "") + ":err", "err");
        toastWeb("Échec du téléchargement");
      });
    },
    /* Téléchargement multi-fichiers → ZIP (chapitre manga) */
    downloadMany: function (jsonUrls, folder, dlId) {
      const name = cleanName(folder) + ".zip";
      toastWeb("Préparation du chapitre…");
      let urls;
      try { urls = JSON.parse(jsonUrls); } catch (e) { done((dlId || "") + ":err", "err"); return; }
      if (typeof JSZip === "undefined") { done((dlId || "") + ":err", "err"); toastWeb("ZIP indisponible"); return; }
      Promise.all(urls.map(function (u) {
        return fetch(u.replace(" ", "%20")).then(function (r) {
          if (!r.ok) throw new Error("page");
          return r.blob();
        });
      })).then(function (blobs) {
        const zip = new JSZip();
        blobs.forEach(function (b, i) { zip.file(String(i + 1).padStart(4, "0") + ".jpg", b); });
        zip.generateAsync({ type: "blob" }).then(function (zb) {
          saveBlob(zb, name);
          done(dlId, name);
          toastWeb("Chapitre téléchargé : " + blobs.length + " pages");
        });
      }).catch(function () {
        done((dlId || "") + ":err", "err");
        toastWeb("Échec du téléchargement du chapitre");
      });
    },
    getDownloadDir: function () { return "Dossier « Téléchargements » de votre navigateur"; },
    openUrl: function (u) { window.open(u, "_blank", "noopener"); },
    share: function (url, title) {
      if (navigator.share) {
        navigator.share({ title: title || "", url: url }).catch(function () {});
      } else {
        try {
          const ta = document.createElement("textarea");
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          toastWeb("Lien copié");
        } catch (e) { window.open(url, "_blank", "noopener"); }
      }
    },
    toast: function (m) { toastWeb(m); },
    platform: function () { return "web"; },
    /* Transfert Wi-Fi : indisponible sur le web (fonction app Android) */
    getShareState: function () { return JSON.stringify({ running: false, url: "", files: [] }); },
    startShareServer: function () {},
    stopShareServer: function () {},
    removeShareFile: function () {},
    pickShareFiles: function () { toastWeb("Transfert Wi-Fi : disponible dans l'app Android"); }
  };
})();
