// Flux MSA hérité : client ID public du launcher Minecraft officiel, endpoints
// login.live.com. Aucune app Azure / inscription d'application requise.
const CLIENT_ID = "00000000402b5328";
const SCOPE = "service::user.auth.xboxlive.com::MBI_SSL";
const DEVICE_CODE_URL = "https://login.live.com/oauth20_connect.srf";
const TOKEN_URL = "https://login.live.com/oauth20_token.srf";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestDeviceCode() {
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPE, response_type: "device_code" }),
  });
  if (!res.ok) throw new Error(`Requête device code échouée (${res.status})`);
  return res.json();
}

// Polls the token endpoint until the user finishes signing in at microsoft.com/link.
async function pollForToken(deviceCode, intervalSeconds, expiresInSeconds) {
  const deadline = Date.now() + expiresInSeconds * 1000;
  let interval = intervalSeconds * 1000;

  while (Date.now() < deadline) {
    await sleep(interval);
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: CLIENT_ID,
        device_code: deviceCode,
      }),
    });
    const data = await res.json();
    if (res.ok) return data;
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      interval += 5000;
      continue;
    }
    throw new Error(data.error_description || data.error);
  }
  throw new Error("Le code de connexion a expiré.");
}

async function refreshMicrosoftToken(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
      scope: SCOPE,
    }),
  });
  if (!res.ok) throw new Error("Renouvellement de session échoué.");
  return res.json();
}

module.exports = { requestDeviceCode, pollForToken, refreshMicrosoftToken };
