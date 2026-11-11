/** M1-03 checks on the pure regional layer; one random draw of two states, named in the test output. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import regionsData from "./data/regional/regions.json" with { type: "json" };
import stats from "../../data/research/regional/series/stats.json" with { type: "json" };
import { corePlaceByKey } from "./place-lookup";
import { historyMonths, publishedMonths } from "./macro-model";
import { advanceCore } from "./life";
import { coreAPI, createCore } from "./state";
import {
  MACRO_MODULE,
  countryStateNow,
  countryStates,
  macroCoreData,
  withCentralBank,
} from "./modules/macro";
import {
  REGIONAL_MODULE,
  regionOfPlace,
  regionalShock,
  type RegionalShock,
} from "./modules/regional";
import { parameter } from "./parameters";
import {
  REGIONS,
  openingRegionMonths,
  publishedRegionMonths,
  regionMonthFromState,
  stateFigures,
  type RegionMonth,
} from "./regional-model";
import type { CoreAPI } from "./types";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);
const fixture = {
  tag: "ESTIMATED" as const,
  asOf: "2026-10-01",
  citation: "fixture",
  estimatedFrom: "fixture",
};

/** A world with the macro and regional modules and nobody in it: the states run by themselves. */
function world(
  start: string,
  seed: string,
  shocks: readonly RegionalShock[] = [],
) {
  const core = createCore(
    withCentralBank({
      seed,
      startedAt: start,
      people: [],
      households: [],
      jobs: [],
      organizations: [
        {
          id: "org:a",
          name: "a",
          placeId: "p",
          kind: "employer",
          liquidMinor: 0,
          source: { ...fixture, asOf: start },
        },
      ],
      finance: { contracts: [], facilities: [], businesses: [], gaps: [] },
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    }),
    { data, modules: [MACRO_MODULE, REGIONAL_MODULE] },
  );
  const api = coreAPI(core);
  for (const shock of shocks) regionalShock(api, shock);
  return { core, api };
}

const regionRows = (api: CoreAPI, month: string) =>
  api
    .moduleState("regional")
    .table("months")
    .query("byMonth", [month]) as unknown as RegionMonth[];

const openingMonthOf = (api: CoreAPI) =>
  (
    api.moduleState("macro").table("state").get("macro:state") as unknown as {
      openingMonth: string;
      latestMonth: string;
    }
  ).openingMonth;

const latestMonthOf = (api: CoreAPI) =>
  (
    api.moduleState("macro").table("state").get("macro:state") as unknown as {
      latestMonth: string;
    }
  ).latestMonth;

/** The tier's jobs in a state today: the sum over its sectors. */
const tierJobs = (api: CoreAPI, usps: string) =>
  countryStates(api)
    .find((row) => row.usps === usps)!
    .sectors.reduce((sum, sector) => sum + sector.jobs, 0);

/** The regions on their published figures for the month before a start. */
const publishedOpening = (start: string) =>
  publishedRegionMonths(publishedMonths(start, p).at(-1)!, p);

const years = new Map<string, ReturnType<typeof runYear>>();
/** A world run twelve months: its regions at the opening and now, and how a state's jobs and pay changed. */
function runYear(start: string, seed = "regional-year") {
  const { core, api } = world(start, seed);
  const [y, m, d] = start.split("-");
  advanceCore(core, `${Number(y) + 1}-${m}-${d}`);
  const opening = regionRows(api, openingMonthOf(api));
  const months = regionRows(api, latestMonthOf(api));
  const change = (fips: string) => {
    const a = stateFigures(opening, fips),
      b = stateFigures(months, fips);
    return {
      jobs: (b.jobsThousands / a.jobsThousands - 1) * 100,
      pay: (b.hourlyEarnings / a.hourlyEarnings - 1) * 100,
    };
  };
  return { api, opening, months, change };
}
function year(start: string, seed = "regional-year") {
  const key = `${start} ${seed}`;
  if (!years.has(key)) years.set(key, runYear(start, seed));
  return years.get(key)!;
}

describe("state and metro economies", () => {
  it("splits every state into its largest metros and the rest, from data, for all 56 places", () => {
    const states = new Set(REGIONS.map((row) => row.stateFips));
    expect(states.size).toBe(56);
    for (const fips of states)
      expect(
        REGIONS.filter((row) => row.stateFips === fips && row.kind === "metro")
          .length,
      ).toBeLessThanOrEqual(2);
  });
  it("starts each state on its LAUS unemployment rate for the opening month", () => {
    const opening = publishedOpening("2021-01-01");
    const series = regionsData.series.stateUnemploymentPct as Record<
      string,
      Record<string, number>
    >;
    for (const fips of ["06", "48", "72"]) {
      const state = stateFigures(opening, fips);
      expect(state.unemploymentPct).toBeCloseTo(series[fips]!["2020-12"]!, 1);
    }
  });
  it("opens every state with a LAUS series on its published rate, an all-metro state included", () => {
    const opening = publishedOpening("2021-01-01");
    const series = regionsData.series.stateUnemploymentPct as Record<
      string,
      Record<string, number>
    >;
    const states = [...new Set(REGIONS.map((row) => row.stateFips))].filter(
      (fips) => series[fips]?.["2020-12"] !== undefined,
    );
    // An all-metro state (no rest region) is the case a metro's cross-state
    // area rate once set on its own.
    expect(
      states.some(
        (fips) =>
          !REGIONS.some(
            (row) => row.stateFips === fips && row.kind !== "metro",
          ),
      ),
    ).toBe(true);
    for (const fips of states)
      expect(
        stateFigures(opening, fips).unemploymentPct,
        `state ${fips}`,
      ).toBeCloseTo(series[fips]!["2020-12"]!, 6);
  });
  it("opens every state with a CES pay series on its published hourly pay, its regions' incomes kept apart", () => {
    const opening = publishedOpening("2021-01-01");
    const series = regionsData.series.stateHourlyEarnings as Record<
      string,
      Record<string, number>
    >;
    const states = [...new Set(REGIONS.map((row) => row.stateFips))].filter(
      (fips) => series[fips]?.["2020-12"] !== undefined,
    );
    expect(states.length).toBeGreaterThan(40);
    for (const fips of states) {
      expect(
        stateFigures(opening, fips).hourlyEarnings,
        `state ${fips}`,
      ).toBeCloseTo(series[fips]!["2020-12"]!, 6);
      // Regions whose incomes differ still differ in pay.
      const regions = REGIONS.filter((row) => row.stateFips === fips);
      const pays = opening
        .filter((row) => row.stateFips === fips)
        .map((row) => row.hourlyEarnings);
      if (new Set(regions.map((row) => row.perCapitaIncome)).size > 1)
        expect(new Set(pays).size, `state ${fips}`).toBeGreaterThan(1);
    }
  });
  it("two randomly drawn states diverge in a year, inside the 2000-2025 spread of one-year state changes", () => {
    const seed = createHash("sha256")
      .update(`M1-03:${process.env.GOLDEN_PATH_SEED ?? "regional"}`)
      .digest("hex");
    const fips = [
      ...new Set(
        REGIONS.filter((r) => r.kind !== "territory").map((r) => r.stateFips),
      ),
    ].sort();
    const a = fips[parseInt(seed.slice(0, 8), 16) % fips.length]!;
    const rest = fips.filter((f) => f !== a);
    const b = rest[parseInt(seed.slice(8, 16), 16) % rest.length]!;
    const { change } = year("2026-10-01");
    const [x, y] = [change(a), change(b)];
    console.log(
      `M1-03 draw ${seed.slice(0, 16)}: ${a} jobs ${x.jobs.toFixed(2)}% pay ${x.pay.toFixed(2)}%; ${b} jobs ${y.jobs.toFixed(2)}% pay ${y.pay.toFixed(2)}%`,
    );
    expect(x.jobs).not.toBeCloseTo(y.jobs, 3);
    expect(x.pay).not.toBeCloseTo(y.pay, 3);
    for (const row of [x, y]) {
      expect(row.jobs).toBeGreaterThan(stats.stateOneYearJobGrowthPct.p05);
      expect(row.jobs).toBeLessThan(stats.stateOneYearJobGrowthPct.p95);
      expect(row.pay).toBeGreaterThan(stats.stateOneYearPayGrowthPct.p05);
      expect(row.pay).toBeLessThan(stats.stateOneYearPayGrowthPct.p95);
    }
  });
  it("puts a real town in the region of its county", () => {
    const place = corePlaceByKey("4540075")!;
    const region = regionOfPlace(place.context.jurisdiction.id);
    expect(region).toMatch(/^region:45:/);
  });
});

describe("other places, coarser (M1-13, the economy's part)", () => {
  it("records a monthly jobs report for every state as a public record", () => {
    const { core } = world("2026-10-01", "regional-report");
    advanceCore(core, "2026-11-02");
    const reports = [...core.eventIds].filter((id) =>
      id.startsWith("event:economy.state-jobs-report:"),
    );
    expect(reports).toHaveLength(56 * 2);
  });
  it("states do not all move with the nation: their pay changes spread", () => {
    const { change } = year("2021-01-01");
    const fips = [...new Set(REGIONS.map((row) => row.stateFips))];
    const pay = fips.map((f) => change(f).pay);
    const mean = pay.reduce((a, b) => a + b, 0) / pay.length;
    expect(
      Math.sqrt(pay.reduce((n, v) => n + (v - mean) ** 2, 0) / pay.length),
    ).toBeGreaterThan(0.2);
  });
});

describe("a region reads its state's month in the country tier", () => {
  it("holds each region at the state's jobs, people and unemployment moves, from the opening row", () => {
    const seed = `region-${Math.random().toString(36).slice(2, 10)}`;
    const { api } = year("2026-10-01", seed);
    const opening = openingMonthOf(api),
      latest = latestMonthOf(api);
    const where = `seed ${seed} month ${latest}`;
    expect(latest > opening, where).toBe(true);
    let checked = 0;
    for (const region of REGIONS) {
      const first = regionRows(api, opening).find(
        (row) => row.regionId === region.id,
      )!;
      const stored = regionRows(api, latest).find(
        (row) => row.regionId === region.id,
      )!;
      const own = countryStateNow(api, region.stateFips)!;
      const say = `${where} region ${region.id}`;
      expect(own, say).toBeTruthy();
      const move = {
        unemploymentPct: own.now.unemploymentPct,
        unemploymentAtStartPct: own.base.unemploymentPct,
        jobs: own.now.jobs / own.base.jobs,
        pay: stored.hourlyEarnings / first.hourlyEarnings,
        people: own.now.population / own.base.population,
        prices: stored.priceLevelPct / first.priceLevelPct,
      };
      const expected = regionMonthFromState(first, move, latest);
      expect(stored.jobsThousands / first.jobsThousands, say).toBeCloseTo(
        own.now.jobs / own.base.jobs,
        6,
      );
      expect(stored.jobsThousands, say).toBeCloseTo(expected.jobsThousands, 6);
      expect(stored.population, say).toBeCloseTo(expected.population, 6);
      expect(stored.unemploymentPct, say).toBeCloseTo(
        expected.unemploymentPct,
        6,
      );
      expect(stored.id, say).toBe(`${region.id}:${latest}`);
      checked++;
    }
    expect(checked).toBe(REGIONS.length);
  });
  it("a recorded disaster ends its share of one state's jobs in its start month, and no other state differs before it", () => {
    const seed = createHash("sha256")
      .update(`shock:${process.env.GOLDEN_PATH_SEED ?? "regional"}`)
      .digest("hex");
    const usps = [
      ...new Set(
        REGIONS.filter((r) => r.kind !== "territory").map((r) => r.stateUsps),
      ),
    ].sort();
    const hit = usps[parseInt(seed.slice(0, 8), 16) % usps.length]!;
    const start = "2026-10-01",
      shockMonth = "2026-12";
    const shock: RegionalShock = {
      id: "shock:test",
      stateUsps: hit,
      startMonth: shockMonth,
      jobsLossShare: 0.05,
      sourceId: "disaster:test",
    };
    const where = `state ${hit} seed ${seed.slice(0, 12)}`;
    const calm = world(start, "regional-shock"),
      shaken = world(start, "regional-shock", [shock]);
    // The month before the shock: every state's jobs are the same in both worlds.
    advanceCore(calm.core, "2026-11-30");
    advanceCore(shaken.core, "2026-11-30");
    expect(latestMonthOf(shaken.api), where).toBe("2026-11");
    for (const state of countryStates(calm.api))
      expect(tierJobs(shaken.api, state.usps), `${where} ${state.usps}`).toBe(
        tierJobs(calm.api, state.usps),
      );
    advanceCore(calm.core, "2026-12-02");
    advanceCore(shaken.core, "2026-12-02");
    expect(latestMonthOf(shaken.api), where).toBe(shockMonth);
    const without = tierJobs(calm.api, hit),
      withShock = tierJobs(shaken.api, hit);
    console.log(
      `shock ${where}: jobs ${without.toFixed(0)} calm, ${withShock.toFixed(0)} shaken (${((withShock / without - 1) * 100).toFixed(2)}%)`,
    );
    expect(withShock, where).toBeLessThan(without);
  });
});

describe("each world's own states and metros (owner, Oct 27: realistic, not real)", () => {
  const start = "2025-01-20";
  const at = (seed: string) =>
    openingRegionMonths(historyMonths(start, seed, p).at(-1)!, start, seed, p);
  it("opens every region of every place on figures that differ between two worlds and from the published ones", () => {
    const published = publishedRegionMonths(
      publishedMonths(start, p).at(-1)!,
      p,
    );
    const a = at("world-a"),
      b = at("world-b");
    expect(a.map((row) => row.id)).toEqual(published.map((row) => row.id));
    expect(new Set(a.map((row) => row.stateFips)).size).toBe(56);
    for (const [i, real] of published.entries())
      for (const key of [
        "unemploymentPct",
        "jobsThousands",
        "hourlyEarnings",
        "priceLevelPct",
      ] as const) {
        expect(a[i]![key], `${real.id} ${key}`).not.toBe(real[key]);
        expect(a[i]![key], `${real.id} ${key}`).not.toBe(b[i]![key]);
      }
  });
  it("draws the same regions again from the same seed", () => {
    expect(at("world-a")).toEqual(at("world-a"));
  });
});
