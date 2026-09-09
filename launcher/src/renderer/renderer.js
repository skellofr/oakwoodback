const statusEl = document.getElementById("status");
const playBtn = document.getElementById("play-btn");
const appInfoEl = document.getElementById("app-info");
const progressTrack = document.getElementById("progress-track");
const progressFill = document.getElementById("progress-fill");

window.oakwood.getAppInfo().then((info) => {
  appInfoEl.textContent = info.instanceDir;
  const versionEl = document.getElementById("brand-version");
  if (versionEl && info.version) versionEl.textContent = `v${info.version}`;
});

window.oakwood.onUpdateStatus((text) => {
  statusEl.textContent = text;
});

window.oakwood.onGameProgress(({ status, percent }) => {
  statusEl.textContent = status;
  progressTrack.classList.remove("hidden");
  progressFill.style.width = `${Math.round((percent || 0) * 100)}%`;
});

playBtn.addEventListener("click", async () => {
  playBtn.disabled = true;
  statusEl.textContent = "Préparation...";
  progressTrack.classList.remove("hidden");
  progressFill.style.width = "0%";

  const result = await window.oakwood.play();

  if (result.ok) {
    statusEl.textContent = "Jeu lancé. Bon jeu !";
    progressFill.style.width = "100%";
    setTimeout(() => {
      statusEl.textContent = "Prêt.";
      progressTrack.classList.add("hidden");
      progressFill.style.width = "0%";
    }, 4000);
  } else {
    statusEl.textContent = `Erreur : ${result.error}`;
    progressTrack.classList.add("hidden");
  }
  playBtn.disabled = false;
});

const repairBtn = document.getElementById("repair-btn");
repairBtn.addEventListener("click", async () => {
  repairBtn.disabled = true;
  playBtn.disabled = true;
  statusEl.textContent = "Vérification des fichiers...";
  progressTrack.classList.remove("hidden");
  progressFill.style.width = "0%";

  const result = await window.oakwood.verifyRepair();

  if (result.ok) {
    statusEl.textContent = "Fichiers vérifiés et réparés ✅";
    progressFill.style.width = "100%";
    setTimeout(() => {
      statusEl.textContent = "Prêt.";
      progressTrack.classList.add("hidden");
      progressFill.style.width = "0%";
    }, 4000);
  } else {
    statusEl.textContent = `Erreur : ${result.error}`;
    progressTrack.classList.add("hidden");
  }
  repairBtn.disabled = false;
  playBtn.disabled = false;
});

// --- Parallax + slideshow background ---
const bgContainer = document.getElementById("bg-container");
const bgLayers = [document.getElementById("bg-layer-1"), document.getElementById("bg-layer-2")];
const BACKGROUND_IMAGES = ["image1.png", "image2.png", "image3.png", "image4.png", "image5.png", "image6.png"].map(
  (f) => `assets/${f}`
);

let activeLayerIndex = 0;
let currentImageIndex = 0;

function showBackgroundImage(index) {
  const nextLayerIndex = 1 - activeLayerIndex;
  const nextLayer = bgLayers[nextLayerIndex];
  nextLayer.style.backgroundImage = `url('${BACKGROUND_IMAGES[index]}')`;
  nextLayer.classList.add("active");
  bgLayers[activeLayerIndex].classList.remove("active");
  activeLayerIndex = nextLayerIndex;
}

showBackgroundImage(currentImageIndex);
setInterval(() => {
  currentImageIndex = (currentImageIndex + 1) % BACKGROUND_IMAGES.length;
  showBackgroundImage(currentImageIndex);
}, 7000);

document.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;
  bgContainer.style.transform = `translate(${-x}px, ${-y}px)`;
});

// --- Server status ---
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

async function refreshServerStatus() {
  const result = await window.oakwood.getServerStatus();
  if (result.online) {
    statusDot.className = "status-dot online";
    statusText.textContent = `${result.playersOnline}/${result.playersMax} joueurs · ${result.latencyMs} ms`;
  } else {
    statusDot.className = "status-dot offline";
    statusText.textContent = "Serveur hors ligne";
  }
}

refreshServerStatus();
setInterval(refreshServerStatus, 30000);

// --- Profile / Microsoft login ---
const profileLoggedOut = document.getElementById("profile-logged-out");
const profileLoggedIn = document.getElementById("profile-logged-in");
const profileAvatar = document.getElementById("profile-avatar");
const profileUsernameDisplay = document.getElementById("profile-username-display");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const playerSkin = document.getElementById("player-skin");
const playerSkinPlaceholder = document.getElementById("player-skin-placeholder");
const playerCardName = document.getElementById("player-card-name");
const playerCardTag = document.getElementById("player-card-tag");

const loginOverlay = document.getElementById("login-overlay");
const deviceCodeEl = document.getElementById("device-code");
const loginStatusEl = document.getElementById("login-status");
const loginCancelBtn = document.getElementById("login-cancel-btn");

function showProfile(profile) {
  profileUsernameDisplay.textContent = profile.username;
  const avatarUrl = profile.headUrl || `https://mc-heads.net/avatar/${profile.uuid}/64`;
  const bodyUrl = profile.bodyUrl || `https://mc-heads.net/body/${profile.uuid}/right`;
  profileAvatar.src = avatarUrl;
  profileLoggedOut.classList.add("hidden");
  profileLoggedIn.classList.remove("hidden");

  playerSkin.src = bodyUrl;
  playerSkin.classList.remove("hidden");
  playerSkinPlaceholder.classList.add("hidden");
  playerCardName.textContent = profile.username;
  playerCardTag.textContent = "Connecté";
}

function showLoggedOut() {
  profileLoggedOut.classList.remove("hidden");
  profileLoggedIn.classList.add("hidden");

  playerSkin.removeAttribute("src");
  playerSkin.classList.add("hidden");
  playerSkinPlaceholder.classList.remove("hidden");
  playerCardName.textContent = "Invité";
  playerCardTag.textContent = "Connecte-toi pour jouer";
}

window.oakwood.onDeviceCode(({ userCode }) => {
  deviceCodeEl.textContent = userCode;
  loginStatusEl.textContent = "En attente de connexion...";
  loginOverlay.classList.remove("hidden");
});

loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  deviceCodeEl.textContent = "------";
  loginStatusEl.textContent = "Connexion en cours...";
  loginOverlay.classList.remove("hidden");

  const result = await window.oakwood.loginMicrosoft();
  loginBtn.disabled = false;

  if (result.ok) {
    loginOverlay.classList.add("hidden");
    showProfile(result.profile);
  } else {
    loginStatusEl.textContent = `Erreur : ${result.error}`;
  }
});

loginCancelBtn.addEventListener("click", () => {
  loginOverlay.classList.add("hidden");
});

logoutBtn.addEventListener("click", async () => {
  await window.oakwood.logout();
  showLoggedOut();
});

async function initProfile() {
  const cached = await window.oakwood.getProfile();
  if (cached) showProfile(cached);

  const silent = await window.oakwood.trySilentLogin();
  if (silent.ok) {
    showProfile(silent.profile);
  } else if (!cached) {
    showLoggedOut();
  }
}

initProfile();

// --- News feed ---
const newsList = document.getElementById("news-list");

const CHANGELOG_LABELS = {
  add: (path) => `Mod ajouté : ${path}`,
  update: (path) => `Mod mis à jour : ${path}`,
  remove: (path) => `Mod retiré : ${path}`,
};

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function loadFeed() {
  const feed = await window.oakwood.getFeed();
  const items = [
    ...feed.announcements.map((a) => ({ icon: "📢", text: `${a.title} — ${a.body}`, timestamp: a.timestamp })),
    ...feed.changelog.map((c) => ({ icon: "🧩", text: CHANGELOG_LABELS[c.type](c.path), timestamp: c.timestamp })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  newsList.innerHTML = "";
  if (items.length === 0) {
    newsList.innerHTML = "<div class=\"news-item\">Aucune actualité pour le moment.</div>";
    return;
  }

  for (const item of items) {
    const el = document.createElement("div");
    el.className = "news-item";
    el.innerHTML = `<span class="news-icon">${item.icon}</span><span>${item.text}</span><span class="news-date">${formatDate(item.timestamp)}</span>`;
    newsList.appendChild(el);
  }
}

loadFeed();

// --- Settings modal ---
const settingsBtn = document.getElementById("settings-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsCancelBtn = document.getElementById("settings-cancel-btn");
const settingsSaveBtn = document.getElementById("settings-save-btn");
const ramSlider = document.getElementById("ram-slider");
const ramValue = document.getElementById("ram-value");
const resWidth = document.getElementById("res-width");
const resHeight = document.getElementById("res-height");
const jvmArgs = document.getElementById("jvm-args");

settingsBtn.addEventListener("click", async () => {
  const settings = await window.oakwood.getSettings();
  ramSlider.max = settings.maxRamMb;
  ramSlider.value = settings.ramMb;
  ramValue.textContent = settings.ramMb;
  resWidth.value = settings.resolutionWidth;
  resHeight.value = settings.resolutionHeight;
  jvmArgs.value = settings.jvmArgs;
  settingsOverlay.classList.remove("hidden");
});

ramSlider.addEventListener("input", () => {
  ramValue.textContent = ramSlider.value;
});

settingsCancelBtn.addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});

settingsSaveBtn.addEventListener("click", async () => {
  await window.oakwood.saveSettings({
    ramMb: Number(ramSlider.value),
    resolutionWidth: Number(resWidth.value),
    resolutionHeight: Number(resHeight.value),
    jvmArgs: jvmArgs.value,
  });
  settingsOverlay.classList.add("hidden");
});
