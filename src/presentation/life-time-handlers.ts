import { composeWorldTimeHandlers } from "../simulation/campaigns";
import type { FutureTransitionHandlerRegistry, World } from "../simulation";

export type OrdinaryLifeDayAdvance = (world: World, days: number) => World;

/** Preserve caller policies while carrying every ordinary due handler. */
export function lifeActivityHandlers(
  additional?: FutureTransitionHandlerRegistry,
) {
  return composeWorldTimeHandlers(additional);
}
