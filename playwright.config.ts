import { defineConfig, devices } from "@playwright/test";

const nodeBinary = process.execPath;

/**
 * The port is overridable because the repository is worked in several git
 * worktrees at once, and `reuseExistingServer` will happily attach to whichever
 * branch got to 4173 first — so one branch's suite silently runs against
 * another branch's build and fails for reasons that are not in its diff.
 * Setting PLAYWRIGHT_PORT gives a concurrent worktree a server of its own. The port
 * default is unchanged; server reuse now requires explicit opt-in plus identity verification.
 */
import { runConfig } from "./scripts/dev-lab/run-config";
import { historicalEvidenceHashes } from "./scripts/dev-lab/historical-evidence";
import { sourceIdentity } from "./scripts/dev-lab/identity";
const run = runConfig();
process.env.PG_RUN_ID = run.runId;
const expectedIdentity = sourceIdentity();

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: `${run.artifacts}/results`,
  globalSetup: "./scripts/dev-lab/verify-server.ts",
  globalTeardown: "./scripts/dev-lab/verify-evidence.ts",
  metadata: {
    expectedIdentity,
    artifacts: run.artifacts,
    historicalEvidence: historicalEvidenceHashes(),
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: run.workers,
  reporter: [
    ["line"],
    ["html", { open: "never", outputFolder: `${run.artifacts}/report` }],
    ...(process.env.CI
      ? ([["json", { outputFile: `${run.artifacts}/results.json` }]] as const)
      : []),
  ],
  use: {
    baseURL: run.baseURL,
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
    command: `"${nodeBinary}" scripts/dev-identified.mjs --host ${run.host} --port ${run.port}`,
    url: `${run.baseURL}/__dev/identity`,
    reuseExistingServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1",
    timeout: 120_000,
  },
});
