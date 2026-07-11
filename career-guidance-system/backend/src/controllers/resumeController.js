const axios = require("axios");
const pdfParse = require("pdf-parse");
const ResumeReport = require("../models/ResumeReport");
const StudentProfile = require("../models/StudentProfile");

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

/**
 * @route   POST /api/resume/upload
 * @desc    Accepts a PDF resume, extracts its text, sends it to the
 *          Resume Analyzer Agent (LangGraph), and stores the ATS report.
 * @access  Private
 */
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No resume file uploaded. Field name must be 'resume'." });
    }

    // Extract raw text from the uploaded PDF buffer.
    const parsed = await pdfParse(req.file.buffer);
    const resumeText = parsed.text;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ message: "Could not extract any text from this PDF." });
    }

    // Reuse the student's stable thread id so this feeds the same memory
    // thread used by the profile pipeline and chatbot.
    const profile = await StudentProfile.findOne({ user: req.user._id });
    const threadId = profile?.agentThreadId || `student-${req.user._id}`;

    const agentResponse = await axios.post(`${AGENT_SERVICE_URL}/api/agent/invoke`, {
      thread_id: threadId,
      request_type: "resume_analysis",
      resume_text: resumeText,
    });

    const { atsScore, feedback } = agentResponse.data.resume_analysis;

    const report = await ResumeReport.create({
      user: req.user._id,
      fileName: req.file.originalname,
      resumeText,
      atsScore,
      feedback,
    });

    return res.status(201).json(report);
  } catch (error) {
    if (error.response) {
      return res.status(502).json({ message: "Agent service error", detail: error.response.data });
    }
    next(error);
  }
};

/**
 * @route   GET /api/resume
 * @desc    List all resume reports for the current student, most recent first.
 * @access  Private
 */
const getResumeReports = async (req, res, next) => {
  try {
    const reports = await ResumeReport.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(reports);
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadResume, getResumeReports };
