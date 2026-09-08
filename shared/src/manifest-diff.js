/**
 * Manifest shape (server-hosted manifest.json):
 * {
 *   modpackVersion: number,
 *   minecraftVersion: string,
 *   neoforgeVersion: string,
 *   files: [{ path: string, hash: string, size: number, url: string }]
 * }
 *
 * localFiles shape (computed from the local .oakwoodatm instance folder):
 * [{ path: string, hash: string }]
 */

function diffManifest(localFiles, remoteManifest) {
  const localByPath = new Map(localFiles.map((f) => [f.path, f]));
  const remoteByPath = new Map(remoteManifest.files.map((f) => [f.path, f]));

  const toDownload = [];
  for (const remoteFile of remoteManifest.files) {
    const local = localByPath.get(remoteFile.path);
    if (!local || local.hash !== remoteFile.hash) {
      toDownload.push(remoteFile);
    }
  }

  const toDelete = [];
  for (const localFile of localFiles) {
    if (!remoteByPath.has(localFile.path)) {
      toDelete.push(localFile.path);
    }
  }

  return { toDownload, toDelete };
}

module.exports = { diffManifest };
