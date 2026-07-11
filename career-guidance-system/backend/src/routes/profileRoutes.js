const express = require("express");
const { upsertProfile, getProfile, analyzeProfile } = require("../controllers/profileController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, upsertProfile);
router.get("/", protect, getProfile);
router.post("/analyze", protect, analyzeProfile);

module.exports = router;
