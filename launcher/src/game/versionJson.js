const os = require("os");

function currentOsName() {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "osx";
    default:
      return "linux";
  }
}

const OS_NAME = currentOsName();

// Evaluates a version-json "rules" array for the current OS. Feature rules never apply.
function rulesAllow(element) {
  const rules = element.rules;
  if (!Array.isArray(rules)) return true;

  let allowed = false;
  for (const rule of rules) {
    let applies = true;
    if (rule.features) applies = false;
    if (rule.os && rule.os.name) applies = applies && rule.os.name === OS_NAME;
    const action = rule.action || "allow";
    if (applies) allowed = action === "allow";
  }
  return allowed;
}

// net.neoforged:neoforge:21.1.249[:classifier][@ext] -> group/artifact/version/file
function mavenToPath(coords) {
  let ext = "jar";
  const at = coords.indexOf("@");
  if (at >= 0) {
    ext = coords.slice(at + 1);
    coords = coords.slice(0, at);
  }
  const parts = coords.split(":");
  const group = parts[0].replace(/\./g, "/");
  const artifact = parts[1];
  const version = parts[2];
  const classifier = parts.length > 3 ? "-" + parts[3] : "";
  return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.${ext}`;
}

function replacePlaceholders(input, placeholders) {
  return input.replace(/\$\{([^}]+)\}/g, (m, key) => (key in placeholders ? placeholders[key] : m));
}

// Collects "jvm" or "game" arguments from a version-json arguments block.
function collectArguments(root, type, placeholders) {
  const result = [];
  const args = root.arguments && root.arguments[type];
  if (!Array.isArray(args)) return result;

  for (const arg of args) {
    if (typeof arg === "string") {
      result.push(replacePlaceholders(arg, placeholders));
    } else if (arg && typeof arg === "object") {
      if (!rulesAllow(arg)) continue;
      const value = arg.value;
      if (typeof value === "string") result.push(replacePlaceholders(value, placeholders));
      else if (Array.isArray(value)) result.push(...value.map((v) => replacePlaceholders(v, placeholders)));
    }
  }
  return result;
}

module.exports = { rulesAllow, mavenToPath, collectArguments, replacePlaceholders, OS_NAME };
