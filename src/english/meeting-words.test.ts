import { describe, expect, it } from "vitest";
import { screenPick, screenWays } from "./screen-words";

// The resident's lines at a town meeting (Fable A, Nov 13, for
// meetings-resident-player-speaks-at-public-comment): the calendar's plan to
// attend and the meeting panel's lines, each with its wordings, filled only
// from the meeting's own record and silent when a fact is missing.
const facts = {
  body: "Fairlawn City Council",
  time: "7 p.m.",
  date: "March 4",
  count: "three",
};
const cases = [
  ["calendar", "calendar.meeting-plan.1", 3],
  ["meeting", "meeting.empty-agenda.1", 3],
  ["meeting", "meeting.resident-can-speak.1", 1],
  ["meeting", "meeting.resident-can-speak-one.1", 1],
] as const;

describe("a resident's meeting lines", () => {
  for (const [bank, key, ways] of cases)
    it(`${key} has ${ways} wording(s), each filled from the record`, () => {
      const keys = screenWays(bank, key);
      expect(keys).toHaveLength(ways);
      const said = new Set<string>();
      for (let n = 0; n < 24; n += 1) {
        const line = screenPick(bank, keys, facts, {
          momentKey: `meeting:test:${n}`,
          sourceIds: [`meeting:test:${n}`],
        });
        expect(line, key).not.toBeNull();
        expect(line!.text).not.toMatch(/[{}]/);
        expect(line!.text).toContain(facts.body);
        said.add(line!.text);
      }
      // Different meetings are told in different words when there are several.
      expect(said.size).toBe(ways);
      // A fact the record does not hold leaves the line unsaid, never guessed.
      expect(
        screenPick(
          bank,
          keys,
          { ...facts, body: "" },
          {
            momentKey: "meeting:test:missing",
            sourceIds: ["meeting:test:missing"],
          },
        ),
      ).toBeNull();
    });
});
