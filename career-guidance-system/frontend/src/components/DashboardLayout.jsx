import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "\u25A6" },
  { to: "/profile", label: "Student Profile", icon: "\u25A4" },
  { to: "/resume", label: "Resume Upload", icon: "\u25A1" },
  { to: "/careers", label: "Career Recommendation", icon: "\u25C8" },
  { to: "/roadmap", label: "Learning Roadmap", icon: "\u25B2" },
  { to: "/chat", label: "Chatbot", icon: "\u25CF" },
];

/**
 * DashboardLayout
 * Shared shell for every authenticated page: aurora gradient background,
 * a fixed sidebar with the app's core navigation, and a glass content area.
 * Collapses to a top bar on small screens.
 */
export default function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <div className="aurora-bg" />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="glass-panel m-4 flex shrink-0 flex-col justify-between p-5 md:w-64 md:sticky md:top-4 md:h-[calc(100vh-2rem)]">
          <div>
            <div className="mb-8 flex items-center gap-2 px-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-violet shadow-glow" />
              <span className="font-display text-lg font-bold tracking-tight">Aurora Careers</span>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-ink-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <span className="text-accent-cyan">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="border-t border-white/10 pt-4">
            <p className="truncate px-1 text-sm font-medium text-ink-100">{user?.name}</p>
            <p className="truncate px-1 text-xs text-ink-500">{user?.email}</p>
            <button onClick={handleLogout} className="btn-secondary mt-3 w-full text-sm">
              Log out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {title && <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
}
