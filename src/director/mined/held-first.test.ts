import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bringDataFromBank, sceneWordsFromBank } from "./scene-bank";
import { journalDataFromBank } from "./journal-bank";

/**
 * The grading-only `heldFirst` switch: play never offers a line held until the owner grades it, and the
 * grading view offers the held ones wherever one fits, so each can be read
 * where play would say it.
 */
const heldKeys = (bank: string) =>
  (
    JSON.parse(readFileSync(`data/english/parts/${bank}`, "utf8")) as {
      parts: { key: string; shippable?: boolean }[];
    }
  ).parts
    .filter((part) => part.shippable !== true)
    .map((part) => part.key);
const offered = (data: unknown, keys: readonly string[]) => {
  const text = JSON.stringify(data);
  return keys.filter((key) => text.includes(`"${key}"`));
};

describe("the held-first switch", () => {
  for (const [bank, words] of [
    ["scene-words.json", sceneWordsFromBank],
    ["journal.json", journalDataFromBank],
    ["bring-it-up.json", bringDataFromBank],
  ] as const) {
    it(`keeps every held line of ${bank} out of play, and offers them to grading`, () => {
      const held = heldKeys(bank);
      expect(held.length).toBeGreaterThan(0);
      expect(offered(words(), held)).toEqual([]);
      expect(
        offered(words(undefined, undefined, true), held).length,
      ).toBeGreaterThan(0);
    });
  }
});
