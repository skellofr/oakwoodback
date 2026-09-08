const fs = require("fs");
const path = require("path");
const os = require("os");

function systemMaxRamMb() {
  const totalMb = Math.floor(os.totalmem() / (1024 * 1024));
  return Math.max(2048, Math.floor((totalMb - 1024) / 512) * 512);
}

function defaultSettings() {
  const maxRamMb = systemMaxRamMb();
  return {
    ramMb: Math.min(4096, maxRamMb),
    maxRamMb,
    resolutionWidth: 1280,
    resolutionHeight: 720,
    jvmArgs: "",
  };
}

function settingsPath(appDataDir) {
  return path.join(appDataDir, "settings.json");
}

function loadSettings(appDataDir) {
  const filePath = settingsPath(appDataDir);
  if (!fs.existsSync(filePath)) {
    return defaultSettings();
  }
  const saved = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return { ...defaultSettings(), ...saved, maxRamMb: systemMaxRamMb() };
}

function saveSettings(appDataDir, settings) {
  fs.writeFileSync(settingsPath(appDataDir), JSON.stringify(settings, null, 2));
}

module.exports = { loadSettings, saveSettings, defaultSettings };
