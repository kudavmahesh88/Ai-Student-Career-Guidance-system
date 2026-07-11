const express = require("express");
const { generateRoadmap, getRoadmap } = require("../controllers/roadmapController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/generate", protect, generateRoadmap);
router.get("/", protect, getRoadmap);

module.exports = router;
