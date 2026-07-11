import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

/**
 * Dashboard page.
 * Gives the student a quick-glance summary pulled from every collection:
 * profile completeness, latest resume ATS score, career rec count, and
 * roadmap progress - each card links to the page that owns that data.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [careerCount, setCareerCount] = useState(0);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      const results = await Promise.allSettled([
        axiosClient.get("/profile"),
        axiosClient.get("/resume"),
        axiosClient.get("/career"),
        axiosClient.get("/roadmap"),
      ]);

      if (results[0].status === "fulfilled") setProfile(results[0].value.data);
      if (results[1].status === "fulfilled") setResumeCount(results[1].value.data.length);
      if (results[2].status === "fulfilled") setCareerCount(results[2].value.data.careers?.length || 0);
      if (results[3].status === "fulfilled") setRoadmap(results[3].value.data);

      setLoading(false);
    };
    loadAll();
  }, []);

  const cards = [
    {
      label: "Profile status",
      value: profile?.profileSummary ? "Analyzed" : profile ? "Needs analysis" : "Not started",
      to: "/profile",
      accent: "from-accent-indigo to-accent-blue",
    },
    {
      label: "Skill readiness",
      value: profile?.skillGapAnalysis?.readinessScore != null ? `${profile.skillGapAnalysis.readinessScore}%` : "—",
      to: "/profile",
      accent: "from-accent-violet to-accent-indigo",
    },
    {
      label: "Career matches",
      value: careerCount || "—",
      to: "/careers",
      accent: "from-accent-cyan to-accent-blue",
    },
    {
      label: "Resume reports",
      value: resumeCount || "—",
      to: "/resume",
      accent: "from-accent-blue to-accent-violet",
    },
  ];

  return (
    <DashboardLayout title={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`}>
      {loading ? (
        <p className="text-ink-500">Loading your dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Link key={card.label} to={card.to} className="glass-panel group p-5 transition-transform hover:scale-[1.02]">
                <div className={`mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r ${card.accent}`} />
                <p className="text-sm text-ink-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{card.value}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass-panel p-6">
              <h2 className="mb-2 text-lg font-semibold text-white">Profile summary</h2>
              {profile?.profileSummary ? (
                <p className="text-sm leading-relaxed text-ink-300">{profile.profileSummary}</p>
              ) : (
                <p className="text-sm text-ink-500">
                  You haven't run profile analysis yet.{" "}
                  <Link to="/profile" className="text-accent-cyan hover:underline">
                    Complete your profile
                  </Link>{" "}
                  to unlock career recommendations.
                </p>
              )}
            </div>

            <div className="glass-panel p-6">
              <h2 className="mb-2 text-lg font-semibold text-white">Next roadmap step</h2>
              {roadmap?.steps?.length ? (
                <div>
                  <p className="text-sm font-medium text-ink-100">{roadmap.steps[0].step}</p>
                  <p className="mt-1 text-sm text-ink-500">{roadmap.steps[0].description}</p>
                  <Link to="/roadmap" className="mt-3 inline-block text-sm text-accent-cyan hover:underline">
                    View full roadmap →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-ink-500">
                  No roadmap generated yet.{" "}
                  <Link to="/roadmap" className="text-accent-cyan hover:underline">
                    Generate one
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
