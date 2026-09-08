const fs = require("fs");
const path = require("path");
const { MINECRAFT_VERSION, NEOFORGE_VERSION } = require("@oakwood/shared");

const DATA_DIR = path.join(__dirname, "..", "data");
const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {
      modpackVersion: 0,
      minecraftVersion: MINECRAFT_VERSION,
      neoforgeVersion: NEOFORGE_VERSION,
      files: [],
    };
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

// Write to a temp file then rename, so a reader never sees a half-written manifest.
function saveManifest(manifest) {
  const tmpPath = `${MANIFEST_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmpPath, MANIFEST_PATH);
}

function upsertFile(manifest, entry) {
  const idx = manifest.files.findIndex((f) => f.path === entry.path);
  if (idx === -1) manifest.files.push(entry);
  else manifest.files[idx] = entry;
}

function removeFile(manifest, filePath) {
  manifest.files = manifest.files.filter((f) => f.path !== filePath);
}

module.exports = { DATA_DIR, MANIFEST_PATH, loadManifest, saveManifest, upsertFile, removeFile };
