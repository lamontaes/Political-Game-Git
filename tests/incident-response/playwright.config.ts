import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  testDir: ".",
  testMatch: "*.browser.ts",
  workers: 1,
  reporter: "line",
  outputDir: "../../test-results/incident-response7/browser",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    baseURL: "http://127.0.0.1:5217",
  },
  webServer: {
    command:
      "node scripts/dev-identified.mjs --host 127.0.0.1 --port 5217 --strictPort",
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: "http://127.0.0.1:5217",
    reuseExistingServer: false,
  },
});
