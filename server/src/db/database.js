const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "oakwood-db.json");

// Tiny JSON-backed store — zero native dependencies, safe on any host.
const data = { admins: [], sessions: {}, config: {}, stats: { manifestRequests: 0, fileDownloads: 0 }, nextAdminId: 1 };
if (fs.existsSync(DB_PATH)) {
  try {
    Object.assign(data, JSON.parse(fs.readFileSync(DB_PATH, "utf8")));
  } catch {
    // corrupt file: start fresh
  }
}
if (!data.stats) data.stats = { manifestRequests: 0, fileDownloads: 0 };
if (!data.config) data.config = {};

// Atomic write (temp + rename) so a reader never sees a half-written file.
function save() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

function getConfig() {
  return data.config;
}

function setConfig(patch) {
  Object.assign(data.config, patch);
  save();
  return data.config;
}

// Counters are bumped often, so persist them on a timer instead of every hit.
let statsDirty = false;
function bumpStat(key) {
  data.stats[key] = (data.stats[key] || 0) + 1;
  statsDirty = true;
}
setInterval(() => {
  if (statsDirty) {
    save();
    statsDirty = false;
  }
}, 20000).unref();

module.exports = { data, save, DATA_DIR, getConfig, setConfig, bumpStat };
