import type { IsoDate } from "../types";
import { executiveRulePackForJurisdiction } from "../executive-authority-rule-packs";
import { LEGISLATIVE_RULE_PACKS } from "../legislature-rule-packs";
import { officeQualifications } from "../office-qualification-rules";
import {
  US_STATE_NAMES,
  US_STATE_USPS,
  stateExecutiveIdentity,
} from "../nationwide-world/state-executive-candidacy-packs";
import {
  isFullyVerified,
  stateExecutiveTermRule,
} from "../nationwide-world/state-executive-term-rules";

/**
 * One row per state: what the governing baseline runs on there, and what is
 * still missing. A row describes capability and sources; it is not a claim
 * that a state's legal system is complete. The shared baseline route is
 * exercised for every row by the whole-registry test, which reports any state
 * where filing is refused and the exact reason.
 */

export interface StateGoverningDisposition {
  readonly stateUsps: string;
  readonly stateName: string;
  readonly governorOfficeKey: string;
  readonly termCalendar: "verified" | "game-profile" | "mixed";
  readonly termRuleVersion: string;
  /** An accepted executive authority pack (advanced legal powers). */
  readonly executiveAuthorityPack: string | null;
  /** An accepted legislative rule pack (bills, presentment, veto). */
  readonly legislativeRulePack: string | null;
  /** Sourced governor qualification facts the game has read. */
  readonly governorQualificationFacts: number;
  /** Exactly what is not yet compiled, in plain terms. */
  readonly unfinished: readonly string[];
}

export function stateGoverningDisposition(
  stateUsps: string,
  onDate: IsoDate,
): StateGoverningDisposition | null {
  const identity = stateExecutiveIdentity(stateUsps);
  const rule = stateExecutiveTermRule(stateUsps);
  if (!identity || !rule) return null;
  const jurisdictionKey = `US-${stateUsps}`;
  const executivePack = executiveRulePackForJurisdiction(jurisdictionKey);
  const legislativePack =
    LEGISLATIVE_RULE_PACKS.find(
      (pack) => pack.jurisdictionKey === jurisdictionKey,
    ) ?? null;
  const qualifications = officeQualifications(
    jurisdictionKey,
    "GOVERNOR",
    onDate,
  ).filter((row) => row.sourceState !== "UNKNOWN");
  const bases = Object.values(rule.basis);
  const termCalendar = isFullyVerified(rule)
    ? "verified"
    : bases.every((basis) => basis === "game-profile")
      ? "game-profile"
      : "mixed";
  const unfinished = [
    ...(termCalendar === "verified"
      ? []
      : [
          "The governor's real election cycle, term length and start date are not compiled; the game's disclosed calendar is used.",
        ]),
    ...(executivePack
      ? []
      : [
          "The governor's legal powers (appointments needing confirmation, emergencies, clemency, reorganization) are not compiled.",
        ]),
    ...(legislativePack
      ? []
      : [
          "The legislature's rules (bill passage, presentment, veto and override) are not compiled.",
        ]),
    ...(qualifications.length > 0
      ? []
      : ["No sourced governor qualification (age, residence) is read yet."]),
  ];
  return {
    stateUsps,
    stateName: US_STATE_NAMES[identity.stateUsps],
    governorOfficeKey: identity.officeKey,
    termCalendar,
    termRuleVersion: rule.ruleVersion,
    executiveAuthorityPack: executivePack?.packId ?? null,
    legislativeRulePack: legislativePack?.packId ?? null,
    governorQualificationFacts: qualifications.length,
    unfinished,
  };
}

export function allStateGoverningDispositions(
  onDate: IsoDate,
): readonly StateGoverningDisposition[] {
  return US_STATE_USPS.map((usps) => stateGoverningDisposition(usps, onDate)!);
}
