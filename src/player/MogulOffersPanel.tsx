import { useMemo, useState } from "react";

import "./campaign-workspace.css";
import {
  answerOffer,
  deliverOfferStance,
  projectMogulOffers,
} from "../presentation/mogul-offers-view";
import type { EntityId, World } from "../simulation";
import { readableCampaignDate } from "./CampaignWorkspace";

/**
 * Money offered to the campaign by people who want something from
 * government. Answering takes no time; what the money was for is between the
 * two of you until somebody says otherwise.
 */
export function MogulOffersPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const offers = useMemo(
    () => projectMogulOffers(world, personId),
    [world, personId],
  );
  const [problem, setProblem] = useState<string | null>(null);
  if (offers.length === 0) return null;
  function act(change: () => World) {
    try {
      setProblem(null);
      onWorldChange(change());
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <section
      className="game-campaign-offers"
      data-testid="mogul-offers"
      aria-labelledby="mogul-offers-title"
    >
      <h3 id="mogul-offers-title">Offers of money</h3>
      <ul>
        {offers.map((offer) => (
          <li key={offer.offerEventId} data-testid="mogul-offer">
            <p>
              <strong>{offer.offer}</strong> {offer.ask}
            </p>
            <p className="game-note">
              Offered {readableCampaignDate(offer.offeredOn)}
              {offer.canAnswer
                ? `; it stands until ${readableCampaignDate(offer.standsUntil)}.`
                : "."}
            </p>
            {offer.outcome ? <p>{offer.outcome}</p> : null}
            {offer.canAnswer ? (
              <div className="game-campaign-offer-actions">
                <button
                  type="button"
                  data-testid="mogul-offer-accept"
                  onClick={() =>
                    act(() => answerOffer(world, offer.offerEventId, "accept"))
                  }
                >
                  Take the money
                </button>
                <button
                  type="button"
                  data-testid="mogul-offer-decline"
                  onClick={() =>
                    act(() => answerOffer(world, offer.offerEventId, "decline"))
                  }
                >
                  Turn it down
                </button>
              </div>
            ) : null}
            {offer.canDeliver && offer.deliverLabel ? (
              <button
                type="button"
                data-testid="mogul-offer-deliver"
                onClick={() =>
                  act(() => deliverOfferStance(world, offer.offerEventId))
                }
              >
                {offer.deliverLabel}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {problem ? (
        <p className="game-problem" data-testid="mogul-offers-problem">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
