const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { hashFile } = require("@oakwood/shared");
const { requireAdmin } = require("../auth/session");
const { DATA_DIR, loadManifest, saveManifest, upsertFile, removeFile } = require("../manifestStore");
const { appendChangelogEntry } = require("../feedStore");

const FILES_DIR = path.join(DATA_DIR, "files");
const upload = multer({ dest: path.join(DATA_DIR, "tmp-uploads") });

const router = express.Router();
router.use(requireAdmin);

// Rejects absolute paths and ".." so an upload can't escape FILES_DIR.
function resolveSafePath(relPath) {
  const normalized = path.normalize(relPath).replace(/^([/\\])+/, "");
  if (normalized.split(/[/\\]/).includes("..")) throw new Error("invalid path");
  return path.join(FILES_DIR, normalized);
}

function publicUrl(relPath) {
  const base = process.env.PUBLIC_BASE_URL || "";
  return `${base}/files/${relPath}`;
}

router.get("/", (req, res) => {
  const manifest = loadManifest();
  res.json({
    modpackVersion: manifest.modpackVersion,
    minecraftVersion: manifest.minecraftVersion,
    neoforgeVersion: manifest.neoforgeVersion,
    files: manifest.files,
  });
});

router.post("/upload", upload.array("files"), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "no files" });
  const folder = (req.body.folder || "mods").replace(/^([/\\])+|([/\\])+$/g, "");

  const manifest = loadManifest();
  const added = [];
  try {
    for (const file of req.files) {
      const relPath = `${folder}/${file.originalname}`;
      const destPath = resolveSafePath(relPath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.renameSync(file.path, destPath);

      const hash = await hashFile(destPath);
      const size = fs.statSync(destPath).size;
      const normalizedPath = relPath.replace(/\\/g, "/");
      const isUpdate = manifest.files.some((f) => f.path === normalizedPath);

      upsertFile(manifest, { path: normalizedPath, hash, size, url: publicUrl(normalizedPath) });
      appendChangelogEntry({ type: isUpdate ? "update" : "add", path: normalizedPath });
      added.push(normalizedPath);
    }
    manifest.modpackVersion += 1;
    saveManifest(manifest);
    res.json({ ok: true, added, modpackVersion: manifest.modpackVersion, files: manifest.files });
  } catch (err) {
    for (const file of req.files) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
    res.status(400).json({ error: err.message });
  }
});

router.post("/delete", express.json(), (req, res) => {
  const relPath = req.body.path;
  if (!relPath) return res.status(400).json({ error: "missing path" });

  let targetPath;
  try {
    targetPath = resolveSafePath(relPath);
  } catch {
    return res.status(400).json({ error: "invalid path" });
  }
  if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);

  const normalizedPath = relPath.replace(/\\/g, "/");
  const manifest = loadManifest();
  removeFile(manifest, normalizedPath);
  manifest.modpackVersion += 1;
  saveManifest(manifest);
  appendChangelogEntry({ type: "remove", path: normalizedPath });

  res.json({ ok: true, modpackVersion: manifest.modpackVersion, files: manifest.files });
});

module.exports = router;
