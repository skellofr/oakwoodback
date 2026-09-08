const fs = require("fs");
const path = require("path");
const { hashFile } = require("@oakwood/shared");
const { downloadFile } = require("./download");

// Downloads every manifest file whose local copy is missing or hash-mismatched,
// then prunes obsolete .jar files from the mods folder only (safe deletion).
async function syncInstanceFiles(instanceDir, manifest, onProgress) {
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const total = files.length;
  let i = 0;

  for (const file of files) {
    i++;
    const dest = path.join(instanceDir, file.path.split("/").join(path.sep));

    let needsDownload = true;
    if (fs.existsSync(dest) && file.hash) {
      needsDownload = (await hashFile(dest)) !== file.hash;
    } else if (fs.existsSync(dest) && !file.hash) {
      needsDownload = false;
    }

    const baseline = (i - 1) / Math.max(total, 1);
    if (needsDownload) {
      onProgress && onProgress(`Téléchargement ${file.path}`, baseline);
      await downloadFile(file.url, dest, (p) =>
        onProgress && onProgress(`Téléchargement ${file.path}`, baseline + p / Math.max(total, 1))
      );
    } else {
      onProgress && onProgress(`À jour : ${file.path}`, i / Math.max(total, 1));
    }
  }

  pruneMods(instanceDir, files);
  onProgress && onProgress("Fichiers synchronisés", 1);
}

function pruneMods(instanceDir, files) {
  const modsDir = path.join(instanceDir, "mods");
  if (!fs.existsSync(modsDir)) return;

  const keep = new Set(files.filter((f) => f.path.startsWith("mods/")).map((f) => path.basename(f.path)));
  for (const name of fs.readdirSync(modsDir)) {
    if (name.toLowerCase().endsWith(".jar") && !keep.has(name)) {
      try {
        fs.unlinkSync(path.join(modsDir, name));
      } catch {
        // ignore locked files
      }
    }
  }
}

module.exports = { syncInstanceFiles };
