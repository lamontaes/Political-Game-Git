import { describe, expect, it } from "vitest";
import { adultSituationBank } from "../simulation/adult-situations";
import {
  assertWorldIntegrity,
  serializeWorld,
  deserializeWorld,
  workItemState,
} from "../simulation";
import { chooseAdultOption } from "./adult-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

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
    ["adult.help-with-strings", "take-it", /was sorted out/i],
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
  for (const optionKey of ["say-it", "absorb-it", "set-it-out"]) {
    it(`household-standing/${optionKey} appends an action without completing the work item`, () => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: "kentucky",
        startAge: 34,
        depth: "summarize-earlier-life",
        startingLife: "ordinary-life",
        household: "shares-a-home",
        startKind: "custom",
        questionnaire: "skipped",
        seed: "p2r1-action-boundary",
      });
      const world = openOrdinaryLife(game.world, game.playerPersonId);
      const before = serializeWorld(world);
      const item = world.history.workItems.find(
        (w) => w.stableKey === "ordinary-life:household-errands",
      )!;
      const state = workItemState(world, item.id);
      const next = chooseAdultOption(world, {
        personId: game.playerPersonId,
        situationKey: "adult.household-standing",
        optionKey,
      });
      expect(serializeWorld(world)).toBe(before);
      expect(next.history.workItems).toEqual(world.history.workItems);
      expect(workItemState(next, item.id)).toEqual(state);
      expect(next.history.lifeCommitments).toEqual(
        world.history.lifeCommitments,
      );
      const event = next.history.events.find((e) =>
        e.tags.includes("adult.household-standing"),
      )!;
      expect(event.tags).toContain(`choice.${optionKey}`);
      const authored = adultSituationBank()
        .find((s) => s.key === "adult.household-standing")!
        .options.find((o) => o.key === optionKey)!;
      expect(event.context.choice).toBe(authored.label);
      expect(event.summary).toBe(authored.memory);
      expect(
        next.history.memories.some(
          (m) =>
            m.personId === game.playerPersonId &&
            m.eventId === event.id &&
            m.rememberedSummary === authored.memory,
        ),
      ).toBe(true);
      expect(event.participants.length).toBe(authored.witnessed ? 2 : 1);
      assertWorldIntegrity(next);
      expect(deserializeWorld(serializeWorld(next))).toEqual(next);
    });
  }
});
