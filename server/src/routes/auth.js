const crypto = require("crypto");
const express = require("express");
const discord = require("../auth/discord");
const { getByDiscordId, upsertOnLogin, adminCount } = require("../adminStore");
const { SESSION_COOKIE, SESSION_TTL_MS, createSession, destroySession, getAdminFromToken } = require("../auth/session");

const router = express.Router();
const STATE_COOKIE = "oakwood_oauth_state";

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: "lax",
    // Only require HTTPS when the public URL is actually HTTPS (IP:port stays http).
    secure: (process.env.PUBLIC_BASE_URL || "").startsWith("https"),
    maxAge: maxAgeMs,
    path: "/",
  };
}

// Grants access to allowlisted Discord IDs, or to the first-ever user when the
// allowlist is empty (bootstrap of the very first admin).
function isAuthorized(discordId) {
  const allow = discord.allowedIds();
  if (allow.includes(discordId)) return true;
  if (getByDiscordId(discordId)) return true;
  return allow.length === 0 && adminCount() === 0;
}

router.get("/discord", (req, res) => {
  if (!discord.isConfigured()) return res.status(503).send("Discord OAuth non configuré côté serveur.");
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, cookieOpts(10 * 60 * 1000));
  res.redirect(discord.getAuthorizeUrl(state));
});

router.get("/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || state !== req.cookies?.[STATE_COOKIE]) {
    return res.status(400).send("État OAuth invalide, réessaie la connexion.");
  }
  res.clearCookie(STATE_COOKIE, { path: "/" });

  try {
    const tokens = await discord.exchangeCode(code);
    const user = await discord.fetchDiscordUser(tokens.access_token);

    if (!isAuthorized(user.id)) {
      return res.status(403).send("Ton compte Discord n'est pas autorisé à administrer Oakwood.");
    }

    const adminId = upsertOnLogin(user);
    const token = createSession(adminId);
    res.cookie(SESSION_COOKIE, token, cookieOpts(SESSION_TTL_MS));
    res.redirect("/panel");
  } catch (err) {
    res.status(500).send("Connexion Discord échouée : " + err.message);
  }
});

router.get("/me", (req, res) => {
  const admin = getAdminFromToken(req.cookies?.[SESSION_COOKIE]);
  if (!admin) return res.status(401).json({ error: "unauthorized" });
  res.json({ admin });
});

router.post("/logout", (req, res) => {
  destroySession(req.cookies?.[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

module.exports = router;
