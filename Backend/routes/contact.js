const express = require("express");
const multer = require("multer");
const { sendContactMessage } = require("../utils/emails"); // adjust path to match your project

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB per file, max 5 files
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const VALID_TYPES = ["general", "complaint", "wholesale", "support"];

module.exports = () => {
  const router = express.Router();

  router.post("/", upload.array("images", 5), async (req, res) => {
    const { name, email, type, message, lang, orderNumber } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const safeType = VALID_TYPES.includes(type) ? type : "general";

    const attachments = (req.files || []).map((file) => ({
      filename: file.originalname,
      content: file.buffer.toString("base64"),
    }));

    try {
      await sendContactMessage({
        name,
        email,
        type: safeType,
        message,
        lang,
        orderNumber,
        attachments,
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Contact form error:", err);
      return res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Catches multer errors specifically (file too big, wrong type, too many files)
  router.use((err, req, res, next) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });

  return router;
};
