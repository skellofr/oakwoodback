const pickFolderBtn = document.getElementById("pick-folder-btn");
const syncBtn = document.getElementById("sync-btn");
const folderPathEl = document.getElementById("folder-path");
const statusEl = document.getElementById("status");

let selectedFolder = null;

pickFolderBtn.addEventListener("click", async () => {
  const folder = await window.oakwoodAdmin.pickModsFolder();
  if (!folder) return;
  selectedFolder = folder;
  folderPathEl.textContent = folder;
  syncBtn.disabled = false;
});

syncBtn.addEventListener("click", () => {
  statusEl.textContent = "Synchronisation (hash, diff, upload) à venir...";
});

const announcementTitleEl = document.getElementById("announcement-title");
const announcementBodyEl = document.getElementById("announcement-body");
const announcementBtn = document.getElementById("announcement-btn");
const announcementStatusEl = document.getElementById("announcement-status");

announcementBtn.addEventListener("click", async () => {
  const title = announcementTitleEl.value.trim();
  const body = announcementBodyEl.value.trim();
  if (!title || !body) {
    announcementStatusEl.textContent = "Titre et contenu requis.";
    return;
  }

  announcementBtn.disabled = true;
  announcementStatusEl.textContent = "Publication...";
  try {
    await window.oakwoodAdmin.postAnnouncement({ title, body });
    announcementStatusEl.textContent = "Annonce publiée.";
    announcementTitleEl.value = "";
    announcementBodyEl.value = "";
  } catch (err) {
    announcementStatusEl.textContent = `Erreur: ${err.message}`;
  } finally {
    announcementBtn.disabled = false;
  }
});
