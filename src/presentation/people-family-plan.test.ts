import { afterEach, describe, expect, it, vi } from "vitest";
import * as decisions from "../simulation/decisions";
import { deserializeWorld } from "../simulation/serialization";
import {
  resolveFutureDueItemsThrough,
  futureDueItemStateAt,
} from "../simulation/future-transitions";
import {
  addDays,
  advanceWorld,
  assertWorldIntegrity,
  createCampaignElectionTransitionRegistry,
  createPartnership,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { childrenOf } from "../simulation/people-family";
import {
  FAMILY_INTENTION_ANSWERED_EVENT,
  FAMILY_RESOLUTION_TRANSITION_KEY,
  familyPlanTransitionHandler,
  peopleFamilyHandlers,
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
    // The long wait is run through the clock itself rather than day by day:
    // the point is the dated resolution, not the months in between, and a
    // composed world charges for every simulated day.
    const handlers = createCampaignElectionTransitionRegistry();
    const later = advanceWorld(
      current,
      daysBetween(current.currentDate, plan.resolvesOn!),
      handlers,
    );
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
    const onwards = advanceWorld(later, 30, handlers);
    expect(childrenOf(onwards, player)).toEqual(childrenOf(later, player));
    expect(serializeWorld(onwards).length).toBeGreaterThan(0);
  });

  afterEach(() => vi.restoreAllMocks());

  function unansweredPlan() {
    expect(fixture).toBeTruthy();
    const { world, player } = fixture!;
    const raised = proposeFamilyPlan(world, {
      personId: player,
      kind: "birth",
    });
    const plan = familyPlans(raised, player)[0]!;
    const due = raised.history.futureDueItems.find(
      (item) =>
        item.transitionKey === FAMILY_RESOLUTION_TRANSITION_KEY &&
        item.entityIds.includes(plan.eventId),
    );
    expect(due).toBeDefined();
    return { raised, player, plan, due: due! };
  }

  function forceFamilyAnswer(key: "agree" | "not-now" | null) {
    const original = decisions.evaluateDecision;
    return vi
      .spyOn(decisions, "evaluateDecision")
      .mockImplementation(
        (
          world: Parameters<typeof original>[0],
          input: Parameters<typeof original>[1],
        ): ReturnType<typeof original> => {
          const actual = original(world, input);
          return input.decisionType === "people.family-plan"
            ? {
                ...actual,
                outcomeKind: key === null ? "undecided" : "selected",
                selectedOptionKey: key,
              }
            : actual;
        },
      );
  }

  it("leaves an undecided family answer unwritten through Continue and direct repeat", () => {
    const { raised, player, due } = unansweredPlan();
    const spy = forceFamilyAnswer(null);
    const result = familyPlanTransitionHandler(raised, due);
    expect(
      spy.mock.calls.some(
        ([, input]: Parameters<typeof decisions.evaluateDecision>) =>
          input.decisionType === "people.family-plan",
      ),
    ).toBe(true);
    expect(result.status).toBe("blocked");
    expect(result.reasonKey).toBe("people:family-plan-undecided");
    expect(result.outcomeEventId).toBeNull();
    expect(result.world).toBe(raised);
    expect(familyPlans(result.world, player)[0]!.answer).toBe("waiting");
    expect(result.world.history.events).toEqual(raised.history.events);
    expect(result.world.history.knowledge).toEqual(raised.history.knowledge);
    expect(result.world.history.futureDueItems).toEqual(
      raised.history.futureDueItems,
    );
    expect(childrenOf(result.world, player)).toEqual(
      childrenOf(raised, player),
    );
    const continued = deserializeWorld(serializeWorld(result.world));
    const repeated = familyPlanTransitionHandler(continued, due);
    expect(repeated.status).toBe("blocked");
    expect(repeated.world).toEqual(continued);
  });

  it("saves the existing answer due item as blocked without adding a retry or answer", () => {
    const { raised, player, due } = unansweredPlan();
    forceFamilyAnswer(null);
    const pending = resolveFutureDueItemsThrough(
      raised,
      due.dueAt,
      peopleFamilyHandlers(),
    );
    expect(
      futureDueItemStateAt(pending, due.id, {
        asOfDate: due.dueAt,
        historySequenceExclusive: pending.history.nextSequence,
      }),
    ).toMatchObject({
      status: "blocked",
      reasonKey: "people:family-plan-undecided",
      outcomeEventId: null,
    });
    expect(familyPlans(pending, player)[0]!.answer).toBe("waiting");
    expect(pending.history.events).toEqual(raised.history.events);
    expect(pending.history.knowledge).toEqual(raised.history.knowledge);
    expect(pending.history.futureDueItems).toEqual(
      raised.history.futureDueItems,
    );
    const continued = deserializeWorld(serializeWorld(pending));
    const repeated = resolveFutureDueItemsThrough(
      continued,
      due.dueAt,
      peopleFamilyHandlers(),
    );
    expect(repeated.history.futureDueItemStates).toEqual(
      pending.history.futureDueItemStates,
    );
    expect(repeated.history.events).toEqual(pending.history.events);
    expect(repeated.history.futureDueItems).toEqual(
      pending.history.futureDueItems,
    );
  });

  it.each(["agree", "not-now"] as const)(
    "preserves the selected %s answer and its actual existing writers",
    (key: "agree" | "not-now") => {
      const { raised, player, plan, due } = unansweredPlan();
      forceFamilyAnswer(key);
      const answered = resolveFutureDueItemsThrough(
        raised,
        due.dueAt,
        peopleFamilyHandlers(),
      );
      const records = answered.history.events.filter(
        (event) =>
          event.type === FAMILY_INTENTION_ANSWERED_EVENT &&
          event.tags.includes(`family-plan:${plan.eventId}`),
      );
      expect(records).toHaveLength(1);
      expect(familyPlans(answered, player)[0]!.answer).toBe(
        key === "agree" ? "agreed" : "not-now",
      );
      expect(
        answered.history.knowledge.some(
          (entry) =>
            entry.personId === player && entry.eventId === records[0]!.id,
        ),
      ).toBe(true);
      expect(childrenOf(answered, player)).toEqual(childrenOf(raised, player));
      const resolutions = answered.history.futureDueItems.filter(
        (item) => item.stableKey === `family-plan:${plan.eventId}:resolution`,
      );
      expect(resolutions).toHaveLength(key === "agree" ? 1 : 0);
      if (key === "agree")
        expect(resolutions[0]!.dueAt).toBe(addDays(due.dueAt, 273));
      const continued = deserializeWorld(serializeWorld(answered));
      const repeated = resolveFutureDueItemsThrough(
        continued,
        due.dueAt,
        peopleFamilyHandlers(),
      );
      expect(repeated.history.events).toEqual(answered.history.events);
      expect(repeated.history.futureDueItems).toEqual(
        answered.history.futureDueItems,
      );
    },
  );
});

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}
