const DISCORD_API = "https://discord.com/api";

function clientId() {
  return process.env.DISCORD_CLIENT_ID || "";
}
function clientSecret() {
  return process.env.DISCORD_CLIENT_SECRET || "";
}
function redirectUri() {
  return process.env.DISCORD_REDIRECT_URI || "";
}

// Discord user IDs allowed to become admins (comma-separated env allowlist).
function allowedIds() {
  return (process.env.ADMIN_DISCORD_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isConfigured() {
  return Boolean(clientId() && clientSecret() && redirectUri());
}

function getAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });
  return `${DISCORD_API}/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed (${res.status})`);
  return res.json();
}

async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord user fetch failed (${res.status})`);
  const u = await res.json();
  return { id: u.id, username: u.global_name || u.username, avatar: u.avatar };
}

module.exports = { isConfigured, getAuthorizeUrl, exchangeCode, fetchDiscordUser, allowedIds };
