import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("react") ||
            id.includes("scheduler") ||
            id.includes("react-router-dom")
          ) {
            return "react-vendor";
          }

          if (
            id.includes("chart.js") ||
            id.includes("recharts") ||
            id.includes("react-chartjs-2")
          ) {
            return "charts-vendor";
          }

          if (id.includes("framer-motion")) {
            return "motion-vendor";
          }

          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }

          if (
            id.includes("jspdf") ||
            id.includes("docx") ||
            id.includes("html-docx-js")
          ) {
            return "export-vendor";
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
      //target: "http://192.168.15.36:5001",
        target: "http://localhost:5000", // porta real da sua API
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
