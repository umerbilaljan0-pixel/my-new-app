import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// One codebase, one web app; Tauri wraps this same build for desktop.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    // allow importing the shared design tokens that live one level up
    fs: { allow: [resolve(__dirname, ".."), __dirname] },
    proxy: {
      "/api": "http://localhost:8000",
      "/v1": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
  build: { outDir: "dist", target: "es2022" },
});
