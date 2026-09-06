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
 * Provenance is checked by allowing, not by forbidding. Every artifact a record
 * cites has to be one this domain declared it retrieved, and its own locked
 * jurisdiction has to be the record's; an id prefix proves nothing, because an
 * id is a name a declarer chooses, and the independent audit relabelled a
 * California record as Kentucky by inventing a `ky-*` id to go with it. The
 * rejected-provenance list below is kept as a second line only: the 92K V2/V3
 * waves were rejected and V4 is unaccepted, so their strings are worth catching
 * wherever they appear, but a domain that tried to blacklist every name bad
 * material might arrive under would be playing a game it cannot win. The
 * lineage allowlist is what actually holds.
 */

import { isUnresolved } from "../../core/index";
import { stateLegislatureSource } from "./acquisition";
import { hasPinpointFor } from "./normalize";
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
     * Evidence from outside this record's own declared authorities.
     *
     * Three bindings, none of them a name a declarer picks: the artifact has to
     * be one this domain declared it retrieved, the artifact's own locked
     * jurisdiction has to be this record's, and the locator has to point back at
     * the same artifact and carry a pinpoint appropriate to the instrument. The
     * old check compared an id prefix to the state code, which a fabricated
     * `ky-constitution` satisfied without a Kentucky instrument existing.
     */
    for (const evidence of recordCitedArtifacts(record)) {
      const spec = stateLegislatureSource(evidence.artifactId);
      if (!spec) {
        findings.push({
          severity: "error",
          code: "state-legislatures/evidence-outside-acquisition-lineage",
          message: `${id} cites artifact "${evidence.artifactId}", which this domain never declared it retrieved. Evidence is admitted from the locked acquisition lineage and from nowhere else, so renamed or repackaged material has no route in.`,
          recordId: id,
        });
        continue;
      }
      if (spec.jurisdictionKey !== record.jurisdictionKey) {
        findings.push({
          severity: "error",
          code: "state-legislatures/evidence-from-another-jurisdiction",
          message: `${id} cites artifact "${evidence.artifactId}", whose locked jurisdiction is ${spec.jurisdictionKey}. A state's identity may rest only on its own instruments, and the artifact's own declaration says whose it is.`,
          recordId: id,
        });
      }
      const locator = evidence.locator as {
        artifactId?: string;
        citation?: string;
      };
      if (
        locator.artifactId !== undefined &&
        locator.artifactId !== evidence.artifactId
      ) {
        findings.push({
          severity: "error",
          code: "state-legislatures/locator-artifact-mismatch",
          message: `${id} carries evidence from artifact "${evidence.artifactId}" whose locator points at "${locator.artifactId}".`,
          recordId: id,
        });
      }
      if (
        locator.citation === undefined ||
        !hasPinpointFor(spec.instrumentKind, locator.citation)
      ) {
        findings.push({
          severity: "error",
          code: "state-legislatures/generic-citation",
          message: `${id} cites "${locator.citation ?? ""}", which names no article, section or statutory locator inside a ${spec.instrumentKind}. A citation without a pinpoint cannot be checked.`,
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
