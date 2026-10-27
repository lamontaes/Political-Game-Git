/**
 * The outcome web's unwired writer loads from its own entry point
 * (release-outcome-web-unwired-initialization-cycle). Entered there, the
 * group A law-reach registry is reached back through the treasury and budget
 * engines while it is still loading, so a handler it reads at load stops the
 * writer before it writes anything.
 */
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("the outcome web's unwired writer", () => {
  it("loads from its own entry point", () => {
    const run = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        'await import("./scripts/outcome-web/write-unwired.ts"); console.log("loaded");',
      ],
      { encoding: "utf8", timeout: 300_000 },
    );
    expect(run.stderr).not.toMatch(/before initialization/);
    expect(run.stdout.trim().split("\n").at(-1)).toBe("loaded");
    expect(run.status).toBe(0);
  }, 300_000);
});
