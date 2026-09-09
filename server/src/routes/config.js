const express = require("express");
const { MINECRAFT_VERSION, NEOFORGE_VERSION, MODPACK_NAME } = require("@oakwood/shared");
const { requireAdmin } = require("../auth/session");
const { getConfig, setConfig } = require("../db/database");

const router = express.Router();

// Config with sensible fallbacks to the shared constants when unset.
function effectiveConfig() {
  const c = getConfig();
  return {
    modpackName: c.modpackName ?? MODPACK_NAME,
    minecraftVersion: c.minecraftVersion ?? MINECRAFT_VERSION,
    neoforgeVersion: c.neoforgeVersion ?? NEOFORGE_VERSION,
    recommendedRamMb: c.recommendedRamMb ?? 4096,
  };
}

router.use(requireAdmin);
router.use(express.json());

router.get("/", (req, res) => res.json(effectiveConfig()));

router.post("/", (req, res) => {
  const { modpackName, minecraftVersion, neoforgeVersion, recommendedRamMb } = req.body;
  const patch = {};
  if (modpackName != null) patch.modpackName = String(modpackName).trim();
  if (minecraftVersion != null) patch.minecraftVersion = String(minecraftVersion).trim();
  if (neoforgeVersion != null) patch.neoforgeVersion = String(neoforgeVersion).trim();
  if (recommendedRamMb != null) patch.recommendedRamMb = Number(recommendedRamMb);
  setConfig(patch);
  res.json(effectiveConfig());
});

module.exports = { router, effectiveConfig };
