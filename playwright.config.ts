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
import { dirname, join } from "node:path";
import { gateEntryPoint } from "./scripts/storage/storage-guard.mjs";
import { runConfig } from "./scripts/dev-lab/run-config";
import { historicalEvidenceHashes } from "./scripts/dev-lab/historical-evidence";
import { sourceIdentity } from "./scripts/dev-lab/identity";
const run = runConfig();
// Browser capture writes traces, videos and screenshots; take headroom and
// refuse an over-budget output root BEFORE a server starts. Workers re-import
// this config, so only the first process (no TEST_WORKER_INDEX) gates.
if (process.env.TEST_WORKER_INDEX === undefined)
  gateEntryPoint({
    operation: "e2e-capture",
    outputRoots: [dirname(run.artifacts)],
    // This run's own directory: output cleanup keeps it while we are alive.
    outputPaths: [run.artifacts],
  });
process.env.PG_RUN_ID = run.runId;
// The Art Desk bridge can write to the owner's persistent store and shared
// Drive mirror by default. Every browser run must use its own disposable store,
// including when the runner inherited a live app's environment.
const artbenchDataRoot = join(run.artifacts, "artbench");
process.env.PG_ARTBENCH_DATA_ROOT = artbenchDataRoot;
process.env.PG_ARTBENCH_DRIVE_ROOT = join(run.artifacts, "artbench-exchange");
process.env.PG_ARTBENCH_OWNER_ID = "e2e-fixture-owner";
const expectedIdentity = sourceIdentity();

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: `${run.artifacts}/results`,
  globalSetup: "./scripts/dev-lab/verify-server.ts",
  globalTeardown: "./scripts/dev-lab/verify-evidence.ts",
  metadata: {
    expectedIdentity,
    artifacts: run.artifacts,
    artbenchDataRoot,
    historicalEvidence: historicalEvidenceHashes(),
  },
  /*
   * A budget sized from what the walks actually cost, not from the default.
   *
   * This suite never set a `timeout`, so every case inherited Playwright's
   * thirty seconds. That is below what an ordinary walk in this game costs:
   * a case here opens the creator, answers every stage, enters a life and
   * then does its actual work, and the simulation runs for real throughout.
   * Measured on this machine at two workers, the docket route's own cases
   * take 42.9 s, 43.6 s, 55.7 s and two at 60 s — all of them passing, none
   * of them hung. Sixty of the suite's failures were that: a walk killed
   * part-way and reported as a timeout, which reads like a broken screen.
   *
   * Two minutes is a little over twice the slowest legitimate case measured
   * here, which leaves room for a CI runner slower than this one without
   * leaving a genuinely hung test spinning for minutes before it is called.
   * It is deliberately not generous: the sixty-second docket cases are close
   * enough to this ceiling to be worth watching, and the point of writing the
   * number down is that it can be argued with rather than silently inherited.
   *
   * Raising this does not hide anything. It uncovers: giving the cluster more
   * time surfaced assertions that were already wrong and had been dying
   * before they could be reached. A file that needs longer still says so
   * itself, and `test.setTimeout` still wins over this.
   */
  timeout: 120_000,
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
    /*
     * Safari's engine, on request: PG_E2E_WEBKIT=1 adds it without changing
     * the default run. Needs `npx playwright install webkit` once.
     */
    ...(process.env.PG_E2E_WEBKIT === "1"
      ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }]
      : []),
  ],
  webServer: {
    command: `"${nodeBinary}" scripts/dev-identified.mjs --host ${run.host} --port ${run.port}`,
    url: `${run.baseURL}/__dev/identity`,
    reuseExistingServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1",
    timeout: 120_000,
  },
});
