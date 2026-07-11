const mongoose = require("mongoose");

/**
 * LearningRoadmap schema
 * Stores the step-by-step roadmap, certifications, projects (Learning
 * Roadmap Agent) and recommended courses (Course Recommendation Agent)
 * for a student.
 */
const learningRoadmapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    steps: [
      {
        step: String,
        description: String,
      },
    ],
    certifications: [String],
    projects: [String],
    courses: [
      {
        title: String,
        platform: String,
        skill: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearningRoadmap", learningRoadmapSchema);
