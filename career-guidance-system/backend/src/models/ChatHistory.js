const mongoose = require("mongoose");

/**
 * ChatHistory schema
 * Stores the running conversation between a student and the Career
 * Chatbot Agent. One document per student; messages are appended.
 */
const chatHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatHistory", chatHistorySchema);
