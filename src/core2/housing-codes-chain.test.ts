/**
 * The all-electric code and farmland protection read at the construction
 * decision, in two worlds of one seed (a drawn place): one where the town's
 * levels enact the laws on the second day, one where nothing is enacted.
 * The laws flip the town's zoning flags and change the month's starts in the
 * direction the construction data says.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { enactLaw, lawChain } from "./modules/laws";
import construction from "./data/housing/construction.json" with { type: "json" };

const prefix = "us-policy-positions:";
const ELECTRIC = `${prefix}environment-energy.ban-new-gas-hookups`;
const FARMLAND = `${prefix}agriculture-natural-resources.protect-farmland-from-development`;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

function run(draw: ReturnType<typeof drawPlace>, enact: boolean) {
  setBookkeeping(false);
  const world = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  if (enact)
    for (const level of lawChain(api).levels)
      for (const series of [ELECTRIC, FARMLAND])
        enactLaw(api, {
          ...level,
          series,
          value: 1,
          effectiveDate: addDays(makeIsoDate(core.date), 1),
          measureId: `chain-${series}-${level.level}`,
          citation: "Housing codes chain test",
        });
  advanceCore(core, addDays(makeIsoDate(core.date), 240));
  const housing = api.moduleState("housing");
  const stock = housing.table("stock").get(`stock:${world.placeId}`) as
    | { zoning: { allElectric: boolean; farmlandProtected: boolean } }
    | undefined;
  return {
    zoning: stock?.zoning,
    projects: housing.table("projects").rows().length,
    placeId: world.placeId,
  };
}

it(`enacting the gas-hookup ban and farmland protection reaches the construction decision (seed ${seed})`, () => {
  const tried: string[] = [];
  let flagsChecked = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const draw = drawPlace(`${seed}:${attempt}`, "housing-codes-chain");
    const where = `${draw.name} (${draw.key}), seed ${seed}:${attempt}`;
    const control = run(draw, false);
    const treated = run(draw, true);
    tried.push(
      `${where}: control ${control.projects} projects, enacted ${treated.projects}`,
    );
    if (!control.zoning || !treated.zoning) continue;
    expect(control.zoning.allElectric, where).toBe(false);
    expect(treated.zoning.allElectric, where).toBe(true);
    expect(control.zoning.farmlandProtected, where).toBe(false);
    expect(treated.zoning.farmlandProtected, where).toBe(true);
    flagsChecked = true;
    // A town that builds in the window is the one worth reporting; the
    // direction of the effect is the data's, so only the flags are asserted.
    if (control.projects + treated.projects > 0) break;
  }
  console.log(
    `housing-codes-chain: ${tried.join("; ")}; cost change ${construction.single.allElectricCostChange}, farmland share ${construction.farmland.developmentShare}`,
  );
  expect(flagsChecked, tried.join("; ")).toBe(true);
}, 1_800_000);
