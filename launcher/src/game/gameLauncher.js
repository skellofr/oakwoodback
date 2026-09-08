const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { rulesAllow, mavenToPath, collectArguments, OS_NAME } = require("./versionJson");

const CP_SEP = OS_NAME === "windows" ? ";" : ":";

// Builds the launch command from the vanilla + NeoForge version jsons and starts the game.
function launchGame({ mcVersion, vanillaJsonPath, neoJsonPath, javaPath, session, ramMb, jvmArgs, paths }) {
  const vanilla = JSON.parse(fs.readFileSync(vanillaJsonPath, "utf8"));
  const neo = JSON.parse(fs.readFileSync(neoJsonPath, "utf8"));

  const mainClass = neo.mainClass;
  const assetsIndex = vanilla.assetIndex.id;
  const versionName = path.basename(neoJsonPath, ".json");
  const classpath = buildClasspath(vanilla, neo, mcVersion, paths);

  const placeholders = {
    auth_player_name: session.username,
    version_name: versionName,
    game_directory: paths.gameDir,
    assets_root: paths.assetsDir,
    assets_index_name: assetsIndex,
    auth_uuid: session.uuid.replace(/-/g, ""),
    auth_access_token: session.accessToken,
    clientid: "",
    auth_xuid: "",
    user_type: session.isOnline ? "msa" : "legacy",
    version_type: "release",
    natives_directory: paths.nativesDir,
    launcher_name: "OakwoodLauncher",
    launcher_version: "1.0",
    classpath,
    library_directory: paths.librariesDir,
    classpath_separator: CP_SEP,
  };

  const args = [`-Xmx${ramMb}M`, `-Xms${Math.min(ramMb, 1024)}M`, `-Djava.library.path=${paths.nativesDir}`];
  const extra = (jvmArgs || "").trim();
  if (extra) args.push(...extra.split(/\s+/));

  args.push(...collectArguments(vanilla, "jvm", placeholders));
  args.push(...collectArguments(neo, "jvm", placeholders));
  args.push(mainClass);
  args.push(...collectArguments(vanilla, "game", placeholders));
  args.push(...collectArguments(neo, "game", placeholders));

  const logPath = path.join(paths.gameDir, "launcher_game.log");
  fs.writeFileSync(logPath, `${javaPath}\n${args.join("\n")}\n\n===== SORTIE DU JEU =====\n`);

  // Detached + log to a file descriptor so the game keeps running (and keeps
  // logging) after the launcher window is closed.
  const logFd = fs.openSync(logPath, "a");
  const child = spawn(javaPath, args, {
    cwd: paths.gameDir,
    windowsHide: true,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  return child;
}

function buildClasspath(vanilla, neo, mcVersion, paths) {
  const list = [];
  const seen = new Set();

  // NeoForge first, so its library versions take priority over vanilla's.
  addLibraries(neo, list, seen, paths);
  addLibraries(vanilla, list, seen, paths);

  // Minecraft itself is assembled by FML's ProductionClientProvider from the
  // libraries folder (client srg/extra + neoforge-client), never from the classpath.
  return list.join(CP_SEP);
}

function addLibraries(root, list, seen, paths) {
  const libs = Array.isArray(root.libraries) ? root.libraries : [];
  for (const lib of libs) {
    if (!rulesAllow(lib)) continue;

    let relPath = null;
    if (lib.downloads && lib.downloads.artifact && lib.downloads.artifact.path) {
      relPath = lib.downloads.artifact.path;
    } else if (lib.name) {
      relPath = mavenToPath(lib.name);
    }
    if (!relPath) continue;

    const key = dedupeKey(relPath);
    if (seen.has(key)) continue;
    seen.add(key);

    const full = path.join(paths.librariesDir, relPath.split("/").join(path.sep));
    if (fs.existsSync(full)) list.push(full);
  }
}

// group/.../artifact/version/file.jar -> group/.../artifact (dedupe across versions)
function dedupeKey(relPath) {
  const parts = relPath.split("/");
  return parts.length >= 3 ? parts.slice(0, -2).join("/") : relPath;
}

module.exports = { launchGame };
