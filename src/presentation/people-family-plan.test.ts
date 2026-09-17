import { describe, expect, it } from "vitest";
import {
  addDays,
  assertWorldIntegrity,
  createPartnership,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { childrenOf } from "../simulation/people-family";
import {
  FAMILY_INTENTION_ANSWERED_EVENT,
  familyPlanAvailability,
  familyPlans,
  proposeFamilyPlan,
} from "../simulation/people-family-plan";
import { householdMembershipsAt } from "../simulation/life-queries";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * CRUNCH47 B1: the dated family commands, reached the ordinary way. Two adults
 * who live together decide it between them, and the day itself arrives later
 * through the same clock as everything else.
 */

function life(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 30 }),
  ).game!;
  return {
    player: game.playerPersonId,
    world: openOrdinaryLife(game.world, game.playerPersonId),
  };
}

/** Somebody adult who already lives with the player. */
function housemate(world: World, player: EntityId): EntityId | null {
  const mine = householdMembershipsAt(world, player).map(
    (entry) => entry.household.id,
  );
  const found = world.history.householdMemberships.find(
    (record) => record.personId !== player && mine.includes(record.householdId),
  );
  return found?.personId ?? null;
}

function withPartner(seed: string) {
  const { player, world } = life(seed);
  const other = housemate(world, player);
  if (!other) return null;
  const together = createPartnership(world, {
    stableKey: `fixture:${seed}:partnership`,
    personIds: [player, other].sort() as [EntityId, EntityId],
    kind: "legal:marriage",
    startedAt: addDays(world.currentDate, -400),
    provenance: { kind: "authored", note: "PEOPLE family-plan fixture." },
  });
  return { player, partner: other, world: together };
}

describe("PEOPLE B1: deciding to have a family", () => {
  const fixture = withPartner("people-family-a");

  it("needs two people who are actually together", () => {
    const alone = life("people-family-b");
    const availability = familyPlanAvailability(alone.world, alone.player);
    expect(availability.available).toBe(false);
    expect(availability.reason).toMatch(/decision for two people|share a home/);
    expect(() =>
      proposeFamilyPlan(alone.world, {
        personId: alone.player,
        kind: "birth",
      }),
    ).toThrow();
  });

  it("raising it tells them and settles nothing", () => {
    expect(fixture, "the seed gives the player a housemate").toBeTruthy();
    const { player, partner, world } = fixture!;
    expect(familyPlanAvailability(world, player).available).toBe(true);
    const raised = proposeFamilyPlan(world, {
      personId: player,
      kind: "birth",
    });
    expect(raised.currentMoment).toEqual(world.currentMoment);
    const plan = familyPlans(raised, player)[0]!;
    expect(plan.answer).toBe("waiting");
    expect(plan.childPersonId).toBeNull();
    expect(
      raised.history.knowledge.some(
        (entry) => entry.personId === partner && entry.eventId === plan.eventId,
      ),
    ).toBe(true);
    // Asking twice while it is open is refused, in plain words.
    expect(familyPlanAvailability(raised, player).reason).toMatch(
      /have not answered yet/,
    );
    assertWorldIntegrity(raised);
  });

  it("they answer for themselves, and a yes lands on its own day", () => {
    const { player, partner, world } = fixture!;
    let current = proposeFamilyPlan(world, {
      personId: player,
      kind: "birth",
    });
    for (let day = 0; day < 4; day += 1) {
      current = passOrdinaryDays(current, 1);
    }
    const answered = current.history.events.filter(
      (event) => event.type === FAMILY_INTENTION_ANSWERED_EVENT,
    );
    expect(answered).toHaveLength(1);
    const plan = familyPlans(current, player)[0]!;
    expect(["agreed", "not-now"]).toContain(plan.answer);
    // The player is told either way.
    expect(
      current.history.knowledge.some(
        (entry) =>
          entry.personId === player && entry.eventId === answered[0]!.id,
      ),
    ).toBe(true);
    if (plan.answer === "not-now") {
      expect(plan.resolvesOn).toBeNull();
      expect(childrenOf(current, player)).toEqual([]);
      return;
    }
    expect(plan.resolvesOn).toBeTruthy();
    expect(plan.resolvesOn! > current.currentDate).toBe(true);
    // Nothing exists until that day.
    expect(childrenOf(current, player)).toEqual([]);
    let later = current;
    while (later.currentDate < plan.resolvesOn!) {
      later = passOrdinaryDays(later, 30);
    }
    const arrived = familyPlans(later, player)[0]!;
    expect(arrived.childPersonId).toBeTruthy();
    const child = arrived.childPersonId!;
    expect(childrenOf(later, player)).toContain(child);
    expect(childrenOf(later, partner)).toContain(child);
    // A real person with their own record, born on the day it happened.
    expect(later.people[child]!.birthDate).toBe(
      later.history.events.find(
        (event) =>
          event.type === "life.family-member-added" &&
          event.tags.includes(`family-plan:${plan.eventId}`),
      )!.occurredAt,
    );
    assertWorldIntegrity(later);
    // And it happens once, however long the world runs on.
    const onwards = passOrdinaryDays(later, 30);
    expect(childrenOf(onwards, player)).toEqual(childrenOf(later, player));
    expect(serializeWorld(onwards).length).toBeGreaterThan(0);
  });
});
