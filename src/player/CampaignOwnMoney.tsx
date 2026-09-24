import { useMemo, useState } from "react";

import { displayMoney } from "../presentation/money-display";
import {
  activeCampaignForCandidate,
  type EntityId,
  type World,
} from "../simulation";
import {
  candidatePersonalBalance,
  contributeOwnMoneyToCampaign,
} from "../simulation/campaign-money-sources";

/** PLACEHOLDER amounts offered, in cents, until real giving patterns land. */
const OFFERED_AMOUNTS = [50_000, 100_000, 500_000] as const;

/**
 * The candidate puts their own money into the campaign. The committee
 * receives it the same day and the contribution is on the public record.
 * Offering it spends no time; only choosing an amount moves money.
 */
export function CampaignOwnMoney({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const campaign = useMemo(
    () => activeCampaignForCandidate(world, personId),
    [world, personId],
  );
  if (!campaign) return null;
  const currency = campaign.treasuryCurrency;
  const balance = candidatePersonalBalance(world, personId);
  const show = (minorUnits: number) => displayMoney({ minorUnits, currency });
  if (balance === null) {
    return (
      <p className="game-note" data-testid="campaign-own-money">
        The game is not tracking your own money yet, so you cannot put any into
        the campaign.
      </p>
    );
  }
  return (
    <section
      className="game-campaign-own-money"
      data-testid="campaign-own-money"
      aria-label="Your own money"
    >
      <p>
        You have {show(Math.max(0, balance))} of your own. You can put some of
        it into the campaign.
      </p>
      <div>
        {OFFERED_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            data-testid="campaign-own-money-give"
            disabled={balance < amount}
            onClick={() => {
              try {
                onWorldChange(
                  contributeOwnMoneyToCampaign(world, personId, amount),
                );
                setProblem(null);
              } catch (error) {
                setProblem(
                  error instanceof Error ? error.message : String(error),
                );
              }
            }}
          >
            Put in {show(amount)}
          </button>
        ))}
      </div>
      {problem ? <p className="game-note">{problem}</p> : null}
    </section>
  );
}
