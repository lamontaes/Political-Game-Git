import { legislativeBlueprint, rulePackById } from "../simulation";
import { legislativeWorkKey } from "../simulation/legislative-institutions";
import type { EntityId, World } from "../simulation";
import {
  resolveActiveMemberSeat,
  type ActiveMemberSeat,
  type MemberSeatScope,
} from "./legislative-member-seat";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { regularSessionActionRefusal } from "./legislative-session-window";

export type LegislativeFilingEntry =
  | { readonly kind: "unavailable"; readonly reason: string }
  | {
      readonly kind: "available";
      readonly personId: EntityId;
      readonly scenarioKey: string;
      readonly jurisdictionId: EntityId;
      readonly seat: ActiveMemberSeat;
    };

/**
 * The ordinary docket's read-only filing gate. Staff may preview a draft, but
 * filing needs the current controlled person's reconciled election/seat chain.
 * Recompute at the write boundary: a previously available entry grants nothing.
 * Candidate qualification stays in the existing candidacy writer; this does not
 * create a campaign, result, seat, term date, or alternative entry route.
 */
export function resolveLegislativeFilingEntry(
  world: World,
  personId: EntityId,
  scope?: MemberSeatScope,
): LegislativeFilingEntry {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    return {
      kind: "unavailable",
      reason: "Only the current character can file from this office.",
    };
  }
  const capability = resolvePlayerCapabilities(world);
  if (!capability.office) {
    return {
      kind: "unavailable",
      reason:
        "This character has no active office for filing in this legislature.",
    };
  }
  const membership = resolveActiveMemberSeat(world, personId, scope);
  if (membership.kind !== "seated") {
    return {
      kind: "unavailable",
      reason: `Filing requires a supported member seat. ${membership.reason} Staff may prepare a draft, but an office job does not authorize introduction.`,
    };
  }
  if (
    !scope &&
    (!capability.legislativeScenarioKey ||
      capability.legislativeJurisdictionId !==
        membership.seat.governingJurisdictionId)
  ) {
    return {
      kind: "unavailable",
      reason: "The active office does not match the recorded member seat.",
    };
  }
  const scenarioKey = scope
    ? legislativeWorkKey(rulePackById(membership.seat.legislativeRulePackId))
    : capability.legislativeScenarioKey!;
  const blueprint = legislativeBlueprint(scenarioKey);
  if (blueprint.pack.packId !== membership.seat.legislativeRulePackId) {
    return {
      kind: "unavailable",
      reason: "The office rules do not match the recorded member seat.",
    };
  }
  const refusal = regularSessionActionRefusal(
    blueprint.pack,
    world.currentDate,
  );
  if (refusal) return { kind: "unavailable", reason: refusal };
  return {
    kind: "available",
    personId,
    scenarioKey,
    jurisdictionId: membership.seat.governingJurisdictionId,
    seat: membership.seat,
  };
}
