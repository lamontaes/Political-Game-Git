import type { EventSourceDefinition } from "./types";

export interface CalibrationReport {
  readonly sourceId: string;
  readonly family: string;
  readonly provider: string;
  readonly status: "calibrated" | "unresolved";
  readonly annualOccurrenceRate?: number;
  readonly derivationFormula?: string;
  readonly totalObservations?: number;
  readonly samplePeriodYears?: number;
  readonly geographicDenominator?: string;
  readonly unresolvedReason?: string;
  readonly isDefensiblyCalculated: boolean;
}

export function evaluateCalibrationStatus(
  source: EventSourceDefinition,
): CalibrationReport {
  const c = source.calibration;

  if (c.status === "unresolved") {
    return {
      sourceId: source.id,
      family: source.family,
      provider: source.provider,
      status: "unresolved",
      unresolvedReason:
        c.unresolvedReason ??
        "Empirical occurrence rate left unresolved pending rigorous source research; no probability fabricated.",
      isDefensiblyCalculated: false,
    };
  }

  const hasValidRate =
    typeof c.annualOccurrenceRate === "number" &&
    c.annualOccurrenceRate >= 0 &&
    !Number.isNaN(c.annualOccurrenceRate);

  const hasValidDerivation =
    typeof c.formula === "string" && c.formula.trim().length > 0;

  if (hasValidRate && hasValidDerivation) {
    return {
      sourceId: source.id,
      family: source.family,
      provider: source.provider,
      status: "calibrated",
      annualOccurrenceRate: c.annualOccurrenceRate,
      derivationFormula: c.formula,
      totalObservations: c.totalObservations,
      samplePeriodYears: c.samplePeriodYears,
      geographicDenominator: c.geographicDenominator,
      isDefensiblyCalculated: true,
    };
  }

  return {
    sourceId: source.id,
    family: source.family,
    provider: source.provider,
    status: "unresolved",
    unresolvedReason:
      "Calibration incomplete: missing defensible formula or valid numeric rate.",
    isDefensiblyCalculated: false,
  };
}

export function summarizeRegistryCalibration(
  sources: readonly EventSourceDefinition[],
): {
  readonly calibratedCount: number;
  readonly unresolvedCount: number;
  readonly reports: readonly CalibrationReport[];
} {
  const reports = sources.map((s) => evaluateCalibrationStatus(s));
  const calibratedCount = reports.filter(
    (r) => r.isDefensiblyCalculated,
  ).length;
  const unresolvedCount = reports.length - calibratedCount;

  return {
    calibratedCount,
    unresolvedCount,
    reports,
  };
}
