import {
  DEMO_START_DATE,
  type DemoJurisdictionContext,
} from "./demo-jurisdiction-context";
import { US_CONGRESS_RULE_PACK } from "./congress-rule-pack";
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
  localFiscalAuthorityScopeForRulePackId,
  municipalRulePackById,
} from "./municipal-government";
import {
  lifePlaceByKey,
  lifePlaceByJurisdictionId,
  searchLifePlaces,
  stateJurisdictionForKey,
  type LifePlace,
} from "./life-places";
import { STATES } from "./state-reference";
import type { EntityId } from "./types";
import { legislativeWorkKey } from "./legislative-work-key";
import { townCouncilProfilePackById } from "./town-council-profile";
import { governmentUnit } from "./government-units";
import { localGovernmentJurisdiction } from "./nationwide-world/local-governments";
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
  if (key === US_CONGRESS_RULE_PACK.institution?.workKey)
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
  const statePack =
    (compiled ? withCommitteeStandIns(compiled) : null) ??
    (institutionPackId
      ? (legislatureProfilePackById(institutionPackId) ??
        townCouncilProfilePackById(institutionPackId) ??
        (localFiscalGameAuthorityForRulePackId(institutionPackId)
          ? localOrdinanceGameRulePackById(institutionPackId)
          : localFiscalAuthorityScopeForRulePackId(institutionPackId)
            ? municipalRulePackById(institutionPackId)
            : null))
      : null);
  return statePack;
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
  if (pack.institution?.government === "federal") {
    const context = pack.institution.context;
    if (!context)
      throw new Error(`No institutional context for '${pack.packId}'.`);
    return {
      jurisdiction: NATIONAL_ELECTION_JURISDICTION,
      // Only the static scenario blueprint reads this moment. A live Congress
      // assignment uses the save's current moment through congressBlueprint.
      initialMoment: {
        date: DEMO_START_DATE,
        minuteOfDay: 9 * 60,
        timeZone: context.timeZone,
        utcOffsetMinutes: context.utcOffsetMinutes,
      },
      creationSummary: context.creationSummary,
      goalScope: context.goalScope,
      householdLocationLabel: context.householdLocationLabel,
    };
  }
  // A profile's state key locates its rules, not the body doing the work.
  // Resolve the validated saved pack to its actual local government/place.
  if (townCouncilProfilePackById(pack.packId)) {
    const unit = governmentUnit(
      pack.packId.slice(pack.packId.indexOf(":") + 1),
    );
    const jurisdiction = unit ? localGovernmentJurisdiction(unit) : null;
    const place = jurisdiction
      ? (lifePlaceByJurisdictionId(jurisdiction.id) ??
        (unit?.countyGeoid
          ? lifePlaceByKey(`county:${unit.countyGeoid}`)
          : null))
      : null;
    if (!jurisdiction || !place)
      throw new Error(`No local clock/place context for '${pack.packId}'.`);
    return {
      jurisdiction,
      initialMoment: place.context.initialMoment,
      creationSummary: `Legislative work in ${jurisdiction.name}.`,
      goalScope: jurisdiction.name,
      householdLocationLabel: `${jurisdiction.name} home`,
    };
  }
  const cached = STATE_INSTITUTION_CONTEXTS.get(pack.jurisdictionKey);
  if (cached) return cached;
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!jurisdiction)
    throw new Error(`No jurisdiction identity for '${pack.packId}'.`);
  // A state the game generates has no state-level place of its own; its clock
  // is read from a place inside it rather than refusing the member's workspace.
  const place =
    lifePlaceByJurisdictionId(jurisdiction.id) ??
    stateLocalityPlace(pack.jurisdictionKey);
  if (!place) throw new Error(`No clock/place context for '${pack.packId}'.`);
  const context = {
    jurisdiction,
    initialMoment: place.context.initialMoment,
    creationSummary: `Legislative work in ${jurisdiction.name}.`,
    goalScope: jurisdiction.name,
    householdLocationLabel: `${jurisdiction.name} home`,
  };
  // Jurisdiction and place identities are static content. The clock can ask
  // for this context many times during one bill; searching and sorting every
  // locality each time adds no new information.
  STATE_INSTITUTION_CONTEXTS.set(pack.jurisdictionKey, context);
  return context;
}

const STATE_INSTITUTION_CONTEXTS = new Map<string, DemoJurisdictionContext>();
