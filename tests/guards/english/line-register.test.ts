import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  baselineOf,
  EXEMPT,
  exemptProblems,
  jsonStrings,
  literals,
  registerCounts,
  sentenceShaped,
} from "../../../scripts/words/line-register";

/**
 * The register of every player-facing line (owner, Nov 16: no leftovers,
 * because every line is registered and traceable). The register is computed in
 * scripts/words/line-register.ts from the banks, the code and the data files;
 * this guard holds each of its lists to the baseline beside it, which only
 * shrinks: a new line with no tie, a new line no engine reaches, a bank no
 * code reads, a new sentence typed in code or in a data file instead of a bank
 * all fail here. Fix the line (tie it, reach it, delete it, move it to a
 * bank), then lower the baseline with
 * `node --import tsx scripts/words/line-register.ts --write-baseline`.
 */
const BASELINE = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, "line-register-baseline.json"),
    "utf8",
  ),
) as ReturnType<typeof baselineOf>;

describe("the line register", () => {
  const now = baselineOf(registerCounts());

  const grew = (
    label: string,
    current: Record<string, number>,
    known: Record<string, number>,
  ) =>
    Object.entries(current)
      .filter(([name, count]) => count > (known[name] ?? 0))
      .map(
        ([name, count]) =>
          `${label} ${name}: ${count}, known ${known[name] ?? 0}`,
      );
  const stale = (
    label: string,
    current: Record<string, number>,
    known: Record<string, number>,
  ) =>
    Object.entries(known)
      .filter(([name, count]) => (current[name] ?? 0) < count)
      .map(
        ([name, count]) =>
          `${label} ${name}: ${current[name] ?? 0}, lower ${count} in line-register-baseline.json`,
      );

  it("adds no bank line tied to no fact and no slot", () => {
    expect(
      grew("untied", now.untiedBankLines, BASELINE.untiedBankLines),
    ).toEqual([]);
  });
  it("adds no short reply that says nothing of its own", () => {
    expect(
      now.saysNothing.filter((key) => !BASELINE.saysNothing.includes(key)),
    ).toEqual([]);
  });
  it("adds no sentence typed in code or a data file", () => {
    expect([
      ...grew("code", now.codeLines, BASELINE.codeLines),
      ...grew("data", now.dataHeldLines, BASELINE.dataHeldLines),
    ]).toEqual([]);
  });
  it("adds no conversation line no engine reaches, and no bank nothing reads", () => {
    expect(
      now.unreachedConversation.filter(
        (key) => !BASELINE.unreachedConversation.includes(key),
      ),
    ).toEqual([]);
    expect(
      now.unreadBanks.filter((file) => !BASELINE.unreadBanks.includes(file)),
    ).toEqual([]);
    expect(
      now.goodWaitingForReader.filter(
        (file) => !BASELINE.goodWaitingForReader.includes(file),
      ),
    ).toEqual([]);
  });
  it("lowers the baseline as soon as a line is tied, reached, read or moved", () => {
    expect([
      ...stale("untied", now.untiedBankLines, BASELINE.untiedBankLines),
      ...stale("code", now.codeLines, BASELINE.codeLines),
      ...stale("data", now.dataHeldLines, BASELINE.dataHeldLines),
      ...BASELINE.unreachedConversation
        .filter((key) => !now.unreachedConversation.includes(key))
        .map(
          (key) =>
            `unreached ${key} is reached now: remove it from the baseline`,
        ),
      ...BASELINE.saysNothing
        .filter((key) => !now.saysNothing.includes(key))
        .map(
          (key) =>
            `${key} is gone or says something now: remove it from the baseline`,
        ),
      ...BASELINE.unreadBanks
        .filter((file) => !now.unreadBanks.includes(file))
        .map((file) => `${file} is read now: remove it from the baseline`),
      ...BASELINE.goodWaitingForReader
        .filter((file) => !now.goodWaitingForReader.includes(file))
        .map((file) => `${file} is read now: remove it from the baseline`),
    ]).toEqual([]);
  });
  it("registers every bank file in data/english/parts", () => {
    const files = readdirSync(
      path.resolve(import.meta.dirname, "../../../data/english/parts"),
    )
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""))
      .sort();
    expect(Object.keys(registerCounts().bankCount).sort()).toEqual(files);
  });
  it("tells a sentence from a code token", () => {
    expect(sentenceShaped("You meet {name} at the door.")).toBe(true);
    expect(sentenceShaped("person-card")).toBe(false);
    expect(sentenceShaped("scene.opening.home")).toBe(false);
    expect(literals('const a = "Hello there friend"; // "Not code"')).toEqual([
      "Hello there friend",
    ]);
    // A record value the code compares is never said, as a literal beside
    // === or !== or as the file's own constant used only in comparisons.
    expect(
      literals(
        'const TOPIC = "Planning and zoning";\nif (a === "Some words to test") x(TOPIC === b, b !== TOPIC);',
      ),
    ).toEqual([]);
    expect(
      literals('const TOPIC = "Planning and zoning";\nsay(TOPIC);'),
    ).toEqual(["Planning and zoning"]);
    expect(
      jsonStrings({
        label: "A label here",
        note: "A note here",
        rows: ["Row one"],
      }),
    ).toEqual(["Row one"]);
  });
  it("proves every exempt constant by its readers: nothing that puts words on a screen reads it", () => {
    // line-register-exempt.json: each entry gives its reason, still exists,
    // and is read outside tests and developer files only through the fields
    // its row names. A new reader on a player's path fails here.
    expect(EXEMPT.length).toBeGreaterThan(0);
    expect(exemptProblems()).toEqual([]);
  });
});
