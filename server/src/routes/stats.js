const express = require("express");
const { requireAdmin } = require("../auth/session");
const { data } = require("../db/database");
const { loadManifest } = require("../manifestStore");

const router = express.Router();
router.use(requireAdmin);

router.get("/", (req, res) => {
  const manifest = loadManifest();
  const files = manifest.files || [];
  const mods = files.filter((f) => f.path.startsWith("mods/"));
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  res.json({
    mods: mods.length,
    totalFiles: files.length,
    totalBytes,
    modpackVersion: manifest.modpackVersion || 0,
    admins: data.admins.length,
    manifestRequests: data.stats.manifestRequests || 0,
    fileDownloads: data.stats.fileDownloads || 0,
  });
});

module.exports = router;
