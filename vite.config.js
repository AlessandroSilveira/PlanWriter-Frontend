import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
