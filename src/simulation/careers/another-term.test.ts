import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { requireLocalityInState } from "../../presentation/new-game-geography";
import { beginHealthEpisode, changeHealthState } from "../crisis/health";
import { crisisRecords } from "../crisis/records";
import { addDays } from "../dates";
import type { DecisionConsideration, EntityId, IsoDate, World } from "../types";
import { chanceOfDyingBefore, decideAnotherTerm } from "./another-term";

const SLOW = 60_000;

function openIn(seed: string) {
  const home = requireLocalityInState("US-NM", "Las Cruces");
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: home.key,
    household: "shares-a-home",
  });
  return { world: game.world, playerId: game.playerPersonId };
}

/** An adult other than the played character, so nobody's choice is taken. */
function someoneElse(world: World, playerId: EntityId): EntityId {
  return Object.values(world.people)
    .filter((person) => person.id !== playerId)
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .find((person) => person.birthDate < "1990-01-01")!.id;
}

function bornOn(world: World, personId: EntityId, birthDate: IsoDate): World {
  return {
    ...world,
    people: {
      ...world.people,
      [personId]: { ...world.people[personId]!, birthDate },
    },
  };
}

const serving = (reason: string): DecisionConsideration[] => [
  {
    stableKey: `test:${reason}:serving`,
    optionKey: "seek",
    sourceType: "context:current-office",
    direction: "supports",
    importance: "strong",
    confidence: "high",
    explanation: "They hold the seat.",
    sourceRefs: [],
  },
];

describe("whether somebody runs for another term", () => {
  it(
    "reads their odds of living through the term from the life table, which climb faster with every decade",
    () => {
      const { world, playerId } = openIn("another-term-odds");
      const id = someoneElse(world, playerId);
      const from = world.currentDate;
      const twoYears = addDays(from, 730);
      const at = (age: number) =>
        chanceOfDyingBefore(
          bornOn(world, id, addDays(from, -Math.round(age * 365.25) - 30)),
          id,
          from,
          twoYears,
        );
      const [fifty, seventy, ninety] = [at(50), at(70), at(90)];
      expect(fifty).toBeGreaterThan(0);
      expect(seventy).toBeGreaterThan(fifty);
      // Not a straight line: the second twenty years add far more than the first.
      expect(ninety - seventy).toBeGreaterThan(3 * (seventy - fifty));
      // A longer term carries more of the same risk.
      const sixYears = chanceOfDyingBefore(
        bornOn(world, id, addDays(from, -Math.round(85 * 365.25) - 30)),
        id,
        from,
        addDays(from, 6 * 365),
      );
      expect(sixYears).toBeGreaterThan(at(85));
    },
    SLOW,
  );

  it(
    "a limiting diagnosis settles it, and the recorded reason says so",
    () => {
      const { world, playerId } = openIn("another-term-health");
      const id = someoneElse(world, playerId);
      const input = {
        personId: id,
        subjectKey: "test-seat",
        onDate: world.currentDate,
        termEnds: addDays(world.currentDate, 730),
        serving: serving("seat"),
        decisionType: "election.consider-another-test-term",
      };
      const well = decideAnotherTerm(world, {
        ...input,
        stableKey: "test:another-term:well",
      });
      const wellTrace = well.world.history.decisionTraces.at(-1)!;
      expect(
        wellTrace.context.considerations.some(
          (row) => row.sourceType === "domain:health",
        ),
      ).toBe(false);

      let sick = beginHealthEpisode(world, {
        stableKey: "test-another-term-illness",
        personId: id,
        severity: "serious",
        initialLimitation: "limited",
        origin: { kind: "authored", note: "Test fixture only." },
        causalParentIds: [],
      });
      const episode = crisisRecords(sick).find(
        (record) => record.kind === "health-episode" && record.personId === id,
      )!;
      sick = changeHealthState(sick, {
        stableKey: "prognosis",
        episodeId: episode.id,
        state: "prognosis-limited",
        functionalLimitation: "limited",
      });
      const decided = decideAnotherTerm(sick, {
        ...input,
        stableKey: "test:another-term:sick",
      });
      const trace = decided.world.history.decisionTraces.at(-1)!;
      const health = trace.context.considerations.find(
        (row) => row.sourceType === "domain:health",
      );
      expect(health).toMatchObject({
        optionKey: "step-down",
        importance: "decisive",
        confidence: "high",
      });
      expect(decided.seeks).toBe(false);
      expect(trace.selectedOptionKey).toBe("step-down");
      expect(decided.reason).toBe(
        "Their illness limits the years they have left.",
      );
      expect(decided.decisionTraceId).toBe(trace.id);
    },
    SLOW,
  );
});
