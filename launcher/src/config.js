module.exports = {
  // Oakwood backend on the VPS (override in dev with OAKWOOD_SERVER_URL).
  SERVER_BASE_URL: process.env.OAKWOOD_SERVER_URL || "http://51.75.195.159:8090",
};
