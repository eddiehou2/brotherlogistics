"use strict";

const { configJsBody } = require("../lib/resolve-api-key");

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(configJsBody());
};
