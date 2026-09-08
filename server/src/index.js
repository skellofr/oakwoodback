const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const fs = require("fs");
const cookieParser = require("cookie-parser");
require("./db/database");
const { loadManifest, DATA_DIR } = require("./manifestStore");
const { getFeed } = require("./feedStore");
const { router: adminRouter, FILES_DIR } = require("./routes/admin");
const authRouter = require("./routes/auth");
const modsRouter = require("./routes/mods");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cookieParser());

fs.mkdirSync(FILES_DIR, { recursive: true });

app.get("/manifest.json", (req, res) => {
  res.json(loadManifest());
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

app.use("/files", express.static(FILES_DIR));
app.use("/updates", express.static(path.join(DATA_DIR, "updates")));

// Admin API + web panel.
app.use("/api/auth", authRouter);
app.use("/api/mods", modsRouter);
app.use("/admin", adminRouter);
app.use("/panel", express.static(path.join(__dirname, "panel")));
app.get("/", (req, res) => res.redirect("/panel"));

app.listen(PORT, () => {
  console.log(`Oakwood ATM10 server listening on port ${PORT}`);
});
