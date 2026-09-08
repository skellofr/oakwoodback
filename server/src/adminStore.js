const { db } = require("./db/database");

const selectByDiscordId = db.prepare("SELECT * FROM admins WHERE discord_id = ?");
const insertAdmin = db.prepare(
  "INSERT INTO admins (discord_id, username, avatar, created_at, last_login) VALUES (?, ?, ?, ?, ?)"
);
const updateOnLogin = db.prepare("UPDATE admins SET username = ?, avatar = ?, last_login = ? WHERE id = ?");
const countAdmins = db.prepare("SELECT COUNT(*) AS n FROM admins");

function getByDiscordId(discordId) {
  return selectByDiscordId.get(discordId);
}

// Creates the admin on first login, otherwise refreshes profile + last_login.
function upsertOnLogin({ id, username, avatar }) {
  const existing = selectByDiscordId.get(id);
  const now = Date.now();
  if (existing) {
    updateOnLogin.run(username, avatar, now, existing.id);
    return existing.id;
  }
  const info = insertAdmin.run(id, username, avatar, now, now);
  return info.lastInsertRowid;
}

function adminCount() {
  return countAdmins.get().n;
}

module.exports = { getByDiscordId, upsertOnLogin, adminCount };
