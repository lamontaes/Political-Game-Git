import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import {
  acceptJobOffer,
  declineJobOffer,
  jobOffersFor,
  JOBS_MODULE_ID,
} from "../core2/modules/jobs";

/** Read-only offers for the controlled person; no simulated openings. */
export function jobsView(core: CoreState, personId: string) {
  if (!core.modules.has(JOBS_MODULE_ID)) return { offers: [] };
  return {
    offers: jobOffersFor(coreAPI(core), personId).map((offer) => ({
      id: offer.id,
      title: offer.title,
      employer: core.organizations.get(offer.organizationId)?.name ?? "",
      hourlyMinor: offer.hourlyMinor,
      offeredAt: offer.offeredAt,
      deadline: offer.deadline,
    })),
  };
}

/** Only an explicit answer to this player's pending offer reaches the engine. */
export function answerJobOffer(
  core: CoreState,
  personId: string,
  offerId: string,
  answer: string,
) {
  if (answer !== "accept" && answer !== "decline")
    throw new Error("Invalid offer answer.");
  if (!jobsView(core, personId).offers.some((offer) => offer.id === offerId))
    throw new Error("This offer is not pending for this person.");
  return {
    answered:
      answer === "accept"
        ? acceptJobOffer(coreAPI(core), offerId)
        : declineJobOffer(coreAPI(core), offerId),
  };
}
