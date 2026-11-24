import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Counts-only corpora (EM-2). Study corpora may inform the composer as numbers,
 * never as lines: every file is marked not shippable, names its source and
 * license, and holds only numbers keyed by tokens of three words or fewer.
 */

const COUNTS_DIR = path.resolve(__dirname, "../data/english/counts");

type CountsFile = {
  schema: string;
  register: string;
  shippable: boolean;
  source: { document: string; license: string; url: string };
  counts: Record<string, unknown>;
};

function leaves(
  value: unknown,
  key: string,
): Array<{ key: string; value: unknown }> {
  if (value !== null && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => leaves(v, k));
  return [{ key, value }];
}

const files = readdirSync(COUNTS_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({
    name,
    file: JSON.parse(
      readFileSync(path.join(COUNTS_DIR, name), "utf8"),
    ) as CountsFile,
  }));

describe("English counts-only corpora", () => {
  it("has at least one counts file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { name, file } of files) {
    describe(name, () => {
      it("is counts-only, not shippable, and names its source", () => {
        expect(file.schema).toBe("english-counts/1");
        expect(`${file.register}.json`).toBe(name);
        expect(file.shippable).toBe(false);
        expect(file.source.document.trim()).not.toBe("");
        expect(file.source.license.trim()).not.toBe("");
        expect(file.source.url).toMatch(/^https:\/\//);
      });

      it("holds only numbers keyed by short tokens", () => {
        for (const { key, value } of leaves(file.counts, "counts")) {
          expect(typeof value).toBe("number");
          expect(key.split(/\s+/).length).toBeLessThanOrEqual(3);
        }
      });

      it("has turn or sentence counts a composer can use", () => {
        const counts = file.counts as Record<string, number>;
        if (counts.turns === undefined) {
          expect(counts.sentences).toBeGreaterThan(1000);
          expect(counts.medianSentenceWords).toBeGreaterThan(0);
          expect(counts.shareSentencesQuoting).toBeGreaterThan(0);
          expect(counts.shareSentencesQuoting).toBeLessThan(1);
          return;
        }
        expect(counts.turns).toBeGreaterThan(1000);
        expect(counts.medianTurnWords).toBeGreaterThan(0);
        expect(counts.shareTurnsThreeWordsOrFewer).toBeGreaterThan(0);
        expect(counts.shareTurnsThreeWordsOrFewer).toBeLessThan(1);
        expect(counts.questionRate).toBeGreaterThan(0);
        expect(counts.questionRate).toBeLessThan(1);
      });
    });
  }
});
