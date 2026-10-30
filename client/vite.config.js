import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // The local Express demo serves this directory while we rebuild it.
  // Retain existing files/chunks so active tabs never see a half-cleared build.
  build: { emptyOutDir: false },
  server: { proxy: { "/api": "http://127.0.0.1:3000" } },
});
