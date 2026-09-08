const { SERVER_HOST, SERVER_PORT } = require("@oakwood/shared");

// mcstatus.io is a public status API — avoids hand-rolling the Server List Ping
// protocol just to show players online/max in the launcher UI.
async function getServerStatus() {
  const start = Date.now();
  try {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_HOST}:${SERVER_PORT}`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (!data.online) return { online: false };
    return {
      online: true,
      playersOnline: data.players.online,
      playersMax: data.players.max,
      latencyMs: Date.now() - start,
    };
  } catch {
    return { online: false };
  }
}

module.exports = { getServerStatus };
