/**
 * A counted household opens with the Survey of Consumer Finances' median for
 * a family like it, spread by its own savings draw (`householdBalanceDraw`),
 * so the median household of the town holds its median. Before, each group's
 * account opened at its households' medians and was then shared by savings
 * weights with a mean of one, which put the median household at
 * exp(−σ²/2) = 0.38 of its median, and at Staples 0.56 counting its bank
 * savings. Pinned at Staples, Connecticut (`drawPlace("probe-a", "exit-a")`,
 * the opening jobless stock test's town) in a town of 1,500, on day 1.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { countedDeposits } from "./counted-money";
import { householdBalanceDraw } from "./household-balance-draw";
import { advanceCore, createLifeCore } from "./life";
import { householdCashReader, residentsRuntime } from "./modules/residents";
import { OUTCOME_WEB_MODULE } from "./modules/outcome-web";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

it("the median counted household holds about its survey median on day 1 (Staples, Connecticut)", () => {
  const place = drawPlace("probe-a", "exit-a");
  const where = `${place.name} ${place.state}, seed probe-a, label exit-a`;
  const core = createLifeCore(
    withWorldEconomy(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    ),
    { data: worldCoreData(), modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE] },
  );
  const api = coreAPI(core);
  const town = core.people.get(core.playerId!)!.placeId;
  advanceCore(core, `${core.date.slice(0, 4)}-01-21`);
  const rt = residentsRuntime(core)!;
  const cashOf = householdCashReader(rt);
  const ratios: number[] = [];
  for (const h of rt.store.liveHouseholds()) {
    if (h.placeId !== town || h.group < 0) continue;
    // Its survey median: what it opened with, over its own draw.
    const median =
      rt.store.countedMembers(h).reduce((n, m) => n + rt.store.liquid[m]!, 0) /
      householdBalanceDraw(core.seed, h.id);
    if (median > 0)
      ratios.push((cashOf(h) + countedDeposits(api, rt, h)) / median);
  }
  ratios.sort((a, b) => a - b);
  const middle = ratios[Math.floor(ratios.length / 2)]!;
  process.stdout.write(
    `OPENING SAVINGS ${where}: ${ratios.length} counted households; cash and savings over the survey median: median ${middle.toFixed(3)}, quartiles ${ratios[Math.floor(ratios.length / 4)]!.toFixed(3)} and ${ratios[Math.floor((3 * ratios.length) / 4)]!.toFixed(3)}\n`,
  );
  expect(ratios.length, where).toBeGreaterThan(100);
  // The median household holds its median, give or take a group's mix of
  // medians and a day's pay and costs (1.10 here; 0.56 before).
  expect(middle, `${where}: the median household`).toBeGreaterThan(0.85);
  expect(middle, `${where}: the median household`).toBeLessThan(1.2);
}, 40_000);
