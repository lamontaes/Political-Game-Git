import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { advanceWorld } from "../../src/simulation/world";
import { productionRouteAdapter } from "./production-route";
const registry = createCampaignElectionTransitionRegistry();
export default productionRouteAdapter(
  {
    ref: "working-tree/shared-production-dependencies",
    route: "current-advanceWorld/full-campaign-registry",
    artifactSha256: createHash("sha256")
      .update(
        readFileSync(new URL("../../src/simulation/world.ts", import.meta.url)),
      )
      .digest("hex"),
  },
  (world, step) => {
    if (step.unit !== "days")
      throw new Error("Date candidate accepts day steps only");
    return advanceWorld(world, step.amount, registry);
  },
);
