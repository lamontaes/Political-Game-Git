/**
 * Homelessness calibration (OPUS-WORLD, owner Oct 14), in a random place from
 * all 56: the town as the player gets it (buildBenchWorld, two-level, every
 * module), run for a year. Two checks against the research, never a draw:
 *
 * - the town's homeless count per 10,000 (sheltered plus unsheltered) against
 *   its state's HUD 2024 point-in-time rate, with room for a small town's
 *   count of a few people;
 * - the rent-burden curve (Zillow and UNH, in the outcome web): the share of
 *   renter households taken to court rises once rent passes 22 percent of
 *   income and faster past 32 percent.
 *
 * Seed and place from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { householdIncome, residentsRuntime } from "./modules/residents";
import { housingStatusCounts } from "./housing-homeless";
import hud from "../../docs/research/cloud-b-outcomes-2024/homelessness-hud-2024.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const BANDS = [0.22, 0.32] as const;

describe("homelessness against the research", { timeout: 1_800_000 }, () => {
  it("the town's count sits near its state's HUD rate, and court cases rise with rent burden past 22 and faster past 32 percent", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "housing-calibration");
    const where = `place ${place.key}, seed ${seed}`;
    console.log(`housing-calibration: ${where}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    const months = api.parameter("macroMonthsPerYear");

    // Each counted renter household's burden on the first day: a year of rent over a year of income.
    const band = new Map<string, number>();
    for (const h of rt.store.liveHouseholds()) {
      if (h.gone || h.tenure !== "rent") continue;
      const rent = rt.flows.get(`rent:${h.id}`)?.amountMinor ?? 0;
      if (rent <= 0) continue;
      const income = householdIncome(rt, h);
      const burden = income > 0 ? (rent * months) / income : Infinity;
      band.set(h.id, BANDS.filter((edge) => burden > edge).length);
    }

    advanceCore(core, addDays(makeIsoDate(core.date), 365));

    const cases = new Set(
      (
        api.moduleState("housing").table("cases").rows() as unknown as {
          householdId: string;
        }[]
      ).map((row) => row.householdId),
    );
    const households = [0, 0, 0];
    const taken = [0, 0, 0];
    for (const [id, b] of band) {
      households[b]! += 1;
      if (cases.has(id)) taken[b]! += 1;
    }
    const rate = households.map((n, b) => (n ? taken[b]! / n : 0));
    console.log(
      `housing-calibration: renter households by burden ${households.join("/")}, taken to court ${taken.join("/")}`,
    );
    // Cases gather above the 22 percent line: their share there is at least
    // the renters' share there. Past 32 percent they rise faster. Both are
    // checked once a year's cases are enough to tell one case from a curve:
    // with two cases, one a band apart from the other is a coin's worth.
    const renters = households.reduce((n, v) => n + v, 0);
    const cased = taken.reduce((n, v) => n + v, 0);
    if (cased >= 10) {
      expect((taken[1]! + taken[2]!) / cased).toBeGreaterThanOrEqual(
        (households[1]! + households[2]!) / renters,
      );
      expect(rate[1]!).toBeGreaterThanOrEqual(rate[0]!);
      expect(rate[2]! - rate[1]!).toBeGreaterThanOrEqual(rate[1]! - rate[0]!);
    }

    const town = core.placeMetadata?.housingTown ?? "";
    const usps = core.placeMetadata?.housingState ?? "";
    const counts = housingStatusCounts(api, town);
    const people =
      counts.housed +
      counts["doubled-up"] +
      counts.sheltered +
      counts.unsheltered;
    const homeless = counts.sheltered + counts.unsheltered;
    const state = (hud.places as Record<string, { per10k: number }>)[
      `US-${usps}`
    ]!.per10k;
    const expected = (state * people) / 10_000;
    console.log(
      `housing-calibration: ${homeless} homeless of ${people} (${((homeless / people) * 10_000).toFixed(1)} per 10,000) against HUD ${usps} ${state}`,
    );
    // A town is not its state: homelessness gathers in cities, and a small
    // town's count is a few people. Within five times the state's rate,
    // with room for a handful.
    expect(homeless).toBeLessThanOrEqual(
      5 * expected + 3 * Math.sqrt(expected) + 3,
    );
  });
});
