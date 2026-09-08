const { requestDeviceCode, pollForToken, refreshMicrosoftToken } = require("./deviceCodeAuth");
const { authenticateXboxLive, authenticateXsts } = require("./xboxAuth");
const { loginWithXbox, getMinecraftProfile } = require("./minecraftAuth");

async function completeChain(msAccessToken) {
  const xbl = await authenticateXboxLive(msAccessToken);
  const xsts = await authenticateXsts(xbl.token);
  const mcAccessToken = await loginWithXbox(xsts.token, xsts.uhs);
  const profile = await getMinecraftProfile(mcAccessToken);
  return { mcAccessToken, profile };
}

// onDeviceCode({ userCode, verificationUri }) is called as soon as the code is ready to show/open.
async function loginWithDeviceCode(onDeviceCode) {
  const device = await requestDeviceCode();
  onDeviceCode({ userCode: device.user_code, verificationUri: device.verification_uri });
  const msTokens = await pollForToken(device.device_code, device.interval, device.expires_in);
  const { mcAccessToken, profile } = await completeChain(msTokens.access_token);
  return { refreshToken: msTokens.refresh_token, mcAccessToken, profile };
}

async function loginWithRefreshToken(refreshToken) {
  const msTokens = await refreshMicrosoftToken(refreshToken);
  const { mcAccessToken, profile } = await completeChain(msTokens.access_token);
  return { refreshToken: msTokens.refresh_token, mcAccessToken, profile };
}

module.exports = { loginWithDeviceCode, loginWithRefreshToken };
