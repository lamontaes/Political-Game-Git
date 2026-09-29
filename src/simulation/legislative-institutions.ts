import type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import {
  legislatureForState,
  legislatureProfilePackById,
} from "./legislature-game-profile";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import type { LegislativeRulePack } from "./legislature-rules";
import { withCommitteeStandIns } from "./standing-committee";
import {
  lifePlaceByJurisdictionId,
  searchLifePlaces,
  stateJurisdictionForKey,
  type LifePlace,
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
  if (compiled) return withCommitteeStandIns(compiled);
  const stateKey = Object.keys(STATES)
    .map((usps) => `US-${usps}`)
    .find((key) => stateJurisdictionForKey(key)?.id === jurisdictionId);
  return stateKey ? legislatureForState(stateKey) : null;
}

export function legislativePackForWorkKey(
  key: string,
): LegislativeRulePack | null {
  const compiled = LEGISLATIVE_RULE_PACKS.find(
    (pack) =>
      legislativeWorkKey(pack) === key || `institution:${pack.packId}` === key,
  );
  // A researched chamber whose committees are unread refers its bills to the
  // stand-in standing committee, as `rulePackById` does.
  return (
    (compiled ? withCommitteeStandIns(compiled) : null) ??
    (key.startsWith("institution:")
      ? legislatureProfilePackById(key.slice("institution:".length))
      : null)
  );
}

/*
 * The place list is fixed for a run, and this first locality was searched for
 * again on every step of every bill; a Pennsylvania world spent about 9 seconds
 * of its first year here.
 */
const STATE_LOCALITY = new Map<string, LifePlace | null>();

function stateLocalityPlace(stateKey: string): LifePlace | null {
  if (!STATE_LOCALITY.has(stateKey))
    STATE_LOCALITY.set(
      stateKey,
      searchLifePlaces("", 1, {
        stateJurisdictionKey: stateKey,
        scope: "locality",
      })[0] ?? null,
    );
  return STATE_LOCALITY.get(stateKey)!;
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
    stateLocalityPlace(pack.jurisdictionKey);
  if (!place) throw new Error(`No clock/place context for '${pack.packId}'.`);
  return {
    jurisdiction,
    initialMoment: place.context.initialMoment,
    creationSummary: `Legislative work in ${jurisdiction.name}.`,
    goalScope: jurisdiction.name,
    householdLocationLabel: `${jurisdiction.name} home`,
  };
}
