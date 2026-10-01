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
  childrenOf,
  parentsOf,
} from "../../src/simulation/people-family";
import {
  FAMILY_RESOLUTION_TRANSITION_KEY,
  childrenTogether,
  familyPlanTransitionHandler,
  familyPlans,
} from "../../src/simulation/people-family-plan";
import {
  TOWN_FAMILIES_VERSION,
  TOWN_FAMILY_EVENTS,
  describeTownFamilies,
  isTownBirth,
  reviewTownFamilies,
} from "../../src/simulation/living-world/town-families";
import {
  createPartnership,
  recordHouseholdMembershipState,
  startHouseholdMembership,
} from "../../src/simulation/life";
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
    let expectedBirths = 0;
    withWorldIntegrityDeferred(() => {
      for (let round = 0; round < QUARTERS; round += 1) {
        const date = addDays(world.currentDate, 91);
        // The family plans' own days in the quarter: answers, then births.
        world = runPlanItemsThrough(world, date);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        expectedBirths += expectedQuarterBirths(world, town, personId);
        world = reviewTownFamilies(world, town, personId, `test-${round}`);
        snapshots.push(world);
      }
    });

    it("couples date, move in, marry and part, and children are born from their plans", () => {
      const counts = describeTownFamilies(world, town);
      expect(counts[TOWN_FAMILY_EVENTS.startedDating] ?? 0).toBeGreaterThan(0);
      expect(counts[TOWN_FAMILY_EVENTS.movedIn] ?? 0).toBeGreaterThan(0);
      expect(counts[TOWN_FAMILY_EVENTS.married] ?? 0).toBeGreaterThan(0);
      expect(
        (counts[TOWN_FAMILY_EVENTS.brokeUp] ?? 0) +
          (counts[TOWN_FAMILY_EVENTS.divorced] ?? 0),
      ).toBeGreaterThan(0);
      // A child comes only from a couple's recorded family plan, on the
      // plan's own day.
      const births = world.history.events.filter(
        (event) => event.type === "life.family-member-added",
      );
      expect(births.length).toBeGreaterThan(0);
      expect(counts.births).toBe(births.length);
      for (const birth of births)
        expect(birth.tags.some((tag) => tag.startsWith("family-plan:"))).toBe(
          true,
        );
    });

    it("five years of births check against the real birth rates", () => {
      // The rates never decide a couple; they check the town's total.
      const births = describeTownFamilies(world, town).births;
      const answers = world.history.events.filter(
        (event) => event.type === "life.family-intent-answered",
      );
      console.log(
        `A136 Lexington (place ${LEXINGTON}, seed families-lexington): ` +
          `${births} births in five years against ` +
          `${expectedBirths.toFixed(1)} at the real rates; plans raised ` +
          `${world.history.events.filter((event) => event.type === "life.family-intended").length}, ` +
          `agreed ${answers.filter((event) => event.tags.includes("family-plan.agreed")).length}, ` +
          `not now ${answers.filter((event) => !event.tags.includes("family-plan.agreed")).length}`,
      );
      expect(births).toBeGreaterThan(expectedBirths / 3);
      expect(births).toBeLessThan(expectedBirths * 3);
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

/**
 * Family-plan due items already run, by item. The clock runs each item once;
 * the handler tells an answer from a birth by what is already recorded, so a
 * second run of an answer's item would be a birth.
 */
const ranPlanItems = new Set<EntityId>();

/** The family plan's own due item for `date`, run the way the clock runs it. */
function runPlanDay(world: World, planEventId: EntityId): World {
  const item = world.history.futureDueItems.find(
    (entry) =>
      entry.transitionKey === FAMILY_RESOLUTION_TRANSITION_KEY &&
      entry.dueAt === world.currentDate &&
      entry.entityIds.includes(planEventId) &&
      !ranPlanItems.has(entry.id),
  );
  if (!item) return world;
  ranPlanItems.add(item.id);
  return familyPlanTransitionHandler(world, item).world;
}

/**
 * Every family-plan day up to `through`, in date order, run the way the
 * clock runs it: an answer two days after a plan is raised, a birth on the
 * plan's date.
 */
function runPlanItemsThrough(world: World, through: string): World {
  let next = world;
  for (;;) {
    const item = next.history.futureDueItems
      .filter(
        (entry) =>
          entry.transitionKey === FAMILY_RESOLUTION_TRANSITION_KEY &&
          !ranPlanItems.has(entry.id) &&
          entry.dueAt >= world.currentDate &&
          entry.dueAt <= through,
      )
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    if (!item) return next;
    ranPlanItems.add(item.id);
    next = onDate(next, item.dueAt);
    next = familyPlanTransitionHandler(next, item).world;
  }
}

/** Births per 1,000 women a year at `age`, from the birth table. */
function realRate(age: number): number {
  let rate = 0;
  for (const [from, value] of BIRTH_RATES_BY_MOTHER_AGE)
    if (age >= from) rate = value;
  return rate;
}

/** A quarter's births in town at the real rates by mother's age. */
function expectedQuarterBirths(
  world: World,
  town: EntityId,
  player: EntityId,
): number {
  let expected = 0;
  for (const id of world.personOrder) {
    const person = world.people[id]!;
    if (person.homeJurisdictionId !== town || id === player) continue;
    if (person.identity?.gender !== "female") continue;
    if (world.history.personDeaths.some((row) => row.personId === id)) continue;
    expected += realRate(ageOnDate(person.birthDate, world.currentDate)) / 4000;
  }
  return expected;
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

/**
 * Seats two unpartnered adults in town as a married couple of three years in
 * her home, through the life writers play uses: he leaves his household for
 * hers, and the marriage is recorded from three years back.
 */
function seatCouple(world: World, woman: EntityId, man: EntityId): World {
  const provenance = {
    kind: "authored" as const,
    note: "A136 fixture: a couple seated for the family-plan proof.",
  };
  const home = householdMembershipsAt(world, woman).find(
    (entry) => entry.state.residenceRole === "primary",
  )!.household.id;
  let next = world;
  const his = householdMembershipsAt(next, man).find(
    (entry) => entry.state.residenceRole === "primary",
  );
  if (his)
    next = recordHouseholdMembershipState(next, {
      stableKey: `a136-seat:${man}:left`,
      membershipId: his.membership.id,
      effectiveAt: next.currentDate,
      status: "ended",
      residenceRole: his.state.residenceRole,
      kind: his.state.kind,
      provenance,
      supersedesStateId: his.state.id,
    });
  next = startHouseholdMembership(next, {
    stableKey: `a136-seat:${man}:joined`,
    personId: man,
    householdId: home,
    startedAt: next.currentDate,
    residenceRole: "primary",
    kind: "resident:partner",
    provenance,
  });
  return createPartnership(next, {
    stableKey: `a136-seat:${woman}:${man}:married`,
    personIds: [woman, man].sort() as [EntityId, EntityId],
    startedAt: addDays(next.currentDate, -3 * 365),
    kind: "legal:marriage",
    provenance,
  });
}

/** Unpartnered adults in town of `gender` within the ages, and childless. */
function single(
  world: World,
  town: EntityId,
  player: EntityId,
  gender: string,
  from: number,
  to: number,
): EntityId[] {
  return world.personOrder.filter((id) => {
    const person = world.people[id]!;
    if (id === player || person.homeJurisdictionId !== town) return false;
    if (person.identity?.gender !== gender) return false;
    const age = ageOnDate(person.birthDate, world.currentDate);
    return (
      age >= from &&
      age <= to &&
      activePartnershipsAt(world, id).length === 0 &&
      childrenOf(world, id).length === 0 &&
      householdMembershipsAt(world, id).some(
        (entry) => entry.state.residenceRole === "primary",
      )
    );
  });
}

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
    const start = opened.world.currentDate;
    const reviewOn = addDays(start, 91);
    let couples: [EntityId, EntityId][] = [];
    let seated: [EntityId, EntityId] | null = null;
    let tried = 0;
    let planEventId: EntityId | null = null;
    let resolvesOn: string | null = null;
    let childrenBeforeTheDay = -1;
    let raisedInTown = 0;
    let expectedInQuarter = 0;
    let world = opened.world;
    withWorldIntegrityDeferred(() => {
      couples = townCouples(opened.world, town, personId);
      const women = single(opened.world, town, personId, "female", 26, 32);
      const men = single(opened.world, town, personId, "male", 27, 36);
      // Seat a couple, let the town's quarterly review weigh it, and let the
      // partner answer two days later from their own temperament. A couple
      // whose own circumstances or answer say not now is a real outcome; the
      // next pair is seated instead, from the same opening world.
      for (const woman of women) {
        for (const man of men) {
          if (seated || tried >= 12) break;
          if (
            opened.world.history.kinshipRelationships.some(
              (row) =>
                row.personIds.includes(woman) && row.personIds.includes(man),
            )
          )
            continue;
          tried += 1;
          let trial = seatCouple(opened.world, woman, man);
          trial = onDate(trial, reviewOn);
          trial = reviewTownFamilies(trial, town, personId, "plan-review");
          const plan = familyPlans(trial, woman).find((row) =>
            row.personIds.includes(man),
          );
          if (!plan) continue;
          trial = onDate(trial, addDays(reviewOn, 2));
          trial = runPlanDay(trial, plan.eventId);
          const settled = familyPlans(trial, woman).find(
            (row) => row.eventId === plan.eventId,
          )!;
          if (settled.answer !== "agreed" || !settled.resolvesOn) continue;
          seated = [woman, man];
          planEventId = plan.eventId;
          resolvesOn = settled.resolvesOn;
          world = trial;
        }
      }
      if (!seated || !planEventId || !resolvesOn) return;
      expectedInQuarter = expectedQuarterBirths(
        onDate(opened.world, reviewOn),
        town,
        personId,
      );
      raisedInTown = world.history.events.filter(
        (event) =>
          event.type === "life.family-intended" &&
          event.occurredAt === reviewOn,
      ).length;
      // Every other plan the review raised runs too, on its own days; then
      // the seated couple's own day.
      world = runPlanItemsThrough(
        world,
        addDays(resolvesOn as World["currentDate"], -1),
      );
      childrenBeforeTheDay = childrenTogether(world, ...seated).length;
      world = runPlanItemsThrough(world, resolvesOn);
    });
    const before = (couple: [EntityId, EntityId]) =>
      childrenTogether(opened.world, couple[0], couple[1]).length;

    it("a seated couple weighs it on the town's review, raises it, and the partner agrees", () => {
      expect(places, label).toHaveLength(56);
      console.log(
        `A136 plan births: ${label}; seated ${seated?.join(" + ") ?? "none"} ` +
          `after ${tried} tries; ${couples.length} town couples could plan; ` +
          `the review raised ${raisedInTown} plans; ` +
          `${describeTownFamilies(world, town).births} births by ${resolvesOn} ` +
          `against ${expectedInQuarter.toFixed(1)} a quarter at the real rates`,
      );
      expect(seated, label).not.toBeNull();
    });

    it("the couple with a plan has their child on the plan's date, not before", () => {
      const [a, b] = seated!;
      expect(childrenBeforeTheDay, label).toBe(0);
      const children = childrenTogether(world, a, b);
      expect(children, label).toHaveLength(1);
      const child = world.people[children[0]!]!;
      expect(child.birthDate, label).toBe(resolvesOn);
      expect(
        familyPlans(world, a).find((row) => row.eventId === planEventId)!
          .childPersonId,
        label,
      ).toBe(child.id);
      expect(parentsOf(world, child.id).sort(), label).toEqual([a, b].sort());
    });

    it("a couple without a plan never has a child", () => {
      const planned = new Set(
        world.history.events
          .filter((event) => event.type === "life.family-intended")
          .flatMap((event) => event.involvedEntityIds),
      );
      const unplanned = couples.filter(
        (couple) => !couple.some((id) => planned.has(id)),
      );
      expect(unplanned.length, label).toBeGreaterThan(0);
      for (const couple of unplanned)
        expect(childrenTogether(world, ...couple).length, label).toBe(
          before(couple),
        );
      const births = world.history.events.filter(
        (event) =>
          event.type === "life.family-member-added" && event.occurredAt > start,
      );
      expect(births.length, label).toBeGreaterThan(0);
      for (const birth of births) {
        expect(
          birth.tags.some((tag) => tag.startsWith("family-plan:")),
          label,
        ).toBe(true);
        expect(isTownBirth(birth, town), label).toBe(true);
      }
    });
  },
);
