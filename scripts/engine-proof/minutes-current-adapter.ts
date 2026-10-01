import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { advanceWorldMinutes } from "../../src/simulation/time-work";
import { createNationalElectionTransitionRegistry } from "../../src/simulation/national-election-consumer";
import { openNationalCountFixture } from "./clock-fixtures";
import { watchedIdentity } from "./places";
import type { RouteAdapter } from "./parity";
const registry = createNationalElectionTransitionRegistry();
const adapter: RouteAdapter = {
  producer: {
    ref: "working-tree/current-canonical-minute-route",
    route: "canonical-minute-route/national-count-fixture",
    artifactSha256: createHash("sha256")
      .update(
        readFileSync(
          new URL("../../src/simulation/time-work.ts", import.meta.url),
        ),
      )
      .digest("hex"),
  },
  open: openNationalCountFixture,
  advance(world, step) {
    if (step.unit !== "minutes")
      throw new Error("Minute adapter requires minutes");
    return advanceWorldMinutes(world, step.amount, registry);
  },
  describe(world, input) {
    return watchedIdentity(world, world.personOrder[0]!, input.placeKey);
  },
};
export default adapter;
