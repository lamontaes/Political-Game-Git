import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import baseline from "./line-inserts-baseline.json";

/**
 * Every line goes through the English engine (owner, Nov 11, 2026: "all the
 * lines in the game need to be run through the English engine... There needs
 * to be a ton of different speech versions, a ton of different inserts for
 * it"). A bank line with no insert is a whole stock sentence picked as it
 * stands: it says the same thing in every town, to every person, about every
 * record. A line carries an insert when its text names a slot in braces
 * (`{name}`, `{place}`), which the engine fills from the world's records.
 *
 * What is read: every part of every bank under data/english/parts. What was
 * already written without an insert is counted by bank in
 * ./line-inserts-baseline.json; a count may only go down, and a bank the
 * baseline does not name may hold none. Nobody decides alone that a kind of
 * line may stay fixed: that is a call for the owner's decisions page
 * (docs/coordination/OWNER-DECISIONS.md), and until it is ruled the line
 * counts here.
 */

const ROOT = path.resolve(__dirname, "../../..");
const BANK_DIR = "data/english/parts";

/** A slot the engine fills, written in braces. */
const INSERT = /\{[^{}\s]+\}/;

/** Whether a line's text carries at least one insert. */
export function hasInsert(text: string): boolean {
  return INSERT.test(text);
}

interface BankPart {
  readonly key?: string;
  readonly text?: string;
}

/** For each bank, the keys of its lines that carry no insert. */
export function linesWithNoInsert(dir: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".json")) continue;
    const bank = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as {
      parts?: readonly BankPart[];
    };
    out[file.slice(0, -".json".length)] = (bank.parts ?? [])
      .filter((part) => !hasInsert(part.text ?? ""))
      .map((part) => part.key ?? part.text ?? "");
  }
  return out;
}

describe("every bank line carries an insert from the world's records", () => {
  const found = linesWithNoInsert(path.join(ROOT, BANK_DIR));
  const known = baseline.banks as Record<string, number>;

  it("adds no line without an insert to any bank", () => {
    const over = Object.entries(found)
      .filter(([bank, keys]) => keys.length > (known[bank] ?? 0))
      .map(
        ([bank, keys]) =>
          `${BANK_DIR}/${bank}.json: ${keys.length} lines with no insert, ${known[bank] ?? 0} known. A new line names at least one slot in braces that the engine fills from a record; the newest without one include ${keys.slice(-3).join(", ")}`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a bank's known count as soon as its lines gain inserts or are deleted", () => {
    const stale = Object.entries(known)
      .filter(([bank, n]) => (found[bank]?.length ?? 0) < n)
      .map(
        ([bank, n]) =>
          `${bank}: lower ${n} to ${found[bank]?.length ?? 0} in tests/guards/english/line-inserts-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("tells a line with an insert from one without", () => {
    expect(hasInsert("I've heard those promises too many times.")).toBe(false);
    expect(
      hasInsert("Did you hear what the President said about {topic}?"),
    ).toBe(true);
    // Braces around nothing, or around words with spaces, are not a slot.
    expect(hasInsert("An empty pair {} is not a slot.")).toBe(false);
    expect(hasInsert("Nor is {two words}.")).toBe(false);
  });
});
