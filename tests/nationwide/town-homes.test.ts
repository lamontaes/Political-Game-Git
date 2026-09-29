import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { homePlaceForPerson } from "../../src/presentation/place-backdrops";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../../src/simulation/life-queries";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import {
  moveTieReader,
  relocateHousehold,
} from "../../src/simulation/migration/relocate";
import { reviewTownFamilies } from "../../src/simulation/living-world/town-families";
import { reviewTownJobs } from "../../src/simulation/living-world/town-labor-market";
import { startTownJobPay } from "../../src/simulation/living-world/town-pay";
import {
  TOWN_HOMES_VERSION,
  TOWN_HOME_EVENTS,
  TOWN_HOME_KINDS,
  TOWN_HOME_REASONS,
  chooseTownHomeKind,
  homeForNewHousehold,
  describeTownHomes,
  reviewTownHomes,
  type TownHomeKind,
} from "../../src/simulation/living-world/town-homes";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
} from "../../src/simulation/resource-queries";
import { SeededRng } from "../../src/simulation/rng";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation";

const LEXINGTON = "2146027";
const BELZONI = "2805140";
const COLUMBUS = "3918000";
const KINDS = Object.keys(TOWN_HOME_KINDS) as TownHomeKind[];

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

function townOf(geoid: string): EntityId {
  return lifePlaceByKey(geoid)!.context.jurisdiction.id;
}

/** How often each kind is drawn for one household in a town. */
function kindShares(town: EntityId, members: readonly number[]) {
  const counts = new Map<TownHomeKind, number>();
  const household = {
    id: "household_test" as EntityId,
    stableKey: "test",
    members: members.map((age, n) => ({ id: `person_${n}` as EntityId, age })),
  };
  const draws = 4000;
  for (let n = 0; n < draws; n += 1) {
    const kind = chooseTownHomeKind(
      town,
      household,
      new SeededRng("homes-test").fork(String(n)),
    );
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return (kind: TownHomeKind) => (counts.get(kind) ?? 0) / draws;
}

describe("every state chooses its homes through one code path", () => {
  it("draws a home of the six kinds in the largest place of each state and D.C.", () => {
    const largest = new Map<string, [string, number]>();
    for (const pair of PLACE_POPULATION_ROWS.split(";")) {
      const [geoid, people] = pair.split(":") as [string, string];
      const state = geoid.slice(0, 2);
      if ((largest.get(state)?.[1] ?? -1) < Number(people))
        largest.set(state, [geoid, Number(people)]);
    }
    // Hawaii's places are not in the population table; Urban Honolulu stands
    // for it, as in the town employment test.
    largest.set("15", ["1571550", 0]);
    expect(largest.size).toBe(51);
    for (const [geoid] of largest.values()) {
      const share = kindShares(townOf(geoid), [40, 38, 9]);
      expect(KINDS.reduce((sum, kind) => sum + share(kind), 0)).toBeCloseTo(1);
      expect(share("suburban-house"), geoid).toBeGreaterThan(0);
    }
  });

  it("gives a farm town more farmhouses and a city more apartments", () => {
    const belzoni = kindShares(townOf(BELZONI), [45, 43, 12]);
    const columbus = kindShares(townOf(COLUMBUS), [45, 43, 12]);
    expect(belzoni("rural-farmhouse")).toBeGreaterThan(
      columbus("rural-farmhouse"),
    );
    expect(belzoni("mobile-home")).toBeGreaterThan(columbus("mobile-home"));
    expect(columbus("small-apartment")).toBeGreaterThan(
      belzoni("small-apartment"),
    );
    // A young person alone rents an apartment more often than a family does.
    const alone = kindShares(townOf(COLUMBUS), [23]);
    expect(alone("small-apartment")).toBeGreaterThan(
      columbus("small-apartment"),
    );
  });
});

describe("a new game's households have homes", { timeout: 180_000 }, () => {
  it.each([
    ["Lexington, Kentucky", LEXINGTON],
    ["Belzoni, Mississippi", BELZONI],
    ["Columbus, Ohio", COLUMBUS],
  ])("%s: every household lives in one home of a known kind", (_, placeKey) => {
    const { world, personId, town } = openAt(placeKey, `homes-${placeKey}`);
    const summary = describeTownHomes(world, town);
    expect(summary.households).toBeGreaterThan(20);
    expect(summary.housed).toBe(summary.households);
    expect(summary.owned).toBeGreaterThan(0);
    expect(summary.owned).toBeLessThan(summary.households);
    // The player's home picture follows the recorded kind.
    expect([...KINDS]).toContain(homePlaceForPerson(world, personId));
    const tenures = activeHousingTenuresAt(world).filter((tenure) =>
      tenure.stableKey.startsWith(TOWN_HOMES_VERSION),
    );
    expect(tenures.length).toBe(summary.households);
  });
});

describe("a household with no home decides where to go, with no draw", () => {
  const adults = (...ages: number[]) => ({
    members: ages.map((age) => ({ age })),
  });
  it("buys when it works and its pay carries the payment, and rents otherwise", () => {
    // A $1,200 payment needs $4,286 a month at 28%.
    expect(homeForNewHousehold(adults(40, 38), true, 450_000, 120_000)).toEqual(
      {
        kind: "suburban-house",
        tenure: "ownership:mortgaged",
      },
    );
    expect(
      homeForNewHousehold(adults(40, 38, 9, 7, 5), true, 450_000, 120_000).kind,
    ).toBe("large-house");
    expect(homeForNewHousehold(adults(40, 38), true, 400_000, 120_000)).toEqual(
      {
        kind: "small-apartment",
        tenure: "lease:rented",
      },
    );
    expect(
      homeForNewHousehold(adults(40, 38, 6), false, 900_000, 120_000),
    ).toEqual({
      kind: "rowhouse",
      tenure: "lease:rented",
    });
    // Unknown pay is not zero, and it is not enough to buy.
    expect(homeForNewHousehold(adults(30), true, null, 120_000).tenure).toBe(
      "lease:rented",
    );
  });
});

describe(
  "the town's homes change over five years",
  { timeout: 300_000 },
  () => {
    const opened = openAt(LEXINGTON, "homes-lexington");
    const { personId, town } = opened;
    const playerHome = householdMembershipsAt(opened.world, personId)[0]!
      .household.id;
    const snapshots: World[] = [];
    let world = opened.world;
    // Only the calendar moves; the jobs, pay, families and homes reviews
    // write, so a household's pay and size change as they do in play. The
    // whole-world check is deferred because the world's other due items are
    // not run here.
    withWorldIntegrityDeferred(() => {
      world = startTownJobPay(world, personId, world.currentDate);
      for (let round = 0; round < 20; round += 1) {
        const date = addDays(world.currentDate, 91);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        world = reviewTownJobs(world, town, personId, `test-${round}`);
        world = startTownJobPay(world, personId, date);
        world = reviewTownFamilies(world, town, personId, `test-${round}`);
        world = reviewTownHomes(world, town, `test-${round}`);
        snapshots.push(world);
      }
    });

    it("households buy, sell and move, on the day of the review", () => {
      const { events } = describeTownHomes(world, town);
      expect(events[TOWN_HOME_EVENTS.bought] ?? 0).toBeGreaterThan(0);
      // Every move by choice names the change that decided it.
      const reasons = Object.values(TOWN_HOME_REASONS);
      const chosen = world.history.events.filter((event) =>
        event.stableKey.startsWith(`${TOWN_HOMES_VERSION}:${town}:test-`),
      );
      expect(chosen.length).toBeGreaterThan(0);
      for (const event of chosen)
        expect(
          reasons.some((reason) => event.summary.endsWith(`: ${reason}.`)),
        ).toBe(true);
      expect(
        (events[TOWN_HOME_EVENTS.moved] ?? 0) +
          (events[TOWN_HOME_EVENTS.movedIn] ?? 0),
      ).toBeGreaterThan(0);
      snapshots.forEach((snapshot, round) => {
        for (const event of snapshot.history.events)
          if (
            event.stableKey.startsWith(
              `${TOWN_HOMES_VERSION}:${town}:test-${round}:`,
            )
          )
            expect(event.occurredAt).toBe(snapshot.currentDate);
      });
    });

    it("every household in town has exactly one home after each review", () => {
      for (const snapshot of snapshots) {
        const summary = describeTownHomes(snapshot, town);
        expect(summary.housed).toBe(summary.households);
        const primary = new Map<EntityId, number>();
        for (const occupancy of activeDwellingOccupanciesAt(snapshot))
          if (occupancy.occupant.kind === "household")
            primary.set(
              occupancy.occupant.householdId,
              (primary.get(occupancy.occupant.householdId) ?? 0) + 1,
            );
        for (const count of primary.values()) expect(count).toBe(1);
        // Two households never share one home.
        const dwellings = activeDwellingOccupanciesAt(snapshot).map(
          (occupancy) => occupancy.dwellingId,
        );
        expect(new Set(dwellings).size).toBe(dwellings.length);
      }
    });

    it("never moves the player's household", () => {
      const moved = world.history.dwellingOccupancies.filter(
        (occupancy) =>
          occupancy.occupant.kind === "household" &&
          occupancy.occupant.householdId === playerHome,
      );
      expect(moved).toHaveLength(1);
    });

    it("runs a round once", () => {
      expect(reviewTownHomes(world, town, "test-19")).toBe(world);
    });

    it("moving away gives up the home instead of blocking the move", () => {
      const start = opened.world;
      const reader = moveTieReader(start);
      const mover = start.personOrder.find((id) => {
        const home = householdMembershipsAt(start, id)[0];
        return (
          id !== personId &&
          home !== undefined &&
          home.household.id !== playerHome &&
          start.people[id]!.homeJurisdictionId === town &&
          peopleInHouseholdAt(start, home.household.id).every(
            (member) => !reader.bindingTie(member),
          )
        );
      })!;
      expect(mover).toBeDefined();
      expect(reader.housingTie(mover)).toBeNull();
      const householdId = householdMembershipsAt(start, mover)[0]!.household.id;
      const moved = relocateHousehold(start, {
        stableKey: "town-homes-test:move",
        personId: mover,
        toJurisdictionId: stateJurisdictionForKey("US-OR")!.id,
        reason: "life-course:unrecorded",
        waveKey: null,
      });
      expect(
        activeDwellingOccupanciesAt(moved).some(
          (occupancy) =>
            occupancy.occupant.kind === "household" &&
            occupancy.occupant.householdId === householdId,
        ),
      ).toBe(false);
      expect(
        activeHousingTenuresAt(moved).some(
          (tenure) =>
            tenure.holder.kind === "household" &&
            tenure.holder.householdId === householdId,
        ),
      ).toBe(false);
    });
  },
);
