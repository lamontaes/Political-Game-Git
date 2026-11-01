/**
 * Group quarters (CTO, Nov 1: the population by place and type comes from
 * the Census and stays out of the rental market). In the played world
 * (`buildBenchWorld`, two-level, every module installed), for a year:
 *
 * - each type's residents, counted rooms times their weight plus full people
 *   in rooms, are this world's share of the place's 2020 Census count;
 * - no room record ever holds a lease, a rent flow, rent arrears, an
 *   eviction case or a move, and each keeps its `group` dwelling;
 * - the town's eviction filings per 100 renter households sit inside the
 *   check range (`housingEvictionFilingRate`), measured in Storrs.
 *
 * Places: Storrs, Connecticut (0973980), the item's case (its 11,452 of
 * 15,207 residents in group quarters once rented as households and filled
 * the year with evictions); and two drawn from all 56 jurisdictions with
 * `drawPlace`'s accept test: one with a prison, a juvenile facility or a
 * military base where the draw allows, one with any group quarters. Seed
 * from GOLDEN_PATH_SEED (random when unset), printed with each place.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import housingParameters from "./data/housing/parameters.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  placeGroupQuarters,
  publishedPlaceReferencePopulation,
} from "./gov-rules/place-population";
import { CountedStore, type GroupKey } from "./counted-groups";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedDemotions } from "./modules/counted-demotion";
import { COUNTED_MOVES_MODULE_ID } from "./modules/counted-moves";
import { townFigures } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import { parameter } from "./parameters";
import { corePlaceByKey } from "./place-lookup";
import type { ResidentHouseholdRecord } from "./residents";
import { coreAPI, fillInPerson } from "./state";
import { monthsAfter } from "./tooling/m1-played-year";
import {
  GROUP_QUARTERS_TYPES,
  type GroupQuartersType,
  type IsoDate,
  type PersonInput,
  type Source,
} from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const institution = drawPlace(seed, "group-quarters-institution", (key) => {
  const row = placeGroupQuarters(key);
  return (
    !!row &&
    row.byType.adultCorrectional + row.byType.juvenile + row.byType.military > 0
  );
});
const drawn = drawPlace(
  seed,
  "group-quarters",
  (key) => (placeGroupQuarters(key)?.total ?? 0) > 0,
);
const band = housingParameters.housingEvictionFilingRate.spread;

describe("group quarters in the played world", { timeout: 1_800_000 }, () => {
  it.each([
    { key: "0973980", worldSeed: seed, filingCheck: true },
    { key: institution.key, worldSeed: institution.seed, filingCheck: false },
    { key: drawn.key, worldSeed: drawn.seed, filingCheck: false },
  ])(
    "place $key: each type's residents are its Census share, and no room rents, owes, is evicted or moves in a year",
    ({ key, worldSeed, filingCheck }) => {
      setBookkeeping(false);
      const started = Date.now();
      const { core, placeId, place, playerId } = buildBenchWorld(
        worldSeed,
        gameStartDate(),
        { twoLevel: true, placeKey: key },
      );
      console.log(
        `group-quarters: place ${key} (${place.displayName}), seed ${seed}, world seed ${worldSeed}`,
      );
      const api = coreAPI(core);
      const rt = residentsRuntime(core)!;
      const store = rt.store;
      const start = core.date;
      const roomMembers = parameter("groupQuartersRoomMembers");

      // The opening: every room record, counted or full.
      const opening = new Map<string, GroupQuartersType>();
      const weighted = new Map<GroupQuartersType, number>();
      const records = new Map<GroupQuartersType, string[]>();
      let weight = 1;
      for (const h of store.liveHouseholds()) {
        if (h.placeId !== placeId || !h.quarters) continue;
        expect(h.tenure, h.id).toBe("group");
        opening.set(h.id, h.quarters);
        weight = Math.max(weight, store.weightOf(h));
        weighted.set(
          h.quarters,
          (weighted.get(h.quarters) ?? 0) +
            store.countedCount(h) * store.weightOf(h),
        );
        records.set(h.quarters, [...(records.get(h.quarters) ?? []), h.id]);
      }
      for (const home of core.households.values()) {
        if (home.placeId !== placeId || !home.quarters) continue;
        opening.set(home.id, home.quarters);
        const alive = home.memberIds.filter(
          (id) => core.people.get(id)?.alive,
        ).length;
        weighted.set(home.quarters, (weighted.get(home.quarters) ?? 0) + alive);
        records.set(home.quarters, [
          ...(records.get(home.quarters) ?? []),
          home.id,
        ]);
      }

      // Each type against this world's share of the Census count.
      const census = placeGroupQuarters(key);
      const sourceGeoid = corePlaceByKey(key)?.sourceGeoid;
      const published = sourceGeoid
        ? publishedPlaceReferencePopulation(sourceGeoid)?.value
        : undefined;
      const world = Number(core.placeMetadata?.referencePopulation);
      expect(census, key).not.toBeNull();
      expect(published, key).toBeGreaterThan(0);
      for (const type of GROUP_QUARTERS_TYPES) {
        const expected =
          (census!.byType[type] * world) / Math.max(published!, census!.total);
        const held = weighted.get(type) ?? 0;
        console.log(
          `group-quarters: ${type} census ${census!.byType[type]}, this world ${expected.toFixed(1)}, held ${held.toFixed(1)} in ${records.get(type)?.length ?? 0} records (${(records.get(type) ?? []).slice(0, 3).join(", ")})`,
        );
        if (census!.byType[type] === 0) {
          expect(records.get(type), `${key} ${type}`).toBeUndefined();
          continue;
        }
        // The sample is whole people: a type's count is within 1 percent or
        // one room's weight of this world's share; with no weight, within one.
        const tolerance =
          weight === 1 ? 1 : Math.max(0.01 * expected, roomMembers * weight);
        expect(Math.abs(held - expected), `${key} ${type}`).toBeLessThanOrEqual(
          tolerance,
        );
      }
      expect(opening.size, key).toBeGreaterThan(0);
      // The player starts in a household, never in group quarters.
      const playerHome = core.people.get(playerId!)?.householdId;
      expect(core.households.get(playerHome!)?.quarters, key).toBeUndefined();

      // One room is met on the first day: filled in whole, it keeps its type
      // and its group dwelling, and once out of the player's life past the
      // world's wait it returns to the counts as a room.
      // (A place whose only room the opening kept full has none to meet.)
      const met = [...store.liveHouseholds()].find(
        (h) => h.placeId === placeId && h.quarters && store.countedCount(h),
      );
      const metType = met?.quarters;
      if (met) {
        fillInPerson(core, store.ids[store.countedMembers(met)[0]!]!);
        expect(core.households.get(met.id)?.quarters, met.id).toBe(metType);
        expect(store.liveHousehold(met.id), met.id).toBeUndefined();
      }

      // A year, month by month, reading the town's renters at each month's end.
      const renters: number[] = [];
      for (let month = 1; month <= 12; month += 1) {
        advanceCore(core, monthsAfter(start, month));
        renters.push(townFigures(api, placeId).renters);
      }

      // Outside the rental market all year, by record id.
      const housing = api.moduleState("housing");
      const cases = housing.table("cases").rows() as unknown as {
        id: string;
        householdId: string;
        counted?: boolean;
        filedAt?: string;
      }[];
      const cased = new Set(cases.map((row) => row.householdId));
      const moves = api
        .moduleState(COUNTED_MOVES_MODULE_ID)
        .table("moves")
        .rows() as unknown as {
        id: string;
        direction: "in" | "out";
        householdId: string;
      }[];
      for (const [id, type] of opening) {
        expect(core.finance.contracts.has(`lease:${id}`), id).toBe(false);
        expect(rt.flows.has(`rent:${id}`), id).toBe(false);
        expect(cased.has(id), id).toBe(false);
        const dwelling = housing.table("dwellings").get(`dwelling:${id}`) as
          { tenure: string; kind: string } | undefined;
        expect(dwelling?.tenure, id).toBe("group");
        expect(dwelling?.kind, id).toBe(type);
        const counted = store.liveHousehold(id);
        if (counted) {
          expect(counted.tenure, id).toBe("group");
          expect(counted.quarters, id).toBe(type);
          expect(rt.arrears.get(counted.group) ?? 0, id).toBe(0);
          expect(rt.housingMonth.has(counted.group), id).toBe(false);
        } else if (core.households.has(id))
          expect(core.households.get(id)?.quarters, id).toBe(type);
      }
      for (const row of moves) {
        if (row.direction === "out")
          expect(opening.has(row.householdId), row.id).toBe(false);
        else
          expect(
            store.liveHousehold(row.householdId)?.quarters,
            row.id,
          ).toBeUndefined();
      }
      if (met) {
        const demoted = countedDemotions(api).some(
          (row) => row.householdId === met.id,
        );
        console.log(
          `group-quarters: ${key} room ${met.id} (${metType}) met on day one, ${demoted ? `returned to the counts with tenure ${store.liveHousehold(met.id)?.tenure}` : "still full"} at the year's end`,
        );
        if (demoted) {
          expect(store.liveHousehold(met.id)?.tenure, met.id).toBe("group");
          expect(store.liveHousehold(met.id)?.quarters, met.id).toBe(metType);
        }
      }
      // No new rooms: the rooms at the year's end are the opening's (deaths
      // may empty one).
      for (const h of store.liveHouseholds())
        if (h.quarters) expect(opening.has(h.id), h.id).toBe(true);
      for (const home of core.households.values())
        if (home.quarters) expect(opening.has(home.id), home.id).toBe(true);

      // Eviction filings per 100 renter households: a case is one household,
      // full or counted; renters are the year's mean month-end count.
      const end = addDays(makeIsoDate(start), 365);
      const filed = cases.filter(
        (row) => row.filedAt && row.filedAt >= start && row.filedAt < end,
      );
      const weightOfCase = (row: (typeof cases)[number]) => {
        const at = row.counted
          ? store.householdOf.get(row.householdId)
          : undefined;
        return at === undefined ? 1 : store.weightOf(store.households[at]!);
      };
      const meanRenters =
        renters.reduce((sum, value) => sum + value, 0) / renters.length;
      const rate = (100 * filed.length) / meanRenters;
      const weightedRate =
        (100 * filed.reduce((sum, row) => sum + weightOfCase(row), 0)) /
        meanRenters;
      console.log(
        `group-quarters: ${key} filings ${filed.length} (${filed.filter((row) => row.counted).length} counted) of ${cases.length} cases, mean renters ${meanRenters.toFixed(1)}: ${rate.toFixed(2)} per 100 renter households (each counted case weighted: ${weightedRate.toFixed(2)}), check range ${band.low} to ${band.high}; ${((Date.now() - started) / 1000).toFixed(0)} s`,
      );
      if (filingCheck) {
        expect(rate, key).toBeGreaterThanOrEqual(band.low);
        expect(rate, key).toBeLessThanOrEqual(band.high);
      }
    },
  );
});

describe("a group-quarters room in the counted store", () => {
  const source: Source = {
    tag: "ESTIMATED",
    asOf: "2025-01-01",
    citation: "Test records.",
  };
  const record = (
    id: string,
    quarters?: GroupQuartersType,
  ): ResidentHouseholdRecord => ({
    household: {
      id,
      placeId: "place:test",
      memberIds: [`${id}:a`, `${id}:b`],
      source,
      ...(quarters ? { quarters } : {}),
    },
    people: ["a", "b"].map(
      (n) =>
        ({
          id: `${id}:${n}`,
          givenName: n,
          familyName: id,
          birthDate: "2005-03-01" as IsoDate,
          placeId: "place:test",
          householdId: id,
          tier: "weekly",
          traits: {},
          liquidMinor: 0,
          livingCostDailyMinor: 0,
          source,
          familyIds: [],
          knownIds: [],
          pastFacts: [],
        }) as unknown as PersonInput,
    ),
    jobs: [],
    workCommitments: [],
    contracts: [],
  });
  const key = (ageBand: string, quarters?: GroupQuartersType): GroupKey => ({
    placeId: "place:test",
    district: "town",
    kind: "adults",
    incomeBand: 0,
    tenure: quarters ? "group" : "other",
    ageBand,
    work: "not-working",
    ...(quarters ? { quarters } : {}),
  });

  it("holds its home as a room, groups by its type, and gives its weight only to rooms of its type when alone in its group", () => {
    const store = new CountedStore();
    const facts = { tenure: "other" as const, unplacedWorkers: 0, weight: 3 };
    const alone = store.addHousehold(record("alone", "college"), facts);
    const other = store.addHousehold(record("other", "college"), facts);
    const house = store.addHousehold(record("house"), facts);
    store.regroup(alone, key("18-29", "college"));
    store.regroup(other, key("30-44", "college"));
    store.regroup(house, key("18-29"));
    expect(alone.tenure).toBe("group");
    expect(alone.quarters).toBe("college");
    expect(house.tenure).toBe("other");
    expect(house.quarters).toBeUndefined();
    expect(store.groups[alone.group]!.id).toMatch(/:college$/);
    expect(store.groups[house.group]!.id).not.toMatch(/college/);
    expect(alone.group).not.toBe(house.group);
    expect(store.householdView(alone).household.quarters).toBe("college");
    expect("quarters" in store.householdView(house).household).toBe(false);
    // Two of its three rooms' people go to the other college room, none to the house.
    expect(store.releaseWeight(alone)).toBe(0);
    expect(store.weightOf(other)).toBe(5);
    expect(store.weightOf(house)).toBe(3);
  });
});
