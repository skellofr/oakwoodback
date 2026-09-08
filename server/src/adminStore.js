const { data, save } = require("./db/database");

function getByDiscordId(discordId) {
  return data.admins.find((a) => a.discord_id === discordId) || null;
}

// Creates the admin on first login, otherwise refreshes profile + last_login.
function upsertOnLogin({ id, username, avatar }) {
  const now = Date.now();
  const existing = data.admins.find((a) => a.discord_id === id);
  if (existing) {
    existing.username = username;
    existing.avatar = avatar;
    existing.last_login = now;
    save();
    return existing.id;
  }
  const admin = {
    id: data.nextAdminId++,
    discord_id: id,
    username,
    avatar,
    created_at: now,
    last_login: now,
  };
  data.admins.push(admin);
  save();
  return admin.id;
}

function adminCount() {
  return data.admins.length;
}

module.exports = { getByDiscordId, upsertOnLogin, adminCount };
