/**
 * The state's figures come from one engine (pool item
 * metrics-state-figures-one-owner). The country tier keeps each state's
 * unemployment, jobs, pay, prices and people by month; the Metrics tab's
 * state rows, the state's session agenda and the working lives elsewhere all
 * read that row, and the regional months stay as the town's region inside its
 * state. Before, Metrics read the regional months weighted by region
 * population while the agenda read the tier, two answers for one state and
 * month (a town's 15% against the state's 4.6% in the six-year game).
 * Pinned place and seed: Everett, Georgia (7a5e19c2b3d84f60). The time is the
 * game's own played days: 366 days (January 20, 2025 to January 20, 2026) in a
 * small town, about a quarter of a second a day; a year is the least that
 * shows last year's row beside this month's, the way Metrics reads them.
 * Measured 97 seconds; the limit is about twice that.
 */
import { describe, expect, it } from "vitest";
import { metricsView } from "./metrics";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { shiftMonth } from "../core2/macro-model";
import { stateUnemployment } from "../core2/modules/counted-moves";
import { countryStateMonth, countryStates } from "../core2/modules/macro";
import { coreAPI } from "../core2/state";

const SEED = "7a5e19c2b3d84f60";

describe("the state's figures have one owner", () => {
  it("Everett, Georgia: Metrics' state rows are the country tier's kept months", () => {
    const world = buildBenchWorld(SEED, gameStartDate(), { twoLevel: true });
    expect(world.place.displayName).toBe("Everett, Georgia");
    const api = coreAPI(world.core);
    const p = (key: string) => api.parameter(key);
    const where = `${world.place.displayName} (seed ${SEED})`;
    // Day one reads the opening the tier is about to keep.
    const stateRows = (view: ReturnType<typeof metricsView>) =>
      view.sections.find((s) => s.key === "state")!.rows;
    const dayOne = stateRows(metricsView(world.core, world.placeId)).map(
      (r) => [r.key, r.now] as const,
    );
    advanceCore(world.core, "2026-01-20" as never);
    const georgiaFips = countryStates(api).find(
      (row) => row.usps === "GA",
    )!.fips;
    const openingMonth = (
      api.moduleState("macro").table("state").get("macro:state") as unknown as {
        openingMonth: string;
      }
    ).openingMonth;
    const opened = countryStateMonth(api, georgiaFips, openingMonth)!;
    for (const [key, value] of dayOne)
      expect(value, `${where}: state.${key} on day one`).toBe(
        opened[
          { unemployment: "unemploymentPct", pay: "hourlyPay", jobs: "jobs" }[
            key as "unemployment" | "pay" | "jobs"
          ] as "unemploymentPct" | "hourlyPay" | "jobs"
        ],
      );
    const latest = (
      api.moduleState("macro").table("state").get("macro:state") as unknown as {
        latestMonth: string;
      }
    ).latestMonth;
    const yearBack = shiftMonth(latest, -p("macroMonthsPerYear"), p);
    const now = countryStateMonth(api, georgiaFips, latest)!;
    const before = countryStateMonth(api, georgiaFips, yearBack)!;
    expect(now, `${where}: kept month ${latest}`).toBeTruthy();
    expect(before, `${where}: kept month ${yearBack}`).toBeTruthy();
    const view = metricsView(world.core, world.placeId);
    const state = stateRows(view);
    for (const [key, field] of [
      ["unemployment", "unemploymentPct"],
      ["pay", "hourlyPay"],
      ["jobs", "jobs"],
    ] as const) {
      const row = state.find((r) => r.key === key)!;
      expect(row.now, `${where}: state.${key} now`).toBe(now[field]);
      expect(row.before, `${where}: state.${key} last year`).toBe(
        before[field],
      );
    }
    // The same month's figure is the one the working lives elsewhere read.
    expect(stateUnemployment(api).get("GA"), where).toBe(now.unemploymentPct);
  }, 190_000);
});
