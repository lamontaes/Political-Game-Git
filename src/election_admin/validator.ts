import type { NormalizedElectionAdminCorpus } from "./types";

export interface ValidationIssue {
  readonly severity: "error" | "warning";
  readonly rule: string;
  readonly recordId: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly totalErrors: number;
  readonly totalWarnings: number;
  readonly issues: readonly ValidationIssue[];
}

export function validateElectionAdminCorpus(
  corpus: NormalizedElectionAdminCorpus,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const addError = (rule: string, recordId: string, message: string) => {
    issues.push({ severity: "error", rule, recordId, message });
  };

  // 1. Validate EAVS Records
  for (const record of corpus.eavsRecords) {
    // Invariant: Administrative source type
    if (record.sourceType !== "administrative_official") {
      addError(
        "admin_vs_survey_isolation",
        record.id,
        `EAVS record has invalid sourceType: ${record.sourceType}. Must be 'administrative_official'.`,
      );
    }

    // Invariant: FIPS integrity
    if (record.level === "state" || record.level === "territory") {
      if (!/^\d{2}$/.test(record.fips)) {
        addError(
          "fips_integrity",
          record.id,
          `State/Territory EAVS record has invalid 2-digit FIPS: '${record.fips}'.`,
        );
      }
    } else if (record.level === "county") {
      if (!/^\d{5}$/.test(record.fips)) {
        addError(
          "fips_integrity",
          record.id,
          `County EAVS record has invalid 5-digit FIPS: '${record.fips}'.`,
        );
      }
      if (record.parentJurisdictionId === null) {
        addError(
          "hierarchy_integrity",
          record.id,
          "County EAVS record must reference a non-null parentJurisdictionId.",
        );
      }
      if (record.fips.slice(0, 2) !== record.stateFips) {
        addError(
          "hierarchy_integrity",
          record.id,
          `County FIPS '${record.fips}' prefix does not match state FIPS '${record.stateFips}'.`,
        );
      }
    }

    // Invariant: Vintage safety
    if (record.vintageYear < 2000 || record.vintageYear > 2030) {
      addError(
        "vintage_safety",
        record.id,
        `Unusual or invalid EAVS vintage year: ${record.vintageYear}.`,
      );
    }

    // Invariant: Mail voting rates and bounds
    const secC = record.sectionC_mailVoting;
    if (secC.rejectionRate !== null) {
      if (secC.rejectionRate < 0 || secC.rejectionRate > 1) {
        addError(
          "numeric_bounds",
          record.id,
          `Mail ballot rejection rate out of range [0, 1]: ${secC.rejectionRate}.`,
        );
      }
    }

    // Invariant: No negative counts
    const numericChecks: [string, number | null][] = [
      ["sectionA.totalRegistered", record.sectionA_registration.totalRegistered],
      ["sectionA.activeRegistered", record.sectionA_registration.activeRegistered],
      ["sectionB.counted", record.sectionB_uocava.counted],
      ["sectionC.transmitted", record.sectionC_mailVoting.transmitted],
      ["sectionC.returned", record.sectionC_mailVoting.returned],
      ["sectionC.counted", record.sectionC_mailVoting.counted],
      ["sectionD.totalParticipants", record.sectionD_inPersonAndPolling.totalParticipants],
      ["sectionE.provisionalBallotsCast", record.sectionE_provisional.provisionalBallotsCast],
    ];

    for (const [fieldName, val] of numericChecks) {
      if (val !== null && val < 0) {
        addError(
          "no_negative_counts",
          record.id,
          `Administrative count '${fieldName}' cannot be negative: ${val}.`,
        );
      }
    }

    // Provenance check
    if (!record.provenance || !record.provenance.contentHash) {
      addError(
        "provenance_integrity",
        record.id,
        "Missing provenance or contentHash.",
      );
    }
  }

  // 2. Validate Policy Survey Records
  for (const record of corpus.policySurveys) {
    if (record.sourceType !== "administrative_official") {
      addError(
        "admin_vs_survey_isolation",
        record.id,
        `Policy Survey record has invalid sourceType: ${record.sourceType}. Must be 'administrative_official'.`,
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.statutoryEffectiveDate)) {
      addError(
        "date_format",
        record.id,
        `Invalid statutoryEffectiveDate format: '${record.statutoryEffectiveDate}'. Expected YYYY-MM-DD.`,
      );
    }

    if (!/^\d{2}$/.test(record.fips)) {
      addError(
        "fips_integrity",
        record.id,
        `Policy Survey record has invalid state FIPS: '${record.fips}'.`,
      );
    }

    if (!record.provenance || !record.provenance.contentHash) {
      addError(
        "provenance_integrity",
        record.id,
        "Missing provenance or contentHash.",
      );
    }
  }

  // 3. Validate CPS Calibration Records
  for (const record of corpus.cpsCalibrations) {
    // Invariant: Survey source type
    if (record.sourceType !== "survey_sample_estimate") {
      addError(
        "admin_vs_survey_isolation",
        record.id,
        `CPS record has invalid sourceType: ${record.sourceType}. Must be 'survey_sample_estimate'.`,
      );
    }

    // Invariant: Methodology preservation
    if (!record.weightingVariable || record.weightingVariable.trim() === "") {
      addError(
        "methodology_preservation",
        record.id,
        "CPS record missing weightingVariable identifier.",
      );
    }

    if (record.sampleSizeUnweighted <= 0) {
      addError(
        "methodology_preservation",
        record.id,
        `Invalid unweighted sample size: ${record.sampleSizeUnweighted}. Must be > 0.`,
      );
    }

    // Invariant: Rates and MOE bounds
    if (
      record.reportedRegistration.ratePercent < 0 ||
      record.reportedRegistration.ratePercent > 100
    ) {
      addError(
        "numeric_bounds",
        record.id,
        `Reported registration rate out of range [0, 100]: ${record.reportedRegistration.ratePercent}.`,
      );
    }

    if (
      record.reportedVoting.ratePercent < 0 ||
      record.reportedVoting.ratePercent > 100
    ) {
      addError(
        "numeric_bounds",
        record.id,
        `Reported voting rate out of range [0, 100]: ${record.reportedVoting.ratePercent}.`,
      );
    }

    if (
      record.reportedRegistration.standardError < 0 ||
      record.reportedVoting.standardError < 0
    ) {
      addError(
        "numeric_bounds",
        record.id,
        "Standard errors cannot be negative.",
      );
    }

    if (
      record.reportedRegistration.marginOfError90Percent < 0 ||
      record.reportedVoting.marginOfError90Percent < 0
    ) {
      addError(
        "numeric_bounds",
        record.id,
        "Margin of error cannot be negative.",
      );
    }

    // Demographic cross-tab checks
    if (record.demographics) {
      const allDemos = [
        ...(record.demographics.byAge ?? []),
        ...(record.demographics.bySex ?? []),
        ...(record.demographics.byRaceHispanic ?? []),
        ...(record.demographics.byEducation ?? []),
        ...(record.demographics.byFamilyIncome ?? []),
        ...(record.demographics.byDurationOfResidence ?? []),
      ];

      for (const demo of allDemos) {
        if (demo.universeCount < 0 || demo.registeredCount < 0 || demo.votedCount < 0) {
          addError(
            "numeric_bounds",
            record.id,
            `Demographic breakdown '${demo.category}:${demo.label}' contains negative counts.`,
          );
        }
        if (
          demo.registeredRatePercent < 0 ||
          demo.registeredRatePercent > 100 ||
          demo.votedRatePercent < 0 ||
          demo.votedRatePercent > 100
        ) {
          addError(
            "numeric_bounds",
            record.id,
            `Demographic breakdown '${demo.category}:${demo.label}' has rates outside [0, 100].`,
          );
        }
      }
    }
  }

  // 4. Validate Historical Series
  for (const record of corpus.historicalSeries) {
    if (record.startYear >= record.endYear) {
      addError(
        "historical_series_integrity",
        record.id,
        `startYear (${record.startYear}) must be strictly less than endYear (${record.endYear}).`,
      );
    }

    let prevYear = 0;
    for (const entry of record.seriesEntries) {
      if (entry.year <= prevYear) {
        addError(
          "historical_series_integrity",
          record.id,
          `Historical series entries must be strictly chronologically increasing: year ${entry.year} <= ${prevYear}.`,
        );
      }
      prevYear = entry.year;

      if (
        entry.officialAdministrativeTurnout.sourceType !==
        "administrative_official"
      ) {
        addError(
          "admin_vs_survey_isolation",
          record.id,
          `Historical entry year ${entry.year} administrative turnout must have sourceType 'administrative_official'.`,
        );
      }

      if (
        entry.cpsSurveyReportedTurnout.sourceType !== "survey_sample_estimate"
      ) {
        addError(
          "admin_vs_survey_isolation",
          record.id,
          `Historical entry year ${entry.year} CPS turnout must have sourceType 'survey_sample_estimate'.`,
        );
      }
    }
  }

  const totalErrors = issues.filter((i) => i.severity === "error").length;
  const totalWarnings = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    issues,
  };
}
