const { app, BrowserWindow, ipcMain, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { APP_FOLDER_NAME } = require("@oakwood/shared");
const { getServerStatus } = require("./serverStatus");
const { loadSettings, saveSettings } = require("./settingsStore");
const { loadProfile, saveProfile, clearProfile } = require("./profileStore");
const { saveRefreshToken, loadRefreshToken, clearRefreshToken } = require("./authStore");
const { loginWithDeviceCode, loginWithRefreshToken } = require("./auth/authFlow");
const { prepareAndLaunch, verifyAndRepair } = require("./game/install");
const { autoUpdater } = require("electron-updater");
const { SERVER_BASE_URL } = require("./config");

const APP_DATA_DIR = path.join(os.homedir(), APP_FOLDER_NAME);
const INSTANCE_DIR = path.join(APP_DATA_DIR, "instance");

let mainWindow = null;

function ensureAppDirs() {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  fs.mkdirSync(INSTANCE_DIR, { recursive: true });
  fs.mkdirSync(path.join(INSTANCE_DIR, "mods"), { recursive: true });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 640,
    minWidth: 800,
    minHeight: 500,
    resizable: true,
    icon: path.join(__dirname, "renderer", "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow = win;
  return win;
}

ipcMain.handle("get-app-info", () => ({
  appDataDir: APP_DATA_DIR,
  version: app.getVersion(),
  instanceDir: INSTANCE_DIR,
}));

ipcMain.handle("get-server-status", () => getServerStatus());

ipcMain.handle("get-settings", () => loadSettings(APP_DATA_DIR));
ipcMain.handle("save-settings", (event, settings) => {
  saveSettings(APP_DATA_DIR, settings);
  return loadSettings(APP_DATA_DIR);
});

ipcMain.handle("get-feed", async () => {
  try {
    const res = await fetch(`${SERVER_BASE_URL}/feed.json`);
    if (!res.ok) return { announcements: [], changelog: [] };
    return await res.json();
  } catch {
    return { announcements: [], changelog: [] };
  }
});

// --- Auth ---
ipcMain.handle("get-profile", () => loadProfile(APP_DATA_DIR));

ipcMain.handle("try-silent-login", async () => {
  const refreshToken = loadRefreshToken(APP_DATA_DIR);
  if (!refreshToken) return { ok: false };
  try {
    const result = await loginWithRefreshToken(refreshToken);
    saveRefreshToken(APP_DATA_DIR, result.refreshToken);
    saveProfile(APP_DATA_DIR, result.profile);
    return { ok: true, profile: result.profile };
  } catch {
    return { ok: false };
  }
});

ipcMain.handle("login-microsoft", async (event) => {
  try {
    const result = await loginWithDeviceCode(({ userCode, verificationUri }) => {
      shell.openExternal(verificationUri);
      event.sender.send("auth:device-code", { userCode, verificationUri });
    });
    saveRefreshToken(APP_DATA_DIR, result.refreshToken);
    saveProfile(APP_DATA_DIR, result.profile);
    return { ok: true, profile: result.profile };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("logout", () => {
  clearRefreshToken(APP_DATA_DIR);
  clearProfile(APP_DATA_DIR);
});

let launching = false;

ipcMain.handle("play", async (event) => {
  if (launching) return { ok: false, error: "Lancement déjà en cours." };

  const refreshToken = loadRefreshToken(APP_DATA_DIR);
  if (!refreshToken) return { ok: false, error: "Connecte-toi avec Microsoft avant de jouer." };

  launching = true;
  const report = (status, percent) => event.sender.send("game:progress", { status, percent });
  try {
    const auth = await loginWithRefreshToken(refreshToken);
    saveRefreshToken(APP_DATA_DIR, auth.refreshToken);
    saveProfile(APP_DATA_DIR, auth.profile);

    const settings = loadSettings(APP_DATA_DIR);
    let manifest = { files: [] };
    try {
      const res = await fetch(`${SERVER_BASE_URL}/manifest.json`);
      if (res.ok) manifest = await res.json();
    } catch {
      // offline: continue with no extra files
    }

    // Versions come from the admin panel (/config.json), falling back to constants.
    let versions = null;
    try {
      const res = await fetch(`${SERVER_BASE_URL}/config.json`);
      if (res.ok) {
        const cfg = await res.json();
        versions = { minecraftVersion: cfg.minecraftVersion, neoforgeVersion: cfg.neoforgeVersion };
      }
    } catch {
      // offline: fall back to built-in versions
    }

    const session = {
      username: auth.profile.username,
      uuid: auth.profile.uuid,
      accessToken: auth.mcAccessToken,
      isOnline: true,
    };

    await prepareAndLaunch(
      { appDataDir: APP_DATA_DIR, instanceDir: INSTANCE_DIR, session, settings, manifest, versions },
      report
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    launching = false;
  }
});

ipcMain.handle("verify-repair", async (event) => {
  if (launching) return { ok: false, error: "Opération déjà en cours." };
  launching = true;
  const report = (status, percent) => event.sender.send("game:progress", { status, percent });
  try {
    let manifest = { files: [] };
    try {
      const res = await fetch(`${SERVER_BASE_URL}/manifest.json`);
      if (res.ok) manifest = await res.json();
    } catch {
      // offline: nothing to repair against
    }
    await verifyAndRepair({ appDataDir: APP_DATA_DIR, instanceDir: INSTANCE_DIR, manifest }, report);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    launching = false;
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ensureAppDirs();
  createWindow();
  setupAutoUpdate();
});

// Checks the self-hosted update feed on startup (packaged builds only).
function setupAutoUpdate() {
  if (!app.isPackaged) return;
  const notify = (text) => mainWindow && mainWindow.webContents.send("update:status", text);
  autoUpdater.on("update-available", () => notify("Mise à jour disponible, téléchargement..."));
  autoUpdater.on("download-progress", (p) => notify(`Téléchargement de la mise à jour : ${Math.round(p.percent)}%`));
  autoUpdater.on("update-downloaded", () => notify("Mise à jour prête ! Redémarre le launcher pour l'appliquer."));
  autoUpdater.on("error", (err) => console.error("Auto-update:", err.message));
  try {
    autoUpdater.setFeedURL({ provider: "generic", url: `${SERVER_BASE_URL}/updates` });
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error("Auto-update:", err.message);
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
