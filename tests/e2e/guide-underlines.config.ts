import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: ".",
  testMatch: "guide-underlines.spec.ts",
  workers: 1,
  timeout: 45_000,
  outputDir: join(tmpdir(), "guide-underlines-browser-results"),
  reporter: "list",
  use: {
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
});
