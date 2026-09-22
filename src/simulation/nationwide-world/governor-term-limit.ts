import {
  enactedRuleChangeAt,
  type TermLimitRule,
} from "../enacted-rule-changes";
import type { EntityId, IsoDate, World } from "../types";
import { recordedTermsInOffice } from "./prior-terms";
import { GOVERNOR_TURNOVER_PROFILE } from "./state-executive-turnover-calendar";
import { stateExecutiveOffice } from "./state-executives";

/**
 * The governor's term limit in force in one state on one date, and where it
 * comes from.
 *
 * An enacted change (a statute or a constitutional amendment, resolved by rank
 * in `enacted-rule-changes.ts`) governs where one is in force. Otherwise the
 * game profile's universal limit applies, which is not any state's law: real
 * limits differ by state and some states have none (filed as
 * executive-terms-and-incumbency-turnover).
 *
 * NOT MODELLED, each with its blanket rule:
 * - Consecutive versus total: the World's term record does not mark breaks in
 *   service, so "consecutive" counts every recorded term in the office.
 * - A lookback window (`lookbackYears`) is recorded and not applied.
 * - A change silent on prior service (`countsPriorService: null`) counts it.
 */
export interface GovernorTermLimitInForce {
  /** Null: no limit at all. */
  readonly limit: TermLimitRule | null;
  readonly basis: "enacted" | "game-profile";
  /** When counting starts: null counts every recorded term. */
  readonly countsTermsFrom: IsoDate | null;
  readonly measureId: EntityId | null;
}

const PROFILE_LIMIT: TermLimitRule = {
  maxConsecutiveTerms: GOVERNOR_TURNOVER_PROFILE.incumbentStepsDownAfterTerms,
  maxLifetimeTerms: null,
  lookbackYears: null,
};

export function governorTermLimitInForce(
  world: World,
  stateUsps: string,
  onDate: IsoDate,
): GovernorTermLimitInForce {
  const office = stateExecutiveOffice(stateUsps);
  const change = office
    ? enactedRuleChangeAt(world, {
        stateUsps,
        officeKey: office.officeKey,
        field: "executive.term.limit",
        onDate,
      })
    : null;
  if (!change)
    return {
      limit: PROFILE_LIMIT,
      basis: "game-profile",
      countsTermsFrom: null,
      measureId: null,
    };
  return {
    limit: change.value as TermLimitRule | null,
    basis: "enacted",
    countsTermsFrom:
      change.applicability.countsPriorService === false
        ? change.operativeAt
        : null,
    measureId: change.measureId,
  };
}

/** The most terms in a row this limit lets anyone serve; null for none. */
export function termsAllowed(limit: TermLimitRule | null): number | null {
  if (!limit) return null;
  const caps = [limit.maxConsecutiveTerms, limit.maxLifetimeTerms].filter(
    (cap): cap is number => cap !== null,
  );
  return caps.length ? Math.min(...caps) : null;
}

/** Terms this person has served that count against the limit in force. */
export function termsCountingAgainstLimit(
  world: World,
  personId: EntityId,
  stateUsps: string,
  onDate: IsoDate,
): number {
  const office = stateExecutiveOffice(stateUsps);
  if (!office) return 0;
  const inForce = governorTermLimitInForce(world, stateUsps, onDate);
  return recordedTermsInOffice(
    world,
    personId,
    office.officeKey,
    inForce.countsTermsFrom,
  );
}

/** Whether the limit in force on `onDate` bars this person from another term. */
export function governorTermLimitReached(
  world: World,
  personId: EntityId,
  stateUsps: string,
  onDate: IsoDate,
): boolean {
  const allowed = termsAllowed(
    governorTermLimitInForce(world, stateUsps, onDate).limit,
  );
  return (
    allowed !== null &&
    termsCountingAgainstLimit(world, personId, stateUsps, onDate) >= allowed
  );
}
