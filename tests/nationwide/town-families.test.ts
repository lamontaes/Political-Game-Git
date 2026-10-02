import { beforeAll, describe, expect, it } from "vitest";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";

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
import { SeededRng, pickDistinct } from "../../src/simulation/rng";
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
  SAME_GENDER_SHARE_PPM,
  TOWN_FAMILIES_VERSION,
  TOWN_FAMILY_EVENTS,
  describeTownFamilies,
  isTownBirth,
  reviewTownFamilies,
  sameGenderSeekers,
} from "../../src/simulation/living-world/town-families";
import { SAME_SEX_COUPLE_SHARE } from "../../src/simulation/living-world/town-residents";
import { largestRemainderAllocation } from "../../src/simulation/largest-remainder";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { firstLocality } from "../fixtures/state-executive-entry";
import {
  createPartnership,
  recordHouseholdMembershipState,
  startHouseholdMembership,
} from "../../src/simulation/life";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import { resolveDueThrough } from "../fixtures/due-item-clock";
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
    let personId: ReturnType<typeof buildFixture>["personId"];
    let town: ReturnType<typeof buildFixture>["town"];
    let snapshots: ReturnType<typeof buildFixture>["snapshots"];
    let world: ReturnType<typeof buildFixture>["world"];
    let expectedBirths: ReturnType<typeof buildFixture>["expectedBirths"];
    function buildFixture() {
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
            currentMoment: simulationMomentOnLocalDate(
              world.currentMoment,
              date,
            ),
          };
          expectedBirths += expectedQuarterBirths(world, town, personId);
          world = reviewTownFamilies(world, town, personId, `test-${round}`);
          snapshots.push(world);
        }
      });
      return { personId, town, snapshots, world, expectedBirths };
    }
    beforeAll(() => {
      ({ personId, town, snapshots, world, expectedBirths } = buildFixture());
    }, 300_000);

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
 * Resolve the real dated queue, including each family-plan answer and birth.
 * Keep its canonical terminal states so this fixture is a valid saved world.
 */
function runPlanItemsThrough(world: World, through: string): World {
  return resolveDueThrough(world, through);
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

/**
 * Seats two unpartnered adults in town as a newly married couple in her
 * home, through the life writers play uses: he leaves his household for
 * hers, and the marriage is recorded on the day.
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
    startedAt: next.currentDate,
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

const PLAN_SEEDS = process.env.A136_SEED
  ? [process.env.A136_SEED]
  : ["a136-family-plan", "check-two", "check-five"];

describe.each(PLAN_SEEDS)(
  "a child is born only from a couple's recorded family plan (seed %s)",
  { timeout: 60_000 },
  (seed) => {
    // One of the 56 (each state's, D.C.'s and each territory's largest
    // place) drawn by the seed; the place and seed are named on failure.
    const places = onePlaceEach();
    const placeKey = new SeededRng(`a136:${seed}`).pick(places);
    const label = `place ${placeKey}, seed ${seed}`;
    let town: ReturnType<typeof buildFixture>["town"];
    let start: ReturnType<typeof buildFixture>["start"];
    let couples: ReturnType<typeof buildFixture>["couples"];
    let before: ReturnType<typeof buildFixture>["before"];
    let opening: ReturnType<typeof buildFixture>["opening"];
    let seated: [EntityId, EntityId] | null;
    let planEventId: ReturnType<typeof buildFixture>["planEventId"];
    let raisedOn: ReturnType<typeof buildFixture>["raisedOn"];
    let resolvesOn: ReturnType<typeof buildFixture>["resolvesOn"];
    let childrenBeforeTheDay: ReturnType<
      typeof buildFixture
    >["childrenBeforeTheDay"];
    let world: ReturnType<typeof buildFixture>["world"];
    function buildFixture() {
      const opened = openAt(placeKey, seed);
      const { personId, town } = opened;
      const start = opened.world.currentDate;
      const firstReview = addDays(start, 91);
      const couples = townCouples(opened.world, town, personId);
      const before = (couple: [EntityId, EntityId]) =>
        childrenTogether(opened.world, couple[0], couple[1]).length;

      // The opening quarter: the town's own couples, as the world opened.
      const opening = { raised: 0, agreed: 0, births: 0, expected: 0 };
      withWorldIntegrityDeferred(() => {
        let w = onDate(
          runPlanItemsThrough(opened.world, firstReview),
          firstReview,
        );
        opening.expected = expectedQuarterBirths(w, town, personId);
        w = reviewTownFamilies(w, town, personId, "opening-review");
        const raised = w.history.events.filter(
          (event) =>
            event.type === "life.family-intended" &&
            event.occurredAt === firstReview,
        );
        opening.raised = raised.length;
        w = runPlanItemsThrough(w, addDays(firstReview, 300));
        opening.agreed = w.history.events.filter(
          (event) =>
            event.type === "life.family-intent-answered" &&
            event.tags.includes("family-plan.agreed") &&
            raised.some((plan) =>
              event.tags.includes(`family-plan:${plan.id}`),
            ),
        ).length;
        opening.births = describeTownFamilies(w, town).births;
      });

      // The proof: a couple seated with the life writers on the opening day
      // weighs it on each quarterly review until their own circumstances turn
      // them toward it; the partner answers; the child comes on the plan's day.
      let seated: [EntityId, EntityId] | null = null;
      let planEventId: EntityId | null = null;
      let raisedOn: string | null = null;
      let resolvesOn: string | null = null;
      let childrenBeforeTheDay = -1;
      let world = opened.world;
      withWorldIntegrityDeferred(() => {
        const women = single(opened.world, town, personId, "female", 26, 32);
        const men = single(opened.world, town, personId, "male", 27, 36);
        const pairs: [EntityId, EntityId][] = [];
        for (const woman of women)
          for (const man of men)
            if (
              !opened.world.history.kinshipRelationships.some(
                (row) =>
                  row.personIds.includes(woman) && row.personIds.includes(man),
              )
            )
              pairs.push([woman, man]);
        for (const [woman, man] of pairs.slice(0, 6)) {
          let trial = seatCouple(opened.world, woman, man);
          let plan = null;
          for (let round = 1; round <= 8 && !plan; round += 1) {
            const date = addDays(start, 91 * round);
            trial = runPlanItemsThrough(trial, date);
            trial = onDate(trial, date);
            trial = reviewTownFamilies(trial, town, personId, `seat-${round}`);
            plan =
              familyPlans(trial, woman).find((row) =>
                row.personIds.includes(man),
              ) ?? null;
          }
          if (!plan) continue;
          const raised = trial.history.events.find(
            (event) => event.id === plan.eventId,
          )!.occurredAt;
          trial = runPlanItemsThrough(trial, addDays(raised, 2));
          const settled = familyPlans(trial, woman).find(
            (row) => row.eventId === plan.eventId,
          )!;
          if (settled.answer !== "agreed" || !settled.resolvesOn) continue;
          seated = [woman, man];
          planEventId = plan.eventId;
          raisedOn = raised;
          resolvesOn = settled.resolvesOn;
          world = trial;
          break;
        }
        if (!seated || !resolvesOn) return;
        world = runPlanItemsThrough(
          world,
          addDays(resolvesOn as World["currentDate"], -1),
        );
        childrenBeforeTheDay = childrenTogether(world, ...seated).length;
        world = runPlanItemsThrough(world, resolvesOn);
      });
      return {
        personId,
        town,
        start,
        couples,
        before,
        opening,
        seated,
        planEventId,
        raisedOn,
        resolvesOn,
        childrenBeforeTheDay,
        world,
      };
    }
    beforeAll(() => {
      ({
        town,
        start,
        couples,
        before,
        opening,
        seated,
        planEventId,
        raisedOn,
        resolvesOn,
        childrenBeforeTheDay,
        world,
      } = buildFixture());
    }, 60_000);

    it("the opening quarter's plans that agree check against the real birth rates", () => {
      console.log(
        `A136 opening quarter: ${label}; ${couples.length} couples could plan; ` +
          `${opening.raised} raised, ${opening.agreed} agreed, ` +
          `${opening.births} births against ${opening.expected.toFixed(1)} ` +
          `a quarter at the real rates`,
      );
      expect(places, label).toHaveLength(56);
      // Small towns: a quarter's real-rate births is about one, so the check
      // allows what a quarter can hold, never a boom of every ready couple.
      expect(opening.births, label).toBeLessThanOrEqual(
        Math.ceil(3 * opening.expected),
      );
      expect(opening.births, label).toBe(opening.agreed);
    });

    it("a seated couple weighs it on the town's reviews, raises it, and the partner agrees", () => {
      console.log(
        `A136 plan proof: ${label}; seated ${seated?.join(" + ") ?? "none"}, ` +
          `raised ${raisedOn}, born ${resolvesOn}`,
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

    it("the recorded child and plan survive Continue and replaying their resolution adds no child", () => {
      expect(seated, label).not.toBeNull();
      expect(planEventId, label).not.toBeNull();
      const [a, b] = seated!;
      const saved = serializeWorld(world);
      const continued = deserializeWorld(saved);
      const plan = familyPlans(continued, a).find(
        (row) => row.eventId === planEventId,
      )!;
      expect(plan.answer, label).toBe("agreed");
      expect(plan.resolvesOn, label).toBe(resolvesOn);
      expect(childrenTogether(continued, a, b), label).toHaveLength(1);
      expect(plan.childPersonId, label).toBe(
        childrenTogether(continued, a, b)[0],
      );
      const resolution = continued.history.futureDueItems.find(
        (item) =>
          item.transitionKey === FAMILY_RESOLUTION_TRANSITION_KEY &&
          item.stableKey === `family-plan:${planEventId}:resolution`,
      );
      expect(resolution, label).toBeDefined();
      const replayed = familyPlanTransitionHandler(continued, resolution!);
      expect(replayed.reasonKey, label).toBe(
        "people:family-plan-already-resolved",
      );
      expect(replayed.world, label).toBe(continued);
      expect(serializeWorld(replayed.world), label).toBe(saved);
      expect(serializeWorld(world), label).toBe(saved);
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

const SEEKER_SEED = "a136-same-gender-share";
const [seekerState] = pickDistinct(
  new SeededRng(SEEKER_SEED),
  lifePlaceStateIdentities(),
  1,
);
const SEEKER_USPS = seekerState!.jurisdictionKey.slice(3);

describe(`A136: the same-gender share is allocated, not drawn (US-${SEEKER_USPS}, seed ${SEEKER_SEED})`, () => {
  let world: ReturnType<typeof buildFixture>["world"];
  let town: ReturnType<typeof buildFixture>["town"];
  let personId: ReturnType<typeof buildFixture>["personId"];
  let residents: ReturnType<typeof buildFixture>["residents"];
  function buildFixture() {
    const opened = openAt(firstLocality(SEEKER_USPS).key, SEEKER_SEED);
    const { world, town, personId } = opened;
    const residents = world.personOrder
      .map((id) => world.people[id]!)
      .filter((person) => person.homeJurisdictionId === town);
    return { world, town, personId, residents };
  }
  beforeAll(() => {
    ({ world, town, personId, residents } = buildFixture());
  }, 60_000);

  it("each gender's count is the share's largest-remainder whole number, the same every time", () => {
    expect(lifePlaceStateIdentities()).toHaveLength(56);
    expect(SAME_GENDER_SHARE_PPM).toBe(Math.round(SAME_SEX_COUPLE_SHARE * 1e6));
    const seekers = sameGenderSeekers(world, residents);
    console.log(
      `US-${SEEKER_USPS}, seed ${SEEKER_SEED}: ${seekers.size} of ${residents.length} residents look for a partner of their own gender`,
    );
    for (const gender of ["female", "male"] as const) {
      const group = residents.filter(
        (person) => person.identity?.gender === gender,
      );
      expect(group.length, gender).toBeGreaterThan(0);
      const [owed] = largestRemainderAllocation(
        [SAME_GENDER_SHARE_PPM, 1_000_000 - SAME_GENDER_SHARE_PPM],
        group.length,
      );
      expect(
        group.filter((person) => seekers.has(person.id)).length,
        gender,
      ).toBe(owed);
    }
    // No draw: the same people, in any order, give the same answer.
    expect(
      [...sameGenderSeekers(world, [...residents].reverse())].sort(),
    ).toEqual([...seekers].sort());
  });

  it("a resident leaving changes nobody but that resident and at most one at the edge", () => {
    const seekers = sameGenderSeekers(world, residents);
    for (const leaving of residents) {
      const after = sameGenderSeekers(
        world,
        residents.filter((person) => person.id !== leaving.id),
      );
      const changed = residents.filter(
        (person) =>
          person.id !== leaving.id &&
          seekers.has(person.id) !== after.has(person.id),
      );
      expect(changed.length, leaving.id).toBeLessThanOrEqual(1);
    }
  });

  it("a quarter's new couples follow who each partner looks for", () => {
    const date = addDays(world.currentDate, 91);
    let next: World = world;
    withWorldIntegrityDeferred(() => {
      next = reviewTownFamilies(
        {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        },
        town,
        personId,
        "a136-seekers",
      );
    });
    const people = next.personOrder
      .map((id) => next.people[id]!)
      .filter((person) => person.homeJurisdictionId === town);
    const seekers = sameGenderSeekers(next, people);
    const dating = familyEvents(next, town).filter(
      (event) => event.type === TOWN_FAMILY_EVENTS.startedDating,
    );
    expect(dating.length).toBeGreaterThan(0);
    for (const event of dating) {
      const [a, b] = event.involvedEntityIds.map((id) => next.people[id]!);
      const genders = [a!.identity?.gender, b!.identity?.gender];
      if (!genders.every((g) => g === "female" || g === "male")) continue;
      const same = genders[0] === genders[1];
      expect(seekers.has(a!.id), event.summary).toBe(same);
      expect(seekers.has(b!.id), event.summary).toBe(same);
    }
  });
});
