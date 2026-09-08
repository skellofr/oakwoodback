const fs = require("fs");
const path = require("path");

function profilePath(appDataDir) {
  return path.join(appDataDir, "profile.json");
}

function loadProfile(appDataDir) {
  const filePath = profilePath(appDataDir);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveProfile(appDataDir, profile) {
  fs.writeFileSync(profilePath(appDataDir), JSON.stringify(profile, null, 2));
}

function clearProfile(appDataDir) {
  const filePath = profilePath(appDataDir);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { loadProfile, saveProfile, clearProfile };
