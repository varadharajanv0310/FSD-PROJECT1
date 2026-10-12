import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Two builds:
 * - default: the web client, served by the Express API in production.
 * - `--mode standalone`: one self-contained HTML file that runs the whole app
 *   (offline engine + device storage) with no server at all.
 */
export default defineConfig(({ mode }) => {
  const standalone = mode === "standalone";

  return {
    plugins: [react(), tailwindcss(), ...(standalone ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    define: {
      "import.meta.env.VITE_STANDALONE": JSON.stringify(standalone ? "true" : "false"),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        // The standalone build reuses the server's environment-free modules
        // (server/src/core and the offline engine) directly.
        "@server": fileURLToPath(new URL("../server/src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:4000", changeOrigin: true },
      },
    },
    build: standalone
      ? {
          target: "es2022",
          outDir: "dist-standalone",
          emptyOutDir: true,
          // Inline every asset (fonts included) so the file works anywhere, offline.
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          cssCodeSplit: false,
          chunkSizeWarningLimit: 5000,
        }
      : {
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
  };
});
