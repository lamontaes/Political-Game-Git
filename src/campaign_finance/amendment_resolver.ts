/**
 * FEC Filing Amendment Chain Resolver
 *
 * Tracks filing amendments, links superseded filings to their replacements,
 * and provides non-double-counting aggregations for cycle summaries and calibration metrics.
 */

import type { FecFilingReport } from "./types";

/**
 * Resolves amendment chains across a collection of filings.
 * Modifies amendmentChain status in place or returns enriched filings.
 */
export function resolveFilingAmendments(
  filings: FecFilingReport[],
): FecFilingReport[] {
  // Group filings by committeeId + cycle + reportType + coverageStartDate + coverageEndDate
  const groups = new Map<string, FecFilingReport[]>();

  for (const filing of filings) {
    const key = `${filing.committeeId}:${filing.cycle}:${filing.reportType}:${filing.coverageStartDate}:${filing.coverageEndDate}`;
    const list = groups.get(key);
    if (!list) {
      groups.set(key, [filing]);
    } else {
      list.push(filing);
    }
  }

  const resolved: FecFilingReport[] = [];

  for (const groupFilings of groups.values()) {
    if (groupFilings.length === 1 && groupFilings[0]) {
      const f = groupFilings[0];
      resolved.push({
        ...f,
        amendmentChain: {
          ...f.amendmentChain,
          isLatestActiveAmendment: true,
          supersededByFilingId: null,
        },
      });
      continue;
    }

    // Sort filings by receiptDate ascending, then filingId ascending, then amendmentVersion ascending
    const sorted = [...groupFilings].sort((a, b) => {
      if (a.receiptDate !== b.receiptDate) {
        return a.receiptDate.localeCompare(b.receiptDate);
      }
      if (
        a.amendmentChain.amendmentVersion !== b.amendmentChain.amendmentVersion
      ) {
        return (
          a.amendmentChain.amendmentVersion - b.amendmentChain.amendmentVersion
        );
      }
      return Number(a.filingId) - Number(b.filingId);
    });

    const latest = sorted[sorted.length - 1];
    if (!latest) continue;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (!current) continue;
      const isLatest = current.filingId === latest.filingId;
      const prev = i > 0 ? sorted[i - 1] : undefined;

      resolved.push({
        ...current,
        amendmentChain: {
          ...current.amendmentChain,
          isLatestActiveAmendment: isLatest,
          supersededByFilingId: isLatest ? null : latest.filingId,
          amendsFilingId:
            current.amendmentChain.amendsFilingId ??
            (prev ? prev.filingId : null),
        },
      });
    }
  }

  return resolved;
}

/**
 * Returns only the active (non-superseded) filings to prevent double-counting
 * when aggregating figures across a cycle or candidate.
 */
export function filterActiveFilings(
  filings: FecFilingReport[],
): FecFilingReport[] {
  return filings.filter((f) => f.amendmentChain.isLatestActiveAmendment);
}

/**
 * Aggregates financial totals for a given committee across active filings only.
 */
export function aggregateActiveCommitteeFinances(
  committeeId: string,
  filings: FecFilingReport[],
  cycle?: number,
): {
  totalReceipts: number;
  totalDisbursements: number;
  latestCashOnHand: number;
  totalDebtsOwed: number;
  individualItemized: number;
  individualUnitemized: number;
  pacContributions: number;
  candidateContributions: number;
  candidateLoans: number;
  otherLoans: number;
  activeFilingCount: number;
  supersededFilingCount: number;
} {
  const committeeFilings = filings.filter((f) => f.committeeId === committeeId);
  const scoped = cycle
    ? committeeFilings.filter((f) => f.cycle === cycle)
    : committeeFilings;

  const active = scoped.filter((f) => f.amendmentChain.isLatestActiveAmendment);
  const superseded = scoped.filter(
    (f) => !f.amendmentChain.isLatestActiveAmendment,
  );

  let totalReceipts = 0;
  let totalDisbursements = 0;
  let totalDebtsOwed = 0;
  let individualItemized = 0;
  let individualUnitemized = 0;
  let pacContributions = 0;
  let candidateContributions = 0;
  let candidateLoans = 0;
  let otherLoans = 0;

  // Sort active by coverageEndDate to find latest cash on hand
  const sortedActive = [...active].sort((a, b) =>
    a.coverageEndDate.localeCompare(b.coverageEndDate),
  );

  for (const f of active) {
    totalReceipts += f.financialSummary.totalReceipts;
    totalDisbursements += f.financialSummary.totalDisbursements;
    individualItemized += f.financialSummary.individualItemizedContributions;
    individualUnitemized +=
      f.financialSummary.individualUnitemizedContributions;
    pacContributions += f.financialSummary.otherPoliticalCommitteeContributions;
    candidateContributions += f.financialSummary.candidateContributions;
    candidateLoans += f.financialSummary.loansMadeByCandidate;
    otherLoans += f.financialSummary.otherLoans;
  }

  const latestReport =
    sortedActive.length > 0 ? sortedActive[sortedActive.length - 1] : undefined;
  const latestCashOnHand = latestReport
    ? latestReport.financialSummary.cashOnHandClosePeriod
    : 0;
  totalDebtsOwed = latestReport
    ? latestReport.financialSummary.debtsOwedByCommittee
    : 0;

  return {
    totalReceipts: Math.round(totalReceipts * 100) / 100,
    totalDisbursements: Math.round(totalDisbursements * 100) / 100,
    latestCashOnHand: Math.round(latestCashOnHand * 100) / 100,
    totalDebtsOwed: Math.round(totalDebtsOwed * 100) / 100,
    individualItemized: Math.round(individualItemized * 100) / 100,
    individualUnitemized: Math.round(individualUnitemized * 100) / 100,
    pacContributions: Math.round(pacContributions * 100) / 100,
    candidateContributions: Math.round(candidateContributions * 100) / 100,
    candidateLoans: Math.round(candidateLoans * 100) / 100,
    otherLoans: Math.round(otherLoans * 100) / 100,
    activeFilingCount: active.length,
    supersededFilingCount: superseded.length,
  };
}
