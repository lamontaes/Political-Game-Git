import { defineConfig, devices } from "@playwright/test";

const nodeBinary = process.execPath;

/**
 * The port is overridable because the repository is worked in several git
 * worktrees at once, and `reuseExistingServer` will happily attach to whichever
 * branch got to 4173 first — so one branch's suite silently runs against
 * another branch's build and fails for reasons that are not in its diff.
 * Setting PLAYWRIGHT_PORT gives a concurrent worktree a server of its own. The
 * default is unchanged, so CI and a single checkout behave exactly as before.
 */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["line"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" as const }),
      },
    },
  ],
  webServer: {
    command: `"${nodeBinary}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port}`,
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
