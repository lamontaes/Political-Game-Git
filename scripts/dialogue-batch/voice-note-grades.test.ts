import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { heldByGrades } from "../../src/english/english-grades";

/**
 * The owner's voice-note grades of batches 11 to 19 (owner, Oct 24: "take
 * everything I said I liked in there ... and start getting the stuff in the
 * game"): every line his rulings quote as liked reaches the part ledger as
 * good and is released where its bank is on this branch, and every line they
 * quote as rejected reaches it as bad and is held out of play.
 */
interface Row {
  grade: "good" | "bad";
  by: string;
  line: string;
  note: string;
  parts: string[];
}
const file = JSON.parse(
  readFileSync("data/english/grades/voice-notes-batches-11-19.json", "utf8"),
) as { grades: Row[] };
const ledger = JSON.parse(
  readFileSync("data/english/part-grades.json", "utf8"),
) as {
  batches: string[];
  parts: Record<string, { good: number; bad: number }>;
};
const parts = new Map<string, { text: string; shippable?: boolean }>();
for (const name of readdirSync("data/english/parts"))
  for (const part of (
    JSON.parse(readFileSync(`data/english/parts/${name}`, "utf8")) as {
      parts?: { key: string; text: string; shippable?: boolean }[];
    }
  ).parts ?? [])
    parts.set(part.key, part);

const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/[{}?.,:!]/g, "")
    .replace(/\s+/g, " ")
    .trim();

describe("the owner's voice-note grades, batches 11 to 19", () => {
  it("is folded into the ledger", () => {
    expect(ledger.batches).toContain("voice-notes-batches-11-19");
    expect(file.grades.length).toBeGreaterThan(30);
  });

  it("cites the ruling each grade was read from", () => {
    for (const row of file.grades) {
      expect(row.by, row.line).toMatch(/^owner \(voice notes, Oct 1\d/);
      expect(row.by).toContain("OWNER-DECISIONS.md");
      expect(row.note, row.line).toMatch(/batch 1\d/);
    }
  });

  it("names the part that says each quoted line", () => {
    for (const row of file.grades)
      for (const key of row.parts) {
        const part = parts.get(key);
        // A part from a batch after 14 reaches this branch with the word pack (#4626).
        if (!part) continue;
        const quoted = row.line.split(" / ").map(plain);
        expect(
          quoted.some((line) =>
            plain(part.text).includes(line.replace(/ (school|employer)$/, "")),
          ),
          `${key}: "${part.text}" for "${row.line}"`,
        ).toBe(true);
      }
  });

  it("releases every liked line and holds every rejected one", () => {
    for (const row of file.grades)
      for (const key of row.parts) {
        const counts = ledger.parts[key];
        expect(counts, key).toBeDefined();
        if (row.grade === "good") {
          expect(counts!.good, key).toBeGreaterThan(0);
          expect(heldByGrades(key), key).toBe(false);
          const part = parts.get(key);
          if (part) expect(part.shippable, `${key} is released`).toBe(true);
        } else {
          expect(counts!.bad, key).toBeGreaterThan(0);
          expect(heldByGrades(key), key).toBe(true);
        }
      }
  });
});
