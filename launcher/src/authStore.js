const fs = require("fs");
const path = require("path");
const { safeStorage } = require("electron");

function authPath(appDataDir) {
  return path.join(appDataDir, "auth.dat");
}

function saveRefreshToken(appDataDir, refreshToken) {
  fs.writeFileSync(authPath(appDataDir), safeStorage.encryptString(refreshToken));
}

function loadRefreshToken(appDataDir) {
  const filePath = authPath(appDataDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    return safeStorage.decryptString(fs.readFileSync(filePath));
  } catch {
    return null;
  }
}

function clearRefreshToken(appDataDir) {
  const filePath = authPath(appDataDir);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { saveRefreshToken, loadRefreshToken, clearRefreshToken };
