const axios = require("axios");
const StudentProfile = require("../models/StudentProfile");
const CareerRecommendation = require("../models/CareerRecommendation");
const LearningRoadmap = require("../models/LearningRoadmap");

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

/**
 * @route   POST /api/profile
 * @desc    Create or update the student's profile (education, interests, goals, skills)
 * @access  Private
 */
const upsertProfile = async (req, res, next) => {
  try {
    const { education, interests, goals, currentSkills, targetRole } = req.body;

    let profile = await StudentProfile.findOne({ user: req.user._id });

    if (profile) {
      profile.education = education ?? profile.education;
      profile.interests = interests ?? profile.interests;
      profile.goals = goals ?? profile.goals;
      profile.currentSkills = currentSkills ?? profile.currentSkills;
      profile.targetRole = targetRole ?? profile.targetRole;
    } else {
      // Each student gets a stable thread id so the LangGraph checkpointer
      // can persist and recall conversational/agent memory across requests.
      profile = new StudentProfile({
        user: req.user._id,
        education,
        interests,
        goals,
        currentSkills,
        targetRole,
        agentThreadId: `student-${req.user._id}`,
      });
    }

    await profile.save();
    return res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/profile
 * @desc    Get the current student's profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found. Please create one first." });
    }
    return res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/profile/analyze
 * @desc    Runs the LangGraph agent pipeline (Orchestrator -> Profile Analysis -> Skill Assessment)
 *          against the student's stored profile and persists the agent output.
 * @access  Private
 */
const analyzeProfile = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found. Please create one first." });
    }

    // Call the Python LangGraph microservice. This is a REAL graph invocation,
    // not a mocked response - see agent-service/graph.py for the StateGraph definition.
    const agentResponse = await axios.post(`${AGENT_SERVICE_URL}/api/agent/invoke`, {
      thread_id: profile.agentThreadId,
      request_type: "full_pipeline", // triggers orchestrator's conditional routing
      education: profile.education,
      interests: profile.interests,
      goals: profile.goals,
      current_skills: profile.currentSkills,
      target_role: profile.targetRole,
    });

    const { profile_summary, skill_gap, recommended_careers, roadmap } = agentResponse.data;

    profile.profileSummary = profile_summary;
    profile.skillGapAnalysis = skill_gap;
    await profile.save();

    // full_pipeline also produces career recommendations and a roadmap in
    // the same graph run, so persist those to their own collections too.
    let careerRecommendation = null;
    if (recommended_careers?.length) {
      careerRecommendation = await CareerRecommendation.create({
        user: req.user._id,
        careers: recommended_careers,
      });
    }

    let learningRoadmap = null;
    if (roadmap?.steps?.length) {
      learningRoadmap = await LearningRoadmap.create({
        user: req.user._id,
        steps: roadmap.steps,
        certifications: roadmap.certifications,
        projects: roadmap.projects,
        courses: roadmap.courses,
      });
    }

    return res.status(200).json({ profile, careerRecommendation, learningRoadmap });
  } catch (error) {
    if (error.response) {
      // Forward errors coming from the agent microservice with useful context
      return res.status(502).json({
        message: "Agent service error",
        detail: error.response.data,
      });
    }
    next(error);
  }
};

module.exports = { upsertProfile, getProfile, analyzeProfile };
