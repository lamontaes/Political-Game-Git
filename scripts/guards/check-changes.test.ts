import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { approves, checkChanges } from "./check-changes.mjs";

const rules = JSON.parse(
  readFileSync("tests/guards/check-changes.json", "utf8"),
);

// The marks are spelled in pieces so this file does not carry them itself.
const mark = (name: string) => `it.${name}("a case", () => {});\n`;
const plain = 'it("a case", () => { expect(1).toBe(1); });\n';
const ids = (
  path: string,
  before: string | null,
  after: string | null,
): string[] => checkChanges([{ path, before, after }], rules).map((f) => f.id);

describe("check-changes: what a pull request may not add to its own checks", () => {
  it("refuses each added mark, in a new file or an old one", () => {
    for (const name of ["fails", "skip", "only", "todo", "skipIf", "runIf"]) {
      expect(ids("src/a.test.ts", null, mark(name)), name).toContain(
        "expected-failure",
      );
      expect(ids("src/a.test.ts", plain, plain + mark(name)), name).toContain(
        "expected-failure",
      );
    }
    expect(
      ids("src/a.test.ts", plain, `describe.${"skip"}("x", () => {});` + plain),
    ).toContain("expected-failure");
    expect(
      ids("src/a.test.ts", plain, `x${"it"}("x", () => {});` + plain),
    ).toContain("expected-failure");
    expect(
      ids(
        "src/a.test.ts",
        plain,
        `(red ? it.${"fails"} : it)("x", () => {});` + plain,
      ),
    ).toContain("expected-failure");
  });

  it("lets a mark move or come out, and ignores marks outside test files", () => {
    const one = mark("fails");
    expect(ids("src/a.test.ts", one + plain, plain + one)).toEqual([]);
    expect(ids("src/a.test.ts", one + plain, plain + plain)).toEqual([]);
    expect(ids("docs/notes.md", null, one)).toEqual([]);
  });

  it("refuses a new known-red row and a new failing-today row", () => {
    const row = `{ "table": "x", "${"knownRed"}": "some-item" }`;
    expect(ids("src/core2/data/opening/day-zero.json", "{}", row)).toEqual([
      "known-red-row",
    ]);
    const failing = (rows: number) =>
      `const FAILING = {\n${'  "a check": { owner: "X" },\n'.repeat(rows)}};\n`;
    expect(
      ids(
        "tests/golden-path/played-world.node-test.ts",
        failing(2),
        failing(3),
      ),
    ).toEqual(["failing-today-row"]);
    expect(
      ids(
        "tests/golden-path/played-world.node-test.ts",
        failing(3),
        failing(2),
      ),
    ).toEqual([]);
  });

  it("refuses a test newly pinned to a named town or seed", () => {
    const seed = "a".repeat(64);
    for (const pin of [
      `build({ ${"placeKey"}: "2264905" });`,
      `const SEED = "${seed}";`,
      `const PINS = [{ ${"key"}: "territory:GU:inarajan" }];`,
      `process.env.GOLDEN_PATH_${"SEED"} = seed;`,
    ])
      expect(ids("src/a.test.ts", plain, plain + pin), pin).toEqual([
        "pinned-place-or-seed",
      ]);
    // A drawn place carries no literal key or seed.
    expect(
      ids(
        "src/a.test.ts",
        plain,
        plain + 'const place = drawPlace(seed, "a");',
      ),
    ).toEqual([]);
    // Reading the replay seed is not a pin.
    expect(
      ids(
        "src/a.test.ts",
        plain,
        plain + "const s = process.env.GOLDEN_PATH_SEED;",
      ),
    ).toEqual([]);
  });

  it("refuses a deleted test file, dropped cases and dropped assertions", () => {
    expect(ids("src/a.test.ts", plain, null)).toEqual(["test-deleted"]);
    expect(ids("src/a.test.ts", plain + plain, plain)).toEqual([
      "cases-dropped",
      "assertions-dropped",
    ]);
    expect(ids("src/a.test.ts", plain, 'it("a case", () => {});\n')).toEqual([
      "assertions-dropped",
    ]);
    expect(ids("src/a.test.ts", plain, plain + plain)).toEqual([]);
    expect(ids("src/a.ts", "expect(1)", null)).toEqual([]);
  });

  it("refuses a baseline that grows, and lets one shrink", () => {
    const list = (rows: number) =>
      JSON.stringify({ files: Array(rows).fill("a") }, null, 2);
    expect(
      ids("tests/guards/families-baseline.json", list(2), list(3)),
    ).toEqual(["baseline-raised"]);
    expect(
      ids("tests/guards/families-baseline.json", list(3), list(2)),
    ).toEqual([]);
    expect(
      ids(
        "data/research/nationwide1/chief-executive-baseline-51.json",
        list(2),
        list(3),
      ),
    ).toEqual([]);
  });

  it("refuses a change to its own rules, script or workflow", () => {
    for (const file of rules.ownFiles)
      expect(ids(file, "a", "b")).toContain("own-rules");
  });

  it("takes an approval only from a line that starts with CTO and names the pull request", () => {
    expect(approves("CTO: check change approved #9801", 9801, rules)).toBe(
      true,
    );
    expect(
      approves(
        "Status.\nCTO: I approve the pin in #9801, one place.",
        9801,
        rules,
      ),
    ).toBe(true);
    expect(approves("CTO: check change approved #98011", 9801, rules)).toBe(
      false,
    );
    expect(approves("CTO: check change approved #9800", 9801, rules)).toBe(
      false,
    );
    expect(approves("Long game: approved #9801", 9801, rules)).toBe(false);
    expect(approves("CTO: not yet for #9801", 9801, rules)).toBe(false);
    expect(approves("> CTO: approved #9801", 9801, rules)).toBe(false);
  });
});
