const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { downloadFile } = require("./download");
const { OS_NAME } = require("./versionJson");

const JAVA_BIN = OS_NAME === "windows" ? "javaw.exe" : "java";
const JAVA_BIN_CONSOLE = OS_NAME === "windows" ? "java.exe" : "java";

function temurinUrl() {
  const osKey = OS_NAME === "osx" ? "mac" : OS_NAME;
  const arch = process.arch === "arm64" ? "aarch64" : "x64";
  const ext = OS_NAME === "windows" ? "zip" : "tar.gz";
  return `https://api.adoptium.net/v3/binary/latest/21/ga/${osKey}/${arch}/jre/hotspot/normal/eclipse`;
}

function findBundledJava(paths, binName) {
  if (!fs.existsSync(paths.javaDir)) return null;
  const stack = [paths.javaDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.toLowerCase() === binName.toLowerCase()) return full;
    }
  }
  return null;
}

// Returns the path to javaw (or java). Downloads a Temurin 21 JRE if none is bundled.
async function ensureJava(configuredPath, paths, onProgress) {
  if (configuredPath && fs.existsSync(configuredPath)) return configuredPath;

  const bundled = findBundledJava(paths, JAVA_BIN);
  if (bundled) return bundled;

  onProgress && onProgress("Téléchargement de Java 21...", 0);
  fs.mkdirSync(paths.javaDir, { recursive: true });

  if (OS_NAME !== "windows") {
    throw new Error("Installation automatique de Java disponible seulement sous Windows. Installe Java 21 manuellement.");
  }

  const zipPath = path.join(paths.javaDir, "temurin21.zip");
  await downloadFile(temurinUrl(), zipPath, (p) => onProgress && onProgress("Téléchargement de Java 21...", p));

  onProgress && onProgress("Extraction de Java...", 1);
  new AdmZip(zipPath).extractAllTo(paths.javaDir, true);
  try {
    fs.unlinkSync(zipPath);
  } catch {
    // ignore
  }

  const javaw = findBundledJava(paths, JAVA_BIN);
  if (!javaw) throw new Error("Java n'a pas pu être installé.");
  return javaw;
}

// Resolves the console java executable next to a javaw path (installers need stdout).
function consoleJava(javaPath) {
  if (javaPath.toLowerCase().endsWith("javaw.exe")) {
    const candidate = javaPath.slice(0, -"javaw.exe".length) + JAVA_BIN_CONSOLE;
    if (fs.existsSync(candidate)) return candidate;
  }
  return javaPath;
}

module.exports = { ensureJava, consoleJava };
