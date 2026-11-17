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

  it("refuses a drawn seed taken out of a test, the commonest pin", () => {
    const drawn = (from: string) =>
      `const seed = ${from};\nconst place = drawPlace(\`\${seed}:0\`, "a");\n${plain}`;
    const pinned = `const PLACES = ["a-pin:1", "a-pin:3"];\n${plain}`;
    expect(
      ids(
        "src/a.test.ts",
        drawn(`${"randomBytes"}(8).toString("hex")`),
        pinned,
      ),
    ).toEqual(["drawn-seed-dropped"]);
    expect(
      ids(
        "src/a.test.ts",
        drawn(`process.env.GOLDEN_PATH_${"SEED"} ?? "x"`),
        pinned,
      ),
    ).toEqual(["drawn-seed-dropped"]);
    // Putting the draw back is not a finding.
    expect(
      ids(
        "src/a.test.ts",
        pinned,
        drawn(`${"randomBytes"}(8).toString("hex")`),
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

  it("lets a test moving to a drawn place drop only its pin-checking case (the CTO's standing ruling)", () => {
    const pinCheck = `it("draws its pinned place from the fixed seed", () => {\n  expect(drawPlace("pin-a:0", "a")).toMatchObject({ key: "1" });\n});\n`;
    const real = 'it("a real case", () => { expect(1).toBe(1); });\n';
    const pinnedFile = `const seed = "pin-a";\n${pinCheck}${real}`;
    const drawnFile = `const seed = process.env.GOLDEN_PATH_${"SEED"} ?? ${"randomBytes"}(8).toString("hex");\n${real}`;
    expect(ids("src/a.test.ts", pinnedFile, drawnFile)).toEqual([]);
    // Staying pinned, the same deletion is still a finding.
    expect(
      ids("src/a.test.ts", pinnedFile, `const seed = "pin-a";\n${real}`),
    ).toEqual(["cases-dropped", "assertions-dropped"]);
    // Moving to a drawn place does not excuse dropping a real case.
    expect(
      ids(
        "src/a.test.ts",
        pinnedFile + real.replace("a real", "another"),
        drawnFile,
      ),
    ).toEqual(["cases-dropped", "assertions-dropped"]);
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

  it("refuses a skill added without retiring one, and lets a swap pass", () => {
    const skill = (
      name: string,
      before: string | null,
      after: string | null,
    ) => ({
      path: `.agents/skills/${name}/SKILL.md`,
      before,
      after,
    });
    const found = (changes: Parameters<typeof checkChanges>[0]) =>
      checkChanges(changes, rules).map((f) => f.id);
    expect(found([skill("new-one", null, "x")])).toEqual(["skill-added"]);
    expect(
      found([skill("new-one", null, "x"), skill("old-one", "x", null)]),
    ).toEqual([]);
    expect(found([skill("same", "x", "y")])).toEqual([]);
  });

  it("refuses a new guard test the guard list does not run", () => {
    const guard = {
      path: "tests/guards/new-rule.test.ts",
      before: null,
      after: plain,
    };
    const listed = (text: string) => () => text;
    expect(
      checkChanges(
        [guard],
        rules,
        listed('vitest("tests/guards/old.test.ts")'),
      ).map((f) => f.id),
    ).toEqual(["guard-unlisted"]);
    expect(
      checkChanges(
        [guard],
        rules,
        listed('vitest("tests/guards/new-rule.test.ts")'),
      ).map((f) => f.id),
    ).toEqual([]);
    expect(
      checkChanges(
        [
          guard,
          {
            path: rules.guardList,
            before: "",
            after: 'vitest("tests/guards/new-rule.test.ts")',
          },
        ],
        rules,
      ).map((f) => f.id),
    ).toEqual([]);
  });

  it("refuses a change to its own rules, script or workflow", () => {
    for (const file of rules.ownFiles)
      expect(ids(file, "a", "b")).toContain("own-rules");
  });

  it("takes an approval only from a CTO comment with a line that names the pull request", () => {
    expect(approves("CTO: check change approved #9801", 9801, rules)).toBe(
      true,
    );
    // The CTO's own formatting (issue 9747, Nov 16 to 17).
    expect(
      approves(
        "CTO: Two answers.\n\n1. **Coordinator, #9801: approved.** It changes guard files.",
        9801,
        rules,
      ),
    ).toBe(true);
    expect(
      approves(
        "CTO: \n- **Long game, CTO lines:** #9752 approved, as before. #9801 approved under the ruling.",
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
    expect(approves("Status.\nCTO: approved #9801", 9801, rules)).toBe(false);
    expect(approves("CTO: not yet for #9801", 9801, rules)).toBe(false);
    expect(approves("CTO: #9801 is not approved yet.", 9801, rules)).toBe(
      false,
    );
    expect(approves("> CTO: approved #9801", 9801, rules)).toBe(false);
  });

  it("does not read another pull request's approval in the same line as this one's", () => {
    const comment =
      "CTO: \n- #9752 approved, as before. #9801 and #9793 need no line.";
    expect(approves(comment, 9801, rules)).toBe(false);
    expect(approves(comment, 9752, rules)).toBe(true);
  });
});
