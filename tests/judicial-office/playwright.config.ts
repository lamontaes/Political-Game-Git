import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 5196);
export default defineConfig({
  testDir: ".",
  testMatch: "*.browser.ts",
  outputDir: "../../test-results/jud-work2/browser",
  workers: 1,
  fullyParallel: false,
  reporter: [["line"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices["Desktop Chrome"],
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node scripts/dev-identified.mjs --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
