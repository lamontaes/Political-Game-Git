/**
 * A state's term read comes from the country tier's kept months, before the
 * opening as after it (pool item term-read-state-figures-from-the-tier). The
 * tier keeps the real coarse months the world was fitted from, summed to the
 * state, each shifted to meet the tier at the opening month, so a term that
 * began before the world did reads one series, with no step where the world
 * opens. The place is drawn from all 56 (GOLDEN_PATH_SEED replays a draw) and
 * named in every message; the time is the world's build and its first days.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { countryStateMonth, countryStates } from "./modules/macro";
import { placeStateKey } from "./place-map";
import { openingRegionMonths, stateOfRegions } from "./regional-model";
import { coreAPI } from "./state";
import { jurisdictionTermRead } from "./term-read";

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWN = drawPlace(SEED, "term-read-state-tier");
setBookkeeping(false);

describe("a state's term read stands on the tier's own months", () => {
  it("a drawn place: a term that began before the opening reads one series across it", () => {
    const world = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: DRAWN.key,
    });
    advanceCore(world.core, "2025-03-05" as never);
    const api = coreAPI(world.core);
    const where = `${world.place.displayName} (seed ${SEED})`;
    const key = placeStateKey(world.placeId)!;
    const fips = countryStates(api).find((row) => row.key === key)!.fips;
    const macro = api
      .moduleState("macro")
      .table("state")
      .get("macro:state") as unknown as { openingMonth: string };
    const opening = macro.openingMonth;
    const before = "2024-11";
    const was = countryStateMonth(api, fips, before);
    const at = countryStateMonth(api, fips, opening);
    expect(was, `${where}: ${before} kept`).toBeTruthy();
    expect(at, `${where}: ${opening} kept`).toBeTruthy();
    // The history moves as the real months do: the month before the opening
    // stands to the opening as the regions' own figures do, to the last digit.
    const months = api.moduleState("macro").table("months");
    const regions = (month: string) =>
      stateOfRegions(
        openingRegionMonths(
          months.get(`macro-month:${month}`) as never,
          api.state.startedAt,
          api.state.seed,
          (k: string) => api.parameter(k),
        ),
        fips,
      );
    const raw = regions(before);
    const rawOpening = regions(opening);
    expect(was!.unemploymentPct / at!.unemploymentPct, where).toBeCloseTo(
      raw.unemploymentPct / rawOpening.unemploymentPct,
      9,
    );
    expect(was!.jobs / at!.jobs, where).toBeCloseTo(
      raw.jobsThousands / rawOpening.jobsThousands,
      9,
    );
    expect(was!.priceLevelPct / at!.priceLevelPct, where).toBeCloseTo(
      raw.priceLevelPct / rawOpening.priceLevelPct,
      9,
    );
    // A term that began in March 2024 reads from the first kept month at or
    // after it and names the tier's rows.
    const reads = jurisdictionTermRead(api, key, "2024-03-01");
    for (const area of ["jobs", "prices", "pay"]) {
      const read = reads.find((row) => row.area === area);
      expect(read, `${where}: ${area}`).toBeDefined();
      for (const id of read!.sourceRecordIds)
        expect(
          id.startsWith(`country-state-month:${fips}:`),
          `${where}: ${id}`,
        ).toBe(true);
    }
  }, 300_000);
});
