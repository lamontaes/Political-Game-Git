import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { createRenewalCore } from "./births-setup";
import { advanceCore } from "./life";
import { HEALTH_MODULE, healthReport } from "./modules/health";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

// SG-P10-health-minimal-port, arrivals: a baby born in play gets their own
// resilience line and course from the day they arrive, as everyone at the
// opening did, so a life begun in the game can fall ill too.
const drawn = drawPlace("health-arrivals", "arrivals");
const input = generatedOpening(
  { seed: drawn.seed, key: drawn.key },
  { economy: false, settings: { population: 700 } },
);
const core = createRenewalCore(input, { modules: [HEALTH_MODULE] });
advanceCore(core, "2021-11-01");
const births = coreAPI(core)
  .moduleState(RENEWAL_MODULE_ID)
  .table("births")
  .rows() as unknown as { childId: string }[];

describe(`health for those born in play in ${drawn.name} (seed ${drawn.seed.slice(0, 12)})`, () => {
  it("gives every baby born in play a resilience line of their own", () => {
    expect(births.length).toBeGreaterThan(0);
    const report = healthReport(core);
    for (const { childId } of births)
      expect(report.resilienceLines.has(childId), childId).toBe(true);
  });
});
