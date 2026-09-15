import type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import type { LegislativeRulePack } from "./legislature-rules";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import type { EntityId } from "./types";
import { legislativeWorkKey } from "./legislative-work-key";
export { legislativeWorkKey } from "./legislative-work-key";

/** Institutional identity is independent of whether a scenario was authored. */
export function legislativePackForJurisdiction(
  jurisdictionId: EntityId,
): LegislativeRulePack | null {
  return (
    LEGISLATIVE_RULE_PACKS.find(
      (pack) =>
        stateJurisdictionForKey(pack.jurisdictionKey)?.id === jurisdictionId,
    ) ?? null
  );
}

export function legislativePackForWorkKey(
  key: string,
): LegislativeRulePack | null {
  return (
    LEGISLATIVE_RULE_PACKS.find(
      (pack) =>
        legislativeWorkKey(pack) === key ||
        `institution:${pack.packId}` === key,
    ) ?? null
  );
}

export function legislativeInstitutionContext(
  pack: LegislativeRulePack,
): DemoJurisdictionContext {
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!jurisdiction)
    throw new Error(`No jurisdiction identity for '${pack.packId}'.`);
  const place = lifePlaceByJurisdictionId(jurisdiction.id);
  if (!place) throw new Error(`No clock/place context for '${pack.packId}'.`);
  return {
    jurisdiction,
    initialMoment: place.context.initialMoment,
    creationSummary: `Legislative work in ${jurisdiction.name}.`,
    goalScope: jurisdiction.name,
    householdLocationLabel: `${jurisdiction.name} home`,
  };
}
