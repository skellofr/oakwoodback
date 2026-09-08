const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("./manifestStore");

const CHANGELOG_PATH = path.join(DATA_DIR, "changelog.json");
const ANNOUNCEMENTS_PATH = path.join(DATA_DIR, "announcements.json");
const MAX_ENTRIES = 200;

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Write to a temp file then rename, so a reader never sees a half-written file.
function writeJsonArray(filePath, arr) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(arr, null, 2));
  fs.renameSync(tmpPath, filePath);
}

function appendChangelogEntry(entry) {
  const entries = readJsonArray(CHANGELOG_PATH);
  entries.unshift({ ...entry, timestamp: Date.now() });
  writeJsonArray(CHANGELOG_PATH, entries.slice(0, MAX_ENTRIES));
}

function appendAnnouncement(entry) {
  const entries = readJsonArray(ANNOUNCEMENTS_PATH);
  entries.unshift({ ...entry, id: Date.now(), timestamp: Date.now() });
  writeJsonArray(ANNOUNCEMENTS_PATH, entries.slice(0, MAX_ENTRIES));
}

function getFeed() {
  return {
    announcements: readJsonArray(ANNOUNCEMENTS_PATH),
    changelog: readJsonArray(CHANGELOG_PATH),
  };
}

module.exports = { appendChangelogEntry, appendAnnouncement, getFeed };
