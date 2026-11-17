import { expect, it } from "vitest";
import { sentenceText } from "./address-render";

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
