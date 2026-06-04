"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, "js", "config.js");

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function readKeyFromConfigFile() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, "utf8");
    const match = content.match(/window\.GOOGLE_MAPS_API_KEY\s*=\s*["']([^"']*)["']/);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

function resolveApiKey() {
  const fromFile = readKeyFromConfigFile();
  if (fromFile) {
    return fromFile;
  }
  return process.env.GOOGLE_MAPS_API_KEY || "";
}

function serveConfigJs(res) {
  const key = resolveApiKey();
  const body = `window.GOOGLE_MAPS_API_KEY = ${JSON.stringify(key)};\n`;
  res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
  res.end(body);
}

function serveStatic(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/js/config.js") {
    serveConfigJs(res);
    return;
  }

  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const filePath = path.resolve(ROOT, "." + pathname);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  serveStatic(filePath, res);
}).listen(PORT, () => {
  console.log(`Brother Logistics site running at http://localhost:${PORT}`);
});
