import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const webPort = Number(process.env.PLAINBASE_WEB_PORT ?? process.env.PORT ?? 5173);
const apiPort = Number(process.env.PLAINBASE_API_PORT ?? 3001);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true
      }
    }
  }
});
