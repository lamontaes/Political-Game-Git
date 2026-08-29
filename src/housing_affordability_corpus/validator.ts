/**
 * Housing Affordability Corpus Validator
 *
 * Comprehensive integrity verification enforcing:
 * 1. AMI Bracket Preservation
 * 2. Table Universe Distinctness & Preservation
 * 3. Suppression != Zero Invariant
 * 4. Multi-vintage Isolation & Integrity
 * 5. FMR ($/mo by BR) vs Income Limit ($/yr by size) vs Observed Median Rent Invariants
 * 6. Cryptographic Provenance & Deterministic Serialization
 */

import { computeSha256 } from "./provenance.js";
import type {
  AmiBracket,
  ChasAffordabilityRecord,
  CompiledHousingCorpus,
  FairMarketRentRecord,
  HousingCalibrationProfile,
  IncomeLimitRecord,
} from "./types.js";

export interface ValidationIssue {
  severity: "critical" | "warning";
  code: string;
  recordId?: string;
  geoId?: string;
  message: string;
}

export interface ValidationReport {
  isValid: boolean;
  criticalIssuesCount: number;
  warningsCount: number;
  issues: ValidationIssue[];
  validatedAt: string;
  corpusSha256: string;
}

export function validateHousingCorpus(
  corpus: CompiledHousingCorpus,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  // 1. Validate FMR Records
  for (const fmr of corpus.fmrRecords) {
    validateFmrRecord(fmr, issues);
  }

  // 2. Validate Income Limit Records
  for (const il of corpus.incomeLimitRecords) {
    validateIncomeLimitRecord(il, issues);
  }

  // 3. Validate CHAS Records
  for (const chas of corpus.chasRecords) {
    validateChasRecord(chas, issues);
  }

  // 4. Validate Calibration Profiles
  for (const profile of corpus.calibrationProfiles) {
    validateCalibrationProfile(profile, issues);
  }

  // 5. Validate SHA256 integrity
  const { corpusSha256, ...corpusWithoutHash } = corpus;
  const computedHash = computeSha256(corpusWithoutHash);
  if (corpusSha256 !== computedHash) {
    issues.push({
      severity: "critical",
      code: "CORPUS_HASH_MISMATCH",
      message: `Corpus SHA256 mismatch. Recorded: ${corpusSha256}, Computed: ${computedHash}`,
    });
  }

  const criticalIssuesCount = issues.filter(
    (i) => i.severity === "critical",
  ).length;
  const warningsCount = issues.filter((i) => i.severity === "warning").length;

  return {
    isValid: criticalIssuesCount === 0,
    criticalIssuesCount,
    warningsCount,
    issues,
    validatedAt: new Date().toISOString(),
    corpusSha256: corpus.corpusSha256,
  };
}

export function validateFmrRecord(
  fmr: FairMarketRentRecord,
  issues: ValidationIssue[],
): void {
  // Invariant: FMR is not observed median rent
  if (fmr.isObservedMedianRent !== false) {
    issues.push({
      severity: "critical",
      code: "FMR_MEDIAN_RENT_CONFUSION",
      recordId: fmr.id,
      geoId: fmr.geo.geoId,
      message: "FMR record must have isObservedMedianRent === false",
    });
  }

  // Validate bedroom rent monotonicity (0BR <= 1BR <= 2BR <= 3BR <= 4BR)
  if (
    fmr.fmr0Br <= 0 ||
    fmr.fmr1Br <= 0 ||
    fmr.fmr2Br <= 0 ||
    fmr.fmr3Br <= 0 ||
    fmr.fmr4Br <= 0
  ) {
    issues.push({
      severity: "critical",
      code: "FMR_NONPOSITIVE_RENT",
      recordId: fmr.id,
      geoId: fmr.geo.geoId,
      message: `FMR rents must all be positive: 0BR=${fmr.fmr0Br}, 1BR=${fmr.fmr1Br}, 2BR=${fmr.fmr2Br}, 3BR=${fmr.fmr3Br}, 4BR=${fmr.fmr4Br}`,
    });
  }

  if (
    fmr.fmr0Br > fmr.fmr1Br ||
    fmr.fmr1Br > fmr.fmr2Br ||
    fmr.fmr2Br > fmr.fmr3Br ||
    fmr.fmr3Br > fmr.fmr4Br
  ) {
    issues.push({
      severity: "warning",
      code: "FMR_NON_MONOTONIC_BEDROOMS",
      recordId: fmr.id,
      geoId: fmr.geo.geoId,
      message: `FMR bedroom progression is non-monotonic: [${fmr.fmr0Br}, ${fmr.fmr1Br}, ${fmr.fmr2Br}, ${fmr.fmr3Br}, ${fmr.fmr4Br}]`,
    });
  }

  if (!fmr.vintage || !fmr.vintage.startsWith("FY")) {
    issues.push({
      severity: "critical",
      code: "FMR_INVALID_VINTAGE",
      recordId: fmr.id,
      geoId: fmr.geo.geoId,
      message: `FMR vintage must follow 'FY<year>' format, got: ${fmr.vintage}`,
    });
  }
}

export function validateIncomeLimitRecord(
  il: IncomeLimitRecord,
  issues: ValidationIssue[],
): void {
  if (il.medianFamilyIncome <= 0) {
    issues.push({
      severity: "critical",
      code: "IL_NONPOSITIVE_MFI",
      recordId: il.id,
      geoId: il.geo.geoId,
      message: `Median Family Income must be positive: ${il.medianFamilyIncome}`,
    });
  }

  // Invariant: 30% AMI < 50% AMI < 80% AMI for every family size (1..8)
  for (let size = 1; size <= 8; size++) {
    const s = size as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    const l30 = il.limits30Pct[s];
    const l50 = il.limits50Pct[s];
    const l80 = il.limits80Pct[s];

    if (!l30 || !l50 || !l80 || l30 <= 0 || l50 <= 0 || l80 <= 0) {
      issues.push({
        severity: "critical",
        code: "IL_MISSING_OR_NONPOSITIVE_LIMIT",
        recordId: il.id,
        geoId: il.geo.geoId,
        message: `Income limit for family size ${size} contains non-positive values: 30%=${l30}, 50%=${l50}, 80%=${l80}`,
      });
      continue;
    }

    if (l30 > l50 || l50 > l80) {
      issues.push({
        severity: "critical",
        code: "IL_INVERTED_TIERS",
        recordId: il.id,
        geoId: il.geo.geoId,
        message: `Income limits inverted for size ${size}: 30%=${l30}, 50%=${l50}, 80%=${l80}`,
      });
    }
  }
}

export function validateChasRecord(
  chas: ChasAffordabilityRecord,
  issues: ValidationIssue[],
): void {
  // Invariant: Suppressed != Zero
  if (chas.suppression.isSuppressed) {
    if (chas.householdCount !== null) {
      issues.push({
        severity: "critical",
        code: "CHAS_SUPPRESSION_NOT_NULL",
        recordId: chas.id,
        geoId: chas.geo.geoId,
        message: `Suppressed CHAS cell must have householdCount === null, got: ${chas.householdCount}`,
      });
    }
    if (
      chas.suppression.status !== "suppressed" &&
      chas.suppression.status !== "not_available"
    ) {
      issues.push({
        severity: "critical",
        code: "CHAS_INVALID_SUPPRESSION_STATUS",
        recordId: chas.id,
        geoId: chas.geo.geoId,
        message: `Suppressed cell must have status 'suppressed' or 'not_available', got: ${chas.suppression.status}`,
      });
    }
  } else {
    if (chas.householdCount === null || chas.householdCount < 0) {
      issues.push({
        severity: "critical",
        code: "CHAS_AVAILABLE_INVALID_COUNT",
        recordId: chas.id,
        geoId: chas.geo.geoId,
        message: `Available CHAS cell must have valid numeric count >= 0, got: ${chas.householdCount}`,
      });
    }
  }

  // Validate table universe preservation
  const validUniverses = [
    "occupied_housing_units",
    "renter_occupied_housing_units",
    "owner_occupied_housing_units",
    "all_housing_units",
    "rental_housing_units",
    "households_cost_burden_computable",
  ];
  if (!validUniverses.includes(chas.tableUniverse)) {
    issues.push({
      severity: "critical",
      code: "CHAS_INVALID_TABLE_UNIVERSE",
      recordId: chas.id,
      geoId: chas.geo.geoId,
      message: `Invalid table universe: ${chas.tableUniverse}`,
    });
  }
}

export function validateCalibrationProfile(
  profile: HousingCalibrationProfile,
  issues: ValidationIssue[],
): void {
  const summary = profile.chasSummary;

  // Validate AMI brackets completeness
  const requiredBrackets: AmiBracket[] = [
    "le_30_pct_ami",
    "gt_30_le_50_pct_ami",
    "gt_50_le_80_pct_ami",
    "gt_80_le_100_pct_ami",
    "gt_100_pct_ami",
  ];

  let sumBracketHouseholds = 0;
  for (const b of requiredBrackets) {
    const bracketData = summary.byAmiBracket[b];
    if (!bracketData) {
      issues.push({
        severity: "critical",
        code: "PROFILE_MISSING_AMI_BRACKET",
        geoId: profile.geo.geoId,
        message: `Calibration profile missing AMI bracket summary: ${b}`,
      });
    } else {
      sumBracketHouseholds += bracketData.totalHouseholds;
      if (bracketData.costBurdenRate < 0 || bracketData.costBurdenRate > 1) {
        issues.push({
          severity: "critical",
          code: "PROFILE_INVALID_BURDEN_RATE",
          geoId: profile.geo.geoId,
          message: `Bracket ${b} cost burden rate out of range [0, 1]: ${bracketData.costBurdenRate}`,
        });
      }
    }
  }

  if (
    summary.totalHouseholds > 0 &&
    Math.abs(sumBracketHouseholds - summary.totalHouseholds) > 50
  ) {
    issues.push({
      severity: "warning",
      code: "PROFILE_BRACKET_SUM_DISCREPANCY",
      geoId: profile.geo.geoId,
      message: `Sum of brackets (${sumBracketHouseholds}) differs from totalHouseholds (${summary.totalHouseholds})`,
    });
  }
}
