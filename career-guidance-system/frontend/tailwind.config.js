/**
 * Tailwind config — "Aurora" design system for the career guidance dashboard.
 * Deep indigo/navy base with electric blue + violet accents and glassmorphic
 * surfaces, per the project's blue/purple theme requirement.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#05061A", // page background
          900: "#0B0F2E", // panel background
          800: "#131A44",
        },
        accent: {
          blue: "#4F7CFF",
          indigo: "#6366F1",
          violet: "#8B5CF6",
          cyan: "#22D3EE",
        },
        ink: {
          100: "#F1F5FF",
          300: "#C4CCE8",
          500: "#8B93B8",
        },
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(15, 15, 60, 0.45)",
        glow: "0 0 40px rgba(99, 102, 241, 0.35)",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.3), transparent 45%), radial-gradient(circle at 50% 100%, rgba(34,211,238,0.18), transparent 40%)",
      },
    },
  },
  plugins: [],
};
