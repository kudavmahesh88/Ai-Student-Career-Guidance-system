import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config: React plugin only, dev server proxies /api to the backend
// so the frontend can call relative paths in development.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
