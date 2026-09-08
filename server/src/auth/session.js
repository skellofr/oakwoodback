const crypto = require("crypto");
const { data, save } = require("../db/database");

const SESSION_COOKIE = "oakwood_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function createSession(adminId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  data.sessions[token] = { admin_id: adminId, created_at: now, expires_at: now + SESSION_TTL_MS };
  save();
  return token;
}

function getAdminFromToken(token) {
  if (!token) return null;
  const session = data.sessions[token];
  if (!session) return null;
  if (session.expires_at < Date.now()) {
    delete data.sessions[token];
    save();
    return null;
  }
  const admin = data.admins.find((a) => a.id === session.admin_id);
  if (!admin) return null;
  return { id: admin.id, discordId: admin.discord_id, username: admin.username, avatar: admin.avatar };
}

function destroySession(token) {
  if (token && data.sessions[token]) {
    delete data.sessions[token];
    save();
  }
}

// Express middleware: rejects requests without a valid admin session.
function requireAdmin(req, res, next) {
  const admin = getAdminFromToken(req.cookies?.[SESSION_COOKIE]);
  if (!admin) return res.status(401).json({ error: "unauthorized" });
  req.admin = admin;
  next();
}

// Best-effort periodic cleanup of expired sessions.
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const token of Object.keys(data.sessions)) {
    if (data.sessions[token].expires_at < now) {
      delete data.sessions[token];
      changed = true;
    }
  }
  if (changed) save();
}, 60 * 60 * 1000).unref();

module.exports = { SESSION_COOKIE, SESSION_TTL_MS, createSession, getAdminFromToken, destroySession, requireAdmin };
