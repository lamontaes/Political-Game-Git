import { readFiledTaxContentIdentity } from "../simulation/legislation-tax-identity";
import type { FiledTaxContentIdentity } from "../simulation/legislation-tax-identity";
import type { EntityId, World } from "../simulation/types";
import { resolveActiveMemberSeat } from "./legislative-member-seat";

export const TAX_ENACTMENT_REQUIRED_INPUTS = [
  "recorded-committee-membership",
  "recorded-committee-member-decisions",
  "recorded-house-membership-and-decisions",
  "recorded-senate-membership-and-decisions",
  "bill-specific-executive-disposition",
] as const;

export type TaxEnactmentInputContract =
  | { readonly kind: "unavailable"; readonly reason: string }
  | {
      readonly kind: "available";
      readonly contentIdentity: FiledTaxContentIdentity;
      readonly playerPersonId: EntityId;
      readonly memberSeatStableKey: string;
      readonly memberChamberKey: string;
      readonly requiredInputs: typeof TAX_ENACTMENT_REQUIRED_INPUTS;
      /** No implicit sitting, ballots, law or executive authority. */
      readonly procedure: null;
    };

/** F's action-boundary contract for S. Available means the exact tax/member
 * identity can consume explicitly recorded inputs, never that enactment is
 * supplied. S must admit/read those inputs and use its existing writers.
 */
export function resolveTaxEnactmentInputContract(
  world: World,
  input: { readonly measureId: EntityId; readonly playerPersonId: EntityId },
): TaxEnactmentInputContract {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerPersonId
  )
    return {
      kind: "unavailable",
      reason:
        "Only the current character may use this tax enactment input contract.",
    };
  const member = resolveActiveMemberSeat(world, input.playerPersonId);
  if (member.kind !== "seated")
    return {
      kind: "unavailable",
      reason: "Tax enactment inputs require a reconciled current member seat.",
    };
  const content = readFiledTaxContentIdentity(world, input.measureId);
  if (content.kind !== "available") return content;
  if (
    member.seat.governingJurisdictionId !== content.identity.jurisdictionId ||
    member.seat.legislativeRulePackId !== content.identity.rulePackId
  )
    return {
      kind: "unavailable",
      reason:
        "This tax belongs to another institution from the current member seat.",
    };
  return {
    kind: "available",
    contentIdentity: content.identity,
    playerPersonId: input.playerPersonId,
    memberSeatStableKey: member.seat.relationshipStableKey,
    memberChamberKey: member.seat.chamberKey,
    requiredInputs: TAX_ENACTMENT_REQUIRED_INPUTS,
    procedure: null,
  };
}
