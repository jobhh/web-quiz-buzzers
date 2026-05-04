import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: "client",
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "shared/src"),
      "@client": resolve(__dirname, "client/src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
      // Forward HTTP API + static media/audio to Bun in dev. Without this,
      // Vite's SPA fallback would 200-return index.html for these paths and
      // confuse the client.
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/audio": { target: "http://localhost:3000", changeOrigin: true },
      "/media": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
