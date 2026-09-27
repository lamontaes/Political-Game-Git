import { describe, expect, it } from "vitest";
import { adultSituationBank } from "../simulation/adult-situations";
import {
  assertWorldIntegrity,
  serializeWorld,
  workItemState,
} from "../simulation";
import { chooseAdultOption } from "./adult-life";
import { fixture } from "../../tests/support/p2r1-worlds";

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
    ["adult.ordinary-good-day", "get-things-done", /cleared most|felt.*good/i],
  ] as const) {
    it(`${sceneKey}/${optionKey}: no unrecorded result in its memory`, () => {
      const option = adultSituationBank()
        .find((s) => s.key === sceneKey)!
        .options.find((o) => o.key === optionKey)!;
      expect(option.memory).not.toMatch(unsupported);
    });
  }
  it("keeps an older grocery item but refuses its archived confrontation", () => {
    const { world, personId } = fixture();
    const item = world.history.workItems.find(
      (entry) => entry.stableKey === "ordinary-life:household-errands",
    )!;
    const state = workItemState(world, item.id);
    const before = serializeWorld(world);
    for (const optionKey of ["say-it", "absorb-it", "set-it-out"]) {
      expect(() =>
        chooseAdultOption(world, {
          personId,
          situationKey: "adult.household-standing",
          optionKey,
        }),
      ).toThrow(/not available/);
      expect(serializeWorld(world)).toBe(before);
      expect(workItemState(world, item.id)).toEqual(state);
    }
    assertWorldIntegrity(world);
  });
});
