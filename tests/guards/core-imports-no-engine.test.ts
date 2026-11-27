import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  counts,
  exists,
  importsOf,
} from "../../scripts/guards/core-imports-no-engine";

/**
 * The core imports no engine; engines plug in (core audit K2, Nov 26; owner:
 * "the core is where engines plug in, and it can also be very friendly for
 * modders"). A file of the `core` family in tests/guards/families.json (the
 * kernel, the state, the record, the clock, the plug, parameters, starting
 * and saving a world, the choice engine) may not import a file of an engine
 * family. Every import counts, a type import too: the families guard counted
 * the core's type imports of engines before the core was its own family, and
 * a type the core names from an engine is the same dependency in the wrong
 * direction.
 *
 * The families guard leaves the core's outgoing imports out of its own count
 * so that making the core a family raised nothing; they are counted here,
 * per file, and the counts only shrink as the core's hooks (items 6 to 10)
 * replace each one. The baseline is core-imports-no-engine-baseline.json;
 * `node --import tsx scripts/guards/write-core-imports-baseline.ts --shrink-only`
 * rewrites it from the code and refuses a count that rose.
 */
const BASELINE = path.join(__dirname, "core-imports-no-engine-baseline.json");
describe("the core imports no engine", () => {
  const now = counts();
  const known = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<
    string,
    number
  >;

  it("finds an import, a type import and a re-export, and not a package", () => {
    const names = new Set([
      "src/core2/a.ts",
      "src/core2/b.ts",
      "src/core2/c.ts",
      "src/core2/d.ts",
    ]);
    for (const name of names) exists.add(name);
    expect(
      importsOf(
        "src/core2/state.ts",
        'import { x } from "./a"; import type { Y } from "./b"; import { type Z } from "./c"; export { w } from "./d"; import "left-pad";',
      ),
    ).toEqual([
      "src/core2/a.ts",
      "src/core2/b.ts",
      "src/core2/c.ts",
      "src/core2/d.ts",
    ]);
  });

  it("imports no engine that it did not before", () => {
    const over = Object.entries(now)
      .filter(([file, n]) => n > (known[file] ?? 0))
      .map(
        ([file, n]) =>
          `${file}: ${n} imports of engines, ${known[file] ?? 0} known. The core calls an engine through a hook the engine registers (CoreModule), never by importing it.`,
      );
    expect(over).toEqual([]);
  });

  it("only shrinks: lowers a count or drops a file as soon as an import is cut", () => {
    const stale = Object.entries(known)
      .filter(([file, n]) => (now[file] ?? 0) < n)
      .map(([file, n]) => `${file}: lower ${n} to ${now[file] ?? 0}`);
    expect(
      stale,
      "edit tests/guards/core-imports-no-engine-baseline.json",
    ).toEqual([]);
  });
});
