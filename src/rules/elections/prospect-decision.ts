import type { IsoDate } from "./calendar";
import { makeIsoDate } from "./calendar";
import { seatTermWindow } from "./congress-term";
import type { CongressSeat } from "../../simulation/living-world/congress-seats";
import type { EntityId } from "../../simulation/types";
export function prospectDecision(
  facts: {
    readonly generatedShare: number | null | undefined;
    readonly slateKey: string;
    readonly lowOpportunityShare: number;
    readonly references: Parameters<typeof seatTermWindow>[2];
  },
  plan: { readonly seat: CongressSeat; readonly intakeDate: IsoDate },
  year: number,
  personId: EntityId,
  party: string,
  recruitmentEventId: EntityId,
) {
  const share = facts.generatedShare;
  const opportunity =
    share === null || share === undefined
      ? null
      : party === "democratic"
        ? share
        : 1 - share;
  return {
    stableKey: `${facts.slateKey}:decision:${party}:${personId}`,
    decisionType: "election.consider-congress-run",
    seatKey: plan.seat.seatKey,
    personId,
    intakeDate: plan.intakeDate,
    recruitmentEventId,
    opportunity,
    lowOpportunityShare: facts.lowOpportunityShare,
    termEnds: seatTermWindow(
      plan.seat,
      makeIsoDate(`${year + 1}-01-03`),
      facts.references,
    ).endExclusive,
  };
}
