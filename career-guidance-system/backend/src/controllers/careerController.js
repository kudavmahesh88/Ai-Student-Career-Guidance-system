const axios = require("axios");
const CareerRecommendation = require("../models/CareerRecommendation");
const StudentProfile = require("../models/StudentProfile");

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

/**
 * @route   POST /api/career/recommend
 * @desc    Runs the Career Recommendation Agent using the student's
 *          already-stored profile summary and skill gap, and saves the result.
 * @access  Private
 */
const recommendCareers = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile || !profile.profileSummary) {
      return res.status(400).json({
        message: "Run profile analysis first (POST /api/profile/analyze) before requesting career recommendations.",
      });
    }

    const agentResponse = await axios.post(`${AGENT_SERVICE_URL}/api/agent/invoke`, {
      thread_id: profile.agentThreadId,
      request_type: "career_recommendation",
      target_role: profile.targetRole,
    });

    const careers = agentResponse.data.recommended_careers;

    const recommendation = await CareerRecommendation.create({
      user: req.user._id,
      careers,
    });

    return res.status(201).json(recommendation);
  } catch (error) {
    if (error.response) {
      return res.status(502).json({ message: "Agent service error", detail: error.response.data });
    }
    next(error);
  }
};

/**
 * @route   GET /api/career
 * @desc    Get the student's most recent career recommendations.
 * @access  Private
 */
const getCareerRecommendations = async (req, res, next) => {
  try {
    const recommendation = await CareerRecommendation.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!recommendation) {
      return res.status(404).json({ message: "No career recommendations found yet." });
    }
    return res.status(200).json(recommendation);
  } catch (error) {
    next(error);
  }
};

module.exports = { recommendCareers, getCareerRecommendations };
