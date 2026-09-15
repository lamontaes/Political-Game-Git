import { composeFutureTransitionHandlerRegistries } from "../simulation/future-transitions";
import {
  createCampaignElectionTransitionRegistry,
  type FutureTransitionHandlerRegistry,
  type World,
} from "../simulation";

/** The caller may supply the existing ordinary-day clock with its registry.
 * This seam does not create or bypass the clock's routine and interruption loop. */
export type OrdinaryLifeDayAdvance = (world: World, days: number) => World;

/** Caller additions travel with ordinary pay/study/callback handlers. Lazy,
 * existing registry composition; no clock or scheduling authority of its own. */
export function lifeActivityHandlers(
  additional?: FutureTransitionHandlerRegistry,
) {
  const ordinary = createCampaignElectionTransitionRegistry();
  return additional
    ? composeFutureTransitionHandlerRegistries(additional, ordinary)
    : ordinary;
}
