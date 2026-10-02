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

  it("names the owning build on every allowed line", () => {
    const unowned = allowlist.entries.filter(
      (entry: { build: unknown }) =>
        typeof entry.build !== "string" || !/^Build \d+$/.test(entry.build),
    );
    expect(unowned).toEqual([]);
  });

  const onMain = mainAllowlist();
  it.skipIf(onMain === null)(
    "allows no file more lines of a kind than main does",
    () => {
      expect(growth(onMain, allowlist)).toEqual([]);
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
      "function decide(rng: SeededRng) {",
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
    ).toEqual([2, 3]);
  });

  it("reads raw draws while ignoring ordinary arrows and iterators", () => {
    expect(
      kinds(
        "function draw(rng: SeededRng) { const high = rng.nextUint32() >>> 5; }",
      ),
    ).toEqual(["roll"]);
    expect(kinds("const pick = items.map((roll) => roll.id);")).toEqual([]);
    expect(
      kinds(
        "function noise(rng: SeededRng) { return 1 + (rng.next() * 2 - 1) * width; }",
      ),
    ).toEqual(["roll"]);
    expect(kinds("const first = values.values().next().value;")).toEqual([]);
    expect(kinds("const generator = chunks(); generator.next();")).toEqual([]);
  });

  it("finds the registered-trait pick that needs no threshold", () => {
    expect(
      kinds(
        'import { SeededRng } from "./rng";\nconst stream = new SeededRng(seed).fork(key);\nconst magnitude = stream.pick(trait.seed.spread);',
      ),
    ).toEqual(["roll"]);
  });

  it("follows imported aliases, stream aliases, forks and multiline choices", () => {
    const source =
      'import { SeededRng as Random } from "./rng";\nconst first = new Random(seed);\nconst alias = first;\nconst choice = alias.fork(key)\n .pick(\n options,\n );';
    expect(scanSource(source)).toEqual([
      { line: 5, kind: "roll", code: ".pick(" },
    ]);
  });

  it("follows RNG-returning functions and nullable typed inputs", () => {
    expect(
      kinds(
        "function stream(rng: SeededRng | null): SeededRng { return rng!; }\nconst born = stream(input).integer(\n 1,\n 31\n);",
      ),
    ).toEqual(["roll"]);
  });

  it("follows inferred factories and contextually typed callback RNGs", () => {
    expect(
      kinds(
        "function stream() { return new SeededRng(seed); }\nconst rng = stream();\nrng.integer(1, 31);",
      ),
    ).toEqual(["roll"]);
    expect(
      kinds(
        "function withStream(choose: (rng: SeededRng) => string) {}\nwithStream(rng => rng.pick(options));",
      ),
    ).toEqual(["roll"]);
  });

  it("keeps same-name iterator bindings separate from an RNG", () => {
    expect(
      kinds(
        "const rng = new SeededRng(seed);\nrng.next();\nfunction other(rng) { return rng.next(); }",
      ),
    ).toEqual(["roll"]);
  });

  it("reads un-compared Math.random values and distinct-choice helpers", () => {
    expect(
      kinds(
        "const nonce = Math.random() * 256;\nconst chosen = pickDistinct(rng,options,count);",
      ),
    ).toEqual(["roll", "roll"]);
  });

  it("reads draws inside JSX while retaining ordinary TypeScript generics", () => {
    expect(
      kinds(
        "const rng = new SeededRng(seed);\nconst view = <div>{rng.pick(options)}</div>;",
      ),
    ).toEqual(["roll"]);
    expect(
      kinds(
        "const identity = <T>(value: T) => value;\nconst rng = new SeededRng(seed);\nidentity(rng.pick(options));",
      ),
    ).toEqual(["roll"]);
  });

  it("reads computed RNG members, destructured methods and helper aliases", () => {
    expect(
      kinds(
        'import { SeededRng, openUniform as uniform } from "./rng";\nconst rng = new SeededRng(seed);\nrng["pick"](options);\nconst {integer: age} = rng;\nage(1,90);\nuniform(rng);',
      ),
    ).toEqual(["roll", "roll", "roll"]);
  });

  it("does not confuse strings, comments, constructors or forks with draws", () => {
    expect(
      kinds(
        'const rng = new SeededRng(seed).fork(key);\n/* rng.pick(options); */\nconst prose = "rng.next() chooses nothing here";',
      ),
    ).toEqual([]);
  });

  it("rejects a newly discovered draw without widening the allowlist", () => {
    const findings = scanSource(
      "const rng = new SeededRng(seed);\nrng.pick(options);",
    ).map((finding) => ({ file: "src/simulation/trait-packs.ts", ...finding }));
    expect(compare(findings, { entries: [] }).added).toHaveLength(1);
    expect(
      growth({ entries: [] }, { entries: [{ ...findings[0]!, count: 1 }] }),
    ).toHaveLength(1);
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
});
