import { expect, it } from "vitest";
import { OPENING_SPEECH_BANK } from "../english/english-opening-speech";

/**
 * A close that only fits an ask for a new law ("get it done", "send it to
 * me", "I'll sign it", "the votes for ...") is said only where the record
 * holds one (`asked-for`, speech-outline.ts closeFacts): Maine's governor,
 * against independent redistricting, closed "First up is independent
 * redistricting. Let's get it done this year." (North Berwick, Maine
 * (2350290), seed press-1117:4, at 2796f33f7d).
 */
const FOR_A_NEW_LAW =
  /\b(?:get it done|finish it|send (?:it to )?me|sign it|reaches my desk|votes for|needs votes|got the votes\. Let's go)\b/i;
/** "Start with X" opens the close: the first thing to pass ("We start with X" names it only). */
const STARTS = /^Start with\b/;

it("says a close that fits only an ask for a new law only where the speaker asks for one", () => {
  const wrong = OPENING_SPEECH_BANK.parts.flatMap((part) =>
    part.uses
      .filter(
        (use) =>
          use.role === "close" &&
          (use.requiresFacts ?? []).includes("asked-about") &&
          (FOR_A_NEW_LAW.test(part.text) || STARTS.test(part.text)) &&
          !(use.requiresFacts ?? []).includes("asked-for"),
      )
      .map((use) => `${part.key} (${use.subject}): ${part.text}`),
  );
  expect(wrong).toEqual([]);
});
