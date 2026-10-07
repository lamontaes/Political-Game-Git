import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { applyDateBoundary } from "../../src/simulation/time-work";
import { baselineAdvanceWorld } from "./baseline-date-route";
import { productionRouteAdapter } from "./production-route";
const registry = createCampaignElectionTransitionRegistry();
export default productionRouteAdapter(
  {
    ref: "working-tree/extracted-date-boundary+shared-production-dependencies",
    route: "frozen-wrapper/injected-applyDateBoundary/full-campaign-registry",
    artifactSha256: createHash("sha256")
      .update(
        readFileSync(
          new URL("../../src/simulation/time-work.ts", import.meta.url),
        ),
      )
      .digest("hex"),
  },
  (world, step) => {
    if (step.unit !== "days")
      throw new Error("Date candidate accepts day steps only");
    return baselineAdvanceWorld(
      world,
      step.amount,
      registry,
      applyDateBoundary,
    );
  },
);
