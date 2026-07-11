import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import axiosClient from "../api/axiosClient";

/**
 * ResumeUpload page.
 * Uploads a PDF to POST /api/resume/upload (multipart/form-data), which
 * runs the Resume Analyzer Agent and returns an ATS score + feedback.
 * Also lists past reports.
 */
export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState(null);
  const [reports, setReports] = useState([]);

  const loadReports = () => {
    axiosClient.get("/resume").then(({ data }) => {
      setReports(data);
      if (data.length) setLatest(data[0]);
    });
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const { data } = await axiosClient.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLatest(data);
      loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const scoreColor = (score) => {
    if (score >= 75) return "text-emerald-300";
    if (score >= 50) return "text-amber-300";
    return "text-rose-300";
  };

  return (
    <DashboardLayout title="Resume Upload">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Upload your resume (PDF)</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 px-4 py-10 text-center transition-colors hover:border-accent-indigo">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <span className="text-sm text-ink-300">
                {file ? file.name : "Click to select a PDF resume"}
              </span>
              <span className="mt-1 text-xs text-ink-500">Max 5MB</span>
            </label>

            {error && <p className="text-sm text-rose-300">{error}</p>}

            <button type="submit" disabled={!file || uploading} className="btn-primary w-full">
              {uploading ? "Analyzing with AI..." : "Upload & analyze"}
            </button>
          </form>

          {reports.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-ink-100">Past reports</h3>
              <ul className="space-y-2">
                {reports.map((r) => (
                  <li key={r._id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span className="truncate text-ink-300">{r.fileName}</span>
                    <span className={`font-semibold ${scoreColor(r.atsScore)}`}>{r.atsScore}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="glass-panel p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">ATS report</h2>
          {latest ? (
            <>
              <div className="mb-5 flex items-center gap-4">
                <div className={`text-5xl font-bold ${scoreColor(latest.atsScore)}`}>{latest.atsScore}</div>
                <div>
                  <p className="text-sm text-ink-300">ATS compatibility score</p>
                  <p className="text-xs text-ink-500">out of 100</p>
                </div>
              </div>
              <h3 className="mb-2 text-sm font-semibold text-ink-100">Suggested improvements</h3>
              <ul className="space-y-2">
                {latest.feedback?.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-300">
                    <span className="text-accent-cyan">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ink-500">Upload a resume to see your ATS score and feedback here.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
