import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: { port: 5173 },
  build: {
    // Split heavy vendors so a repeat visit on mobile data only refetches app code.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          motion: ["framer-motion"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // injectManifest → we own src/sw.ts so it can carry the push handlers.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: null, // registered manually in main.tsx
      includeAssets: ["icons/apple-touch-icon-180.png", "icons/favicon.svg"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
      manifest: {
        name: "Esabel Santos Beleza",
        short_name: "ESB Agenda",
        description: "Agenda interna do salão Esabel Santos Beleza",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#faf7f5",
        theme_color: "#b76e79",
        categories: ["business", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      devOptions: { enabled: true, type: "module" },
    }),
  ],
});
