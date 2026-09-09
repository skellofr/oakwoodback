const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const { bumpStat } = require("./db/database");
const { loadManifest, DATA_DIR } = require("./manifestStore");
const { getFeed } = require("./feedStore");
const { router: adminRouter, FILES_DIR } = require("./routes/admin");
const authRouter = require("./routes/auth");
const modsRouter = require("./routes/mods");
const releasesRouter = require("./routes/releases");
const newsRouter = require("./routes/news");
const { router: configRouter, effectiveConfig } = require("./routes/config");
const statsRouter = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cookieParser());

fs.mkdirSync(FILES_DIR, { recursive: true });

app.get("/manifest.json", (req, res) => {
  bumpStat("manifestRequests");
  res.json(loadManifest());
});

app.get("/config.json", (req, res) => {
  res.json(effectiveConfig());
});

app.get("/version.json", (req, res) => {
  const versionPath = path.join(DATA_DIR, "version.json");
  if (!fs.existsSync(versionPath)) {
    return res.json({ version: "0.0.0", url: null });
  }
  res.json(JSON.parse(fs.readFileSync(versionPath, "utf8")));
});

app.get("/feed.json", (req, res) => {
  res.json(getFeed());
});

app.use(
  "/files",
  (req, res, next) => {
    if (req.method === "GET") bumpStat("fileDownloads");
    next();
  },
  express.static(FILES_DIR)
);
app.use("/updates", express.static(path.join(DATA_DIR, "updates")));

// Admin API + web panel.
app.use("/api/auth", authRouter);
app.use("/api/mods", modsRouter);
app.use("/api/releases", releasesRouter);
app.use("/api/news", newsRouter);
app.use("/api/config", configRouter);
app.use("/api/stats", statsRouter);
app.use("/admin", adminRouter);
app.use("/panel", express.static(path.join(__dirname, "panel")));
app.get("/", (req, res) => res.redirect("/panel"));

app.listen(PORT, () => {
  console.log(`Oakwood ATM10 server listening on port ${PORT}`);
});
