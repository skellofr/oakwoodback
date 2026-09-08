async function loginWithXbox(xstsToken, uhs) {
  const res = await fetch("https://api.minecraftservices.com/authentication/login_with_xbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityToken: `XBL3.0 x=${uhs};${xstsToken}` }),
  });
  if (!res.ok) throw new Error("Connexion aux services Minecraft échouée.");
  const data = await res.json();
  return data.access_token;
}

async function getMinecraftProfile(mcAccessToken) {
  const res = await fetch("https://api.minecraftservices.com/minecraft/profile", {
    headers: { Authorization: `Bearer ${mcAccessToken}` },
  });
  if (res.status === 404) throw new Error("Ce compte Microsoft ne possède pas Minecraft.");
  if (!res.ok) throw new Error("Impossible de récupérer le profil Minecraft.");
  const data = await res.json();
  return {
    uuid: data.id,
    username: data.name,
    headUrl: `https://mc-heads.net/avatar/${data.id}/64`,
    bodyUrl: `https://mc-heads.net/body/${data.id}/right`,
  };
}

module.exports = { loginWithXbox, getMinecraftProfile };
