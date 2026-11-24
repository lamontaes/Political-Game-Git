import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { OUTCOME_WEB_MODULE } from "./modules/outcome-web";
import { regionalMonth } from "./modules/regional";
import { townMetrics } from "./modules/world-metrics";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

// Pinned places and seeds (skill pinned-tests). The jobless the opening draws are drawn against every working adult in the town's households, away workers included; the Metrics tab's rate must stand on the same labor force. Before, it left the out-of-town workers out and read about one and a half times the world's own rate (Tanapag 13.9% against 9.8%, Maloata 14.0% against 10.9%, Staples 4.4% against 3.3%).
const PLACES: readonly [string, string][] = [
  ["9e95b68a47a0d28082fc4d0185f47064", "outcome-web-unemployment"], // Tanapag, Northern Mariana Islands
  ["probe-a", "exit-a"], // Staples, Connecticut
  ["probe-b", "exit-b"], // Maloata, American Samoa
];

describe("the Metrics tab's unemployment rate stands on the world's own labor force", () => {
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
      advanceCore(core, "2025-01-21");
      const latest = (
        api.moduleState("macro").table("state").get("macro:state") as
          { latestMonth: string } | undefined
      )?.latestMonth;
      const region = regionalMonth(api, town, latest!)?.unemploymentPct;
      const row = townMetrics(api).find((r) => r.placeId === town)!;
      const tab = row.unemploymentRate * 100;
      expect(region, `${place.name} has a regional rate`).toBeGreaterThan(0);
      // A small town's count moves by a person; the tab's rate reads within a fifth either way of the rate the opening drew against.
      expect(
        tab / region!,
        `${place.name} ${place.state}, seed ${seed}: the tab reads ${tab.toFixed(1)}% (${row.unemployed} out, ${row.residentsEmployed} in work) against the region's ${region!.toFixed(1)}%`,
      ).toBeGreaterThanOrEqual(0.75);
      expect(tab / region!).toBeLessThanOrEqual(1.2);
    }, 120_000);
  }
});
