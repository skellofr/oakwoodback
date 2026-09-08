const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { SERVER_BASE_URL, UPLOAD_TOKEN } = require("./config");

function createWindow() {
  const win = new BrowserWindow({
    width: 700,
    height: 500,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

ipcMain.handle("pick-mods-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("post-announcement", async (event, { title, body }) => {
  const res = await fetch(`${SERVER_BASE_URL}/admin/announcement`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPLOAD_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return res.json();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
