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
 * The grading-only `heldFirst` switch. Every bank piece plays unless the
 * owner's grades reject it (words-engine, Oct 24): a rejected piece is never
 * offered, in play or on a grading page. A piece not yet released (not
 * shippable, and not rejected) plays only on a grading page, wherever one
 * fits, so the owner reads it where play would say it.
 */
type Bank = { parts: { key: string; shippable?: boolean }[] };
type Words = (bank?: never, rows?: undefined, heldFirst?: boolean) => unknown;

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

describe("the held-first switch", () => {
  for (const [name, bank, words] of [
    ["scene-words.json", SCENE_BANK, sceneWordsFromBank],
    ["journal.json", JOURNAL_BANK, journalDataFromBank],
    ["bring-it-up.json", BRING_BANK, bringWordsFromBank],
  ] as unknown as [string, Bank, Words][]) {
    it(`never offers a piece of ${name} the owner's grades reject, in play or grading`, () => {
      const play = offered(words());
      const grading = offered(words(undefined, undefined, true));
      expect(play.size, name).toBeGreaterThan(0);
      const rejected = bank.parts
        .map((part) => part.key)
        .filter((key) => heldByGrades(key));
      expect(
        rejected.filter((key) => play.has(key) || grading.has(key)),
        name,
      ).toEqual([]);
    });

    it(`plays an unreleased piece of ${name} only on a grading page`, () => {
      // A piece play offers today, made unreleased: play stops offering it
      // and the grading page offers it where it fits.
      const play = offered(words());
      const parts = new Set(bank.parts.map((part) => part.key));
      const key = [...play].filter((row) => parts.has(row)).sort()[0]!;
      const unreleased = {
        ...bank,
        parts: bank.parts.map((part) =>
          part.key === key ? { ...part, shippable: false } : part,
        ),
      } as never;
      expect(offered(words(unreleased)).has(key), `${name}: ${key}`).toBe(
        false,
      );
      expect(
        offered(words(unreleased, undefined, true)).has(key),
        `${name}: ${key}`,
      ).toBe(true);
    });
  }
});
