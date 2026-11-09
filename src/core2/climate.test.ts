import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { buildPopulation } from "./population";
import { climateNow, HAZARDS, type ClimateMonth } from "./modules/climate";
import { openClimate } from "./modules/climate";
import { enactLaw, openLaws, stateLawInForce } from "./modules/laws";
import { STATES } from "./state-bases";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const CARBON_PRICE = "us-policy-positions:environment-energy.price-carbon";
const POWER_PLANTS =
  "us-federal-positions:energy-environment.limit-power-plant-carbon";
// The climate reads the laws in force in every state and nothing of the town's people, so
// the twins are a small life core with the laws and the climate; they differ only in the
// laws enacted on day one.
const SMALL_TOWN = 30;

type Twin = "baseline" | "power-plant rule flipped" | "carbon price everywhere";

/** One world to the end of the run, keeping only its climate month and what was enacted. */
function runTwin(twin: Twin, place: ReturnType<typeof drawPlace>) {
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: gameStartDate(),
      minimumPeople: SMALL_TOWN,
    }),
  );
  openLaws(core);
  openClimate(core);
  const api = coreAPI(core);
  const opened = core.date;
  expect(climateNow(api)?.warmingC ?? 0, twin).toBe(0);
  const effective = addDays(makeIsoDate(opened), 2);
  let plantsOpen = 0;
  let priced = 0;
  if (twin === "power-plant rule flipped") {
    plantsOpen = stateLawInForce(api, "US-OH", POWER_PLANTS).value ?? 0;
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: POWER_PLANTS,
      value: plantsOpen ? 0 : 1,
      effectiveDate: effective,
      measureId: "climate-test-power-plants",
      citation: "Twin world for the climate test",
    });
  }
  if (twin === "carbon price everywhere")
    for (const key of Object.keys(STATES)) {
      if ((stateLawInForce(api, key, CARBON_PRICE).value ?? 0) !== 0) continue;
      priced += 1;
      enactLaw(api, {
        jurisdiction: key,
        level: "state",
        series: CARBON_PRICE,
        value: 1,
        effectiveDate: effective,
        measureId: "climate-test-carbon-price",
        citation: "Twin world for the climate test",
      });
    }
  // Past the power-plant link's 24 months of lag, and two months more.
  const until = addDays(makeIsoDate(opened), 365 * 2 + 60);
  advanceCore(core, until);
  return {
    row: { ...climateNow(api)! } as ClimateMonth,
    plantsOpen,
    priced,
    until,
  };
}

describe(`the climate through the effect map (seed ${seed})`, () => {
  it("moves the warming and every hazard's level only with the carbon laws in force", () => {
    const started = Date.now();
    const place = drawPlace(`${seed}:climate`, "core2-climate");
    const where = `${place.name}, ${place.state}`;
    // One world at a time, so only one is in memory.
    const base = runTwin("baseline", place);
    const repeal = runTwin("power-plant rule flipped", place);
    const price = runTwin("carbon price everywhere", place);
    const [b, r, p] = [base.row, repeal.row, price.row];
    const direction = repeal.plantsOpen ? 1 : -1;
    process.stdout.write(
      `climate twins: ${where} (seed ${seed}:climate); population ${SMALL_TOWN}; to ${base.until}; ${price.priced} states priced; carbon index baseline ${b.usIndex.toFixed(5)}, power-plant rule ${repeal.plantsOpen ? "repealed" : "enacted"} ${r.usIndex.toFixed(5)}, carbon price ${p.usIndex.toFixed(5)}; warming (deg C) ${b.warmingC.toExponential(6)} / ${r.warmingC.toExponential(6)} / ${p.warmingC.toExponential(6)}; flood level ${b.hazard.flood.toFixed(9)} / ${r.hazard.flood.toFixed(9)} / ${p.hazard.flood.toFixed(9)}; records ${b.id}; ${Math.round((Date.now() - started) / 1000)} s, rss ${Math.round(process.memoryUsage().rss / 1e6)} MB\n`,
    );
    // The power-plant rule moves emissions the way its link says; the carbon price the other way.
    expect(Math.sign(r.usIndex - b.usIndex)).toBe(direction);
    expect(Math.sign(r.warmingC - b.warmingC)).toBe(direction);
    for (const hazard of HAZARDS)
      expect(Math.sign(r.hazard[hazard] - b.hazard[hazard]), hazard).toBe(
        direction,
      );
    if (price.priced > 0) {
      expect(p.usIndex).toBeLessThan(b.usIndex);
      expect(p.warmingC).toBeLessThan(b.warmingC);
      for (const hazard of HAZARDS)
        expect(p.hazard[hazard], hazard).toBeLessThan(b.hazard[hazard]);
    }
    // The climate warms in every world: the world's CO2 keeps adding to it.
    expect(b.warmingC).toBeGreaterThan(0);
  }, 1_800_000);
});
