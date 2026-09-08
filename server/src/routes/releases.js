const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAdmin } = require("../auth/session");
const { DATA_DIR } = require("../db/database");

const UPDATES_DIR = path.join(DATA_DIR, "updates");
fs.mkdirSync(UPDATES_DIR, { recursive: true });
const upload = multer({ dest: path.join(DATA_DIR, "tmp-uploads") });

const router = express.Router();
router.use(requireAdmin);

function listFiles() {
  if (!fs.existsSync(UPDATES_DIR)) return [];
  return fs.readdirSync(UPDATES_DIR).map((name) => ({
    name,
    size: fs.statSync(path.join(UPDATES_DIR, name)).size,
  }));
}

// Reads the published version straight from electron-updater's latest.yml.
function currentRelease() {
  const ymlPath = path.join(UPDATES_DIR, "latest.yml");
  if (!fs.existsSync(ymlPath)) return null;
  const content = fs.readFileSync(ymlPath, "utf8");
  const version = (content.match(/^version:\s*(.+)$/m) || [])[1]?.trim();
  const file = (content.match(/^path:\s*(.+)$/m) || [])[1]?.trim();
  return { version, file };
}

router.get("/", (req, res) => {
  res.json({ current: currentRelease(), files: listFiles() });
});

router.post("/upload", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "no files" });
  const saved = [];
  for (const file of req.files) {
    const name = path.basename(file.originalname);
    fs.renameSync(file.path, path.join(UPDATES_DIR, name));
    saved.push(name);
  }
  res.json({ ok: true, saved, current: currentRelease(), files: listFiles() });
});

router.post("/delete", express.json(), (req, res) => {
  const name = path.basename(req.body.name || "");
  const dest = path.join(UPDATES_DIR, name);
  if (name && fs.existsSync(dest)) fs.unlinkSync(dest);
  res.json({ ok: true, current: currentRelease(), files: listFiles() });
});

module.exports = router;
