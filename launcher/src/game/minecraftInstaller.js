const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { getJson, downloadFile } = require("./download");
const { rulesAllow, OS_NAME } = require("./versionJson");

const VERSION_MANIFEST_URL = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
const RESOURCES_BASE = "https://resources.download.minecraft.net";
const NATIVE_EXT = OS_NAME === "windows" ? ".dll" : OS_NAME === "osx" ? ".dylib" : ".so";
const NATIVE_CLASSIFIER = `natives-${OS_NAME}`;

function vanillaJsonPath(paths, mcVersion) {
  return path.join(paths.versionsDir, mcVersion, `${mcVersion}.json`);
}

function clientJarPath(paths, mcVersion) {
  return path.join(paths.versionsDir, mcVersion, `${mcVersion}.jar`);
}

// NeoForge's neoform runtime resolves the vanilla client from its Maven coordinate
// (libraries/net/minecraft/client/<v>/client-<v>.jar), so mirror the jar there.
function ensureClientInLibraries(paths, mcVersion) {
  const src = clientJarPath(paths, mcVersion);
  if (!fs.existsSync(src)) return;
  const dir = path.join(paths.librariesDir, "net", "minecraft", "client", mcVersion);
  const dest = path.join(dir, `client-${mcVersion}.jar`);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

async function ensureVanilla(mcVersion, paths, onProgress) {
  const report = (status, percent) => onProgress && onProgress(status, percent);
  report("Récupération des métadonnées Minecraft...", 0);

  const versionJson = vanillaJsonPath(paths, mcVersion);
  if (!fs.existsSync(versionJson)) {
    const manifest = await getJson(VERSION_MANIFEST_URL);
    const entry = manifest.versions.find((v) => v.id === mcVersion);
    if (!entry) throw new Error(`Version Minecraft ${mcVersion} introuvable.`);
    await downloadFile(entry.url, versionJson);
  }

  const root = JSON.parse(fs.readFileSync(versionJson, "utf8"));

  report("Téléchargement du client Minecraft...", 0.1);
  const clientJar = clientJarPath(paths, mcVersion);
  if (!fs.existsSync(clientJar)) {
    await downloadFile(root.downloads.client.url, clientJar);
  }

  await downloadLibraries(root, paths, report);
  await downloadAssets(root, paths, report);

  report("Minecraft prêt.", 1);
  return versionJson;
}

async function downloadLibraries(root, paths, report) {
  const libs = Array.isArray(root.libraries) ? root.libraries : [];
  let i = 0;
  for (const lib of libs) {
    i++;
    if (!rulesAllow(lib)) continue;
    const downloads = lib.downloads;
    if (!downloads) continue;

    if (downloads.artifact) {
      const relPath = downloads.artifact.path;
      const url = downloads.artifact.url;
      const dest = path.join(paths.librariesDir, relPath.split("/").join(path.sep));
      if (!fs.existsSync(dest) && url) await downloadFile(url, dest);
      if (relPath.includes(NATIVE_CLASSIFIER) && !relPath.includes("arm64") && !relPath.includes("x86")) {
        extractNatives(dest, paths);
      }
    }

    if (downloads.classifiers && downloads.classifiers[NATIVE_CLASSIFIER]) {
      const native = downloads.classifiers[NATIVE_CLASSIFIER];
      const jar = path.join(paths.librariesDir, native.path.split("/").join(path.sep));
      if (!fs.existsSync(jar) && native.url) await downloadFile(native.url, jar);
      extractNatives(jar, paths);
    }

    report(`Librairies... (${i}/${libs.length})`, 0.2 + (0.5 * i) / libs.length);
  }
}

function extractNatives(jarPath, paths) {
  if (!fs.existsSync(jarPath)) return;
  try {
    const zip = new AdmZip(jarPath);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      if (entry.entryName.toLowerCase().endsWith(NATIVE_EXT)) {
        const dest = path.join(paths.nativesDir, path.basename(entry.entryName));
        if (!fs.existsSync(dest)) fs.writeFileSync(dest, entry.getData());
      }
    }
  } catch {
    // ignore natives extraction errors
  }
}

async function downloadAssets(root, paths, report) {
  if (!root.assetIndex) return;
  const id = root.assetIndex.id;
  const indexPath = path.join(paths.assetsDir, "indexes", `${id}.json`);
  if (!fs.existsSync(indexPath)) await downloadFile(root.assetIndex.url, indexPath);

  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const objects = index.objects || {};
  const entries = Object.values(objects);
  let i = 0;
  for (const obj of entries) {
    i++;
    const hash = obj.hash;
    const sub = hash.slice(0, 2);
    const dest = path.join(paths.assetsDir, "objects", sub, hash);
    if (!fs.existsSync(dest)) await downloadFile(`${RESOURCES_BASE}/${sub}/${hash}`, dest);
    if (i % 25 === 0 || i === entries.length) {
      report(`Ressources... (${i}/${entries.length})`, 0.7 + (0.3 * i) / entries.length);
    }
  }
}

module.exports = { ensureVanilla, ensureClientInLibraries, vanillaJsonPath, clientJarPath };
