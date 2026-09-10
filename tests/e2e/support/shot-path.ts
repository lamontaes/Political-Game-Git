import { test } from "@playwright/test";

/**
 * Where a captured screenshot goes.
 *
 * These specs photograph the docket click path for owner review, and they used
 * to write straight into `docs/agent/evidence/leg-content1/`. That path is
 * tracked, and main's harness-integrity teardown (`scripts/dev-lab/
 * verify-evidence.ts`) asserts two things after every browser run: that the
 * source digest is unchanged, and that no tracked file under
 * `docs/agent/evidence` moved. Writing a PNG there during an ordinary run
 * breaks both, which is exactly what the guard is for — a suite must not
 * rewrite the historical proof it is supposed to be measured against.
 *
 * So by default the images land in the run's own output directory, where every
 * assertion still executes and the pictures are still produced, but nothing
 * tracked is touched. An explicit capture run — `PG_CAPTURE_EVIDENCE=1` —
 * refreshes the committed images on purpose, which is the only time rewriting
 * them is the intent rather than a side effect.
 */
export function shotPath(name: string): string {
  return process.env.PG_CAPTURE_EVIDENCE === "1"
    ? `docs/agent/evidence/leg-content1/${name}`
    : test.info().outputPath(name);
}
