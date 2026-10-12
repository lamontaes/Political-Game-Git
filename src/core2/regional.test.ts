/** M1-03 checks on the pure regional layer; one random draw of two states, named in the test output. */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import regionsData from "./data/regional/regions.json" with { type: "json" };
import stats from "../../data/research/regional/series/stats.json" with { type: "json" };
import { lifePlaceByKey } from "../simulation/life-places";
import { historyMonths, stepMacroMonth, type MacroMonth } from "./macro-model";
import { macroCoreData } from "./modules/macro";
import { regionOfPlace } from "./modules/regional";
import { parameter } from "./parameters";
import {
  REGIONS,
  openingRegionMonths,
  stateFigures,
  stepRegionMonth,
  type RegionMonth,
} from "./regional-model";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);

function year(start: string, rate?: number) {
  const nation: MacroMonth[] = historyMonths(start, p);
  let months: RegionMonth[] = openingRegionMonths(nation.at(-1)!, p);
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
    const place = lifePlaceByKey("4540075")!;
    const region = regionOfPlace(place.context.jurisdiction.id);
    expect(region).toMatch(/^region:45:/);
  });
});
