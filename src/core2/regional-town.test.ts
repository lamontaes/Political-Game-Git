/** M1-03 in a generated world: a drawn town's pay follows its region. The place and seed are named in the test output. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import type { MacroMonth } from "./macro-model";
import { regionalFactors } from "./modules/regional";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { countedJobsOf } from "./residents-economy";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const input = process.env.GOLDEN_PATH_SEED ?? randomUUID();
const drawn = drawPlace(input, "M1-03-town");

describe(`a town follows its region (${drawn.name}, ${drawn.state}, GOLDEN_PATH_SEED=${input})`, () => {
  it("its pay index is the nation's moved by its region's, and a worker's yearly raise follows it", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    const api = coreAPI(core);
    advanceCore(core, opening.startedAt);
    const town = [...core.finance.businesses.keys()]
      .map((id) => core.organizations.get(id)!.placeId)
      .sort()
      .reduce(
        (best, id, _, all) =>
          all.filter((x) => x === id).length >
          all.filter((x) => x === best).length
            ? id
            : best,
        "",
      );
    const before = new Map<string, number>();
    for (const id of core.finance.businesses.keys())
      for (const job of countedJobsOf(core, id))
        if (job.hourlyMinor) before.set(job.id, job.hourlyMinor);
    const end = new Date(`${opening.startedAt}T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 13);
    advanceCore(core, end.toISOString().slice(0, 10));

    const macro = api.moduleState("macro");
    const state = macro.table("state").get("macro:state") as unknown as {
      openingMonth: string;
      latestMonth: string;
    };
    const month = (key: string) =>
      macro.table("months").get(`macro-month:${key}`) as unknown as MacroMonth;
    const first = month(state.openingMonth),
      latest = month(state.latestMonth);
    const condition = core.finance.conditionsByPlace.get(town)!.at(-1)!;
    const region = regionalFactors(api, town, first, latest);
    // The pay index: the nation's average hourly pay since the opening, times the region's against the nation's.
    expect(condition.wagePriceFactor).toBeCloseTo(
      (latest.hourlyEarnings / first.hourlyEarnings) * region.wage,
      6,
    );
    // Workers still in the same job got their yearly raise at that index (it moves a little month to month).
    const ratios: number[] = [];
    for (const id of core.finance.businesses.keys())
      for (const job of countedJobsOf(core, id)) {
        const was = before.get(job.id);
        if (was && job.hourlyMinor) ratios.push(job.hourlyMinor / was);
      }
    ratios.sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)]!;
    console.log(
      `${drawn.name}: region pay factor ${region.wage.toFixed(4)}, town pay index ${condition.wagePriceFactor.toFixed(4)}, median raise ${median.toFixed(4)} over ${ratios.length} kept jobs`,
    );
    expect(ratios.length).toBeGreaterThan(0);
    expect(Math.abs(median - condition.wagePriceFactor)).toBeLessThan(0.02);
  }, 600_000);
});
