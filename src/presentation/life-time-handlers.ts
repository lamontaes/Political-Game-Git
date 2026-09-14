import {
  composeFutureTransitionHandlerRegistries,
  createCampaignElectionTransitionRegistry,
  type FutureTransitionHandlerRegistry,
} from "../simulation";

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
