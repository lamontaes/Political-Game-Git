import type { EntityId, HistoricalEvent, World } from "../types";
import { referForProsecution } from "./prosecution";
import { priorAdverseFindings } from "../press/findings";
import type {
  MatterProceedingRecord,
  ProceedingStepRecord,
} from "../press/records";
import { requirePressRecord } from "../press/store";

/** A supported misconduct finding is sent to the prosecutor for an individual
 * charging decision. The prosecutor's recorded decision, not a regulator
 * threshold, determines whether charges follow. */
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
