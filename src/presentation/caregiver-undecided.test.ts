import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as decisions from "../simulation/decisions";
import type { DecisionEvaluation, EntityId, World } from "../simulation/types";
import { assertWorldIntegrity } from "../simulation/world";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  caregiverChoice,
  playChildhoodMoment,
  projectChildhoodMoment,
} from "./childhood";

let world: World;
let playerId: EntityId;
beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "people-childhood-a",
      startAge: 6,
      depth: "play-formative-years",
    }),
  ).game!;
  world = game.world;
  playerId = game.playerPersonId;
  const moment = projectChildhoodMoment(world, playerId)!;
  expect(moment.action).toBe("watch");
  expect(moment.caregiverPersonId).not.toBeNull();
  expect(moment.scene!.options.length).toBeGreaterThan(1);
});
afterEach(() => vi.restoreAllMocks());

function answer(
  outcomeKind: DecisionEvaluation["outcomeKind"],
  selectedOptionKey: string | null,
) {
  const actual = decisions.evaluateDecision;
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation(
      (
        at: World,
        context: Parameters<typeof decisions.evaluateDecision>[1],
      ) => {
        const evaluation = actual(at, context);
        return context.decisionType === "people.caregiver-choice"
          ? { ...evaluation, outcomeKind, selectedOptionKey }
          : evaluation;
      },
    );
}

describe("a caregiver's unresolved choice leaves the actual childhood moment pending", () => {
  it.each(["undecided", "no-available-option", "selected"] as const)(
    "%s with no selected option writes no formative outcome before or after reload",
    (outcomeKind: DecisionEvaluation["outcomeKind"]) => {
      const spy = answer(outcomeKind, null);
      const before = serializeWorld(world);
      const moment = projectChildhoodMoment(world, playerId)!;
      const chosen = caregiverChoice(world, playerId, moment, moment.scene!);
      const played = playChildhoodMoment(world, { personId: playerId });
      expect(played === world).toBe(true);
      expect(chosen).toBeNull();
      expect(serializeWorld(played)).toBe(before);
      expect(projectChildhoodMoment(played, playerId)).toEqual(moment);
      const reloaded = deserializeWorld(before);
      assertWorldIntegrity(reloaded);
      const repeated = playChildhoodMoment(reloaded, { personId: playerId });
      expect(repeated).toBe(reloaded);
      expect(serializeWorld(repeated)).toBe(before);
      expect(projectChildhoodMoment(repeated, playerId)).toEqual(moment);
      expect(
        spy.mock.calls.filter(
          ([, c]: Parameters<typeof decisions.evaluateDecision>) =>
            c.decisionType === "people.caregiver-choice",
        ),
      ).toHaveLength(3);
    },
  );

  it.each([0, 1])(
    "keeps the selected option at index %s and its saved formative outcome",
    (index: number) => {
      const moment = projectChildhoodMoment(world, playerId)!;
      const optionKey = moment.scene!.options[index]!.key;
      answer("selected", optionKey);
      expect(caregiverChoice(world, playerId, moment, moment.scene!)).toBe(
        optionKey,
      );
      const played = playChildhoodMoment(world, { personId: playerId });
      expect(played.history.events.length).toBeGreaterThan(
        world.history.events.length,
      );
      expect(
        played.history.memories.filter((m) => m.personId === playerId).length,
      ).toBeGreaterThan(
        world.history.memories.filter((m) => m.personId === playerId).length,
      );
      expect(played.currentDate).toBe(world.currentDate);
      const saved = deserializeWorld(serializeWorld(played));
      assertWorldIntegrity(saved);
      expect(saved.history.events).toEqual(played.history.events);
      expect(saved.history.memories).toEqual(played.history.memories);
      expect(() => playChildhoodMoment(saved, { personId: playerId })).toThrow(
        "The selected life situation is not appropriate for the current formative context.",
      );
    },
  );
});
