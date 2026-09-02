/**
 * External event source eligibility routing.
 *
 * Salvaged from PR #38's `ExternalEventRouter` and rebuilt on PR #37's
 * contract architecture, which is the surviving source model.
 *
 * What this does: answers "which providers plausibly cover this place and this
 * month?" from provider-declared coverage metadata.
 *
 * What this deliberately does NOT do: decide that an event happened, sample
 * one, or attach a rate to one. PR #38 shipped hand-written
 * `annualOccurrenceRate` constants (0.18, 1.25, 0.45, ...) with no derivation;
 * those were discarded rather than re-estimated, so this module has no
 * probability surface at all. A source that has not been calibrated stays
 * `unresolved_requires_research`, and ineligibility here means "this provider
 * does not report on that place/season", never "no hazard is possible there".
 */

import type { ExternalEventSourceContract, MonthNumber } from "./types.js";

export interface EventEligibilityRequest {
  /** State postal abbreviation, e.g. "KY". */
  readonly stateCode?: string;
  /** FIPS code (state, county or place) to test against provider prefixes. */
  readonly fipsCode?: string;
  /** ISO date `YYYY-MM-DD`; the month is derived from it when `month` is absent. */
  readonly date?: string;
  readonly month?: MonthNumber;
}

export type EligibilityExclusionReason =
  "state_not_covered" | "fips_not_covered" | "month_not_observed";

export interface EligibilityExclusion {
  readonly contractId: string;
  readonly reason: EligibilityExclusionReason;
  readonly explanation: string;
}

export interface EventEligibilityResult {
  /** Contracts whose declared coverage includes the requested place and month. */
  readonly eligibleContractIds: readonly string[];
  readonly exclusions: readonly EligibilityExclusion[];
  /**
   * Contracts excluded only because the provider has observed no records in
   * this month. Kept separate because seasonality is an observation about the
   * record, not a prohibition on the hazard.
   */
  readonly seasonallyExcludedContractIds: readonly string[];
}

/** Parses the month out of an ISO date, returning undefined for anything malformed. */
export function monthFromIsoDate(date: string): MonthNumber | undefined {
  const match = /^\d{4}-(\d{2})-\d{2}$/.exec(date);
  if (!match) return undefined;
  const month = Number.parseInt(match[1]!, 10);
  return month >= 1 && month <= 12 ? (month as MonthNumber) : undefined;
}

function stateEligible(
  contract: ExternalEventSourceContract,
  stateCode: string | undefined,
): boolean {
  if (stateCode === undefined) return true;
  const supported = contract.geographicCoverage.supportedStateCodes;
  // `null` means the provider declares no state restriction, not "no states".
  if (supported === null || supported.length === 0) return true;
  return supported.includes(stateCode.toUpperCase());
}

function fipsEligible(
  contract: ExternalEventSourceContract,
  fipsCode: string | undefined,
): boolean {
  if (fipsCode === undefined) return true;
  const prefixes = contract.geographicCoverage.supportedFipsPrefixes;
  if (prefixes === undefined || prefixes === null || prefixes.length === 0) {
    return true;
  }
  return prefixes.some((prefix) => fipsCode.startsWith(prefix));
}

function monthObserved(
  contract: ExternalEventSourceContract,
  month: MonthNumber | undefined,
): boolean {
  if (month === undefined) return true;
  const active = contract.seasonality.observedActiveMonths;
  // `null` is unresolved seasonality. An unresolved season must not exclude a
  // provider — that would turn missing evidence into a negative finding.
  if (active === null || active.length === 0) return true;
  return active.includes(month);
}

/**
 * Evaluates which source contracts cover a requested place and month.
 *
 * Eligibility is a statement about provider coverage only. It carries no
 * likelihood, and an empty result means "no provider in this registry reports
 * on that request", not "nothing happens there".
 */
export function evaluateEventSourceEligibility(
  contracts: readonly ExternalEventSourceContract[],
  request: EventEligibilityRequest,
): EventEligibilityResult {
  const month =
    request.month ??
    (request.date === undefined ? undefined : monthFromIsoDate(request.date));

  const eligibleContractIds: string[] = [];
  const exclusions: EligibilityExclusion[] = [];
  const seasonallyExcludedContractIds: string[] = [];

  for (const contract of contracts) {
    if (!stateEligible(contract, request.stateCode)) {
      exclusions.push({
        contractId: contract.contractId,
        reason: "state_not_covered",
        explanation: `${contract.contractId} does not report on state ${request.stateCode}.`,
      });
      continue;
    }
    if (!fipsEligible(contract, request.fipsCode)) {
      exclusions.push({
        contractId: contract.contractId,
        reason: "fips_not_covered",
        explanation: `${contract.contractId} does not report on FIPS ${request.fipsCode}.`,
      });
      continue;
    }
    if (!monthObserved(contract, month)) {
      seasonallyExcludedContractIds.push(contract.contractId);
      exclusions.push({
        contractId: contract.contractId,
        reason: "month_not_observed",
        explanation:
          `${contract.contractId} has recorded no events in month ${month}. ` +
          "This describes the provider's record, not a prohibition on the hazard.",
      });
      continue;
    }
    eligibleContractIds.push(contract.contractId);
  }

  return { eligibleContractIds, exclusions, seasonallyExcludedContractIds };
}

/**
 * True when a contract can support quantitative reasoning about frequency.
 *
 * Every contract in this repository currently answers `false`: no calibration
 * has been derived from a committed empirical artifact. Callers must branch on
 * this rather than reaching for a default rate.
 */
export function isCalibratedForFrequency(
  contract: ExternalEventSourceContract,
): boolean {
  return contract.calibration.status === "calibrated";
}
