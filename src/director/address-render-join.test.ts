import { expect, it } from "vitest";
import { sentenceText } from "./address-render";
import { noCapitalAfterComma } from "../english/composed-checks";
import {
  composedLine,
  type ComposedSample,
  type ComposedText,
} from "../english/composed-text";

/**
 * The one renderer joins a belief that leads into its ask at a comma, so the
 * ask's first word takes no capital there (the Story lead's read of #9831:
 * "...to protect their family, Don't look for my name ..." in the Alaska
 * governor's address, Big Lake, Alaska (0207070), seed press-1117:0).
 */
it("says an ask joined after a belief's comma in lower case", () => {
  const text = sentenceText({
    pieces: [
      "opening-speech.ask.polished-inaugural-because-i-hold-that-belief-belief-leads",
      "opening-speech.ask.oppose-more-plain-0",
    ],
    values: {
      belief: "an adult can keep a gun safe at home",
      measure: "bill",
      about: "child access prevention for guns",
    },
  });
  expect(text).toBe(
    "Because I hold that an adult can keep a gun safe at home, don't look for my name on any bill for child access prevention for guns.",
  );
});

/**
 * The turn to the states says a past office after its lead clause and a comma
 * ("To the governors of every state, before I was President, ..."), and
 * capitalized when it stands alone; "I" keeps its capital either way (the
 * Story lead's read of #9840, Nov 17). The composed check finds no capital
 * after the comma.
 */
it("joins the past office to the states' lead clause in lower case, and capitalizes it alone", () => {
  const opener =
    "opening-speech.to-states.polished-ina-sta-all-opener-to-the-governors-of-every-state";
  const before =
    "opening-speech.to-states.polished-unit3-prior-governor-before-i-was-president-i-was-governor-of-prior";
  const governed =
    "opening-speech.to-states.polished-unit3-prior-governor-i-governed-prior-state-so-i-know-where-the";
  const values = { "prior-state": "Delaware" };
  const joined = sentenceText({ pieces: [opener, before], values });
  expect(joined).toMatch(
    /^To the governors of every state, before I was President, I was governor of Delaware,/,
  );
  expect(sentenceText({ pieces: [before], values })).toMatch(
    /^Before I was President/,
  );
  expect(sentenceText({ pieces: [opener, governed], values })).toMatch(
    /^To the governors of every state, I governed Delaware/,
  );
  const said = (text: string): ComposedText => ({
    id: "speech:president:join",
    kind: "speech:president",
    date: "2025-01-20",
    minuteOfDay: 720,
    presentIds: [],
    screens: [{ lines: [composedLine(text)], offered: [] }],
  });
  for (const text of [
    joined,
    sentenceText({ pieces: [opener, governed], values }),
  ])
    expect(noCapitalAfterComma(said(text), {} as ComposedSample)).toEqual([]);
});
