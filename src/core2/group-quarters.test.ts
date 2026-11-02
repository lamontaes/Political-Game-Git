/**
 * Group quarters (CTO, Nov 1: the population by place and type comes from
 * the Census and stays out of the rental market). In the played world
 * (`buildBenchWorld`, two-level, every module installed), for a year:
 *
 * - each type's residents, counted rooms times their weight plus full people
 *   in rooms, are this world's share of the place's 2020 Census count;
 * - no room record ever holds a lease, a rent flow, rent arrears, an
 *   eviction case or a move, and each keeps its `group` dwelling;
 * - residents of institutions and military quarters hold no civilian job
 *   and no share of the unplaced workers, and no room gains a member;
 * - the town's eviction filings per 100 renter households sit inside the
 *   states' range (`housingEvictionFilingRate`, Eviction Lab 2018), measured
 *   in Storrs, with its state's own rate printed beside it.
 *
 * Places: Storrs, Connecticut (0973980), the item's case (its 11,452 of
 * 15,207 residents in group quarters once rented as households and filled
 * the year with evictions); and two drawn from all 56 jurisdictions with
 * `drawPlace`'s accept test: one whose sample holds at least one resident of
 * a prison, a juvenile facility or a military base where the draw allows,
 * one with any group quarters. Seed from GOLDEN_PATH_SEED (random when
 * unset), printed with each place.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import housingParameters from "./data/housing/parameters.json" with { type: "json" };
import evictionFilings from "../../data/research/housing/eviction-filings-2026.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  outsideLaborForce,
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
const INSTITUTIONS = ["adultCorrectional", "juvenile", "military"] as const;
/** A place's published population, where it has one. */
const publishedOf = (key: string) => {
  const sourceGeoid = corePlaceByKey(key)?.sourceGeoid;
  return sourceGeoid
    ? publishedPlaceReferencePopulation(sourceGeoid)?.value
    : undefined;
};
// A prison, juvenile facility or base big enough for the sample to hold at
// least one of its residents: its share of the published population times
// the sample (the target, or a tenth under the published count where that is
// smaller, for this world's offset) is one person or more.
const institution = drawPlace(seed, "group-quarters-institution", (key) => {
  const row = placeGroupQuarters(key);
  const published = publishedOf(key);
  if (!row || !published || !(published > 0)) return false;
  const sample = Math.min(parameter("targetPopulation"), 0.9 * published);
  return INSTITUTIONS.some(
    (type) => (row.byType[type] * sample) / Math.max(published, row.total) >= 1,
  );
});
const drawn = drawPlace(seed, "group-quarters", (key) => {
  const published = publishedOf(key);
  return (
    (placeGroupQuarters(key)?.total ?? 0) > 0 && !!published && published > 0
  );
});
const band = housingParameters.housingEvictionFilingRate.spread;
/** A state's 2018 filing rate from the research file, by postal code. */
const stateFilingRate = (usps: string | undefined) => {
  const rate = evictionFilings.columns.indexOf("rate");
  const row = [
    ...evictionFilings.rows,
    ...evictionFilings.estimatedRows.rows,
  ].find((entry) => entry[0] === usps);
  return row ? `${usps} ${String(row[rate])} (${String(row[2])})` : "none";
};

describe("group quarters in the played world", { timeout: 1_800_000 }, () => {
  it.each([
    { key: "0973980", worldSeed: seed, filingCheck: true, institutions: false },
    {
      key: institution.key,
      worldSeed: institution.seed,
      filingCheck: false,
      institutions: true,
    },
    {
      key: drawn.key,
      worldSeed: drawn.seed,
      filingCheck: false,
      institutions: false,
    },
  ])(
    "place $key: each type's residents are its Census share, and no room rents, owes, is evicted, moves, works outside the labor force or grows in a year",
    ({ key, worldSeed, filingCheck, institutions }) => {
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

      // The opening: every room record, counted or full, and its members.
      const opening = new Map<string, GroupQuartersType>();
      const members = new Map<string, number>();
      const weighted = new Map<GroupQuartersType, number>();
      const records = new Map<GroupQuartersType, string[]>();
      const fullPeople = new Map<GroupQuartersType, number>();
      let weight = 1;
      for (const h of store.liveHouseholds()) {
        if (h.placeId !== placeId || !h.quarters) continue;
        expect(h.tenure, h.id).toBe("group");
        opening.set(h.id, h.quarters);
        members.set(h.id, store.countedCount(h));
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
        members.set(home.id, alive);
        fullPeople.set(
          home.quarters,
          (fullPeople.get(home.quarters) ?? 0) + alive,
        );
        weighted.set(home.quarters, (weighted.get(home.quarters) ?? 0) + alive);
        records.set(home.quarters, [
          ...(records.get(home.quarters) ?? []),
          home.id,
        ]);
      }

      // Each type against this world's share of the Census count.
      const census = placeGroupQuarters(key);
      const published = publishedOf(key);
      const world = Number(core.placeMetadata?.referencePopulation);
      // The sample the opening drew (the target, or the whole town where it
      // is smaller) against the one the weight implies: whole households
      // overshoot the target a little, and each counted person stands for
      // the weight.
      const sampleSize = Math.min(parameter("targetPopulation"), world);
      const overshoot = Math.abs((sampleSize * weight) / world - 1);
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
        // The sample is whole people: a type's count is within one person's
        // weight of this world's share, plus the households' overshoot of
        // the sample, plus each full resident's weight (a full person counts
        // one); with no weight, within one person.
        const tolerance =
          weight === 1
            ? 1
            : weight * (1 + (fullPeople.get(type) ?? 0)) + expected * overshoot;
        expect(Math.abs(held - expected), `${key} ${type}`).toBeLessThanOrEqual(
          tolerance,
        );
      }
      expect(opening.size, key).toBeGreaterThan(0);
      // The institution draw holds a prison's, a juvenile facility's or a
      // base's residents, so the labor-force skips below are exercised.
      if (institutions)
        expect(
          [...opening.values()].some((type) =>
            (INSTITUTIONS as readonly string[]).includes(type),
          ),
          key,
        ).toBe(true);
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
      // may empty one), none with more members than it opened with (no
      // births, no newcomers), and none outside the civilian labor force
      // holds a job or a share of the unplaced workers.
      let outside = 0;
      for (const h of store.liveHouseholds()) {
        if (!h.quarters) continue;
        expect(opening.has(h.id), h.id).toBe(true);
        expect(store.countedCount(h), h.id).toBeLessThanOrEqual(
          members.get(h.id) ?? 0,
        );
        if (!outsideLaborForce(h.quarters)) continue;
        outside += 1;
        expect(
          h.jobs
            .filter((job) => job.endsAt === undefined)
            .map((job) => `${job.id} (${job.organizationId})`),
          `${h.id} (${h.quarters})`,
        ).toEqual([]);
        expect(h.unplacedWorkers, h.id).toBe(0);
      }
      for (const home of core.households.values()) {
        if (!home.quarters) continue;
        expect(opening.has(home.id), home.id).toBe(true);
        const alive = home.memberIds.filter((id) => core.people.get(id)?.alive);
        expect(alive.length, home.id).toBeLessThanOrEqual(
          members.get(home.id) ?? Infinity,
        );
        if (!outsideLaborForce(home.quarters)) continue;
        outside += 1;
        for (const id of alive)
          expect(core.people.get(id)?.jobId, id).toBeUndefined();
      }
      console.log(
        `group-quarters: ${key} ${outside} rooms outside the civilian labor force at the year's end, none working`,
      );

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
      const usps = corePlaceByKey(key)?.stateJurisdictionKey.replace(
        /^US-/,
        "",
      );
      console.log(
        `group-quarters: ${key} filings ${filed.length} (${filed.filter((row) => row.counted).length} counted) of ${cases.length} cases, mean renters ${meanRenters.toFixed(1)}: ${rate.toFixed(2)} per 100 renter households (each counted case weighted: ${weightedRate.toFixed(2)}); the states' range ${band.low} to ${band.high}, national ${housingParameters.housingEvictionFilingRate.value}, this state ${stateFilingRate(usps)}; ${((Date.now() - started) / 1000).toFixed(0)} s`,
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
