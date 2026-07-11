const axios = require("axios");
const ChatHistory = require("../models/ChatHistory");
const StudentProfile = require("../models/StudentProfile");

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

/**
 * @route   POST /api/chat
 * @desc    Sends a follow-up question to the Career Chatbot Agent. The
 *          agent automatically recalls prior context (profile, skills,
 *          career recs) via the LangGraph memory checkpointer for this
 *          student's thread_id.
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: "question is required" });
    }

    const profile = await StudentProfile.findOne({ user: req.user._id });
    const threadId = profile?.agentThreadId || `student-${req.user._id}`;

    const agentResponse = await axios.post(`${AGENT_SERVICE_URL}/api/agent/chat`, {
      thread_id: threadId,
      question,
    });

    const { answer } = agentResponse.data;

    // Persist the exchange in Mongo as well, so chat history survives
    // independently of the in-memory LangGraph checkpointer.
    let history = await ChatHistory.findOne({ user: req.user._id });
    if (!history) {
      history = new ChatHistory({ user: req.user._id, messages: [] });
    }
    history.messages.push({ role: "user", content: question });
    history.messages.push({ role: "assistant", content: answer });
    await history.save();

    return res.status(200).json({ answer, history: history.messages });
  } catch (error) {
    if (error.response) {
      return res.status(502).json({ message: "Agent service error", detail: error.response.data });
    }
    next(error);
  }
};

/**
 * @route   GET /api/chat
 * @desc    Get the full chat history for the current student.
 * @access  Private
 */
const getChatHistory = async (req, res, next) => {
  try {
    const history = await ChatHistory.findOne({ user: req.user._id });
    return res.status(200).json(history?.messages || []);
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage, getChatHistory };
