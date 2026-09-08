const path = require("path");
const fs = require("fs");

// The instance folder is treated as the Minecraft game directory.
function createGamePaths(appDataDir, instanceDir) {
  const p = {
    gameDir: instanceDir,
    versionsDir: path.join(instanceDir, "versions"),
    librariesDir: path.join(instanceDir, "libraries"),
    assetsDir: path.join(instanceDir, "assets"),
    nativesDir: path.join(instanceDir, "natives"),
    modsDir: path.join(instanceDir, "mods"),
    javaDir: path.join(appDataDir, "java"),
  };
  return p;
}

function ensureGameDirs(p) {
  for (const dir of [p.gameDir, p.versionsDir, p.librariesDir, p.assetsDir, p.nativesDir, p.modsDir, p.javaDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { createGamePaths, ensureGameDirs };
