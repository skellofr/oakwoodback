module.exports = {
  // Oakwood backend on the VPS (override in dev with OAKWOOD_SERVER_URL).
  SERVER_BASE_URL: process.env.OAKWOOD_SERVER_URL || "https://oakwoodrp.fr",
};
