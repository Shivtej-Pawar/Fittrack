import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Phase 13 / Feature 5 — turns the built app into an installable
    // PWA. `registerType: "autoUpdate"` means the service worker
    // silently pulls in a new build the next time the app loads,
    // instead of requiring the user to manually clear a stale cache.
    // `workbox.globPatterns` precaches the built JS/CSS/HTML so the
    // shell loads offline; API calls (getWorkouts(), login, etc.) are
    // NOT cached here — this is app-shell offline support, not API
    // response caching. Feature 6's IndexedDB queue (utils/
    // offlineQueue.js) is the actual offline *data* story.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-64.png"],
      manifest: {
        name: "FitTrack",
        short_name: "FitTrack",
        description: "Track every rep. Build every PR.",
        theme_color: "#2563eb",
        background_color: "#030712",
        display: "standalone",
        start_url: "/dashboard",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
