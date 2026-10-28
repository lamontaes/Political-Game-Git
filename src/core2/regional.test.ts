/** M1-03 checks on the pure regional layer; one random draw of two states, named in the test output. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import regionsData from "./data/regional/regions.json" with { type: "json" };
import stats from "../../data/research/regional/series/stats.json" with { type: "json" };
import { corePlaceByKey } from "./place-lookup";
import {
  historyMonths,
  publishedMonths,
  stepMacroMonth,
  type MacroMonth,
} from "./macro-model";
import { macroCoreData } from "./modules/macro";
import { regionOfPlace } from "./modules/regional";
import { parameter } from "./parameters";
import {
  REGIONS,
  openingRegionMonths,
  publishedRegionMonths,
  stateFigures,
  stepRegionMonth,
  type RegionMonth,
} from "./regional-model";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);

function year(start: string, rate?: number) {
  const nation: MacroMonth[] = publishedMonths(start, p);
  let months: RegionMonth[] = publishedRegionMonths(nation.at(-1)!, p);
  const opening = months;
  for (let i = 0; i < 12; i++) {
    const before = nation.at(-1)!,
      now = stepMacroMonth(before, rate ?? before.policyRatePct, 0, 0, p);
    nation.push(now);
    months = months.map((row) =>
      stepRegionMonth(
        row,
        REGIONS.find((r) => r.id === row.regionId)!,
        before,
        now,
        p,
      ),
    );
  }
  const change = (fips: string) => {
    const a = stateFigures(opening, fips),
      b = stateFigures(months, fips);
    return {
      jobs: (b.jobsThousands / a.jobsThousands - 1) * 100,
      pay: (b.hourlyEarnings / a.hourlyEarnings - 1) * 100,
    };
  };
  return { opening, months, change };
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
    const { opening } = year("2021-01-01");
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
    const { opening } = year("2021-01-01");
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
    const { opening } = year("2021-01-01");
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
  it("in a national downturn, the state most exposed to the hardest-hit industries falls further than the least exposed", () => {
    // Exposure: each industry's share weighted by how hard that industry moves with the nation (its measured beta).
    const key = (sector: string) =>
      sector
        .split("-")
        .map((word) => word[0]!.toUpperCase() + word.slice(1))
        .join("");
    const exposure = (fips: string) => {
      const rows = REGIONS.filter(
        (r) => r.stateFips === fips && r.kind !== "territory",
      );
      const pop = rows.reduce((s, r) => s + r.population, 0);
      return (
        rows.reduce(
          (s, r) =>
            s +
            Object.entries(r.mix).reduce(
              (t, [sector, share]) =>
                t + share * p(`regionalSector${key(sector)}Beta`),
              0,
            ) *
              r.population,
          0,
        ) / pop
      );
    };
    const fips = [
      ...new Set(
        REGIONS.filter((r) => r.kind !== "territory").map((r) => r.stateFips),
      ),
    ].sort((a, b) => exposure(a) - exposure(b));
    const calm = year("2026-10-01"),
      downturn = year("2026-10-01", 10);
    const fall = (f: string) => calm.change(f).jobs - downturn.change(f).jobs;
    expect(fall(fips.at(-1)!)).toBeGreaterThan(fall(fips[0]!));
  });
  it("puts a real town in the region of its county", () => {
    const place = corePlaceByKey("4540075")!;
    const region = regionOfPlace(place.context.jurisdiction.id);
    expect(region).toMatch(/^region:45:/);
  });
});

describe("other places, coarser (M1-13, the economy's part)", () => {
  it("moves people out of regions whose unemployment runs above the nation's", () => {
    const { opening, months } = year("2021-01-01");
    const gap = (row: RegionMonth) => row.unemploymentPct;
    const high = [...opening]
      .filter((row) => row.population > 0)
      .sort((a, b) => gap(b) - gap(a))[0]!;
    const low = [...opening]
      .filter((row) => row.population > 0)
      .sort((a, b) => gap(a) - gap(b))[0]!;
    const after = (id: string) => months.find((row) => row.regionId === id)!;
    expect(after(high.regionId).population).toBeLessThan(high.population);
    expect(after(low.regionId).population).toBeGreaterThan(low.population);
  });
  it("records a monthly jobs report for every state as a public record", async () => {
    const { advanceCore } = await import("./life");
    const { coreAPI, createCore } = await import("./state");
    const { MACRO_MODULE, withCentralBank } = await import("./modules/macro");
    const { REGIONAL_MODULE } = await import("./modules/regional");
    const src = {
      tag: "ESTIMATED" as const,
      asOf: "2026-10-01",
      citation: "fixture",
      estimatedFrom: "fixture",
    };
    const core = createCore(
      withCentralBank({
        seed: "regional-report",
        startedAt: "2026-10-01",
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
            source: src,
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
    advanceCore(core, "2026-11-02");
    void coreAPI(core);
    const reports = [...core.eventIds].filter((id) =>
      id.startsWith("event:economy.state-jobs-report:"),
    );
    expect(reports).toHaveLength(56 * 2);
  });
  it("runs a tight state's pay ahead of the nation's and a slack one behind, not every state with the nation alone", () => {
    const { opening, change } = year("2021-01-01");
    const fips = [...new Set(REGIONS.map((row) => row.stateFips))].filter(
      (f) => change(f).pay !== undefined,
    );
    const gap = fips.map((f) => stateFigures(opening, f).unemploymentPct);
    const pay = fips.map((f) => change(f).pay);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const mg = mean(gap),
      mp = mean(pay);
    const cov = gap.reduce((n, g, i) => n + (g - mg) * (pay[i]! - mp), 0);
    const r =
      cov /
      Math.sqrt(
        gap.reduce((n, g) => n + (g - mg) ** 2, 0) *
          pay.reduce((n, v) => n + (v - mp) ** 2, 0),
      );
    // States do not all move with the nation: their pay changes spread, and
    // the spread runs against their unemployment gap (the pooled fit, r -0.14,
    // is weak, so the model's own is the stronger one it is built to be).
    expect(
      Math.sqrt(pay.reduce((n, v) => n + (v - mp) ** 2, 0) / pay.length),
    ).toBeGreaterThan(0.2);
    expect(r).toBeLessThan(-0.5);
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
