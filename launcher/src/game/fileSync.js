const fs = require("fs");
const path = require("path");
const { hashFile } = require("@oakwood/shared");
const { downloadFile } = require("./download");

const CONCURRENCY = 8; // simultaneous downloads
const MAX_ATTEMPTS = 3;

async function downloadWithRetry(url, dest) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await downloadFile(url, dest);
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// Downloads every manifest file whose local copy is missing or hash-mismatched,
// using a bounded pool of parallel workers, then prunes obsolete mods.
async function syncInstanceFiles(instanceDir, manifest, onProgress) {
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const total = files.length;

  let completed = 0;
  let downloadedBytes = 0;
  const startTime = Date.now();

  function report() {
    const elapsed = (Date.now() - startTime) / 1000;
    const mbps = elapsed > 0 ? (downloadedBytes / (1024 * 1024) / elapsed).toFixed(1) : "0.0";
    const percent = total > 0 ? completed / total : 1;
    onProgress && onProgress(`Téléchargement des fichiers — ${completed}/${total} · ${mbps} Mo/s`, percent);
  }

  let nextIndex = 0;
  async function worker() {
    while (true) {
      const idx = nextIndex++;
      if (idx >= total) return;
      const file = files[idx];
      const dest = path.join(instanceDir, file.path.split("/").join(path.sep));

      let needsDownload = true;
      if (fs.existsSync(dest) && file.hash) {
        needsDownload = (await hashFile(dest)) !== file.hash;
      } else if (fs.existsSync(dest) && !file.hash) {
        needsDownload = false;
      }

      if (needsDownload) {
        await downloadWithRetry(file.url, dest);
        downloadedBytes += file.size || 0;
      }
      completed++;
      report();
    }
  }

  if (total > 0) {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
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
