import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "../../convex/_generated": path.resolve(__dirname, "./src/convex-stubs"),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [".", ".."],
    },
  },
});
