import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * The repository's scripts load the simulation through tsx, not through
 * vitest, and the two resolve an import cycle differently. On 2026-09-22 an
 * import from relationship-absence.ts into people-contact.ts closed a cycle
 * through queries.ts; every unit test still passed, while
 * `npm run corpus:prose` crashed with "__name is not a function" and no branch
 * could regenerate the prose inventory. This loads the whole simulation the
 * way the scripts do.
 */
describe("the simulation under the scripts' loader", () => {
  it("loads its whole public surface without crashing", () => {
    const entry = resolve("src/simulation/index.ts");
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        `await import(${JSON.stringify(entry)}); console.log("loaded");`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    expect(output.trim()).toBe("loaded");
  }, 120_000);
});
