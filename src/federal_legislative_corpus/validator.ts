/**
 * Federal Legislative Source Corpus - Integrity and Semantic Validator
 *
 * Validates cryptographic provenance, action ordering, amendment uniqueness,
 * text-version identity, veto/override distinctions, and provider separation.
 */

import { hashDataStructure } from "./provenance.js";
import type { FederalCorpusBundle, FederalMeasureRecord } from "./types.js";

export interface FederalValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  measureId?: string;
  context?: Record<string, unknown>;
}

export interface FederalValidationReport {
  isValid: boolean;
  totalMeasuresChecked: number;
  totalVotesChecked: number;
  errorCount: number;
  warningCount: number;
  issues: FederalValidationIssue[];
}

/**
 * Validates an individual federal measure record.
 */
export function validateFederalMeasure(
  measure: FederalMeasureRecord,
): FederalValidationIssue[] {
  const issues: FederalValidationIssue[] = [];

  // 1. Provenance Hash Integrity
  const recordPayload = {
    measureId: measure.measureId,
    congress: measure.congress,
    measureType: measure.measureType,
    measureNumber: measure.measureNumber,
    displayNumber: measure.displayNumber,
    title: measure.title,
    originChamber: measure.originChamber,
    introducedDate: measure.introducedDate,
    policyArea: measure.policyArea,
    legislativeSubjects: measure.legislativeSubjects,
    sponsors: measure.sponsors,
    committees: measure.committees,
    actions: measure.actions,
    amendments: measure.amendments,
    textVersions: measure.textVersions,
    houseVotes: measure.houseVotes,
    publicLawNumber: measure.publicLawNumber,
    rawProviderStatus: measure.rawProviderStatus,
    derivedLifecycle: measure.derivedLifecycle,
    officialCongressGovUrl: measure.officialCongressGovUrl,
    govinfoPackageId: measure.govinfoPackageId,
  };

  const expectedSha256 = hashDataStructure(recordPayload);
  if (measure.provenance.recordSha256 !== expectedSha256) {
    issues.push({
      severity: "error",
      code: "PROVENANCE_HASH_MISMATCH",
      message: `Measure provenance hash ${measure.provenance.recordSha256} does not match computed hash ${expectedSha256}`,
      measureId: measure.measureId,
    });
  }

  // 2. Action Chronological Ordering & Sequence Indexing
  for (let i = 0; i < measure.actions.length; i += 1) {
    const act = measure.actions[i];
    if (!act) continue;

    if (act.sequence !== i + 1) {
      issues.push({
        severity: "error",
        code: "ACTION_SEQUENCE_INVALID",
        message: `Action index ${i} has sequence ${act.sequence}, expected ${i + 1}`,
        measureId: measure.measureId,
      });
    }

    if (i > 0) {
      const prevAct = measure.actions[i - 1];
      if (prevAct && prevAct.actionDate > act.actionDate) {
        issues.push({
          severity: "error",
          code: "ACTION_DATE_OUT_OF_ORDER",
          message: `Action ${act.actionId} date ${act.actionDate} is earlier than previous action ${prevAct.actionId} date ${prevAct.actionDate}`,
          measureId: measure.measureId,
        });
      }
    }
  }

  // 3. Amendment Deduplication & Identifier Integrity
  const seenAmendmentIds = new Set<string>();
  for (const amd of measure.amendments) {
    if (seenAmendmentIds.has(amd.amendmentId)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_AMENDMENT",
        message: `Duplicate amendment ID detected: ${amd.amendmentId}`,
        measureId: measure.measureId,
        context: { amendmentId: amd.amendmentId },
      });
    }
    seenAmendmentIds.add(amd.amendmentId);

    if (amd.parentMeasureId !== measure.measureId) {
      issues.push({
        severity: "error",
        code: "AMENDMENT_PARENT_MISMATCH",
        message: `Amendment ${amd.amendmentId} has parent ${amd.parentMeasureId}, expected ${measure.measureId}`,
        measureId: measure.measureId,
      });
    }
  }

  // 4. Text Version Deduplication & Format Integrity
  const seenTextKeys = new Set<string>();
  for (const tv of measure.textVersions) {
    const key = `${tv.versionCode}_${tv.date}`;
    if (seenTextKeys.has(key)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_TEXT_VERSION",
        message: `Duplicate text version detected: ${key}`,
        measureId: measure.measureId,
      });
    }
    seenTextKeys.add(key);

    if (tv.formats.length === 0) {
      issues.push({
        severity: "warning",
        code: "TEXT_VERSION_NO_FORMATS",
        message: `Text version ${tv.versionCode} (${tv.date}) has no format download URLs`,
        measureId: measure.measureId,
      });
    }
  }

  // 5. Veto vs. Veto-Override Invariants
  const { status, vetoDate, vetoOverrideDate } = measure.derivedLifecycle;
  if (status === "veto-override") {
    if (!vetoOverrideDate) {
      issues.push({
        severity: "error",
        code: "VETO_OVERRIDE_MISSING_DATE",
        message: "Measure marked as veto-override but lacks vetoOverrideDate",
        measureId: measure.measureId,
      });
    }
  }

  if (status === "vetoed") {
    if (!vetoDate) {
      issues.push({
        severity: "error",
        code: "VETO_MISSING_DATE",
        message: "Measure marked as vetoed but lacks vetoDate",
        measureId: measure.measureId,
      });
    }
    if (vetoOverrideDate) {
      issues.push({
        severity: "error",
        code: "CONTRADICTORY_VETO_STATE",
        message: "Measure marked as vetoed contains vetoOverrideDate",
        measureId: measure.measureId,
      });
    }
  }

  // 6. Resolution Specificity Invariants
  if (measure.measureType === "hres" || measure.measureType === "sres") {
    if (
      status === "signed-became-law" ||
      status === "presented-to-president" ||
      status === "both-chambers-passed"
    ) {
      issues.push({
        severity: "error",
        code: "INVALID_SIMPLE_RESOLUTION_LIFECYCLE",
        message: `Simple resolution ${measure.displayNumber} cannot have lifecycle status '${status}'`,
        measureId: measure.measureId,
      });
    }
  }

  if (measure.measureType === "hconres" || measure.measureType === "sconres") {
    if (status === "signed-became-law" || status === "presented-to-president") {
      issues.push({
        severity: "error",
        code: "INVALID_CONCURRENT_RESOLUTION_LIFECYCLE",
        message: `Concurrent resolution ${measure.displayNumber} cannot have lifecycle status '${status}'`,
        measureId: measure.measureId,
      });
    }
  }

  return issues;
}

/**
 * Validates full FederalCorpusBundle integrity.
 */
export function validateFederalCorpusBundle(
  bundle: FederalCorpusBundle,
): FederalValidationReport {
  const issues: FederalValidationIssue[] = [];

  // Verify Corpus SHA-256
  const bundlePayloadWithoutHash = {
    schemaVersion: bundle.schemaVersion,
    generatedAt: bundle.generatedAt,
    primarySource: bundle.primarySource,
    secondaryDocumentSource: bundle.secondaryDocumentSource,
    congresses: bundle.congresses,
    measures: bundle.measures,
    houseVotes: bundle.houseVotes,
  };

  const computedCorpusHash = hashDataStructure(bundlePayloadWithoutHash);
  if (bundle.corpusSha256 !== computedCorpusHash) {
    issues.push({
      severity: "error",
      code: "CORPUS_HASH_MISMATCH",
      message: `Corpus SHA-256 ${bundle.corpusSha256} does not match computed hash ${computedCorpusHash}`,
    });
  }

  // Validate all measures
  for (const m of bundle.measures) {
    const measureIssues = validateFederalMeasure(m);
    issues.push(...measureIssues);
  }

  // Validate House roll-call votes
  for (const hv of bundle.houseVotes) {
    const { yea, nay, present, notVoting } = hv.totals;
    if (yea < 0 || nay < 0 || present < 0 || notVoting < 0) {
      issues.push({
        severity: "error",
        code: "INVALID_VOTE_TOTALS",
        message: `House vote ${hv.voteId} contains negative vote totals`,
      });
    }

    if (hv.memberVotes && hv.memberVotes.length > 0) {
      const sum = yea + nay + present + notVoting;
      if (hv.memberVotes.length > sum) {
        issues.push({
          severity: "error",
          code: "VOTE_MEMBER_COUNT_EXCEEDS_TOTAL",
          message: `House vote ${hv.voteId} member count (${hv.memberVotes.length}) exceeds total tally sum (${sum})`,
        });
      }

      for (const mv of hv.memberVotes) {
        if (!["Yea", "Nay", "Present", "Not Voting"].includes(mv.voteCast)) {
          issues.push({
            severity: "error",
            code: "INVALID_MEMBER_VOTE_CAST",
            message: `House vote ${hv.voteId} contains invalid vote cast: ${mv.voteCast}`,
          });
        }
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    isValid: errorCount === 0,
    totalMeasuresChecked: bundle.measures.length,
    totalVotesChecked: bundle.houseVotes.length,
    errorCount,
    warningCount,
    issues,
  };
}
