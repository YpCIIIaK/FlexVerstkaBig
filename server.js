const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const env = {};
try {
  fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch (e) {}

const PORT = Number(env.PORT || 8080);
const API_URL = (env.API_URL || "https://dev.api.ktng.bybyte.dev/site").replace(/\/$/, "");
const SITE_KEY = env.SITE_KEY || "";
const MAPS_KEY = env.YANDEX_MAPS_KEY || "";

if (!SITE_KEY) console.warn("SITE_KEY is empty: fill it in .env");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const proxy = (req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const headers = { Accept: "application/json", "X-Site-Key": SITE_KEY };
    ["content-type", "authorization", "accept-language"].forEach((h) => {
      if (req.headers[h]) headers[h] = req.headers[h];
    });
    try {
      const r = await fetch(API_URL + req.url, {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
      });
      const body = Buffer.from(await r.arrayBuffer());
      console.log(req.method, req.url, r.status);
      res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/json" });
      res.end(body);
    } catch (e) {
      console.error(req.method, req.url, e.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ detail: "API недоступно", code: "PROXY_ERROR" }));
    }
  });
};

const serveFile = (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || path.basename(file).startsWith(".")) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      return fs.createReadStream(path.join(ROOT, "404.html")).pipe(res);
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(file.endsWith(".html") ? data.toString().replaceAll("YANDEX_MAPS_KEY", MAPS_KEY) : data);
  });
};

http
  .createServer((req, res) => {
    if (req.url.startsWith("/api/")) return proxy(req, res);
    serveFile(req, res);
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}/login.html -> ${API_URL}`));
