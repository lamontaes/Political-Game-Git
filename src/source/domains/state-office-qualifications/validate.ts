/**
 * Qualifications corpus validation.
 *
 * These checks are written against PR #72's specific failures, because those
 * are the failures a qualifications corpus actually has. #72 did not get a
 * detail slightly wrong; it invented a uniform country — the same five-year
 * residency and the same two-term limit everywhere, all citing one URL that
 * does not resolve.
 */

import { isUnresolved } from "../../core/index";
import type { CompiledCorpus, ValidationFinding, ValidationReport } from "../../core/index";
import { isOfficeExistence } from "./types";
import type { QualificationRecord } from "./types";

/** The citation PR #72 used 1,819 times. It does not resolve and never did. */
export const REJECTED_PLACEHOLDER_CITATIONS: readonly string[] = [
  "elections.gov/official-sources",
  "www.elections.gov",
];

/** Phrases #72 used in place of a term-limit rule it had not looked up. */
export const REJECTED_PLACEHOLDER_VALUES: readonly string[] = [
  "Standard state term limit",
  "Standard state term rule",
];

export function validateQualificationCorpus(
  compiled: CompiledCorpus<QualificationRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  const residenceByState = new Map<string, Set<string>>();

  for (const record of records) {
    const authority = record.citedAuthority;

    for (const placeholder of REJECTED_PLACEHOLDER_CITATIONS) {
      if (authority.authorityUrl.includes(placeholder)) {
        findings.push({
          severity: "error",
          code: "qualifications/rejected-placeholder-citation",
          message: `${record.recordId} cites "${authority.authorityUrl}". That is the non-resolving URL PR #72 used for all 1,819 of its citations, and it is not an authority.`,
          recordId: record.recordId,
        });
      }
    }

    if (authority.authorityUrl === "" || !/^https?:\/\//.test(authority.authorityUrl)) {
      findings.push({
        severity: "error",
        code: "qualifications/no-authority-url",
        message: `${record.recordId} cites no first-party authority URL.`,
        recordId: record.recordId,
      });
    }
    if (authority.legalLocator.trim() === "") {
      findings.push({
        severity: "error",
        code: "qualifications/no-legal-locator",
        message: `${record.recordId} names an authority but no article, section or statute within it. A citation without a locator is not checkable.`,
        recordId: record.recordId,
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(authority.effectiveDate)) {
      findings.push({
        severity: "error",
        code: "qualifications/no-effective-date",
        message: `${record.recordId} carries effective date "${authority.effectiveDate}". A qualification rule without a date cannot be applied to a moment in time.`,
        recordId: record.recordId,
      });
    }

    if (isOfficeExistence(record)) continue;

    if (record.normalizationReviewRequired) {
      findings.push({
        severity: "warning",
        code: "qualifications/awaiting-normalization-review",
        message: `${record.recordId} was flagged for normalization review by the research batch and is carried with that flag rather than cleared.`,
        recordId: record.recordId,
      });
    }

    if (record.requirement.state === "KNOWN") {
      const value = record.requirement.value;
      for (const placeholder of REJECTED_PLACEHOLDER_VALUES) {
        if (String(value) === placeholder) {
          findings.push({
            severity: "error",
            code: "qualifications/rejected-placeholder-value",
            message: `${record.recordId} holds "${placeholder}", which is the string PR #72 wrote where it had not established a rule.`,
            recordId: record.recordId,
          });
        }
      }
      if (record.field === "STATE_RESIDENCE" && typeof value === "number") {
        const seen = residenceByState.get(record.stateUsps) ?? new Set<string>();
        seen.add(String(value));
        residenceByState.set(record.stateUsps, seen);
      }
      if (record.field === "MINIMUM_AGE" && typeof value === "number") {
        if (value < 18 || value > 40) {
          findings.push({
            severity: "error",
            code: "qualifications/implausible-age",
            message: `${record.recordId} holds a minimum age of ${value}. No state sets one outside 18 to 40, so this reads as a parse error rather than a rule.`,
            recordId: record.recordId,
          });
        }
      }
    }
  }

  /*
   * The uniformity check.
   *
   * PR #72's signature was that every state agreed with every other. Real state
   * law does not: North Carolina requires two years' residence, Oregon three,
   * Massachusetts and Pennsylvania seven. If a corpus spanning several states
   * reports one residence figure everywhere, that is the shape of a fabricated
   * template rather than a coincidence.
   */
  const distinctResidences = new Set(
    [...residenceByState.values()].flatMap((set) => [...set]),
  );
  if (residenceByState.size >= 5 && distinctResidences.size === 1) {
    findings.push({
      severity: "error",
      code: "qualifications/suspicious-uniformity",
      message: `Every one of ${residenceByState.size} states reports the same state-residence requirement of ${[...distinctResidences][0]}. That uniformity is PR #72's signature defect and state law does not look like this.`,
    });
  }

  const unresolved = records.filter(
    (record) => !isOfficeExistence(record) && isUnresolved(record.requirement),
  ).length;
  if (records.length >= 20 && unresolved === 0) {
    findings.push({
      severity: "warning",
      code: "qualifications/no-uncertainty",
      message:
        "Every requirement in the corpus resolved to KNOWN. The research wave found genuine silence and genuine conflict in most states, so a corpus with no unresolved value may have promoted statuses somewhere.",
    });
  }

  return {
    domain: "state-office-qualifications",
    checked: records.length,
    findings,
  };
}
