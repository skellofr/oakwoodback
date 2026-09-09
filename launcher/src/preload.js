const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("oakwood", {
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),
  getServerStatus: () => ipcRenderer.invoke("get-server-status"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getFeed: () => ipcRenderer.invoke("get-feed"),

  getProfile: () => ipcRenderer.invoke("get-profile"),
  trySilentLogin: () => ipcRenderer.invoke("try-silent-login"),
  loginMicrosoft: () => ipcRenderer.invoke("login-microsoft"),
  logout: () => ipcRenderer.invoke("logout"),
  onDeviceCode: (callback) => ipcRenderer.on("auth:device-code", (event, data) => callback(data)),

  play: () => ipcRenderer.invoke("play"),
  verifyRepair: () => ipcRenderer.invoke("verify-repair"),
  onGameProgress: (callback) => ipcRenderer.on("game:progress", (event, data) => callback(data)),
  onUpdateStatus: (callback) => ipcRenderer.on("update:status", (event, text) => callback(text)),
});
