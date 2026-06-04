"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "js", "config.js");

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

function configJsBody() {
  const key = resolveApiKey();
  return `window.GOOGLE_MAPS_API_KEY = ${JSON.stringify(key)};\n`;
}

module.exports = { resolveApiKey, configJsBody };
