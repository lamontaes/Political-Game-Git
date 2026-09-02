/**
 * Reconciliation Engine for BLS LAUS Unemployment Rates and Counts
 */

import type {
  LausObservation,
  LausReconciliation,
  LausReconciliationSummary,
  SeasonalAdjustment,
} from "./types.js";

/**
 * Reconciles published labor force, employment, unemployment, and unemployment rate
 * for a single geography, period, and seasonal status.
 */
export function reconcilePeriodGroup(
  areaCode: string,
  year: number,
  period: string,
  seasonal: SeasonalAdjustment,
  groupObservations: LausObservation[],
): LausReconciliation {
  let laborForce: number | null = null;
  let employment: number | null = null;
  let unemployment: number | null = null;
  let publishedRate: number | null = null;

  for (const obs of groupObservations) {
    if (obs.measureCode === "06") {
      laborForce = obs.value;
    } else if (obs.measureCode === "05") {
      employment = obs.value;
    } else if (obs.measureCode === "04") {
      unemployment = obs.value;
    } else if (obs.measureCode === "03") {
      publishedRate = obs.value;
    }
  }

  let calculatedRate: number | null = null;
  if (unemployment !== null && laborForce !== null && laborForce > 0) {
    calculatedRate = Number(((unemployment / laborForce) * 100).toFixed(1));
  }

  let rateDifference: number | null = null;
  if (publishedRate !== null && calculatedRate !== null) {
    rateDifference = Number(Math.abs(publishedRate - calculatedRate).toFixed(1));
  }

  let expectedLaborForce: number | null = null;
  let difference: number | null = null;
  let matches = true;

  if (employment !== null && unemployment !== null) {
    expectedLaborForce = employment + unemployment;
    if (laborForce !== null) {
      difference = Math.abs(laborForce - expectedLaborForce);
      matches = difference <= 1; // within 1 person rounding
    }
  }

  const rateMatches = rateDifference === null || rateDifference <= 0.1; // within 0.1% rounding
  const isReconciled = rateMatches && matches;

  let discrepancyNote: string | undefined = undefined;
  if (!rateMatches) {
    discrepancyNote = `Published rate (${publishedRate}%) differs from calculated rate (${calculatedRate}%) by ${rateDifference}%.`;
  }
  if (!matches) {
    const countsNote = `Published labor force (${laborForce}) differs from sum of employment and unemployment (${expectedLaborForce}) by ${difference}.`;
    discrepancyNote = discrepancyNote ? `${discrepancyNote} ${countsNote}` : countsNote;
  }

  return {
    areaCode,
    year,
    period,
    seasonal,
    laborForce,
    employment,
    unemployment,
    publishedRate,
    calculatedRate,
    rateDifference,
    countsSumCheck: {
      expectedLaborForce,
      difference,
      matches,
    },
    isReconciled,
    discrepancyNote,
  };
}

/**
 * Reconciles an entire list of LAUS observations by grouping by (areaCode, year, period, seasonal).
 */
export function reconcileCorpus(
  observations: LausObservation[],
): { reconciliations: LausReconciliation[]; summary: LausReconciliationSummary } {
  const groups = new Map<string, LausObservation[]>();

  for (const obs of observations) {
    const key = `${obs.areaCode}|${obs.year}|${obs.period}|${obs.seasonal}`;
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(obs);
  }

  const reconciliations: LausReconciliation[] = [];
  let reconciledCount = 0;
  let discrepancyCount = 0;

  for (const [key, groupObs] of groups.entries()) {
    const parts = key.split("|");
    const areaCode = parts[0] || "";
    const yearStr = parts[1] || "0";
    const period = parts[2] || "";
    const seasonal = (parts[3] || "U") as SeasonalAdjustment;
    const year = parseInt(yearStr, 10);
    const recon = reconcilePeriodGroup(
      areaCode,
      year,
      period,
      seasonal,
      groupObs,
    );

    reconciliations.push(recon);
    if (recon.isReconciled) {
      reconciledCount++;
    } else {
      discrepancyCount++;
    }
  }

  return {
    reconciliations,
    summary: {
      totalPeriodsChecked: reconciliations.length,
      reconciledCount,
      discrepancyCount,
    },
  };
}
