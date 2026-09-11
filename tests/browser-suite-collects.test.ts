import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The browser suite can still be collected at all.
 *
 * This exists because of a failure that was invisible in exactly the way that
 * matters. `src/simulation/municipal-capacity.ts` imported a JSON file without
 * an import attribute, which Vite and Vitest transform happily. Playwright
 * collects spec files through native Node ESM, where that is a hard error — and
 * it is thrown while COLLECTING, before any test runs, so the whole suite
 * reported `Total: 0 tests in 0 files` and exited without a single failure to
 * point at. Running any single spec by name still passed, which is how it
 * survived: every filtered run looked green while the suite as a whole was
 * loading nothing.
 *
 * A count is the right assertion here. The specific import is already fixed at
 * its own site; what this protects is the property that broke, which is that
 * the suite is loadable — the next module that becomes reachable from a spec's
 * import graph and cannot be loaded by native Node ESM fails here, loudly, in
 * the unit suite, instead of quietly emptying the browser run.
 */
describe("the browser suite", () => {
  const root = resolve(import.meta.dirname, "..");

  it("collects every spec file on disk", () => {
    const onDisk = readdirSync(resolve(root, "tests", "e2e")).filter((name) =>
      name.endsWith(".spec.ts"),
    );
    expect(onDisk.length).toBeGreaterThan(0);

    const listed = execFileSync(
      "npx",
      ["playwright", "test", "--list", "--reporter=list"],
      {
        cwd: root,
        encoding: "utf8",
        // Collection reads the config and the specs; it starts no web server
        // and binds nothing, so this port is only here to satisfy the config's
        // own validation and never has to be free.
        env: { ...process.env, PLAYWRIGHT_PORT: "5417" },
        maxBuffer: 32 * 1024 * 1024,
      },
    );

    const total = /Total:\s+(\d+)\s+tests?\s+in\s+(\d+)\s+files?/.exec(listed);
    expect(total, `no total reported:\n${listed.slice(-2000)}`).not.toBeNull();
    const tests = Number(total![1]);
    const files = Number(total![2]);

    // Every spec on disk is loadable. A module that native Node ESM refuses
    // takes its whole file out of the run, so a shortfall here is the symptom.
    expect(files).toBe(onDisk.length);
    expect(tests).toBeGreaterThan(0);
  }, 180_000);
});
