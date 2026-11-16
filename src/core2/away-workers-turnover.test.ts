import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { AWAY_WORK_LOST } from "./modules/jobs";
import { townMetrics } from "./modules/world-metrics";
import { OUTCOME_WEB_MODULE } from "./modules/outcome-web";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

// Pinned places and seeds (skill pinned-tests). The workers who live in town and work out of town lose work by the rule everyone's work is (the state's layoff pace), so a year on the town has some of them out of work and looking, and the town's residents in work read lower than they would if only the town's own jobs ever ended.
const PLACES: readonly [string, string, number][] = [
  ["9e95b68a47a0d28082fc4d0185f47064", "outcome-web-unemployment", 7], // Tanapag, Northern Mariana Islands
  ["probe-a", "exit-a", 3], // Staples, Connecticut
  ["probe-b", "exit-b", 15], // Maloata, American Samoa
];

describe("workers who live in town and work out of town lose work by the layoff rule", () => {
  for (const [seed, label, least] of PLACES) {
    it(
      label,
      () => {
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
        const year = Number(core.date.slice(0, 4));
        advanceCore(core, `${year}-02-01`);
        const opening = townMetrics(api).find((row) => row.placeId === town)!;
        // A resident let go from an away job starts their search at the
        // opening's progress, so most are hired again within the year. The
        // count of those still looking is read in June, where the stock peaks
        // and where it is true that they show up looking (re-pinned Nov 14
        // from December, when the search began from nothing and Staples,
        // Maloata and Tanapag read 7, 27 and 19 in December; with the search
        // seeded they read 3, 16 and 18 in December and 6, 31 and 14 in June).
        // The floors are half the measured June counts: the count moves with
        // the opening's progress and the regional hiring around it, so a floor
        // at the measured figure would go red when either changes, while half
        // still fails the one defect this test guards (away workers never let
        // go, which reads 0).
        advanceCore(core, `${year}-06-01`);
        // Looking now, out of work because their household's away share lost work, since the opening month:
        // the counted people the away workers' share made jobless.
        const looking = (
          api
            .moduleState("jobs" as never)
            .table("countedSeekers" as never)
            .rows() as unknown as {
            placeId: string;
            reasons?: Record<string, number>;
            since: string;
            employed?: boolean;
          }[]
        ).filter(
          (row) =>
            row.placeId === town &&
            !row.employed &&
            row.reasons?.[AWAY_WORK_LOST] === 1 &&
            row.since > `${year}-02-01`,
        ).length;
        advanceCore(core, `${year}-12-01`);
        const later = townMetrics(api).find((row) => row.placeId === town)!;
        const where = `${place.name}, ${place.state}, seed ${seed}`;
        expect(
          looking,
          `${where}: away workers let go and still looking in June (jobless ${opening.unemployed} then, ${later.unemployed} now)`,
        ).toBeGreaterThanOrEqual(least);
        // Not drained and not run away: the jobless stay within half and twice
        // what the town opened with, and the labor force holds.
        expect(later.unemployed, `${where}: jobless`).toBeGreaterThanOrEqual(
          opening.unemployed * 0.5,
        );
        expect(later.unemployed).toBeLessThanOrEqual(opening.unemployed * 2);
        expect(
          later.unemployed + later.residentsEmployed,
          `${where}: labor force`,
        ).toBeGreaterThanOrEqual(
          (opening.unemployed + opening.residentsEmployed) * 0.8,
        );
      },
      120_000,
    );
  }
});
