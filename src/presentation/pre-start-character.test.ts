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
