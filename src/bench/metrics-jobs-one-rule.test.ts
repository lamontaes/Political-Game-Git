/**
 * One counting rule for the town's labor market (pool item
 * metrics-town-jobs-one-rule): residents at work, residents out of work and
 * looking, and the rate between them come from one pass (`townLaborByPlace`),
 * so the month row, the rate, the Metrics tab and the bench's economy panel
 * never disagree. Before, the tab's "looking for work" counted people who
 * already hold a job and are job-hunting, while the rate counted only the
 * jobless (Washington, Kansas, July 21, 2025: 53 looking against 28 jobless;
 * Saugatuck, Connecticut: 131 against 59).
 * Pinned places and seeds. The time is the game's own played days, not the
 * test's work: each place plays 182 days (January 20 to July 21, 2025), and a
 * played town costs about half a second a day on this machine (a played year of
 * a town is 75 to 200 seconds). Measured: Washington, Kansas 95 seconds,
 * Everett, Georgia 46; the limit is about twice the slower.
 */
import { describe, expect, it } from "vitest";
import { metricsView } from "./metrics";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { townMetrics } from "../core2/modules/world-metrics";
import { townJobsPanel } from "../core2/modules/world-panels";
import { coreAPI } from "../core2/state";

const PLACES: readonly [string, string][] = [
  ["599e6f66e9c1d25a", "Washington, Kansas"],
  ["7a5e19c2b3d84f60", "Everett, Georgia"],
];

describe("the town's jobless are counted once", () => {
  for (const [seed, name] of PLACES)
    it(`${name} (seed ${seed}): month row, rate, panel and Metrics agree on day one and in July`, () => {
      const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
      const api = coreAPI(world.core);
      const where = `${world.place.displayName} (seed ${seed})`;
      expect(world.place.displayName).toBe(name);
      for (const day of ["2025-01-21", "2025-07-21"]) {
        advanceCore(world.core, day as never);
        const row = townMetrics(api).find((r) => r.placeId === world.placeId)!;
        const panel = townJobsPanel(api, world.placeId);
        const here = `${where} on ${day}`;
        expect(panel.employed, here).toBe(row.residentsEmployed);
        expect(panel.seekers, here).toBe(row.unemployed);
        expect(row.unemploymentRate, here).toBeCloseTo(
          row.unemployed / (row.residentsEmployed + row.unemployed),
          10,
        );
        // Metrics reads the town's latest kept month, which is that same count taken on its day.
        const kept = [
          ...api.moduleState("world-metrics").table("months").rows(),
        ]
          .filter(
            (m) =>
              (m as unknown as { placeId?: string }).placeId === world.placeId,
          )
          .sort((x, y) =>
            String((x as { date?: string }).date) <
            String((y as { date?: string }).date)
              ? -1
              : 1,
          )
          .at(-1) as Record<string, number>;
        expect(kept.residentsLooking, here).toBe(kept.unemployed);
        expect(kept.residentsAtWork, here).toBe(kept.residentsEmployed);
        expect(kept.laborForce, here).toBe(
          kept.residentsEmployed + kept.unemployed,
        );
        const view = metricsView(world.core, world.placeId);
        const city = view.sections.find((s) => s.key === "city")!.rows;
        const looking = city.find((r) => r.key === "seekers") as
          { now: number; of?: number } | undefined;
        expect(looking?.now, here).toBe(kept.residentsLooking);
        expect(looking?.of, here).toBe(kept.laborForce);
        expect(city.find((r) => r.key === "employed")?.now, here).toBe(
          kept.residentsAtWork,
        );
      }
    }, 190_000);
});
