/* ═══════════════ FlixPlay Web — serveur statique + proxy MangaDex (0 dépendance) ═══════════════ */
"use strict";
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = path.join(__dirname, "public");
const MDX_HOST = "api.mangadex.org";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  let u;
  try { u = new URL(req.url, "http://localhost"); } catch (e) { res.writeHead(400); res.end("bad request"); return; }
  const p = decodeURIComponent(u.pathname);

  /* ── Proxy MangaDex (CORS ouvert) ── */
  if (p === "/proxy/mangadex" || p.startsWith("/proxy/mangadex/")) {
    const sub = p.slice("/proxy/mangadex".length) || "/";
    const target = new URL("https://" + MDX_HOST + (sub.startsWith("/") ? sub : "/" + sub) + (u.search || ""));
    const headers = Object.assign({}, req.headers, { host: MDX_HOST });
    delete headers.origin; delete headers.referer; delete headers.cookie;
    delete headers["access-control-request-method"]; delete headers["access-control-request-headers"];
    const opts = { hostname: target.hostname, port: 443, path: target.pathname + target.search, method: req.method, headers };
    const up = https.request(opts, (upRes) => {
      const outHeaders = Object.assign({}, upRes.headers, {
        "access-control-allow-origin": "*",
        "access-control-expose-headers": "*",
        "cache-control": "max-age=15, public",
      });
      res.writeHead(upRes.statusCode || 502, outHeaders);
      upRes.pipe(res);
    });
    up.setTimeout(30000, () => { up.destroy(new Error("timeout")); });
    up.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "access-control-allow-origin": "*", "content-type": "application/json" });
      res.end(JSON.stringify({ error: "proxy_error" }));
    });
    if (req.method === "POST" || req.method === "PUT") req.pipe(up);
    else up.end();
    return;
  }

  /* ── Préflight CORS (au cas où) ── */
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
      "access-control-allow-headers": "*",
      "access-control-max-age": "3600",
    });
    res.end();
    return;
  }

  /* ── Santé ── */
  if (p === "/healthz") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, app: "flixplay-web" })); return; }

  /* ── Sonde de serveurs de lecture : même origine (pas de CORS), ne renvoie que le statut HTTP.
         Les sites d'embed ne renvoient pas d'en-tête CORS → une fetch directe du navigateur est
         impossible ; la sonde passe donc par le serveur. ── */
  if (p === "/probe" || p.startsWith("/probe/")) {
    const target = p.slice("/probe".length).replace(/^\/+/, "");
    let tu = null;
    try { tu = new URL(target); } catch (e) {}
    const reply = (status) => {
      if (res.writableEnded) return;
      if (!res.headersSent) res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
      res.end(JSON.stringify({ status }));
    };
    if (!tu || (tu.protocol !== "https:" && tu.protocol !== "http:")) { reply(0); return; }
    const PROBE_HEADERS = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", "Accept": "*/*", "Accept-Language": "fr,en" };
    (function doGet(u, hops) {
      const mod = u.protocol === "https:" ? https : http;
      const r = mod.get(u, { headers: PROBE_HEADERS }, (up) => {
        const code = up.statusCode || 0;
        if (code >= 300 && code < 400 && up.headers.location && hops > 0) {
          up.destroy();
          let nx = null;
          try { nx = new URL(up.headers.location, u); } catch (e) {}
          if (nx) doGet(nx, hops - 1); else reply(0);
        } else {
          up.destroy();
          reply(code);
        }
      });
      r.setTimeout(9000, () => { r.destroy(new Error("probe timeout")); });
      r.on("error", () => reply(0));
      r.on("timeout", () => reply(0));
    })(tu, 3);
    return;
  }

  /* ── Fichiers statiques ── */
  let sp = p;
  if (sp === "/") sp = "/index.html";
  const fp = path.normalize(path.join(ROOT, sp));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) {
      // repli SPA léger : toute route inconnue → index.html
      const idx = path.join(ROOT, "index.html");
      fs.stat(idx, (e2) => {
        if (!e2) {
          res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
          fs.createReadStream(idx).pipe(res);
        } else { res.writeHead(404); res.end("not found"); }
      });
      return;
    }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-cache" : "max-age=3600",
    });
    fs.createReadStream(fp).pipe(res);
  });
});

server.listen(PORT, () => console.log("flixplay-web up on " + PORT));
