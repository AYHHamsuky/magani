import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  // @magani/ui lives outside this app; make it use this app's React and router, not the
  // mobile app's copies hoisted to the repo root.
  resolve: { alias: { "@": path.resolve(__dirname, "src") }, dedupe: ["react", "react-dom", "react-router-dom"] },
  server: { proxy: { "/api": "http://localhost:4000" } },
});
