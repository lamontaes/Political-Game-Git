import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A rewrite never deletes a line the owner graded good (owner, via the CTO,
 * Nov 8). `data/english/part-grades.json` is the ledger of his grades; every
 * key it counts good must still be a piece in a bank of
 * `data/english/parts/`, or be carried by a live piece through a grade row's
 * `restoredFrom` (`scripts/dialogue-batch/restore-liked-lines.ts`). There is
 * no list of exceptions: a liked line no scene reads yet is kept in a bank of
 * its own kind under a registered stopgap (`SG-WORDS-<bank>-no-reader` in
 * `src/director/data/stopgaps.json`) and a pool item for the scene that will
 * read it.
 *
 * The one way a liked line leaves the banks is with its scene: on Nov 12,
 * 2026 the owner gave the story lead the whole story ("change and delete
 * whatever you need to"), and the scene inventory deleted the scenes no
 * engine stands behind. A liked line of a deleted scene is listed, key and
 * text, in `docs/design/scene-inventory.json` (`likedLinesRetired`), which the
 * design page prints under "Lines the owner graded good, deleted with their
 * scenes"; it must be in no bank, and every other liked line stays.
 *
 * Where to find an old piece: `git show <deleting commit>^:<path>` (a shallow
 * clone may need `git fetch origin main --deepen=2000` first).
 */
type Counts = { good: number };
const ledger = JSON.parse(
  readFileSync("data/english/part-grades.json", "utf8"),
) as { parts: Record<string, Counts> };

/** Every key of every bank, and the keys their pieces say they were restored from. */
const bankKeys = new Set<string>();
const restoredFrom = new Set<string>();
for (const name of readdirSync("data/english/parts").filter((entry) =>
  entry.endsWith(".json"),
))
  for (const part of (
    JSON.parse(readFileSync(`data/english/parts/${name}`, "utf8")) as {
      parts: { key: string; restoredFrom?: string }[];
    }
  ).parts) {
    bankKeys.add(part.key);
    if (part.restoredFrom) restoredFrom.add(part.restoredFrom);
  }

/** The ledger keys a grade file moved onto live pieces, with the live keys. */
const moved = new Map<string, string[]>();
for (const name of readdirSync("data/english/grades"))
  for (const row of (
    JSON.parse(readFileSync(`data/english/grades/${name}`, "utf8")) as {
      grades: { parts: string[]; restoredFrom?: string }[];
    }
  ).grades)
    if (row.restoredFrom) moved.set(row.restoredFrom, row.parts);

/** Liked lines that left the banks with their scene (the scene inventory, Nov 12, 2026). */
const retired =
  (
    JSON.parse(readFileSync("docs/design/scene-inventory.json", "utf8")) as {
      likedLinesRetired?: { scene: string; key: string; text: string }[];
    }
  ).likedLinesRetired ?? [];
const retiredKeys = new Set(retired.map((row) => row.key));

const liked = Object.entries(ledger.parts)
  .filter(([, counts]) => counts.good > 0)
  .map(([key]) => key)
  .filter((key) => !retiredKeys.has(key));

describe("a line the owner graded good stays in the banks", () => {
  it("is a piece in a bank, or a grade moved onto a live piece in a bank", () => {
    const gone = liked.filter(
      (key) =>
        !bankKeys.has(key) &&
        !(
          moved.get(key)?.length &&
          moved.get(key)!.every((k) => bankKeys.has(k))
        ),
    );
    expect(gone, "graded good, and in no bank").toEqual([]);
  });

  it("retires a liked line only with its scene, kept with its text on the inventory, and in no bank", () => {
    for (const row of retired) {
      expect(ledger.parts[row.key]?.good, row.key).toBeGreaterThan(0);
      expect(row.scene, row.key).toBeTruthy();
      expect(row.text, row.key).toBeTruthy();
      expect(bankKeys.has(row.key), `${row.key} is still in a bank`).toBe(
        false,
      );
    }
  });

  it("restores a piece only from a key the ledger counts good", () => {
    for (const key of restoredFrom) expect(liked, key).toContain(key);
    for (const [key, live] of moved) {
      // A liked line restored onto a scene that was later deleted left with it.
      if (retiredKeys.has(key)) continue;
      expect(liked, key).toContain(key);
      for (const piece of live) expect(bankKeys.has(piece), piece).toBe(true);
    }
  });

  it("keeps a line no scene reads under a registered stopgap for its bank", () => {
    const stopgaps = JSON.parse(
      readFileSync("src/director/data/stopgaps.json", "utf8"),
    ) as { id: string; status: string }[];
    for (const bank of [
      "address",
      "hearing",
      "legislation",
      "minutes",
      "notice",
    ])
      if (existsSync(`data/english/parts/${bank}.json`))
        expect(
          stopgaps.find((row) => row.id === `SG-WORDS-${bank}-no-reader`),
          bank,
        ).toBeDefined();
  });
});
