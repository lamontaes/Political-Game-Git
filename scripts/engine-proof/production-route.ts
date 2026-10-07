import {
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { shellReadOnly } from "../../src/presentation/life-continuation-shell";
import { watchedIdentity } from "./places";
import type { Producer, RouteAdapter, Step } from "./parity";
import type { World } from "../../src/simulation/types";

/** Production world opening only. Caller injects its actual pinned clock route
 * and due-handler registry; this module does not choose a default composition. */
export function productionRouteAdapter(
  producer: Producer,
  advance: (world: World, step: Step) => World | Promise<World>,
): RouteAdapter {
  let anchorPersonId: string | null = null;
  return {
    producer,
    open(input) {
      const watched = openObserverWorld(
        observerSetup(input.seed, input.placeKey),
      );
      if (!shellReadOnly(watched.world))
        throw new Error("Production proof requires an unplayed watched world");
      anchorPersonId = watched.anchorPersonId;
      return structuredClone(watched.world);
    },
    advance,
    describe(world, input) {
      if (!anchorPersonId) throw new Error("Production world not opened");
      return watchedIdentity(world, anchorPersonId, input.placeKey);
    },
  };
}
