import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { OUTCOME_WEB_MODULE } from "./modules/outcome-web";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreAPI } from "./types";

// Pinned places and seeds (skill pinned-tests): a town that opens at its place's rate keeps near it where nothing has changed. The base layoff rate is the nation's, so a place opening well above the nation's rate used to lose its jobless stock to the nation's flows within months (Tanapag 57 to 6 to 18, Maloata 56 to 5 or 6, in a town of 1,500 with no layoffs).
const PLACES: readonly [string, string][] = [
  ["9e95b68a47a0d28082fc4d0185f47064", "outcome-web-unemployment"], // Tanapag, Northern Mariana Islands
  ["probe-a", "exit-a"], // Staples, Connecticut
  ["probe-b", "exit-b"], // Maloata, American Samoa
];

/** The people of one place out of work and looking, named and counted. */
const jobless = (api: CoreAPI, placeId: string): number => {
  let n = 0;
  for (const table of ["seekers", "countedSeekers"])
    for (const row of api
      .moduleState("jobs" as never)
      .table(table as never)
      .rows() as unknown as { placeId: string; employed?: boolean }[])
      if (!row.employed && row.placeId === placeId) n++;
  return n;
};

describe("a town's jobless count holds near its opening rate where nothing has changed", () => {
  for (const [seed, label] of PLACES) {
    it(`${label}`, () => {
      const place = drawPlace(seed, label);
      const core = createLifeCore(
        withWorldEconomy(
          generatedOpening(place, {
            twoLevel: true,
            settings: { population: 1500 },
          }),
        ),
        {
          data: worldCoreData(),
          modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE],
        },
      );
      const api = coreAPI(core);
      const town = core.people.get(core.playerId!)!.placeId;
      const year = core.date.slice(0, 4);
      // The jobless are seated at the first review, in the opening month.
      advanceCore(core, `${year}-02-01`);
      const opening = jobless(api, town);
      expect(
        opening,
        `${place.name} opens with people out of work`,
      ).toBeGreaterThan(10);
      const series: number[] = [];
      for (const month of ["05", "07", "09", "11"]) {
        advanceCore(core, `${year}-${month}-01`);
        series.push(jobless(api, town));
      }
      // Months five to eleven against the opening: at least half (a town that loses more than half of its jobless is drained), at most twice; not drained (the nation's flows alone took Maloata to a tenth and Tanapag to a fifth) and not run away.
      for (const [i, stock] of series.entries()) {
        expect(
          stock,
          `${place.name} ${place.state}, seed ${seed}: out of work in month ${[5, 7, 9, 11][i]} against ${opening} at the opening (${series.join(", ")})`,
        ).toBeGreaterThanOrEqual(opening * 0.5);
        expect(stock).toBeLessThanOrEqual(opening * 2);
      }
    }, 120_000);
  }
});
