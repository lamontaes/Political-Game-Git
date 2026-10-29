import { describe, expect, it } from "vitest";
import { heldByGrades } from "../english-grades";
import {
  BRING_BANK,
  bringWordsFromBank,
  SCENE_BANK,
  sceneWordsFromBank,
} from "./scene-bank";
import { JOURNAL_BANK, journalDataFromBank } from "./journal-bank";

/**
 * The owner's grades are the one gate on a bank piece (words-engine, Oct 24):
 * every piece plays unless the grades hold it, and a held piece is never
 * offered. The part carries no flag of its own.
 */
type Bank = { parts: { key: string }[] };
type Words = () => unknown;

/** The part keys a set of words offers: every variant (a key with its text). */
const offered = (data: unknown): Set<string> => {
  const keys = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      const row = value as { key?: unknown; text?: unknown };
      if (typeof row.key === "string" && typeof row.text === "string")
        keys.add(row.key);
      Object.values(value).forEach(walk);
    }
  };
  walk(data);
  return keys;
};

describe("the grades gate the banks", () => {
  for (const [name, bank, words] of [
    ["scene-words.json", SCENE_BANK, sceneWordsFromBank],
    ["journal.json", JOURNAL_BANK, journalDataFromBank],
    ["bring-it-up.json", BRING_BANK, bringWordsFromBank],
  ] as unknown as [string, Bank, Words][]) {
    it(`never offers a piece of ${name} the owner's grades reject`, () => {
      const play = offered(words());
      expect(play.size, name).toBeGreaterThan(0);
      const rejected = bank.parts
        .map((part) => part.key)
        .filter((key) => heldByGrades(key));
      expect(
        rejected.filter((key) => play.has(key)),
        name,
      ).toEqual([]);
    });
  }
});
