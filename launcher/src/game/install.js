const { MINECRAFT_VERSION, NEOFORGE_VERSION } = require("@oakwood/shared");
const { createGamePaths, ensureGameDirs } = require("./paths");
const { ensureJava } = require("./java");
const { ensureVanilla, ensureClientInLibraries } = require("./minecraftInstaller");
const { ensureNeoForge } = require("./neoforge");
const { syncInstanceFiles } = require("./fileSync");
const { launchGame } = require("./gameLauncher");

// Full "Play" pipeline: install everything that's missing, then start the game.
// onProgress(status, percent) reports coarse phase progress (0..1).
async function prepareAndLaunch({ appDataDir, instanceDir, session, settings, manifest }, onProgress) {
  const paths = createGamePaths(appDataDir, instanceDir);
  ensureGameDirs(paths);

  // Scale each phase's 0..1 progress into a slice of the overall bar.
  const phase = (start, span) => (status, p) => onProgress && onProgress(status, start + span * (p || 0));

  const javaPath = await ensureJava(settings.javaPath, paths, phase(0, 0.1));
  const vanillaJsonPath = await ensureVanilla(MINECRAFT_VERSION, paths, phase(0.1, 0.4));
  ensureClientInLibraries(paths, MINECRAFT_VERSION);
  const neoJsonPath = await ensureNeoForge(NEOFORGE_VERSION, javaPath, paths, phase(0.5, 0.2));

  const mc = manifest && Array.isArray(manifest.files) ? manifest : { files: [] };
  await syncInstanceFiles(instanceDir, mc, phase(0.7, 0.29));

  onProgress && onProgress("Lancement du jeu...", 1);
  launchGame({
    mcVersion: MINECRAFT_VERSION,
    vanillaJsonPath,
    neoJsonPath,
    javaPath,
    session,
    ramMb: settings.ramMb,
    jvmArgs: settings.jvmArgs,
    paths,
  });
}

module.exports = { prepareAndLaunch };
