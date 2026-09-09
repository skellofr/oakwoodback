const { MINECRAFT_VERSION, NEOFORGE_VERSION } = require("@oakwood/shared");
const { createGamePaths, ensureGameDirs } = require("./paths");
const { ensureJava } = require("./java");
const { ensureVanilla, ensureClientInLibraries } = require("./minecraftInstaller");
const { ensureNeoForge } = require("./neoforge");
const { syncInstanceFiles } = require("./fileSync");
const { launchGame } = require("./gameLauncher");

// Full "Play" pipeline: install everything that's missing, then start the game.
// onProgress(status, percent) reports coarse phase progress (0..1).
async function prepareAndLaunch({ appDataDir, instanceDir, session, settings, manifest, versions }, onProgress) {
  const mcVersion = (versions && versions.minecraftVersion) || MINECRAFT_VERSION;
  const neoVersion = (versions && versions.neoforgeVersion) || NEOFORGE_VERSION;

  const paths = createGamePaths(appDataDir, instanceDir);
  ensureGameDirs(paths);

  // Scale each phase's 0..1 progress into a slice of the overall bar.
  const phase = (start, span) => (status, p) => onProgress && onProgress(status, start + span * (p || 0));

  const javaPath = await ensureJava(settings.javaPath, paths, phase(0, 0.1));
  const vanillaJsonPath = await ensureVanilla(mcVersion, paths, phase(0.1, 0.4));
  ensureClientInLibraries(paths, mcVersion);
  const neoJsonPath = await ensureNeoForge(neoVersion, javaPath, paths, phase(0.5, 0.2));

  const mc = manifest && Array.isArray(manifest.files) ? manifest : { files: [] };
  await syncInstanceFiles(instanceDir, mc, phase(0.7, 0.29));

  onProgress && onProgress("Lancement du jeu...", 1);
  launchGame({
    mcVersion,
    vanillaJsonPath,
    neoJsonPath,
    javaPath,
    session,
    ramMb: settings.ramMb,
    jvmArgs: settings.jvmArgs,
    paths,
  });
}

// Re-verifies every instance file against the manifest and re-downloads any that
// are missing or corrupted (hash mismatch). Does not touch Java/MC/NeoForge.
async function verifyAndRepair({ appDataDir, instanceDir, manifest }, onProgress) {
  const paths = createGamePaths(appDataDir, instanceDir);
  ensureGameDirs(paths);
  const mc = manifest && Array.isArray(manifest.files) ? manifest : { files: [] };
  await syncInstanceFiles(instanceDir, mc, onProgress, { forceVerify: true });
}

module.exports = { prepareAndLaunch, verifyAndRepair };
