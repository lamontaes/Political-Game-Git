import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Both sides use a fresh server, dependency transformation and browser context.
// Keep the original test's 30-second budget; do not split its twelve loads.
export default defineConfig({
  ...base,
  testDir: "./tests/acceptance",
  testMatch: "municipal-load.browser.ts",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  webServer: {
    ...base.webServer,
    command: `${(base.webServer as { command: string }).command} --force`,
    reuseExistingServer: false,
  },
});
