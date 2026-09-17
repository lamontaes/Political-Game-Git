import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../src/presentation/shell-navigation";

/**
 * The packaged transfer proof (desktop/scripts/transfer-test.mjs) compares a
 * seeded interface with its export byte for byte, and it only runs in the
 * hosted packaging job. A preference added to the shell without being added
 * to that seed fails there on every platform; this catches it in the unit run.
 */
describe("desktop transfer proof seed", () => {
  it("names every current shell preference", () => {
    const script = readFileSync("desktop/scripts/transfer-test.mjs", "utf8");
    const missing = Object.keys(DEFAULT_PREFERENCES).filter(
      (key) => !new RegExp(`\\b${key}:`).test(script),
    );
    expect(missing).toEqual([]);
  });
});
