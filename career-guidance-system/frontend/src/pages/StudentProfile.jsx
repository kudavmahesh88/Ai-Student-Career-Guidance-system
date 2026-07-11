import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import axiosClient from "../api/axiosClient";

const emptyForm = {
  degree: "",
  branch: "",
  year: "",
  cgpa: "",
  interests: "",
  goals: "",
  currentSkills: "",
  targetRole: "",
};

/**
 * StudentProfile page.
 * Lets the student enter/update education, interests, goals and skills
 * (POST /api/profile), then trigger the full LangGraph pipeline
 * (POST /api/profile/analyze) to get a profile summary + skill gap.
 */
export default function StudentProfile() {
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axiosClient
      .get("/profile")
      .then(({ data }) => {
        setProfile(data);
        setForm({
          degree: data.education?.degree || "",
          branch: data.education?.branch || "",
          year: data.education?.year || "",
          cgpa: data.education?.cgpa || "",
          interests: (data.interests || []).join(", "),
          goals: data.goals || "",
          currentSkills: (data.currentSkills || []).join(", "),
          targetRole: data.targetRole || "",
        });
      })
      .catch(() => {}); // No profile yet is expected on first visit
  }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        education: { degree: form.degree, branch: form.branch, year: form.year, cgpa: form.cgpa },
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        goals: form.goals,
        currentSkills: form.currentSkills.split(",").map((s) => s.trim()).filter(Boolean),
        targetRole: form.targetRole,
      };
      const { data } = await axiosClient.post("/profile", payload);
      setProfile(data);
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setMessage("");
    try {
      const { data } = await axiosClient.post("/profile/analyze");
      setProfile(data.profile);
      setMessage("Analysis complete — check Career Recommendation and Roadmap pages for full results.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Analysis failed. Is the agent service running?");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <DashboardLayout title="Student Profile">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSave} className="glass-panel space-y-4 p-6">
          <h2 className="text-lg font-semibold text-white">Education & goals</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Degree</label>
              <input className="input-field" value={form.degree} onChange={handleChange("degree")} placeholder="B.Tech" />
            </div>
            <div>
              <label className="label-text">Branch</label>
              <input className="input-field" value={form.branch} onChange={handleChange("branch")} placeholder="CSE" />
            </div>
            <div>
              <label className="label-text">Year</label>
              <input className="input-field" value={form.year} onChange={handleChange("year")} placeholder="4th" />
            </div>
            <div>
              <label className="label-text">CGPA</label>
              <input className="input-field" value={form.cgpa} onChange={handleChange("cgpa")} placeholder="8.5" />
            </div>
          </div>

          <div>
            <label className="label-text">Interests (comma-separated)</label>
            <input className="input-field" value={form.interests} onChange={handleChange("interests")} placeholder="AI, Web Development" />
          </div>

          <div>
            <label className="label-text">Career goals</label>
            <textarea className="input-field min-h-[80px]" value={form.goals} onChange={handleChange("goals")} placeholder="Become a machine learning engineer at a product company" />
          </div>

          <div>
            <label className="label-text">Current skills (comma-separated)</label>
            <input className="input-field" value={form.currentSkills} onChange={handleChange("currentSkills")} placeholder="Python, JavaScript, SQL" />
          </div>

          <div>
            <label className="label-text">Target role</label>
            <input className="input-field" value={form.targetRole} onChange={handleChange("targetRole")} placeholder="Machine Learning Engineer" />
          </div>

          {message && <p className="text-sm text-accent-cyan">{message}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save profile"}
            </button>
            <button type="button" onClick={handleAnalyze} disabled={analyzing || !profile} className="btn-secondary">
              {analyzing ? "Running LangGraph pipeline..." : "Run AI analysis"}
            </button>
          </div>
        </form>

        <div className="glass-panel space-y-5 p-6">
          <div>
            <h2 className="mb-2 text-lg font-semibold text-white">Profile summary</h2>
            <p className="text-sm leading-relaxed text-ink-300">
              {profile?.profileSummary || "Save your profile, then run AI analysis to generate a summary."}
            </p>
          </div>

          {profile?.skillGapAnalysis?.requiredSkills?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-100">Skill readiness — {profile.skillGapAnalysis.readinessScore}%</h3>
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-accent-cyan"
                  style={{ width: `${profile.skillGapAnalysis.readinessScore || 0}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skillGapAnalysis.matchedSkills?.map((s) => (
                  <span key={s} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                    {s}
                  </span>
                ))}
                {profile.skillGapAnalysis.missingSkills?.map((s) => (
                  <span key={s} className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs text-rose-300">
                    {s} (missing)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
