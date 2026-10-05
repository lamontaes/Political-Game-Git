import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays, ageOnDate } from "../simulation/dates";
import { householdMembershipsAt } from "../simulation/life-queries";
import {
  FAMILY_MEMBER_ADDED_EVENT,
  parentsOf,
} from "../simulation/people-family";
import { pursuitCandidates } from "../simulation/people-goal-review";
import { SeededRng } from "../simulation/rng";
import { CREATOR_LIFE_FORKS } from "../simulation/creator-life-forks";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import {
  DEFAULT_NEW_GAME_SETUP,
  createPreStartNewGameWorld,
  finishPreStartNewGameWorld,
} from "./new-game";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  beginHistoricalPastMode,
  endHistoricalPastMode,
} from "../simulation/historical-past-mode";
import { recordPersonDeath } from "../simulation/vitality";
import { advanceWorld, assertWorldIntegrity } from "../simulation/world";
import {
  buildPreStartCharacterWorld,
  finalizePreStartPlayer,
} from "./production-world";

const seed = "session6-birth-resident-handoff";
const place = drawRandomPlace(seed);
const age = new SeededRng(seed).integer(18, 71);
const targetStartDate = place.context.initialMoment.date;
const input = {
  seed,
  place,
  age,
  givenName: "",
  familyName: "",
  startingLife: "ordinary-life" as const,
  depth: "summarize-earlier-life" as const,
  household: "lives-alone" as const,
  preStartYear: {
    version: "pre-start-world-year-v1" as const,
    targetStartDate,
    priorYearStartDate: addDays(targetStartDate, -1),
  },
};

describe("a character remains in their birth World through Begin", () => {
  it("admits a dependent Creator character into the household on their birth date", () => {
    const game = createPreStartNewGameWorld(
      {
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        creatorLifeForks: [],
      },
      addDays(targetStartDate, -1),
    );
    const child = game.world.people[game.playerPersonId]!;
    expect(parentsOf(game.world, child.id).length).toBeGreaterThan(0);
    expect(
      householdMembershipsAt(game.world, child.id, {
        asOfDate: child.birthDate,
        historySequenceExclusive: game.world.history.nextSequence,
      }).length,
    ).toBeGreaterThan(0);
    assertWorldIntegrity(game.world);
  });
  it("preserves the resident ledger through the public finish and save boundaries", () => {
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: age,
      creatorLifeForks: [],
    };
    const game = createPreStartNewGameWorld(
      setup,
      addDays(targetStartDate, -1),
    );
    const reopenedPast = deserializeWorld(serializeWorld(game.world));
    expect(reopenedPast.preStartLife).toEqual(game.world.preStartLife);
    const historical = beginHistoricalPastMode(
      reopenedPast,
      game.playerPersonId,
      targetStartDate,
    );
    expect(() => endHistoricalPastMode(historical)).toThrow(
      "recorded boundary",
    );
    const atBoundary = advanceWorld(historical, 1);
    expect(() =>
      finishPreStartNewGameWorld({ ...game, world: atBoundary }),
    ).toThrow("before Begin");
    const advanced = endHistoricalPastMode(atBoundary);
    expect(advanced.currentMoment).toEqual(atBoundary.currentMoment);
    expect(advanced.pastMode).toBeUndefined();
    const finished = finishPreStartNewGameWorld({ ...game, world: advanced });
    expect(finished.world.history).toBe(advanced.history);
    expect(finished.world.people).toBe(advanced.people);
    const saved = deserializeWorld(serializeWorld(finished.world));
    expect(saved.id).toBe(game.world.id);
    expect(saved.control).toEqual(finished.world.control);
    expect(saved.people).toEqual(advanced.people);
    expect(saved.history).toEqual(advanced.history);
    expect(saved.preStartLife).toBeUndefined();
    assertWorldIntegrity(saved);
  });
  it("records three Creator choices as durable decisions and goals the resident writers read", () => {
    const creatorLifeForks = CREATOR_LIFE_FORKS.map((fork) => ({
      forkKey: fork.key,
      optionKey: "pursue" as const,
    }));
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      creatorLifeForks,
    };
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(setup))?.creatorLifeForks,
    ).toEqual(creatorLifeForks);
    const built = buildPreStartCharacterWorld({ ...input, creatorLifeForks });
    const traces = built.world.history.decisionTraces.filter(
      (trace) => trace.context.decisionType === "people.creator-life-fork",
    );
    expect(traces).toHaveLength(CREATOR_LIFE_FORKS.length);
    expect(
      traces.every(
        (trace) =>
          trace.selectedOptionKey === "pursue" &&
          trace.context.randomness === "none",
      ),
    ).toBe(true);
    for (const fork of CREATOR_LIFE_FORKS) {
      expect(
        built.world.history.goalStates
          .filter(
            (goal) =>
              goal.personId === built.playerPersonId &&
              goal.goalKey === fork.goalKey,
          )
          .at(-1)?.status,
      ).toBe("active");
    }
    const stayed = buildPreStartCharacterWorld({
      ...input,
      creatorLifeForks: creatorLifeForks.map((choice) => ({
        ...choice,
        optionKey: "leave" as const,
      })),
    });
    for (const fork of CREATOR_LIFE_FORKS) {
      expect(
        stayed.world.history.goalStates
          .filter(
            (goal) =>
              goal.personId === stayed.playerPersonId &&
              goal.goalKey === fork.goalKey,
          )
          .at(-1)?.status,
      ).toBe("proposed");
    }
    expect(stayed.playerPersonId).toBe(built.playerPersonId);
    assertWorldIntegrity(stayed.world);
  });
  it("binds the Creator identity to a dated birth and makes them a resident during the past", () => {
    const built = buildPreStartCharacterWorld(input);
    const { world, playerPersonId, player } = built;
    assertWorldIntegrity(world);
    expect(ageOnDate(player.birthDate, targetStartDate)).toBe(age);
    const birth = world.history.events.find(
      (event) =>
        event.type === FAMILY_MEMBER_ADDED_EVENT &&
        event.tags.includes("family.birth") &&
        event.involvedEntityIds.includes(playerPersonId),
    );
    expect(birth?.occurredAt).toBe(player.birthDate);
    expect(parentsOf(world, playerPersonId).length).toBeGreaterThan(0);
    expect(
      householdMembershipsAt(world, playerPersonId, {
        asOfDate: player.birthDate,
        historySequenceExclusive: world.history.nextSequence,
      }).length,
    ).toBeGreaterThan(0);
    expect(pursuitCandidates(world)).toContain(playerPersonId);
    const advanced = advanceWorld(world, 1);
    const begun = finalizePreStartPlayer(advanced, input);
    expect(begun.world.id).toBe(world.id);
    expect(begun.playerPersonId).toBe(playerPersonId);
    expect(begun.world.history).toBe(advanced.history);
    expect(begun.world.people).toBe(advanced.people);
    expect(begun.world.preStartLife).toBeUndefined();
    expect(pursuitCandidates(begun.world)).not.toContain(playerPersonId);
    assertWorldIntegrity(begun.world);
    console.info(
      JSON.stringify({ seed, place: place.displayName, age, playerPersonId }),
    );
  });

  it("stops at Begin if the character died during the past", () => {
    const built = buildPreStartCharacterWorld(input);
    const died = recordPersonDeath(built.world, {
      stableKey: "session6:death-before-begin",
      personId: built.playerPersonId,
      diedAt: built.world.currentDate,
      causeKey: "cause:test",
      sourceEntityIds: [built.world.id],
      summary: "Died before Begin.",
      provenance: { kind: "authored", note: "Pre-start handoff regression." },
    });
    const advanced = advanceWorld(died, 1);
    expect(() => finalizePreStartPlayer(advanced, input)).toThrow(
      "died before Begin",
    );
  });
});
