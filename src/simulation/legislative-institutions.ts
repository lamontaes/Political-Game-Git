import {
  DEMO_START_DATE,
  type DemoJurisdictionContext,
} from "./demo-jurisdiction-context";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "./congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  legislatureForState,
  legislatureProfilePackById,
} from "./legislature-game-profile";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import type { LegislativeRulePack } from "./legislature-rules";
import {
  localFiscalGameAuthorityForRulePackId,
  localOrdinanceGameRulePackById,
} from "./local-ordinance-game-profile";
import { withCommitteeStandIns } from "./standing-committee";
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
  if (jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id)
    return US_CONGRESS_RULE_PACK;
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
  if (key === `institution:${US_CONGRESS_PACK_ID}`)
    return US_CONGRESS_RULE_PACK;
  const compiled = LEGISLATIVE_RULE_PACKS.find(
    (pack) =>
      legislativeWorkKey(pack) === key || `institution:${pack.packId}` === key,
  );
  const institutionPackId = key.startsWith("institution:")
    ? key.slice("institution:".length)
    : null;
  // A researched chamber whose committees are unread refers its bills to the
  // stand-in standing committee, as `rulePackById` does.
  return (
    (compiled ? withCommitteeStandIns(compiled) : null) ??
    (institutionPackId
      ? (legislatureProfilePackById(institutionPackId) ??
        (localFiscalGameAuthorityForRulePackId(institutionPackId)
          ? localOrdinanceGameRulePackById(institutionPackId)
          : null))
      : null)
  );
}

export function legislativeInstitutionContext(
  pack: LegislativeRulePack,
): DemoJurisdictionContext {
  if (pack.packId === US_CONGRESS_PACK_ID)
    return {
      jurisdiction: NATIONAL_ELECTION_JURISDICTION,
      // Only the static scenario blueprint reads this moment. A live Congress
      // assignment uses the save's current moment through congressBlueprint.
      initialMoment: {
        date: DEMO_START_DATE,
        minuteOfDay: 9 * 60,
        timeZone: "America/New_York",
        utcOffsetMinutes: -300,
      },
      creationSummary: "Legislative work in the Congress of the United States.",
      goalScope: "United States",
      householdLocationLabel: "Washington, D.C.",
    };
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
