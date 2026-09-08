const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { hashFile } = require("@oakwood/shared");
const { requireUploadToken } = require("../auth");
const { DATA_DIR, loadManifest, saveManifest, upsertFile, removeFile } = require("../manifestStore");
const { appendChangelogEntry, appendAnnouncement } = require("../feedStore");

const FILES_DIR = path.join(DATA_DIR, "files");
const UPDATES_DIR = path.join(DATA_DIR, "updates");
const upload = multer({ dest: path.join(DATA_DIR, "tmp-uploads") });

const router = express.Router();
router.use(requireUploadToken);

// Token-protected launcher release upload (used by the one-click Publier.bat).
router.post("/release", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "no files" });
  fs.mkdirSync(UPDATES_DIR, { recursive: true });
  const saved = [];
  for (const file of req.files) {
    const name = path.basename(file.originalname);
    fs.renameSync(file.path, path.join(UPDATES_DIR, name));
    saved.push(name);
  }
  res.json({ ok: true, saved });
});

// Rejects absolute paths and ".." segments so an upload can't write outside FILES_DIR.
function resolveSafePath(relPath) {
  const normalized = path.normalize(relPath).replace(/^([/\\])+/, "");
  if (normalized.split(/[/\\]/).includes("..")) {
    throw new Error("invalid path");
  }
  return path.join(FILES_DIR, normalized);
}

router.post("/upload", upload.single("file"), async (req, res) => {
  const relPath = req.query.path;
  if (!relPath || !req.file) {
    return res.status(400).json({ error: "missing path or file" });
  }

  let destPath;
  try {
    destPath = resolveSafePath(relPath);
  } catch {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "invalid path" });
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.renameSync(req.file.path, destPath);

  const hash = await hashFile(destPath);
  const size = fs.statSync(destPath).size;
  const normalizedPath = relPath.replace(/\\/g, "/");

  const manifest = loadManifest();
  const isUpdate = manifest.files.some((f) => f.path === normalizedPath);
  upsertFile(manifest, {
    path: normalizedPath,
    hash,
    size,
    url: `${process.env.PUBLIC_BASE_URL}/files/${normalizedPath}`,
  });
  manifest.modpackVersion += 1;
  saveManifest(manifest);
  appendChangelogEntry({ type: isUpdate ? "update" : "add", path: normalizedPath, modpackVersion: manifest.modpackVersion });

  res.json({ ok: true, path: normalizedPath, hash, size, modpackVersion: manifest.modpackVersion });
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
  appendChangelogEntry({ type: "remove", path: normalizedPath, modpackVersion: manifest.modpackVersion });

  res.json({ ok: true, modpackVersion: manifest.modpackVersion });
});

router.post("/announcement", express.json(), (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: "missing title or body" });
  appendAnnouncement({ title, body });
  res.json({ ok: true });
});

module.exports = { router, FILES_DIR };
