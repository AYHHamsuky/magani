import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") }, dedupe: ["react", "react-dom", "react-router-dom"] },
  server: { port: 5180, strictPort: true, proxy: { "/api": "http://localhost:4100" } },
});
