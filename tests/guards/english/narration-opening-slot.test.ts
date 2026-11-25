import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dayOpening } from "../../../src/english/day-words";
import { narrationNotOpeningOnTheClockOrDate } from "../../../src/english/composed-checks";

/**
 * Narration never opens on a clock time or a date (rule
 * no-day-or-place-in-narration; owner, Nov 24, on "Late in the morning on
 * January 21st, you knock": "you already know what day and time it is").
 * The pattern part of the rule reads the words a bank line holds; this reads
 * the slot that fills one: `{begins}` is `dayOpening(date, minute)` in
 * src/director/scene.ts, a daypart and a date ("Late in the morning on
 * January 21st"), so a narration line that opens on `{begins}` opens on a
 * date. The lines that do are the known list in
 * narration-opening-slot-baseline.json, which only shrinks: a new one fails,
 * and a line rewritten or cut must leave the list.
 */
const ROOT = path.resolve(import.meta.dirname, "../../..");
const KNOWN = (
  JSON.parse(
    readFileSync(
      path.join(
        ROOT,
        "tests/guards/english/narration-opening-slot-baseline.json",
      ),
      "utf8",
    ),
  ) as { opensOnBegins: string[] }
).opensOnBegins;

const now = (
  JSON.parse(
    readFileSync(
      path.join(ROOT, "data/english/parts/scene-words.json"),
      "utf8",
    ),
  ) as { parts: { key: string; text: string }[] }
).parts
  .filter((piece) => /^\{begins\}/.test(piece.text))
  .map((piece) => piece.key)
  .sort();

describe("narration that opens on the day's own date", () => {
  it("adds no line that opens on {begins}", () => {
    expect(
      now.filter((key) => !KNOWN.includes(key)),
      "a new narration line opens on a date; open on the place or the person",
    ).toEqual([]);
  });
  it("lowers the list as soon as a line is rewritten or cut", () => {
    expect(
      KNOWN.filter((key) => !now.includes(key)),
      "remove these from narration-opening-slot-baseline.json",
    ).toEqual([]);
  });
  it("the slot is a date: filled, the opening is what the check lists", () => {
    // `{begins}` is the day's opening: a daypart and a date, in play.
    const filled = `${dayOpening("2025-01-21", 11 * 60 + 30)}, you knock.`;
    const check = narrationNotOpeningOnTheClockOrDate(
      {
        id: "scene:1",
        kind: "scene",
        date: "2025-01-21",
        minuteOfDay: 11 * 60 + 30,
        presentIds: [],
        screens: [
          {
            lines: [
              {
                speakerId: undefined,
                text: filled,
                sentences: [filled],
              } as never,
            ],
            offered: [],
          },
        ],
      },
      {} as never,
    );
    expect(check.length, filled).toBe(1);
  });
});
