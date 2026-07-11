const axios = require("axios");
const LearningRoadmap = require("../models/LearningRoadmap");
const StudentProfile = require("../models/StudentProfile");

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

/**
 * @route   POST /api/roadmap/generate
 * @desc    Runs the Learning Roadmap Agent + Course Recommendation Agent
 *          (chained in the graph) using the student's stored skill gap,
 *          and saves the combined result.
 * @access  Private
 */
const generateRoadmap = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile || !profile.skillGapAnalysis?.missingSkills?.length) {
      return res.status(400).json({
        message: "Run profile analysis first (POST /api/profile/analyze) before generating a roadmap.",
      });
    }

    const agentResponse = await axios.post(`${AGENT_SERVICE_URL}/api/agent/invoke`, {
      thread_id: profile.agentThreadId,
      request_type: "learning_roadmap",
    });

    const { steps, certifications, projects, courses } = agentResponse.data.roadmap;

    const roadmap = await LearningRoadmap.create({
      user: req.user._id,
      steps,
      certifications,
      projects,
      courses,
    });

    return res.status(201).json(roadmap);
  } catch (error) {
    if (error.response) {
      return res.status(502).json({ message: "Agent service error", detail: error.response.data });
    }
    next(error);
  }
};

/**
 * @route   GET /api/roadmap
 * @desc    Get the student's most recent learning roadmap.
 * @access  Private
 */
const getRoadmap = async (req, res, next) => {
  try {
    const roadmap = await LearningRoadmap.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!roadmap) {
      return res.status(404).json({ message: "No roadmap found yet." });
    }
    return res.status(200).json(roadmap);
  } catch (error) {
    next(error);
  }
};

module.exports = { generateRoadmap, getRoadmap };
