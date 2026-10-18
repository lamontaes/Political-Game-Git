/**
 * A local news outlet opens with the cash a small firm holds against its
 * payroll, so its second payday does not fall before its first month's
 * revenue; a national outlet's money stays outside the town. A random place
 * from all 56 whose town has local outlets.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { openingEmployerCashBufferPrior } from "./opening-capital";
import { outletsHere, pressParameter } from "./modules/press";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("opens each local outlet with its buffer days of payroll in cash", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 10; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-opening-cash");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const local = outletsHere(api).filter((o) => o.tier === "local");
    if (!local.length) continue;
    const where = `${place.name}, seed ${seed}:${draw}`;
    for (const outlet of local) {
      const payroll =
        pressParameter("editorAnnualPayMinor") +
        outlet.reporterIds.length * pressParameter("reporterAnnualPayMinor");
      const days = openingEmployerCashBufferPrior(
        core.seed,
        outlet.organizationId,
        "all-small-businesses",
      ).bufferDays;
      const held = api
        .accounts()
        .balance(`cash:${outlet.organizationId}:residual`);
      expect(held, `${where}, ${outlet.id}`).toBeGreaterThan(0);
      expect(held, `${where}, ${outlet.id}`).toBe(
        Math.round((days * payroll) / pressParameter("daysPerYear")),
      );
    }
    for (const outlet of outletsHere(api).filter((o) => o.tier === "national"))
      expect(
        api.accounts().balance(`cash:${outlet.organizationId}:residual`),
        where,
      ).toBe(0);
    return;
  }
  throw new Error(`No town with local outlets: ${tried.join("; ")}`);
}, 3_600_000);
