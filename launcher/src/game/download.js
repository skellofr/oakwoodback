const fs = require("fs");
const path = require("path");

const USER_AGENT = "OakwoodLauncher/1.0";

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

// Downloads url to destPath, reporting a 0..1 fraction via onProgress.
async function downloadFile(url, destPath, onProgress) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok || !res.body) throw new Error(`GET ${url} → ${res.status}`);

  const total = Number(res.headers.get("content-length")) || 0;
  let read = 0;

  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(destPath);
    out.on("error", reject);
    out.on("finish", resolve);

    (async () => {
      try {
        for await (const chunk of res.body) {
          read += chunk.length;
          if (!out.write(chunk)) {
            await new Promise((r) => out.once("drain", r));
          }
          if (total > 0 && onProgress) onProgress(read / total);
        }
        out.end();
      } catch (err) {
        out.destroy();
        reject(err);
      }
    })();
  });
}

module.exports = { getJson, downloadFile };
