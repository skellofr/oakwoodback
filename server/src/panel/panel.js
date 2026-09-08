const loginView = document.getElementById("login-view");
const dashView = document.getElementById("dash-view");
const loginError = document.getElementById("login-error");

async function init() {
  const params = new URLSearchParams(location.search);
  if (params.get("error")) loginError.textContent = decodeURIComponent(params.get("error"));

  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (res.ok) {
      const { admin } = await res.json();
      showDashboard(admin);
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginView.classList.remove("hidden");
  dashView.classList.add("hidden");
}

function showDashboard(admin) {
  loginView.classList.add("hidden");
  dashView.classList.remove("hidden");

  document.getElementById("admin-name").textContent = admin.username;
  const avatar = document.getElementById("admin-avatar");
  avatar.src = admin.avatar
    ? `https://cdn.discordapp.com/avatars/${admin.discordId}/${admin.avatar}.png?size=64`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  wireNav();
  loadOverview();
  setupMods();
  setupReleases();
}

function wireNav() {
  const items = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".panel-section");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      items.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const target = item.dataset.section;
      sections.forEach((s) => s.classList.toggle("hidden", s.dataset.section !== target));
    });
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    location.reload();
  });
}

async function loadOverview() {
  try {
    const manifest = await (await fetch("/manifest.json")).json();
    document.getElementById("stat-mods").textContent = (manifest.files || []).filter((f) =>
      f.path.startsWith("mods/")
    ).length;
    document.getElementById("stat-version").textContent = manifest.modpackVersion ?? "—";
    document.getElementById("stat-mc").textContent = `${manifest.minecraftVersion} / ${manifest.neoforgeVersion}`;
  } catch {
    // manifest may be empty on a fresh install
  }
}

// --- Mods management ---
let modFiles = [];

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " Ko";
  return bytes + " o";
}

function setupMods() {
  const dropzone = document.getElementById("mods-dropzone");
  const input = document.getElementById("mods-input");
  const search = document.getElementById("mods-search");

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    if (input.files.length) uploadMods(input.files);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) uploadMods(e.dataTransfer.files);
  });

  search.addEventListener("input", () => renderMods(search.value));

  loadMods();
}

async function loadMods() {
  try {
    const data = await (await fetch("/api/mods", { credentials: "same-origin" })).json();
    modFiles = (data.files || []).filter((f) => f.path.startsWith("mods/"));
    renderMods(document.getElementById("mods-search").value);
  } catch {
    // ignore
  }
}

function renderMods(filter = "") {
  const list = document.getElementById("mods-list");
  const q = filter.trim().toLowerCase();
  const shown = modFiles.filter((f) => f.path.toLowerCase().includes(q)).sort((a, b) => a.path.localeCompare(b.path));

  document.getElementById("mods-count").textContent = `${modFiles.length} mod${modFiles.length > 1 ? "s" : ""}`;

  if (shown.length === 0) {
    list.innerHTML = `<div class="mods-empty">${modFiles.length === 0 ? "Aucun mod pour le moment." : "Aucun résultat."}</div>`;
    return;
  }

  list.innerHTML = "";
  for (const f of shown) {
    const name = f.path.replace(/^mods\//, "");
    const row = document.createElement("div");
    row.className = "mod-row";
    row.innerHTML = `
      <span class="mod-icon">🧩</span>
      <span class="mod-name" title="${name}">${name}</span>
      <span class="mod-size">${formatSize(f.size)}</span>
      <button class="mod-delete">Supprimer</button>`;
    row.querySelector(".mod-delete").addEventListener("click", () => deleteMod(f.path, name));
    list.appendChild(row);
  }
}

async function uploadMods(fileList) {
  const status = document.getElementById("mods-upload-status");
  const form = new FormData();
  for (const file of fileList) form.append("files", file);
  form.append("folder", "mods");

  status.textContent = `Envoi de ${fileList.length} fichier(s)...`;
  try {
    const res = await fetch("/api/mods/upload", { method: "POST", body: form, credentials: "same-origin" });
    const data = await res.json();
    if (res.ok) {
      status.textContent = `✅ ${data.added.length} mod(s) ajouté(s). Version modpack : ${data.modpackVersion}`;
      modFiles = (data.files || []).filter((f) => f.path.startsWith("mods/"));
      renderMods(document.getElementById("mods-search").value);
      loadOverview();
    } else {
      status.textContent = `❌ Erreur : ${data.error}`;
    }
  } catch (err) {
    status.textContent = `❌ Erreur : ${err.message}`;
  }
}

async function deleteMod(path, name) {
  if (!confirm(`Supprimer le mod "${name}" ?`)) return;
  const res = await fetch("/api/mods/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ path }),
  });
  const data = await res.json();
  if (res.ok) {
    modFiles = (data.files || []).filter((f) => f.path.startsWith("mods/"));
    renderMods(document.getElementById("mods-search").value);
    loadOverview();
  }
}

// --- Launcher releases ---
function setupReleases() {
  const dropzone = document.getElementById("rel-dropzone");
  const input = document.getElementById("rel-input");

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    if (input.files.length) uploadReleases(input.files);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) uploadReleases(e.dataTransfer.files);
  });

  loadReleases();
}

async function loadReleases() {
  try {
    const data = await (await fetch("/api/releases", { credentials: "same-origin" })).json();
    renderReleases(data);
  } catch {
    // ignore
  }
}

function renderReleases(data) {
  const cur = document.getElementById("release-current");
  cur.innerHTML = data.current?.version
    ? `Version publiée : <strong>${data.current.version}</strong>${data.current.file ? ` — ${data.current.file}` : ""}`
    : "Aucune version publiée pour le moment.";

  const list = document.getElementById("rel-files");
  const files = data.files || [];
  if (files.length === 0) {
    list.innerHTML = `<div class="mods-empty">Aucun fichier d'update.</div>`;
    return;
  }
  list.innerHTML = "";
  for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const row = document.createElement("div");
    row.className = "mod-row";
    row.innerHTML = `
      <span class="mod-icon">📦</span>
      <span class="mod-name" title="${f.name}">${f.name}</span>
      <span class="mod-size">${formatSize(f.size)}</span>
      <button class="mod-delete">Supprimer</button>`;
    row.querySelector(".mod-delete").addEventListener("click", () => deleteRelease(f.name));
    list.appendChild(row);
  }
}

async function uploadReleases(fileList) {
  const status = document.getElementById("rel-status");
  const form = new FormData();
  for (const file of fileList) form.append("files", file);

  status.textContent = `Envoi de ${fileList.length} fichier(s)...`;
  try {
    const res = await fetch("/api/releases/upload", { method: "POST", body: form, credentials: "same-origin" });
    const data = await res.json();
    if (res.ok) {
      status.textContent = `✅ ${data.saved.length} fichier(s) publié(s).`;
      renderReleases(data);
    } else {
      status.textContent = `❌ Erreur : ${data.error}`;
    }
  } catch (err) {
    status.textContent = `❌ Erreur : ${err.message}`;
  }
}

async function deleteRelease(name) {
  if (!confirm(`Supprimer "${name}" ?`)) return;
  const res = await fetch("/api/releases/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (res.ok) renderReleases(data);
}

init();
