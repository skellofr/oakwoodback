async function authenticateXboxLive(msAccessToken) {
  const res = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        // Jeton MSA hérité : RpsTicket = token brut, sans préfixe "d=".
        RpsTicket: msAccessToken,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
  });
  if (!res.ok) throw new Error("Authentification Xbox Live échouée.");
  const data = await res.json();
  return { token: data.Token, uhs: data.DisplayClaims.xui[0].uhs };
}

async function authenticateXsts(xblToken) {
  const res = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: { SandboxId: "RETAIL", UserTokens: [xblToken] },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.XErr === 2148916233) throw new Error("Ce compte Microsoft n'a pas de profil Xbox Live.");
    if (data.XErr === 2148916238) throw new Error("Compte enfant : l'accord familial Xbox est requis.");
    throw new Error("Authentification XSTS échouée.");
  }
  return { token: data.Token, uhs: data.DisplayClaims.xui[0].uhs };
}

module.exports = { authenticateXboxLive, authenticateXsts };
