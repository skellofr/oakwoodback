const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LAUNCHER_DIR = path.join(__dirname, "..");
const CONFIG_PATH = path.join(LAUNCHER_DIR, "publish.config.json");
const PKG_PATH = path.join(LAUNCHER_DIR, "package.json");

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("\n❌ Fichier publish.config.json manquant.");
    console.error("   Copie publish.config.example.json en publish.config.json et mets-y ton token serveur.\n");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

async function main() {
  const cfg = readConfig();
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));

  // 1) Bump the patch version automatically.
  const [maj, min, pat] = pkg.version.split(".").map(Number);
  pkg.version = `${maj}.${min}.${pat + 1}`;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`\n➡️  Nouvelle version : ${pkg.version}\n`);

  // 2) Build the installer.
  console.log("🔨 Construction de l'installeur (peut prendre 1-2 min)...\n");
  execSync("npm run dist", { cwd: LAUNCHER_DIR, stdio: "inherit" });

  // 3) Upload the update artifacts to the server.
  const distDir = path.join(LAUNCHER_DIR, "dist");
  const setupName = `Oakwood ATM10 Launcher Setup ${pkg.version}.exe`;
  const files = ["latest.yml", setupName, `${setupName}.blockmap`];

  const form = new FormData();
  for (const name of files) {
    const filePath = path.join(distDir, name);
    if (!fs.existsSync(filePath)) {
      console.error(`\n❌ Fichier introuvable : ${name}`);
      process.exit(1);
    }
    form.append("files", new Blob([fs.readFileSync(filePath)]), name);
  }

  console.log("\n📤 Envoi vers le serveur...");
  const res = await fetch(`${cfg.server}/admin/release`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}` },
    body: form,
  });
  if (!res.ok) {
    console.error(`\n❌ Envoi échoué (${res.status}) : ${await res.text()}`);
    process.exit(1);
  }

  console.log(`\n✅ Version ${pkg.version} publiée ! Les launchers installés se mettront à jour au démarrage.\n`);
}

main().catch((err) => {
  console.error("\n❌ Erreur :", err.message);
  process.exit(1);
});
