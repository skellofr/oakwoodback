const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "oakwood-db.json");

// Tiny JSON-backed store — zero native dependencies, safe on any host.
const data = { admins: [], sessions: {}, config: {}, nextAdminId: 1 };
if (fs.existsSync(DB_PATH)) {
  try {
    Object.assign(data, JSON.parse(fs.readFileSync(DB_PATH, "utf8")));
  } catch {
    // corrupt file: start fresh
  }
}

// Atomic write (temp + rename) so a reader never sees a half-written file.
function save() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

module.exports = { data, save, DATA_DIR };
