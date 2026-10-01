import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  activePartnershipsAt,
  householdMembershipsAt,
} from "../../src/simulation/life-queries";
import {
  BIRTH_RATES_BY_MOTHER_AGE,
  YOUNGEST_AGE_AT_BIRTH,
} from "../../src/simulation/birth-rates";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { SeededRng } from "../../src/simulation/rng";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import {
  MINIMUM_PARENT_AGE_AT_BIRTH,
  parentsOf,
} from "../../src/simulation/people-family";
import {
  FAMILY_RESOLUTION_TRANSITION_KEY,
  childrenTogether,
  familyPlanTransitionHandler,
  familyPlans,
  proposeFamilyPlan,
} from "../../src/simulation/people-family-plan";
import {
  TOWN_FAMILIES_VERSION,
  TOWN_FAMILY_EVENTS,
  describeTownFamilies,
  isTownBirth,
  reviewTownFamilies,
} from "../../src/simulation/living-world/town-families";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation";

const LEXINGTON = "2146027";
const QUARTERS = 20;

function openAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const personId = game.playerPersonId;
  return { world, personId, town: world.people[personId]!.homeJurisdictionId };
}

function familyEvents(world: World, town: EntityId) {
  return world.history.events.filter((event) =>
    event.stableKey.startsWith(`${TOWN_FAMILIES_VERSION}:${town}:`),
  );
}

describe(
  "the town's families change over five years",
  { timeout: 300_000 },
  () => {
    const opened = openAt(LEXINGTON, "families-lexington");
    const { personId, town } = opened;
    const snapshots: World[] = [];
    let world = opened.world;
    // Only the calendar moves, and only the review writes. The whole-world
    // check is deferred because the world's other due items are not run here;
    // the watched-world report runs this review on the real clock.
    withWorldIntegrityDeferred(() => {
      for (let round = 0; round < QUARTERS; round += 1) {
        const date = addDays(world.currentDate, 91);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        world = reviewTownFamilies(world, town, personId, `test-${round}`);
        snapshots.push(world);
      }
    });

    it("couples date, move in, marry and part, and no review makes a child", () => {
      const counts = describeTownFamilies(world, town);
      expect(counts[TOWN_FAMILY_EVENTS.startedDating] ?? 0).toBeGreaterThan(0);
      expect(counts[TOWN_FAMILY_EVENTS.movedIn] ?? 0).toBeGreaterThan(0);
      expect(counts[TOWN_FAMILY_EVENTS.married] ?? 0).toBeGreaterThan(0);
      expect(
        (counts[TOWN_FAMILY_EVENTS.brokeUp] ?? 0) +
          (counts[TOWN_FAMILY_EVENTS.divorced] ?? 0),
      ).toBeGreaterThan(0);
      // A child comes only from a couple's recorded family plan; nobody here
      // raised one, so five years of reviews record no birth at all.
      expect(counts.births).toBe(0);
      expect(
        world.history.events.filter(
          (event) => event.type === "life.family-member-added",
        ),
      ).toEqual([]);
    });

    it("every change is dated on its review, and nobody has two partners", () => {
      for (const snapshot of snapshots) {
        for (const event of familyEvents(snapshot, town))
          if (event.stableKey.includes(`:test-${snapshots.indexOf(snapshot)}:`))
            expect(event.occurredAt).toBe(snapshot.currentDate);
      }
      for (const id of world.personOrder) {
        if (world.history.personDeaths.some((row) => row.personId === id))
          continue;
        expect(activePartnershipsAt(world, id).length, id).toBeLessThanOrEqual(
          1,
        );
      }
    });

    it("nobody dates a relative", () => {
      for (const partnership of world.history.partnerships) {
        if (!partnership.stableKey.startsWith(TOWN_FAMILIES_VERSION)) continue;
        const [a, b] = partnership.personIds;
        expect(
          world.history.kinshipRelationships.some(
            (row) => row.personIds.includes(a) && row.personIds.includes(b),
          ),
        ).toBe(false);
      }
    });

    it("leaves the player's own life to the player", () => {
      for (const partnership of world.history.partnerships)
        if (partnership.stableKey.startsWith(TOWN_FAMILIES_VERSION))
          expect(partnership.personIds).not.toContain(personId);
      for (const birth of familyEvents(world, town))
        expect(birth.involvedEntityIds).not.toContain(personId);
    });

    it("a partner who leaves a shared home gets a home of their own in town", () => {
      const partings = familyEvents(world, town).filter(
        (event) => event.type === TOWN_FAMILY_EVENTS.divorced,
      );
      for (const parting of partings) {
        const [a, b] = parting.involvedEntityIds as [EntityId, EntityId];
        const home = (id: EntityId) =>
          householdMembershipsAt(world, id)[0]?.household.id;
        if (
          world.history.personDeaths.some((row) =>
            [a, b].includes(row.personId),
          )
        )
          continue;
        if (world.people[a]!.homeJurisdictionId !== town) continue;
        if (world.people[b]!.homeJurisdictionId !== town) continue;
        expect(home(a)).not.toBe(home(b));
      }
    });

    it("after a break-up the children's parent keeps the home, else whoever lived there first, else the elder", () => {
      let checked = 0;
      for (const [round, after] of snapshots.entries()) {
        if (round === 0) continue;
        const before = snapshots[round - 1]!;
        for (const parting of familyEvents(after, town).filter(
          (event) =>
            event.stableKey.includes(`:test-${round}:`) &&
            (event.type === TOWN_FAMILY_EVENTS.divorced ||
              event.type === TOWN_FAMILY_EVENTS.brokeUp),
        )) {
          const [a, b] = parting.involvedEntityIds as [EntityId, EntityId];
          const homeOf = (w: World, id: EntityId) =>
            householdMembershipsAt(w, id).find(
              (entry) => entry.state.residenceRole === "primary",
            );
          const shared = homeOf(before, a);
          if (
            !shared ||
            shared.household.id !== homeOf(before, b)?.household.id
          )
            continue;
          const kids = (id: EntityId) =>
            before.personOrder.filter(
              (child) =>
                parentsOf(before, child).includes(id) &&
                ageOnDate(before.people[child]!.birthDate, before.currentDate) <
                  18 &&
                homeOf(before, child)?.household.id === shared.household.id,
            ).length;
          const since = (id: EntityId) =>
            homeOf(before, id)!.membership.startedAt;
          // Then, with the same date, the older of the two.
          const born = (id: EntityId) => before.people[id]!.birthDate;
          const expectedStaying =
            kids(a) !== kids(b)
              ? kids(a) > kids(b)
                ? a
                : b
              : since(a) !== since(b)
                ? since(a) < since(b)
                  ? a
                  : b
                : born(a) <= born(b)
                  ? a
                  : b;
          expect(homeOf(after, expectedStaying)?.household.id).toBe(
            shared.household.id,
          );
          checked += 1;
        }
      }
      expect(checked).toBeGreaterThan(0);
    });

    it("runs a round once", () => {
      expect(
        reviewTownFamilies(world, town, personId, `test-${QUARTERS - 1}`),
      ).toBe(world);
    });
  },
);

describe("the youngest parent is one rule, read from the birth table", () => {
  it("the family writer's youngest parent is the table's first age", () => {
    const first = BIRTH_RATES_BY_MOTHER_AGE.find(([, rate]) => rate > 0)![0];
    expect(MINIMUM_PARENT_AGE_AT_BIRTH).toBe(first);
    expect(YOUNGEST_AGE_AT_BIRTH).toBe(first);
  });
});

/** Move the calendar, and only the calendar, to `date`. */
function onDate(world: World, date: string): World {
  return {
    ...world,
    currentDate: date as World["currentDate"],
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      date as World["currentDate"],
    ),
  };
}

/** The family plan's own due item for `date`, run the way the clock runs it. */
function runPlanDay(world: World, planEventId: EntityId): World {
  const item = world.history.futureDueItems.find(
    (entry) =>
      entry.transitionKey === FAMILY_RESOLUTION_TRANSITION_KEY &&
      entry.dueAt === world.currentDate &&
      entry.entityIds.includes(planEventId),
  );
  if (!item) return world;
  return familyPlanTransitionHandler(world, item).world;
}

/**
 * Couples in town who could plan a child under the family-plan rule: a
 * current partnership, one shared home, both 18 to 45, and neither the
 * player.
 */
function townCouples(world: World, town: EntityId, player: EntityId) {
  const seen = new Set<string>();
  const couples: [EntityId, EntityId][] = [];
  for (const id of world.personOrder) {
    const person = world.people[id]!;
    if (id === player || person.homeJurisdictionId !== town) continue;
    for (const partnership of activePartnershipsAt(world, id)) {
      const [a, b] = partnership.personIds;
      if (a === player || b === player || seen.has(`${a}:${b}`)) continue;
      seen.add(`${a}:${b}`);
      const ages = [a, b].map((who) =>
        ageOnDate(world.people[who]!.birthDate, world.currentDate),
      );
      if (ages.some((age) => age < 18 || age > 45)) continue;
      const homes = (who: EntityId) =>
        householdMembershipsAt(world, who).map((row) => row.household.id);
      if (!homes(a).some((home) => homes(b).includes(home))) continue;
      couples.push([a, b]);
    }
  }
  return couples;
}

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function onePlaceEach(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

const PLAN_SEED = process.env.A136_SEED ?? "a136-family-plan";

describe(
  "a child is born only from a couple's recorded family plan",
  { timeout: 240_000 },
  () => {
    // One of the 56 (each state's, D.C.'s and each territory's largest
    // place) drawn by the seed; the place and seed are named on failure.
    const places = onePlaceEach();
    const placeKey = new SeededRng(`a136:${PLAN_SEED}`).pick(places);
    const label = `place ${placeKey}, seed ${PLAN_SEED}`;
    const opened = openAt(placeKey, PLAN_SEED);
    const { personId, town } = opened;
    let couples: [EntityId, EntityId][] = [];
    let planned: [EntityId, EntityId] | null = null;
    let unplanned: [EntityId, EntityId] | null = null;
    let planEventId: EntityId | null = null;
    let resolvesOn: string | null = null;
    const childrenBeforeTheDay: number[] = [];
    let world = opened.world;
    withWorldIntegrityDeferred(() => {
      // Five years of reviews first, so the town's own couples have met,
      // moved in and married the way they do in play.
      for (let round = 0; round < QUARTERS; round += 1) {
        world = onDate(world, addDays(world.currentDate, 91));
        world = reviewTownFamilies(world, town, personId, `before-${round}`);
      }
      couples = townCouples(world, town, personId);
      const start = world.currentDate;
      const answered = addDays(start, 2);
      // A couple raises it; the partner's own traits decide the answer. The
      // first couple whose partner agrees is the planned one, and a couple
      // nobody asked is the unplanned one.
      for (const couple of couples) {
        const raised = proposeFamilyPlan(world, {
          personId: couple[0],
          kind: "birth",
        });
        const plan = familyPlans(raised, couple[0]).at(-1)!;
        const after = runPlanDay(onDate(raised, answered), plan.eventId);
        const settled = familyPlans(after, couple[0]).at(-1)!;
        if (settled.answer !== "agreed") continue;
        planned = couple;
        planEventId = plan.eventId;
        resolvesOn = settled.resolvesOn;
        world = after;
        break;
      }
      unplanned =
        couples.find(
          (couple) =>
            couple !== planned &&
            !couple.some((id) => planned?.includes(id) ?? false),
        ) ?? null;
      if (!planned || !resolvesOn || !planEventId) return;
      // A year of quarterly reviews, with the plan's own day in between.
      const reviews = [1, 2, 3, 4].map((q) => addDays(start, 91 * q));
      const days: string[] = [...reviews, resolvesOn].sort();
      for (const date of days) {
        world = onDate(world, date);
        if (date === resolvesOn) {
          childrenBeforeTheDay.push(
            childrenTogether(world, planned[0], planned[1]).length,
          );
          world = runPlanDay(world, planEventId);
        }
        if ((reviews as string[]).includes(date))
          world = reviewTownFamilies(world, town, personId, `plan-${date}`);
      }
    });

    it("the drawn place has a couple who agreed and a couple who never planned", () => {
      expect(places, label).toHaveLength(56);
      console.log(
        `A136 plan births: ${label}; ${couples.length} couples could plan; ` +
          `agreed plan ${planEventId ?? "none"} due ${resolvesOn ?? "never"}; ` +
          `births ${describeTownFamilies(world, town).births}`,
      );
      expect(couples.length, label).toBeGreaterThanOrEqual(2);
      expect(planned, label).not.toBeNull();
      expect(unplanned, label).not.toBeNull();
    });

    it("the couple with a plan has their child on the plan's date, not before", () => {
      const [a, b] = planned!;
      expect(childrenBeforeTheDay, label).toEqual([0]);
      const children = childrenTogether(world, a, b);
      expect(children, label).toHaveLength(1);
      const child = world.people[children[0]!]!;
      expect(child.birthDate, label).toBe(resolvesOn);
      expect(familyPlans(world, a).at(-1)!.childPersonId, label).toBe(child.id);
      expect(parentsOf(world, child.id).sort(), label).toEqual([a, b].sort());
    });

    it("the couple without a plan never has a child", () => {
      const [a, b] = unplanned!;
      expect(childrenTogether(world, a, b), label).toEqual([]);
      const births = world.history.events.filter(
        (event) => event.type === "life.family-member-added",
      );
      // The only child born in six years is the planned one.
      expect(births, label).toHaveLength(1);
      expect(births[0]!.tags, label).toContain(`family-plan:${planEventId}`);
      expect(isTownBirth(births[0]!, town), label).toBe(true);
      expect(describeTownFamilies(world, town).births, label).toBe(1);
    });
  },
);
