const mongoose = require("mongoose");

/**
 * ResumeReport schema
 * Stores each resume upload's extracted text, ATS score, and
 * improvement feedback from the Resume Analyzer Agent.
 */
const resumeReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileName: String,
    resumeText: String,
    atsScore: Number,
    feedback: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResumeReport", resumeReportSchema);
