import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  ALLOWLIST_PATH,
  REPO_ROOT,
  compare,
  describeAdded,
  growth,
  readAllowlist,
  scanRepository,
  scanSource,
  unclassified,
  update,
} from "./zero-dice-guard.mjs";

const kinds = (source: string) =>
  scanSource(source).map((finding: { kind: string }) => finding.kind);

/** Main's allowlist, when this checkout can see main. */
function mainAllowlist() {
  try {
    return JSON.parse(
      execFileSync("git", ["show", `origin/main:${ALLOWLIST_PATH}`], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    return null;
  }
}

describe("zero-dice guard", () => {
  const allowlist = readAllowlist();
  const findings = scanRepository();

  it("finds no new roll, fixed share or one-place case", () => {
    const { added } = compare(findings, allowlist);
    expect(added.map(describeAdded)).toEqual([]);
  });

  it("drops an allowed line once the code no longer has it", () => {
    const { stale } = compare(findings, allowlist);
    expect(
      stale.map(
        (entry: { file: string; kind: string; code: string }) =>
          `${entry.file} ${entry.kind}: ${entry.code} (run npm run zero-dice -- --update)`,
      ),
    ).toEqual([]);
  });

  it("names the owning build on every allowed line but a list-pick", () => {
    const unowned = allowlist.entries.filter(
      (entry: { build: unknown; kind: string }) =>
        entry.kind !== "list-pick" &&
        (typeof entry.build !== "string" || !/^Build \d+$/.test(entry.build)),
    );
    expect(unowned).toEqual([]);
  });

  it("classifies every list-pick, with a reason", () => {
    expect(unclassified(allowlist)).toEqual([]);
  });

  const onMain = mainAllowlist();
  it.skipIf(onMain === null)(
    "allows no file more lines of a kind than main does",
    () => {
      // The change that introduces list-pick records today's inventory in one
      // step; once main carries it, no file may grow it.
      const introduced = !onMain.entries.some(
        (entry: { kind: string }) => entry.kind === "list-pick",
      );
      expect(
        growth(onMain, allowlist).filter(
          (grown: { kind: string }) =>
            !introduced || grown.kind !== "list-pick",
        ),
      ).toEqual([]);
    },
  );
});

describe("what the zero-dice guard reads as a roll, a share or a place case", () => {
  it("reads a draw compared with a threshold as a roll", () => {
    expect(kinds("if (rng.next() < 0.3) leave();")).toEqual(["roll"]);
    expect(kinds("if (rng.fork(id).integer(0, 100) < 3) fail();")).toEqual([
      "roll",
    ]);
    expect(kinds("const yes = rng.integer(0, 9) === 0;")).toEqual(["roll"]);
    expect(
      kinds('if (draw(world, ["unrest", key]) >= policy.floor) return;'),
    ).toEqual(["roll"]);
    expect(kinds("  Math.random() <\n    chance")).toEqual(["roll"]);
  });

  it("follows a draw stored in a variable until its block ends", () => {
    const source = [
      "function decide(rng) {",
      "  const roll = rng.integer(0, 100);",
      "  if (roll < 45) return 'stays';",
      "  return 'goes';",
      "}",
      "function other(roll) {",
      "  return roll < 45;",
      "}",
    ].join("\n");
    expect(
      scanSource(source).map((finding: { line: number }) => finding.line),
    ).toEqual([3]);
  });

  it("does not read a shift, an arrow or a draw without a comparison as a roll", () => {
    expect(kinds("const high = rng.nextUint32() >>> 5;")).toEqual([]);
    expect(kinds("const pick = items.map((roll) => roll.id);")).toEqual([]);
    expect(kinds("const spread = 1 + (rng.next() * 2 - 1) * width;")).toEqual(
      [],
    );
  });

  it("reads a named chance or share set to a literal as a fixed share", () => {
    expect(kinds("export const LEAVE_CHANCE_PER_YEAR = 0.04;")).toEqual([
      "fixed-share",
    ]);
    expect(kinds("  turnoutShare: 0.62,")).toEqual(["fixed-share"]);
    expect(kinds("  recessionStartMonthlyChance: 1 / 64,")).toEqual([
      "fixed-share",
    ]);
    expect(kinds("  removeYesShare: [3_000, 6_500],")).toEqual(["fixed-share"]);
    expect(kinds("const DISPLACED_LEAVE_CHANCE = {")).toEqual(["fixed-share"]);
  });

  it("does not read a counter, a comparison or a computed share as fixed", () => {
    expect(kinds("let share = 0;")).toEqual([]);
    expect(kinds("  voteShare: 1.0,")).toEqual([]);
    expect(kinds("if (share === 0.5) return;")).toEqual([]);
    expect(kinds("const sharedRooms = 3;")).toEqual([]);
    expect(kinds("  partyShare: yes ? share : 1 - share,")).toEqual([]);
  });

  it("reads a state or place literal in a branch as a one-place case", () => {
    expect(kinds('if (state.usps === "KY") return 2;')).toEqual([
      "place-in-logic",
    ]);
    expect(kinds('case "Kentucky":')).toEqual(["place-in-logic"]);
    expect(kinds('if (key !== "us-va-charlottesville") return;')).toEqual([
      "place-in-logic",
    ]);
    expect(kinds('return geoid === "21067";')).toEqual(["place-in-logic"]);
    expect(kinds('if (cityName === "Lexington") open();')).toEqual([
      "place-in-logic",
    ]);
    expect(
      kinds('const text = `${home.stateUsps === "PR" ? "a" : "b"}`;'),
    ).toEqual(["place-in-logic"]);
  });

  it("ignores comments, prose and state data that decide nothing", () => {
    expect(kinds('// if (state === "KY") rng.next() < 0.5')).toEqual([]);
    expect(kinds(" * const LEAVE_CHANCE = 0.04;")).toEqual([]);
    expect(kinds('  KY: { name: "Kentucky", seats: 6 },')).toEqual([]);
    expect(kinds('const note = "roll < 3 in case of KY";')).toEqual([]);
  });

  it("scans a large serialized string without losing code after it", () => {
    const serializedRows = '\\"00000\\",'.repeat(120_000);
    const source = `const generatedRows = "${serializedRows}"; if (rng.next() < 0.3) act();`;
    expect(kinds(source)).toEqual(["roll"]);
  });

  it("handles a long escaped quote run without recursive regex backtracking", () => {
    const escapedQuotes = '\\"'.repeat(120_000);
    const source = `const generatedRows = "${escapedQuotes} if (rng.next() < 0.3) act();`;
    expect(kinds(source)).toEqual(["roll"]);
  });
});

describe("what the zero-dice guard reads as a list-pick", () => {
  it("reads a seeded pick call as a list-pick", () => {
    expect(kinds("const name = rng.pick(corpus.givenNames);")).toEqual([
      "list-pick",
    ]);
    expect(kinds("return rng.fork(key).pick(sorted);")).toEqual(["list-pick"]);
    expect(kinds("const ids = pickDistinct(rng, personOrder, 2);")).toEqual([
      "list-pick",
    ]);
    expect(kinds("const row = weightedPick(rng, eligible, outlet);")).toEqual([
      "list-pick",
    ]);
    expect(kinds("const order = shuffle(rng, members);")).toEqual([
      "list-pick",
    ]);
  });

  it("reads a pick split across a chain of lines as one list-pick", () => {
    const source = [
      "const party = rng",
      "  .fork(`executive:${holder.personId}`)",
      "  .pick(parties);",
    ].join("\n");
    const found = scanSource(source);
    expect(found.map((finding: { kind: string }) => finding.kind)).toEqual([
      "list-pick",
    ]);
    expect(found[0].line).toBe(1);
    expect(found[0].code).toContain(".pick(parties)");
  });

  it("reads an index computed from a draw as a list-pick", () => {
    expect(kinds("return choices[rng.integer(0, choices.length)]!;")).toEqual([
      "list-pick",
    ]);
    expect(
      kinds("const item = items[Math.floor(draw(seed, q) * items.length)];"),
    ).toEqual(["list-pick"]);
    expect(
      kinds("const gone = rest.splice(rng.integer(0, rest.length), 1)[0];"),
    ).toEqual(["list-pick"]);
    expect(kinds("const at = rng.integer(0, pool.length);")).toEqual([
      "list-pick",
    ]);
    expect(kinds("const byte = Math.floor(Math.random() * 256);")).toEqual([
      "list-pick",
    ]);
  });

  it("follows a draw stored in a variable to the index or the weights", () => {
    const stored = [
      "function choose(rng, rows) {",
      "  const start = rng.fork('x').integer(0, 9);",
      "  return rows[start];",
      "}",
    ].join("\n");
    expect(
      scanSource(stored).map((finding: { line: number }) => finding.line),
    ).toEqual([3]);
    const weighted = [
      "function choose(rng, weights) {",
      "  let point = rng.next();",
      "  for (const [key, share] of weights) {",
      "    point -= share;",
      "    if (point < 0) return key;",
      "  }",
      "}",
    ].join("\n");
    expect(
      scanSource(weighted).map((finding: { kind: string }) => finding.kind),
    ).toContain("list-pick");
    const chained = [
      "let position = new SeededRng(seed)",
      "  .fork(`x:${id}`)",
      "  .integer(0, total);",
      "for (const [status, count] of options) {",
      "  position -= count;",
      "}",
    ].join("\n");
    expect(
      scanSource(chained).map((finding: { line: number }) => finding.line),
    ).toEqual([5]);
  });

  it("reads a cumulative weighted pick on a draw times a total", () => {
    expect(kinds("let point = rng.next() * total;")).toEqual(["list-pick"]);
  });

  it("reads an index taken from a hash as a list-pick", () => {
    expect(
      kinds("const part = fits[stableHash(pickKey) % fits.length]!;"),
    ).toEqual(["list-pick"]);
    expect(kinds("const start = (hash >>> 0) % personOrder.length;")).toEqual([
      "list-pick",
    ]);
    const folded = [
      "let total = 0;",
      "for (const c of from) total = (total * 31 + c.charCodeAt(0)) % 1000;",
      "return STEPS[total % STEPS.length]!;",
    ].join("\n");
    // reported from the line that folds the hash, through the pick
    expect(
      scanSource(folded).map((finding: { line: number }) => finding.line),
    ).toEqual([2]);
  });

  it("does not read a plain index, a rotation or a value draw as a list-pick", () => {
    expect(kinds("const first = rows[0];")).toEqual([]);
    expect(kinds("return judges[turn % judges.length]!;")).toEqual([]);
    expect(kinds("const age = rng.integer(18, 65);")).toEqual([]);
    expect(kinds("const spread = (rng.next() * 2 - 1) * width;")).toEqual([]);
    expect(kinds("// rng.pick(corpus.givenNames)")).toEqual([]);
    expect(kinds("function weightedPick<T>(rng: SeededRng) {")).toEqual([]);
    expect(kinds('const note = "rng.pick(list)";')).toEqual([]);
  });

  it("does not count a stored draw twice when its own line is the pick", () => {
    const source = [
      "function choose(rng, rows) {",
      "  const at = rng.integer(0, rows.length);",
      "  return rows[at];",
      "}",
    ].join("\n");
    expect(
      scanSource(source).map((finding: { line: number }) => finding.line),
    ).toEqual([2]);
  });
});

describe("what the allowlist asks of a list-pick", () => {
  const pick = (extra: Record<string, unknown>) => ({
    entries: [
      {
        file: "src/simulation/x.ts",
        kind: "list-pick",
        build: null,
        count: 1,
        code: "const a = rng.pick(list);",
        ...extra,
      },
    ],
  });

  it("accepts each class with its reason", () => {
    for (const cls of ["IDENTITY", "PRESENTATION"]) {
      expect(unclassified(pick({ class: cls, reason: "a look" }))).toEqual([]);
    }
    expect(
      unclassified(
        pick({
          class: "GENERATION",
          keyedBy: "person id",
          reason: "the person's own birth month",
        }),
      ),
    ).toEqual([]);
    expect(
      unclassified(
        pick({
          class: "DECISION",
          reason: "chooses a party",
          replacement: "the person's recorded beliefs",
        }),
      ),
    ).toEqual([]);
  });

  it("refuses a missing class, a missing reason and a missing replacement", () => {
    expect(unclassified(pick({ class: null, reason: "x" }))).toHaveLength(1);
    expect(unclassified(pick({ class: "LUCK", reason: "x" }))).toHaveLength(1);
    expect(unclassified(pick({ class: "IDENTITY", reason: "" }))).toHaveLength(
      1,
    );
    expect(
      unclassified(pick({ class: "DECISION", reason: "x", replacement: "" })),
    ).toHaveLength(1);
  });

  it("calls a per-person fact keyed only by place a decision, not generation", () => {
    for (const keyedBy of ["", "place", "town", "State"]) {
      expect(
        unclassified(pick({ class: "GENERATION", reason: "x", keyedBy })),
      ).toHaveLength(1);
    }
  });

  it("keeps a class through --update and leaves a new pick unclassified", () => {
    const before = pick({
      class: "IDENTITY",
      keyedBy: "person id",
      reason: "a given name",
      replacement: null,
    });
    const found = [
      {
        file: "src/simulation/x.ts",
        line: 3,
        kind: "list-pick",
        code: "const a = rng.pick(list);",
      },
      {
        file: "src/simulation/x.ts",
        line: 9,
        kind: "list-pick",
        code: "const b = rng.pick(other);",
      },
    ];
    const next = update(before, found);
    const kept = next.entries.find(
      (entry: { code: string }) => entry.code === "const a = rng.pick(list);",
    );
    const fresh = next.entries.find(
      (entry: { code: string }) => entry.code === "const b = rng.pick(other);",
    );
    expect(kept.class).toBe("IDENTITY");
    expect(fresh.class).toBeNull();
    expect(unclassified(next)).toHaveLength(1);
    expect(growth(before, next)).toEqual([
      { file: "src/simulation/x.ts", kind: "list-pick", before: 1, after: 2 },
    ]);
  });
});
