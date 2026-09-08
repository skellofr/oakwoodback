const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { downloadFile } = require("./download");
const { consoleJava } = require("./java");

function installerUrl(neoVersion) {
  return `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoVersion}/neoforge-${neoVersion}-installer.jar`;
}

function versionId(neoVersion) {
  return `neoforge-${neoVersion}`;
}

function neoForgeJsonPath(paths, neoVersion) {
  const id = versionId(neoVersion);
  return path.join(paths.versionsDir, id, `${id}.json`);
}

// Ensures NeoForge is installed via its official headless client installer.
async function ensureNeoForge(neoVersion, javaPath, paths, onProgress) {
  const jsonPath = neoForgeJsonPath(paths, neoVersion);
  if (fs.existsSync(jsonPath)) return jsonPath;

  ensureLauncherProfiles(paths);

  onProgress && onProgress("Téléchargement de l'installeur NeoForge...", 0);
  const installerPath = path.join(paths.gameDir, `neoforge-${neoVersion}-installer.jar`);
  await downloadFile(installerUrl(neoVersion), installerPath, (p) =>
    onProgress && onProgress("Téléchargement de NeoForge...", p)
  );

  onProgress && onProgress("Installation de NeoForge...", 1);
  await runInstaller(consoleJava(javaPath), installerPath, paths);
  try {
    fs.unlinkSync(installerPath);
  } catch {
    // ignore
  }

  if (!fs.existsSync(jsonPath)) {
    throw new Error("L'installation de NeoForge a échoué (version JSON absente).");
  }
  return jsonPath;
}

function runInstaller(javaExe, installerPath, paths) {
  return new Promise((resolve, reject) => {
    const child = spawn(javaExe, ["-jar", installerPath, "--installClient", paths.gameDir], {
      cwd: paths.gameDir,
      windowsHide: true,
    });
    let stderr = "";
    // Drain both streams: an unread stdout pipe fills up and deadlocks the installer.
    child.stdout.on("data", () => {});
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Installeur NeoForge : code ${code}. ${stderr.slice(0, 400)}`));
    });
  });
}

// The NeoForge installer requires a launcher_profiles.json in the target folder.
function ensureLauncherProfiles(paths) {
  const p = path.join(paths.gameDir, "launcher_profiles.json");
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify({ profiles: {}, settings: {}, version: 3 }));
  }
}

module.exports = { ensureNeoForge, neoForgeJsonPath, versionId };
