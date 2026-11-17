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
 * the year with evictions); Ogden, Utah, whose sample holds residents of a
 * prison, a juvenile facility or a military base; and Brewer, Maine, with
 * group quarters of its own.
 *
 * Pinned (Nov 16). Before, the test drew its seed at run time from
 * GOLDEN_PATH_SEED or randomBytes and drew the second and third places from
 * it with `drawPlace`'s accept tests, so a red came and went with the draw.
 * The places were found once by running the old draw at seeds pin-gq-0 to
 * pin-gq-2 (Storrs and Ogden at pin-gq-1, Brewer at pin-gq-0). Two faults
 * stay here as red cases. Muscatine, Iowa (pin-gq-1's third draw) holds a
 * group-quarters home neither opened nor admitted on the Train at f26c10de
 * (item tests-group-quarters-room-neither-opened-nor-admitted; on the Train
 * at a62a2fda the same fault showed at Storrs, seed 085af212…, and the fault
 * moves between places as the code changes). Holden, West Virginia (the
 * institution draw at pin-gq-0) returned a room met on day one to the counts
 * with no tenure on the Train at f26c10de (item tests-group-quarters-met-
 * room-returns-without-group-tenure; Mount Hope, West Virginia at pin-gq-2
 * failed the same way); on the Train at 800ae520 it passed, and on the Train
 * at 6e9df72b it is red again. Both red rows are expected failures (it.fails)
 * that name their items.
 */
import { placeReferencePopulation } from "./gov-rules/place-population";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
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

// Limit, Nov 16 on the Train at 800ae520, alone and beside the other pinned
// files: Muscatine 356.1 s and 370.5 s, Ogden 355.9 s and 349.7 s, Brewer
// 312.5 s and 318.5 s, Storrs 236.8 s and 254.7 s, Holden 68.1 s and 72.6 s;
// twice the slowest is about 750 s.
describe("group quarters in the played world", { timeout: 750_000 }, () => {
  const rows: {
    key: string;
    worldSeed: string;
    filingCheck: boolean;
    institutions: boolean;
    fails?: string;
  }[] = [
    {
      key: "0973980",
      worldSeed: "pin-gq-1",
      filingCheck: true,
      institutions: false,
    },
    {
      key: "4955980",
      worldSeed:
        "66318a1850c99a24802554a26a0eee699788255fdcc3a89b119754cfc3e711aa",
      filingCheck: false,
      institutions: true,
    },
    {
      key: "2306925",
      worldSeed:
        "f8a777ef05665c5c2d45c5f0c5f5fdcf65f128e5592031839c62f0f134041964",
      filingCheck: false,
      institutions: false,
    },
    {
      key: "1955110",
      worldSeed:
        "699ba32e2ba2dbfca445ba8ce32f5b6b504de63eb4b81c18db5aa95b075ca764",
      filingCheck: false,
      institutions: false,
      fails: "tests-group-quarters-room-neither-opened-nor-admitted",
    },
    // Red at f26c10de, green at 800ae520, red again on the Train at
    // 6e9df72b (Nov 16).
    {
      key: "5437948",
      worldSeed:
        "a4c19fc64e5227305fec46c6dbde9b82c542f0de603825ab6e966a3140d4a8c9",
      filingCheck: false,
      institutions: true,
      fails: "tests-group-quarters-met-room-returns-without-group-tenure",
    },
  ];
  const title =
    "place $key, world seed $worldSeed: each type's residents are its Census share, and no room rents, owes, is evicted, moves, works outside the labor force and an arrival is housed in a room only by the institution's waiting list";
  const run = ({
    key,
    worldSeed,
    filingCheck,
    institutions,
  }: (typeof rows)[number]) => {
    setBookkeeping(false);
    const started = Date.now();
    const { core, placeId, place, playerId } = buildBenchWorld(
      worldSeed,
      gameStartDate(),
      { twoLevel: true, placeKey: key },
    );
    console.log(
      `group-quarters: place ${key} (${place.displayName}), world seed ${worldSeed}`,
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
    const world = placeReferencePopulation(
      corePlaceByKey(key)!.sourceGeoid!,
      core.seed,
    )!.value;
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
    // An arriving household is housed in a room only by the institution's
    // admission (the waiting list refilling a vacancy, `admitToRooms`);
    // every other arrival lives in a home with no quarters.
    const admitted = new Set<string>();
    for (const row of moves) {
      if (row.direction === "out") {
        expect(opening.has(row.householdId), row.id).toBe(false);
        continue;
      }
      const room = store.liveHousehold(row.householdId)?.quarters;
      if (room === undefined) continue;
      expect(
        (row as { fromPlace?: string }).fromPlace,
        `${row.id} housed in a ${room} room by something other than the institution's waiting list`,
      ).toBe("waiting-list");
      admitted.add(row.householdId);
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
    // No unexplained rooms: the rooms at the year's end are the opening's
    // (deaths may empty one) or ones the waiting list filled, none of the
    // opening's with more members than it opened with, and none outside the
    // civilian labor force holds a job or a share of the unplaced workers.
    let outside = 0;
    for (const h of store.liveHouseholds()) {
      if (!h.quarters) continue;
      // A room not in the opening is one the waiting list filled.
      expect(opening.has(h.id) || admitted.has(h.id), h.id).toBe(true);
      if (opening.has(h.id))
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
      expect(opening.has(home.id) || admitted.has(home.id), home.id).toBe(true);
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
    const usps = corePlaceByKey(key)?.stateJurisdictionKey.replace(/^US-/, "");
    console.log(
      `group-quarters: ${key} filings ${filed.length} (${filed.filter((row) => row.counted).length} counted) of ${cases.length} cases, mean renters ${meanRenters.toFixed(1)}: ${rate.toFixed(2)} per 100 renter households (each counted case weighted: ${weightedRate.toFixed(2)}); the states' range ${band.low} to ${band.high}, national ${housingParameters.housingEvictionFilingRate.value}, this state ${stateFilingRate(usps)}; ${((Date.now() - started) / 1000).toFixed(0)} s`,
    );
    if (filingCheck) {
      expect(rate, key).toBeGreaterThanOrEqual(band.low);
      expect(rate, key).toBeLessThanOrEqual(band.high);
    }
  };
  it.each(rows.filter((row) => !row.fails))(title, run);
  // Each red row is an expected failure that names its item (acting CTO,
  // Nov 16, on #9554): it passes while the fault stands and fails the day
  // the fault is fixed, which is the signal to move the row back.
  it.fails.each(rows.filter((row) => row.fails))(
    `${title} (expected failure, item $fails)`,
    run,
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
