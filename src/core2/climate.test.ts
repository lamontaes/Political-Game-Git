import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  climateNow,
  HAZARDS,
  hazardFactor,
  warmingNow,
} from "./modules/climate";
import { enactLaw, stateLawInForce } from "./modules/laws";
import { STATES } from "./modules/outside-budgets";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const CARBON_PRICE = "us-policy-positions:environment-energy.price-carbon";
const POWER_PLANTS =
  "us-federal-positions:energy-environment.limit-power-plant-carbon";

function world(label: string) {
  const place = drawPlace(`${seed}:climate`, "core2-climate");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state}`,
    label,
  };
}

describe(`the climate through the effect map (seed ${seed})`, () => {
  it("moves the warming and every hazard's level only with the carbon laws in force", () => {
    const base = world("baseline");
    const repeal = world("power-plant rule flipped");
    const price = world("carbon price everywhere");
    const opened = base.core.date;
    // Day one: the same laws, the same warming of nothing.
    for (const w of [base, repeal, price])
      expect(climateNow(w.api)?.warmingC ?? 0).toBe(0);
    // Twin A flips the federal power-plant rule from what it opens on; twin B puts a
    // carbon price in every state that opens without one. Both take effect the next day.
    const effective = addDays(makeIsoDate(opened), 2);
    const plantsOpen =
      stateLawInForce(repeal.api, "US-OH", POWER_PLANTS).value ?? 0;
    enactLaw(repeal.api, {
      jurisdiction: "US",
      level: "federal",
      series: POWER_PLANTS,
      value: plantsOpen ? 0 : 1,
      effectiveDate: effective,
      measureId: "climate-test-power-plants",
      citation: "Twin world for the climate test",
    });
    let priced = 0;
    for (const key of Object.keys(STATES)) {
      if ((stateLawInForce(price.api, key, CARBON_PRICE).value ?? 0) !== 0)
        continue;
      priced += 1;
      enactLaw(price.api, {
        jurisdiction: key,
        level: "state",
        series: CARBON_PRICE,
        value: 1,
        effectiveDate: effective,
        measureId: "climate-test-carbon-price",
        citation: "Twin world for the climate test",
      });
    }
    // Past the power-plant link's 24 months of lag, and two months.
    const until = addDays(makeIsoDate(opened), 365 * 2 + 60);
    for (const w of [base, repeal, price]) advanceCore(w.core, until);
    const b = climateNow(base.api)!,
      r = climateNow(repeal.api)!,
      p = climateNow(price.api)!;
    process.stdout.write(
      `climate twins: ${base.where} (seed ${seed}:climate); to ${until}; ${priced} states priced; carbon index baseline ${b.usIndex.toFixed(5)}, power-plant rule ${plantsOpen ? "repealed" : "enacted"} ${r.usIndex.toFixed(5)}, carbon price ${p.usIndex.toFixed(5)}; warming (deg C) ${b.warmingC.toExponential(4)} / ${r.warmingC.toExponential(4)} / ${p.warmingC.toExponential(4)}; flood level ${hazardFactor(base.api, "flood").toFixed(8)} / ${hazardFactor(repeal.api, "flood").toFixed(8)} / ${hazardFactor(price.api, "flood").toFixed(8)}; climate rows ${climateNow(base.api)!.id}\n`,
    );
    // The power-plant rule moves emissions the way its link says; the carbon price the other way.
    expect(Math.sign(r.usIndex - b.usIndex)).toBe(plantsOpen ? 1 : -1);
    if (priced > 0) expect(p.usIndex).toBeLessThan(b.usIndex);
    // Warming follows the emissions, and every hazard follows the warming, in the same direction.
    expect(Math.sign(r.warmingC - b.warmingC)).toBe(plantsOpen ? 1 : -1);
    if (priced > 0) expect(p.warmingC).toBeLessThan(b.warmingC);
    for (const hazard of HAZARDS) {
      expect(
        Math.sign(
          hazardFactor(repeal.api, hazard) - hazardFactor(base.api, hazard),
        ),
        hazard,
      ).toBe(plantsOpen ? 1 : -1);
      if (priced > 0)
        expect(hazardFactor(price.api, hazard), hazard).toBeLessThan(
          hazardFactor(base.api, hazard),
        );
    }
    // The climate warms in every world: the world's CO2 keeps adding to it.
    expect(warmingNow(base.api)).toBeGreaterThan(0);
  }, 3_000_000);
});
