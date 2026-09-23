import type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import {
  legislatureForState,
  legislatureProfilePackById,
} from "./legislature-game-profile";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import type { LegislativeRulePack } from "./legislature-rules";
import {
  lifePlaceByJurisdictionId,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { STATES } from "./state-reference";
import type { EntityId } from "./types";
import { legislativeWorkKey } from "./legislative-work-key";
export { legislativeWorkKey } from "./legislative-work-key";

/**
 * Institutional identity is independent of whether a scenario was authored.
 *
 * A state with no compiled pack plays with its generated legislature, the same
 * one its candidacy and seating already use. Without this a Maine member was
 * seated in a chamber the Office screen could not find, and read "You hold no
 * office".
 */
export function legislativePackForJurisdiction(
  jurisdictionId: EntityId,
): LegislativeRulePack | null {
  const compiled = LEGISLATIVE_RULE_PACKS.find(
    (pack) =>
      stateJurisdictionForKey(pack.jurisdictionKey)?.id === jurisdictionId,
  );
  if (compiled) return compiled;
  const stateKey = Object.keys(STATES)
    .map((usps) => `US-${usps}`)
    .find((key) => stateJurisdictionForKey(key)?.id === jurisdictionId);
  return stateKey ? legislatureForState(stateKey) : null;
}

export function legislativePackForWorkKey(
  key: string,
): LegislativeRulePack | null {
  return (
    LEGISLATIVE_RULE_PACKS.find(
      (pack) =>
        legislativeWorkKey(pack) === key ||
        `institution:${pack.packId}` === key,
    ) ??
    (key.startsWith("institution:")
      ? legislatureProfilePackById(key.slice("institution:".length))
      : null)
  );
}

export function legislativeInstitutionContext(
  pack: LegislativeRulePack,
): DemoJurisdictionContext {
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!jurisdiction)
    throw new Error(`No jurisdiction identity for '${pack.packId}'.`);
  // A state the game generates has no state-level place of its own; its clock
  // is read from a place inside it rather than refusing the member's workspace.
  const place =
    lifePlaceByJurisdictionId(jurisdiction.id) ??
    searchLifePlaces("", 1, {
      stateJurisdictionKey: pack.jurisdictionKey,
      scope: "locality",
    })[0] ??
    null;
  if (!place) throw new Error(`No clock/place context for '${pack.packId}'.`);
  return {
    jurisdiction,
    initialMoment: place.context.initialMoment,
    creationSummary: `Legislative work in ${jurisdiction.name}.`,
    goalScope: jurisdiction.name,
    householdLocationLabel: `${jurisdiction.name} home`,
  };
}
