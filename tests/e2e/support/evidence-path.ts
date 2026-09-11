import { test } from "@playwright/test";

/**
 * Where a captured screenshot or proof file goes.
 *
 * Several specs photograph a click path for owner review, and some of them
 * used to write straight into `docs/agent/evidence/`. That tree is tracked,
 * and the harness-integrity teardown (`scripts/dev-lab/verify-evidence.ts`)
 * asserts two things after every browser run: that the source digest is
 * unchanged, and that no tracked file under `docs/agent/evidence` moved.
 * Writing a capture there during an ordinary run breaks both at once — which
 * is exactly what the guard is for. A suite must not rewrite the historical
 * proof it is supposed to be measured against.
 *
 * So by default a capture lands in the run's own output directory: every
 * assertion still executes, the pictures are still produced, and nothing
 * tracked is touched. An explicit capture run — `PG_CAPTURE_EVIDENCE=1` —
 * writes the committed path instead, which is the only time refreshing
 * owner-review images is the intent rather than a side effect. That run is
 * expected to trip the teardown, because on that run the mutation is real.
 *
 * `trackedDirectory` is repository-relative, e.g. "docs/agent/evidence/people1".
 */
export function capturePath(trackedDirectory: string, name: string): string {
  return process.env.PG_CAPTURE_EVIDENCE === "1"
    ? `${trackedDirectory}/${name}`
    : test.info().outputPath(name);
}

/**
 * The directory form, for specs that mkdir once and join many names into it.
 * Returns null when this is not a capture run, so a caller can skip the write
 * entirely rather than produce files nobody asked for.
 */
export function captureDirectory(trackedDirectory: string): string | null {
  return process.env.PG_CAPTURE_EVIDENCE === "1" ? trackedDirectory : null;
}
