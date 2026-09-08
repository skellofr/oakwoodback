const crypto = require("crypto");
const { db } = require("../db/database");

const SESSION_COOKIE = "oakwood_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const insertSession = db.prepare(
  "INSERT INTO sessions (token, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
);
const selectSession = db.prepare(
  `SELECT a.id, a.discord_id, a.username, a.avatar, s.expires_at
   FROM sessions s JOIN admins a ON a.id = s.admin_id
   WHERE s.token = ?`
);
const deleteSession = db.prepare("DELETE FROM sessions WHERE token = ?");
const deleteExpired = db.prepare("DELETE FROM sessions WHERE expires_at < ?");

function createSession(adminId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  insertSession.run(token, adminId, now, now + SESSION_TTL_MS);
  return token;
}

function getAdminFromToken(token) {
  if (!token) return null;
  const row = selectSession.get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    deleteSession.run(token);
    return null;
  }
  return { id: row.id, discordId: row.discord_id, username: row.username, avatar: row.avatar };
}

function destroySession(token) {
  if (token) deleteSession.run(token);
}

// Express middleware: rejects requests without a valid admin session.
function requireAdmin(req, res, next) {
  const admin = getAdminFromToken(req.cookies?.[SESSION_COOKIE]);
  if (!admin) return res.status(401).json({ error: "unauthorized" });
  req.admin = admin;
  next();
}

// Best-effort periodic cleanup of expired sessions.
setInterval(() => deleteExpired.run(Date.now()), 60 * 60 * 1000).unref();

module.exports = { SESSION_COOKIE, SESSION_TTL_MS, createSession, getAdminFromToken, destroySession, requireAdmin };
