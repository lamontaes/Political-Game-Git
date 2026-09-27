import { describe, expect, it } from "vitest";
import { adultSituationBank } from "../simulation/adult-situations";

describe("P2R1 action recaps do not invent reactions or completed outcomes", () => {
  for (const [sceneKey, optionKey, unsupported] of [
    ["adult.community-building", "cut-something-else", /asked.*twice/i],
    ["adult.partner-plan", "your-way", /and got it/i],
    [
      "adult.friend-in-difficulty",
      "keep-it",
      /because|rather than anybody else/i,
    ],
    ["adult.incident-aftermath", "sort-your-own", /got.*household straight/i],
    [
      "adult.care-request",
      "name-the-limit",
      /became assumed|caregiving|its edges/i,
    ],
    ["adult.promise-comes-due", "renegotiate", /was accepted/i],
    ["adult.friend-favour", "decline", /they said it was fine/i],
    ["adult.petition-ask", "sign", /people.*would read/i],
    ["adult.volunteer-ask", "sign-up", /most Saturdays/i],
  ] as const) {
    it(`${sceneKey}/${optionKey}: no unrecorded result in its memory`, () => {
      const option = adultSituationBank()
        .find((s) => s.key === sceneKey)!
        .options.find((o) => o.key === optionKey)!;
      expect(option.memory).not.toMatch(unsupported);
    });
  }
});
