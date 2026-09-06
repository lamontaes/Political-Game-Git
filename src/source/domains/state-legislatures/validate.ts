/**
 * State-legislature corpus validation.
 *
 * These checks are written against the specific ways an office-identity corpus
 * goes wrong, which are not the ways a statistical corpus goes wrong. A
 * statistical defect is a number in the wrong column. An identity defect is a
 * state that quietly acquires another state's legislature, a KNOWN fact with no
 * provision behind it, a citation so generic it cannot be checked, or a
 * bicameral state carrying one chamber as though that were the whole of it.
 *
 * The rejected-provenance list is not decoration. The 92K V2/V3 research waves
 * were rejected and V4 is unaccepted, and a state-office corpus is exactly the
 * shape of thing somebody would repopulate from them; naming them here means a
 * reintroduction fails the build rather than passing review.
 */

import { isUnresolved } from "../../core/index";
import type {
  CompiledCorpus,
  Sourced,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import { recordCitedArtifacts } from "./types";
import type { StateLegislatureIdentity } from "./types";

/** The fifty states, so a corpus cannot silently lose or invent one. */
export const FIFTY_STATE_KEYS: readonly string[] = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
].map((usps) => `US-${usps}`);

/** Provenance this domain must never carry, however it is dressed. */
export const REJECTED_PROVENANCE: readonly string[] = [
  "92k-v2",
  "92k-v3",
  "92k-v4",
  "92K V2",
  "92K V3",
  "92K V4",
  "elections.gov/official-sources",
];

/**
 * Citations too generic to check.
 *
 * A pinpoint is what makes a citation falsifiable. "Alabama Constitution
 * executive article" names a document and a rough neighbourhood, and a reader
 * who wants to know whether the claim is true has nowhere to look.
 */
const GENERIC_CITATION = /^[^§]*\b(?:constitution|statutes?|code)\b[^§]*$/i;

/**
 * A pinpoint is a section symbol, a numbered section, or a numbered article.
 *
 * The numeral is required and must follow the word: an earlier form of this
 * check accepted "legislative article", because case-insensitive `[IVXLC]`
 * matched the "i" of "icle". A citation that names an article without naming
 * which article is exactly the citation this rule exists to catch.
 */
function hasPinpoint(citation: string): boolean {
  return /§\s*\S|\bsec(?:tion|\.)?\s*\d|\bart(?:icle|\.)\s*(?:\d+|[ivxlc]+)\b/i.test(
    citation,
  );
}

/** Fields this domain must never grow. Their presence is the finding. */
export const FORBIDDEN_FIELDS: readonly string[] = [
  "minimumAge",
  "residencyYears",
  "filingDeadline",
  "filingFee",
  "termLength",
  "termLimit",
  "districtGeometry",
  "primaryRules",
  "compensation",
  "campaignFinance",
  "officeholders",
  "incumbent",
];

function citationsOf(value: Sourced<unknown>): readonly string[] {
  const found: string[] = [];
  const push = (locator: { citation?: string } | undefined): void => {
    if (locator?.citation) found.push(locator.citation);
  };
  if (value.state === "CONFLICTING") {
    for (const claim of value.claims) {
      for (const item of claim.evidence)
        push(item.locator as { citation?: string });
    }
    return found;
  }
  if (value.state === "UNKNOWN") return found;
  for (const item of value.evidence)
    push(item.locator as { citation?: string });
  return found;
}

function evidenceCount(value: Sourced<unknown>): number {
  if (value.state === "CONFLICTING") {
    return value.claims.reduce(
      (total, claim) => total + claim.evidence.length,
      0,
    );
  }
  if (value.state === "UNKNOWN") return value.investigated.length;
  return value.evidence.length;
}

export function validateStateLegislatureCorpus(
  compiled: CompiledCorpus<StateLegislatureIdentity>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const seenJurisdictions = new Set<string>();

  for (const record of records) {
    const id = record.recordId;

    if (seenJurisdictions.has(record.jurisdictionKey)) {
      findings.push({
        severity: "error",
        code: "state-legislatures/duplicate-jurisdiction",
        message: `${record.jurisdictionKey} appears more than once. A state has one identity record.`,
        recordId: id,
      });
    }
    seenJurisdictions.add(record.jurisdictionKey);

    if (record.jurisdictionKey !== `US-${record.stateUsps}`) {
      findings.push({
        severity: "error",
        code: "state-legislatures/jurisdiction-key-mismatch",
        message: `${id} carries jurisdiction key "${record.jurisdictionKey}" for state "${record.stateUsps}".`,
        recordId: id,
      });
    }

    const chamberKeys = new Set<string>();
    for (const chamber of record.chambers) {
      if (chamberKeys.has(chamber.chamberKey)) {
        findings.push({
          severity: "error",
          code: "state-legislatures/duplicate-chamber",
          message: `${id} carries chamber "${chamber.chamberKey}" twice.`,
          recordId: id,
        });
      }
      chamberKeys.add(chamber.chamberKey);

      if (chamber.seatCount.state === "KNOWN") {
        const seats = chamber.seatCount.value;
        if (!Number.isInteger(seats) || seats <= 0) {
          findings.push({
            severity: "error",
            code: "state-legislatures/non-positive-seat-count",
            message: `${id} chamber "${chamber.chamberKey}" holds ${seats} seats. A chamber with no seats is not a chamber.`,
            recordId: id,
          });
        }
      }

      for (const value of [
        chamber.name,
        chamber.seatCount,
        chamber.membersElected,
      ] as const) {
        if (value.state === "KNOWN" && evidenceCount(value) === 0) {
          findings.push({
            severity: "error",
            code: "state-legislatures/known-without-provenance",
            message: `${id} chamber "${chamber.chamberKey}" states a KNOWN fact citing nothing. Only UNKNOWN may carry no evidence.`,
            recordId: id,
          });
        }
        for (const citation of citationsOf(value)) {
          if (!hasPinpoint(citation) && GENERIC_CITATION.test(citation)) {
            findings.push({
              severity: "error",
              code: "state-legislatures/generic-citation",
              message: `${id} cites "${citation}", which names an instrument but no provision within it. A citation without a pinpoint cannot be checked.`,
              recordId: id,
            });
          }
        }
      }
    }

    for (const value of [record.legislatureName, record.structure] as const) {
      if (value.state === "KNOWN" && evidenceCount(value) === 0) {
        findings.push({
          severity: "error",
          code: "state-legislatures/known-without-provenance",
          message: `${id} states a KNOWN state-level fact citing nothing.`,
          recordId: id,
        });
      }
    }

    /*
     * A bicameral state with one chamber.
     *
     * This is the shape that reads as complete and is not: a record that says
     * "two chambers" and then describes one of them, leaving a consumer to
     * conclude the other does not exist. Zero chambers is a different and
     * honest thing — it says nothing was compiled — so it is allowed provided
     * the record says why.
     */
    if (record.structure.state === "KNOWN") {
      const expected = record.structure.value === "bicameral" ? 2 : 1;
      if (record.chambers.length !== 0 && record.chambers.length !== expected) {
        findings.push({
          severity: "error",
          code: "state-legislatures/chamber-count-disagrees-with-structure",
          message: `${id} is ${record.structure.value} but carries ${record.chambers.length} chamber record(s).`,
          recordId: id,
        });
      }
      if (record.chambers.length === 0 && record.unresolvedGaps.length === 0) {
        findings.push({
          severity: "error",
          code: "state-legislatures/silent-omission",
          message: `${id} states a structure and compiles no chamber, without recording a gap saying why. An omission that will not explain itself reads as an absence of chambers.`,
          recordId: id,
        });
      }
    } else if (
      record.chambers.length === 0 &&
      record.unresolvedGaps.length === 0
    ) {
      findings.push({
        severity: "error",
        code: "state-legislatures/silent-omission",
        message: `${id} compiles nothing and records no gap saying why.`,
        recordId: id,
      });
    }

    /*
     * Evidence from another state.
     *
     * Every artifact in this domain is named for the state whose instrument it
     * is, so a Wyoming record citing `ca-constitution-article-4` is caught here
     * rather than shipping California's Assembly as Wyoming's. This is the
     * cross-jurisdiction check in its strongest available form: an id prefix is
     * mechanical, and a copied declaration block does not survive it.
     */
    const prefix = `${record.stateUsps.toLowerCase()}-`;
    for (const evidence of recordCitedArtifacts(record)) {
      if (!evidence.artifactId.startsWith(prefix)) {
        findings.push({
          severity: "error",
          code: "state-legislatures/evidence-from-another-jurisdiction",
          message: `${id} cites artifact "${evidence.artifactId}", which is not a ${record.stateUsps} authority. A state's identity may rest only on its own instruments.`,
          recordId: id,
        });
      }
    }

    const serialized = JSON.stringify(record);
    for (const rejected of REJECTED_PROVENANCE) {
      if (serialized.includes(rejected)) {
        findings.push({
          severity: "error",
          code: "state-legislatures/rejected-provenance",
          message: `${id} carries provenance "${rejected}". The 92K V2 and V3 waves were rejected and V4 is unaccepted; neither is an authority for this domain.`,
          recordId: id,
        });
      }
    }
    for (const forbidden of FORBIDDEN_FIELDS) {
      if (serialized.includes(`"${forbidden}"`)) {
        findings.push({
          severity: "error",
          code: "state-legislatures/out-of-domain-field",
          message: `${id} carries a "${forbidden}" field. Qualifications, filing, districts, terms, compensation, finance and officeholders are other domains' facts; a state-office identity record that grew them would be the uniform national template this substrate refuses.`,
          recordId: id,
        });
      }
    }

    for (const gap of record.unresolvedGaps) {
      if (!gap.reason.trim() || !gap.gapKind.trim()) {
        findings.push({
          severity: "error",
          code: "state-legislatures/empty-gap",
          message: `${id} records a gap with no kind or no reason, which records nothing.`,
          recordId: id,
        });
      }
      if (gap.chamberKey !== null && !chamberKeys.has(gap.chamberKey)) {
        findings.push({
          severity: "error",
          code: "state-legislatures/gap-names-unknown-chamber",
          message: `${id} records a gap for chamber "${gap.chamberKey}", which is not one of its chambers.`,
          recordId: id,
        });
      }
    }
  }

  /*
   * Every state, and only states.
   *
   * A candidacy consumer will index this corpus by parent state, so a missing
   * state is not a smaller corpus — it is a resident who cannot be told what
   * exists above them, with nothing to say why.
   */
  for (const key of FIFTY_STATE_KEYS) {
    if (!seenJurisdictions.has(key)) {
      findings.push({
        severity: "error",
        code: "state-legislatures/missing-state",
        message: `${key} has no record. Every state is present or the corpus is not a fifty-state substrate.`,
      });
    }
  }
  for (const key of seenJurisdictions) {
    if (!FIFTY_STATE_KEYS.includes(key)) {
      findings.push({
        severity: "error",
        code: "state-legislatures/unexpected-jurisdiction",
        message: `${key} is not one of the fifty states. This domain compiles state legislatures and nothing else.`,
      });
    }
  }

  const anyKnown = records.some(
    (record) =>
      !isUnresolved(record.structure) ||
      record.chambers.some((chamber) => !isUnresolved(chamber.seatCount)),
  );
  if (records.length > 0 && !anyKnown) {
    findings.push({
      severity: "warning",
      code: "state-legislatures/nothing-compiled",
      message:
        "No state in the corpus carries a KNOWN structure or seat count. The domain is wired but is reading nothing.",
    });
  }

  return {
    domain: "state-legislatures",
    checked: records.length,
    findings,
  };
}
