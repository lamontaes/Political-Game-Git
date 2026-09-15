import { measurePosition } from "../simulation/legislation";
import { chamberByKey } from "../simulation/legislature-rules";
import {
  votePlanKeyForAmendment,
  votePlanKeyForCommittee,
  votePlanKeyForConcurrence,
  votePlanKeyForFloor,
  votePlanKeyForOverride,
} from "../simulation/legislation-scenarios";
import type { LegislativeProcedureContext } from "../simulation/legislation-scenarios";
import type { MeasureStepKey } from "../simulation/legislation";
import type { World } from "../simulation/types";

/** Readiness belongs to the specific act, never to the entire jurisdiction. */
export function legislativeProcedureRefusal(
  world: World,
  procedure: LegislativeProcedureContext,
  step: MeasureStepKey,
): string | null {
  if (step === "await-executive-decision" && procedure.governorAction === null)
    return "No executive disposition has been supplied for this authored bill. Signature, veto, inaction and an effective date will not be inferred.";
  const position = measurePosition(world, procedure.measureId);
  const chamberKey = position.chamberKey ?? procedure.pack.chamberOrder[0]!;
  const chamber = chamberByKey(procedure.pack, chamberKey);
  if (
    ["move-floor-vote", "offer-amendment", "move-concurrence"].includes(step) &&
    !procedure.bodies.some((body) => body.chamberKey === chamberKey)
  )
    return `The ${chamber.name}'s seated roster is unresolved. This blocks its recorded vote, not introduction or unrelated supported acts.`;
  const committee =
    chamber.committees.find(
      (entry) => entry.committeeKey === position.committeeKey,
    ) ?? chamber.committees[0];
  if (
    [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
    ].includes(step) &&
    !committee
  ) {
    return `The ${chamber.name}'s committee identity and supported referral/report rules have not been compiled. This bill remains recorded; no committee or membership count will be invented.`;
  }
  const questionKeys: Partial<Record<MeasureStepKey, readonly string[]>> = {
    "move-committee-report": committee
      ? [votePlanKeyForCommittee(committee.committeeKey)]
      : [],
    "offer-amendment": [votePlanKeyForAmendment(chamberKey)],
    "move-floor-vote": [
      votePlanKeyForFloor(chamberKey, position.floorStageKey ?? ""),
    ],
    "move-concurrence": [votePlanKeyForConcurrence(chamberKey)],
    "move-veto-override":
      procedure.pack.executive.override.kind === "joint-session"
        ? [votePlanKeyForOverride("joint")]
        : procedure.pack.chamberOrder.map(votePlanKeyForOverride),
  };
  if (questionKeys[step]?.some((key) => !procedure.votePlan[key])) {
    return "The institution supports this question, but this bill has no supplied member decisions on it. No tally or predicted political outcome will be invented.";
  }
  return null;
}
