const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("oakwoodAdmin", {
  pickModsFolder: () => ipcRenderer.invoke("pick-mods-folder"),
  postAnnouncement: (announcement) => ipcRenderer.invoke("post-announcement", announcement),
});
