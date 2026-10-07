import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import { STATES } from "./state-reference";
import type { LifePlace } from "./life-places";

const FEDERAL_JURISDICTION_KEY = "US";

/** Which level of government an office sits at. Never inferred from a title. */
export type CivicOfficeLevel =
  "federal" | "state" | "federal-district" | "territory";

export interface CivicOfficeDefinition {
  /** The accepted pack's own office key, e.g. `us-ky-governor`. */
  readonly officeKey: string;
  /** The office's own title, e.g. `Governor`. */
  readonly title: string;
  /** How the office is named in full, e.g. `Governor of Kentucky`. */
  readonly displayName: string;
  readonly jurisdictionKey: string;
  readonly level: CivicOfficeLevel;
  /** The read pack or estimated game profile used by this office. */
  readonly authorityPackId: string;
}

/**
 * The offices this place has accepted authority for, in reading order.
 *
 * Federal first because every supported place is in the United States; then
 * the place's state, District or territory executive profile.
 */
export function supportedCivicOfficesFor(
  place: LifePlace,
): readonly CivicOfficeDefinition[] {
  const offices: CivicOfficeDefinition[] = [];
  const federal = executiveRulePackForJurisdiction(FEDERAL_JURISDICTION_KEY);
  offices.push({
    officeKey: federal.office.officeKey,
    title: federal.office.title,
    displayName: federal.displayName,
    jurisdictionKey: federal.jurisdictionKey,
    level: "federal",
    authorityPackId: federal.packId,
  });
  const stateKey = place.stateJurisdictionKey;
  if (stateKey !== null && stateKey !== FEDERAL_JURISDICTION_KEY) {
    const state = executiveRulePackForJurisdiction(stateKey);
    const stateUsps = stateKey.slice("US-".length);
    const governmentKind = STATES[stateUsps]?.jurisdictionKind;
    if (!governmentKind) return offices;
    offices.push({
      officeKey: state.office.officeKey,
      title: state.office.title,
      displayName: state.displayName,
      jurisdictionKey: state.jurisdictionKey,
      level: governmentKind,
      authorityPackId: state.packId,
    });
  }
  return offices;
}
