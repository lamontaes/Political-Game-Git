import { claimStancesBy } from "../claim-stances";
import type { EntityId, HistoricalEvent, World } from "../types";
import { referForProsecution, regulatorRefers } from "./prosecution";
import { priorAdverseFindings } from "../press/findings";
import type { MatterProceedingRecord, ProceedingStepRecord } from "../press/records";
import { requirePressRecord } from "../press/store";

// Mechanical ownership extraction only. The existing regulator placeholder,
// referral decision rule, saved event writer and prosecution schedule are unchanged.
/**
 * A finding that somebody took campaign money for themselves goes to
 * prosecutors (`justice/prosecution.ts`) when the record shows the violation
 * was knowing and willful: an earlier finding for the same thing stands, or
 * the person denied what this finding established (`regulatorRefers`). The
 * payments are on the committee's own filed reports, so the evidence is
 * documentary.
 */
export function applyFindingReferral(
  world: World,
  proceeding: MatterProceedingRecord,
  respondentId: EntityId,
  step: ProceedingStepRecord,
  event: HistoricalEvent,
): World {
  const matter = requirePressRecord(world, "matter", proceeding.matterId);
  if (matter.family !== "M1") return world;
  const standing = priorAdverseFindings(world, respondentId, step).length + 1;
  const key = `${step.stableKey}:${respondentId}`;
  const deniedIt = claimStancesBy(world, respondentId).some(
    ({ stance }) =>
      stance.propositionKey === `matter:${proceeding.matterId}` &&
      stance.asserted === "denies",
  );
  if (!regulatorRefers({ standingFindings: standing, deniedIt })) return world;
  return referForProsecution(world, {
    stableKey: key,
    subjectPersonId: respondentId,
    jurisdictionId: matter.jurisdictionId,
    offenseKey: "campaign-funds-personal-use",
    referredBy: {
      kind: "regulator",
      label: proceeding.institutionLabel,
      personId: null,
    },
    basisEventIds: [event.id],
    evidence: "documentary",
    standingFindings: standing,
  }).world;
}

