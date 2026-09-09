const fs = require("fs");
const path = require("path");
const { hashFile } = require("@oakwood/shared");
const { downloadFile } = require("./download");

const CONCURRENCY = 8; // simultaneous downloads
const MAX_ATTEMPTS = 3;
const CACHE_FILE = ".oakwood-hashcache.json";

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

function loadCache(instanceDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(instanceDir, CACHE_FILE), "utf8"));
  } catch {
    return {};
  }
}

function saveCache(instanceDir, cache) {
  try {
    fs.writeFileSync(path.join(instanceDir, CACHE_FILE), JSON.stringify(cache));
  } catch {
    // best effort
  }
}

// Downloads every manifest file whose local copy is missing or hash-mismatched,
// using a bounded pool of parallel workers, then prunes obsolete mods.
// A local hash cache (size + mtime) lets unchanged files skip re-hashing entirely.
// Pass { forceVerify: true } (Repair) to always re-hash instead of trusting the cache.
async function syncInstanceFiles(instanceDir, manifest, onProgress, options = {}) {
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const total = files.length;
  const forceVerify = Boolean(options.forceVerify);
  const cache = loadCache(instanceDir);

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
      const relPath = file.path;
      const dest = path.join(instanceDir, relPath.split("/").join(path.sep));

      let needsDownload = true;
      if (fs.existsSync(dest)) {
        const st = fs.statSync(dest);
        const cached = cache[relPath];
        const trusted =
          !forceVerify &&
          cached &&
          cached.size === st.size &&
          cached.mtimeMs === st.mtimeMs &&
          (!file.hash || cached.hash === file.hash);

        if (trusted) {
          needsDownload = false;
        } else if (file.hash) {
          const h = await hashFile(dest);
          needsDownload = h !== file.hash;
          cache[relPath] = { size: st.size, mtimeMs: st.mtimeMs, hash: h };
        } else {
          needsDownload = false;
          cache[relPath] = { size: st.size, mtimeMs: st.mtimeMs, hash: null };
        }
      }

      if (needsDownload) {
        await downloadWithRetry(file.url, dest);
        const st = fs.statSync(dest);
        cache[relPath] = { size: st.size, mtimeMs: st.mtimeMs, hash: file.hash || null };
        downloadedBytes += file.size || 0;
      }
      completed++;
      report();
    }
  }

  if (total > 0) {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
  }

  saveCache(instanceDir, cache);
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
