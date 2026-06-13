import { defineConfig } from "@playwright/test";

const apiPort = 3101;
const webPort = 4173;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${webPort}`,
    headless: true
  },
  webServer: {
    command: "node scripts/e2e-servers.mjs",
    url: `http://localhost:${webPort}`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe"
  }
});
