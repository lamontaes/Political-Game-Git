import { describe, expect, it } from "vitest";
import { pronounFitsThePerson } from "../src/english/composed-checks";
import {
  composedLine,
  type ComposedSample,
  type ComposedText,
} from "../src/english/composed-text";
import { buildTalks, seed } from "./support/scene-talk-fixture";

/**
 * Rule 109 on real composed scenes. The talks are composed by the director
 * and the English engine from the bank in the pinned world of
 * tests/support/scene-talk-fixture.ts (seed "scene-talk-test"): every
 * purpose, with the other person named "Pat Rivera". The check runs over
 * those composed lines twice: once with Pat's record saying she, where a line
 * that says they, them or their after "Pat" is listed, and once with a
 * record that holds neither, where nothing is.
 */

const PAT = "Pat";
const sampleWith = (pronoun: "he" | "she" | "they"): ComposedSample => ({
  place: "pinned fixture world",
  seed,
  playerId: "p",
  householdIds: ["p"],
  people: [{ id: "pat", full: "Pat Rivera", given: PAT, pronoun }],
  stateNames: [],
  townName: "the town",
  texts: [],
});

function composedTexts(): ComposedText[] {
  return buildTalks().map((talk, index) => {
    const lines: string[] = [];
    const take = (node: { lines: { text: string }[]; replies?: unknown[] }) =>
      node.lines.forEach((line) => lines.push(line.text));
    for (const line of [talk.open, talk.state, ...talk.intro])
      if (line) lines.push(line.text);
    take(talk.tree);
    return {
      id: `scene:${index}`,
      kind: "scene",
      date: "2021-01-03",
      minuteOfDay: 9 * 60,
      presentIds: ["p", "pat"],
      screens: [
        {
          lines: lines.map((text) => composedLine(text, "pat")),
          offered: [],
        },
      ],
    } satisfies ComposedText;
  });
}

describe("rule 109: the check on composed scenes of the pinned world", () => {
  it("lists a bank line that says they after Pat when Pat's record says she, and none when it holds neither", () => {
    const texts = composedTexts();
    const she = sampleWith("she");
    const found = texts.flatMap((text) => pronounFitsThePerson(text, she));
    expect(found.length).toBeGreaterThan(0);
    for (const row of found) expect(row.quote).toMatch(/Pat/);
    const neither = sampleWith("they");
    expect(
      texts.flatMap((text) => pronounFitsThePerson(text, neither)),
    ).toEqual([]);
  }, 240_000);
});
