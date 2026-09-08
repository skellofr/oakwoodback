function requireUploadToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || token !== process.env.UPLOAD_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

module.exports = { requireUploadToken };
