const express = require("express");
const { recommendCareers, getCareerRecommendations } = require("../controllers/careerController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/recommend", protect, recommendCareers);
router.get("/", protect, getCareerRecommendations);

module.exports = router;
