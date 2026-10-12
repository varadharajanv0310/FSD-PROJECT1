import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Keep the landing page lean: heavy chart dependencies load only
        // with the dashboard.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/recharts|d3-|victory-vendor|@reduxjs|react-redux|immer|reselect|es-toolkit|decimal\.js|eventemitter3|tiny-invariant/.test(id)) return "charts";
          if (/[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return "motion";
          if (/[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return "react";
          return "vendor";
        },
      },
    },
  },
});
