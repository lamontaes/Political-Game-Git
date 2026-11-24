import { describe, expect, it } from "vitest";
import { sheetsFor } from "../scripts/words/reply-pairs";

// Thirty built scenes keep the test short; the flags work the same on 240.
const OBSERVED = 30;
const all = (files: ReturnType<typeof sheetsFor>["files"]) =>
  [...files.values()].flatMap((sheet) => sheet.pairs.map((p) => p.id));

describe("words:pairs --observed, --per-file and --sample", () => {
  const whole = sheetsFor({ observed: OBSERVED, perFile: 1_000_000 });

  it(
    "is deterministic: the same options give identical sheets",
    { timeout: 300_000 },
    () => {
      const again = sheetsFor({ observed: OBSERVED, perFile: 1_000_000 });
      expect(JSON.stringify([...again.files])).toBe(
        JSON.stringify([...whole.files]),
      );
      expect(whole.scenes).toBe(OBSERVED);
      expect(whole.instances).toBeGreaterThan(whole.allPairs.length);
      for (const sheet of whole.files.values())
        for (const pair of sheet.pairs) expect(pair.seen).toBeGreaterThan(0);
    },
  );

  it(
    "split files together equal the unsplit sheet",
    { timeout: 300_000 },
    () => {
      const split = sheetsFor({ observed: OBSERVED, perFile: 7 });
      expect(split.files.size).toBeGreaterThan(whole.files.size);
      for (const sheet of split.files.values())
        expect(sheet.pairs.length).toBeLessThanOrEqual(7);
      for (const [name, sheet] of whole.files) {
        const base = name.replace(/\.json$/, "");
        const pieces = [...split.files]
          .filter(
            ([n]) =>
              n === name || new RegExp(`^${base}\\.\\d+\\.json$`).test(n),
          )
          .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
          .flatMap(([, part]) => part.pairs);
        expect(pieces).toEqual(sheet.pairs);
      }
      expect(all(split.files).sort()).toEqual(all(whole.files).sort());
    },
  );

  it(
    "a sample is a subset of the observed pairs, the same for a seed and different for another",
    { timeout: 300_000 },
    () => {
      const one = sheetsFor({ observed: OBSERVED, sample: 20, seed: "a" });
      const again = sheetsFor({ observed: OBSERVED, sample: 20, seed: "a" });
      const other = sheetsFor({ observed: OBSERVED, sample: 20, seed: "b" });
      const observed = new Set(all(whole.files));
      const ids = all(one.files);
      expect([...one.files.keys()]).toEqual(["sample.json"]);
      expect(ids).toHaveLength(20);
      expect(new Set(ids).size).toBe(20);
      for (const id of ids) expect(observed.has(id)).toBe(true);
      expect(JSON.stringify([...again.files])).toBe(
        JSON.stringify([...one.files]),
      );
      expect(all(other.files)).not.toEqual(ids);
      // Spread across purposes: round-robin takes one from each before a second.
      expect(one.perPurpose.size).toBeGreaterThan(
        Math.min(5, whole.perPurpose.size) - 1,
      );
    },
  );
});
