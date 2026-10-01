import { campaigns, campaignState } from "./campaign-queries";
import { recordSupportLoss } from "./campaign-support";
import { electionContestStatus } from "./election-contests";
import type { EntityId, HistoricalEvent, World } from "./types";
import {
  priorAdverseFindings,
  repeatOffenseMultiplier,
  UNRESEARCHED_FINDING_EFFECTS,
  type AdversePublicOutcome,
} from "./press/findings";
import type { ProceedingStepRecord } from "./press/records";

// Ownership extraction only: the existing unresearched magnitude and repeat
// rule remain explicit. This is not a new voter decision or researched score.
export function applyFindingSupportLoss(
  world: World,
  respondentId: EntityId,
  outcome: AdversePublicOutcome,
  step: ProceedingStepRecord,
  event: HistoricalEvent,
): World {
  let next = world;
  for (const campaign of campaigns(next)) {
    if (
      !campaign.candidateSupportScopes.some(
        (scope) => scope.candidatePersonId === respondentId,
      ) ||
      campaign.candidateSupportScopes.length < 2 ||
      campaignState(next, campaign.id).status !== "active" ||
      electionContestStatus(next, campaign.contestId) !== "pending"
    )
      continue;
    next = recordSupportLoss(next, campaign, {
      stableKeyBase: `${step.stableKey}:finding-support:${campaign.id}:${respondentId}`,
      loserPersonId: respondentId,
      lossBasisPoints: Math.round(
        UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints[outcome] *
          repeatOffenseMultiplier(
            priorAdverseFindings(next, respondentId, step).length,
            "support-loss",
          ),
      ),
      sourceEntityIds: [event.id],
    }).world;
  }
  return next;
}

