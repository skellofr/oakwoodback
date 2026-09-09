const express = require("express");
const { requireAdmin } = require("../auth/session");
const { appendAnnouncement, removeAnnouncement, listAnnouncements } = require("../feedStore");

const router = express.Router();
router.use(requireAdmin);
router.use(express.json());

router.get("/", (req, res) => res.json({ announcements: listAnnouncements() }));

router.post("/", (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: "titre et contenu requis" });
  appendAnnouncement({ title, body });
  res.json({ ok: true, announcements: listAnnouncements() });
});

router.post("/delete", (req, res) => {
  const id = Number(req.body.id);
  if (!id) return res.status(400).json({ error: "id requis" });
  removeAnnouncement(id);
  res.json({ ok: true, announcements: listAnnouncements() });
});

module.exports = router;
