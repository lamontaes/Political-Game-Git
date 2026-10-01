import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { baselineAdvanceWorld } from "./baseline-date-route";
import { productionRouteAdapter } from "./production-route";
const registry = createCampaignElectionTransitionRegistry();
export default productionRouteAdapter(
  {
    ref: "ab4ac1b8839456a8d662b0e3c2da84288798bb47+shared-working-dependencies",
    route: "frozen-original-date-chain/full-campaign-registry",
    artifactSha256: createHash("sha256")
      .update(
        readFileSync(new URL("./baseline-date-route.ts", import.meta.url)),
      )
      .digest("hex"),
  },
  (world, step) => {
    if (step.unit !== "days")
      throw new Error("Date baseline accepts day steps only");
    return baselineAdvanceWorld(world, step.amount, registry);
  },
);
