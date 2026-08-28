/**
 * Campaign Finance Calibration Calculator
 *
 * Computes deterministic calibration metrics and statistical distributions
 * from normalized FEC records using only active (non-superseded) filings.
 */

import { filterActiveFilings } from "./amendment_resolver";
import type {
  CampaignFinanceCalibrationProfile,
  CampaignPhase,
  CommitteeRelationshipBenchmark,
  DebtPrevalenceBenchmark,
  DonorDistributionBenchmark,
  FilingCadenceBenchmark,
  IndependentExpenditureScaleBenchmark,
  OfficeFundraisingBenchmark,
  PhaseBurnRateBenchmark,
} from "./calibration_types";
import type {
  FecCampaignFinanceCorpus,
  FecFilingReport,
  FecOffice,
} from "./types";

function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  const lowerVal = sorted[lower] ?? 0;
  const upperVal = sorted[upper] ?? 0;
  return lowerVal * (1 - weight) + upperVal * weight;
}

function classifyFilingPhase(filing: FecFilingReport): CampaignPhase {
  const { reportType, reportYear, cycle } = filing;
  const isElectionYear = reportYear === cycle;

  if (!isElectionYear) {
    return "early_off_year";
  }

  if (["Q1", "Q2", "12P", "M2", "M3", "M4", "M5", "M6"].includes(reportType)) {
    return "primary_season";
  }

  if (
    ["Q3", "12G", "30G", "M7", "M8", "M9", "M10", "M11"].includes(reportType)
  ) {
    return "general_sprint";
  }

  return "post_election_wind_down";
}

export function computeCalibrationProfile(
  corpus: FecCampaignFinanceCorpus,
  vintage = "2024-OpenFEC",
): CampaignFinanceCalibrationProfile {
  const activeFilings = filterActiveFilings(corpus.filings);

  // 1. Office Fundraising Benchmarks
  const officeCandidates = new Map<
    FecOffice,
    Map<
      string,
      { receipts: number; disbursements: number; incumbentStatus: string }
    >
  >();

  for (const cand of corpus.candidates) {
    if (!officeCandidates.has(cand.office)) {
      officeCandidates.set(cand.office, new Map());
    }
  }

  for (const cand of corpus.candidates) {
    const candCommittees = corpus.committees
      .filter(
        (c) =>
          c.sponsorCandidateId === cand.candidateId ||
          c.committeeId === cand.principalCampaignCommitteeId,
      )
      .map((c) => c.committeeId);

    const candFilings = activeFilings.filter((f) =>
      candCommittees.includes(f.committeeId),
    );
    let receipts = 0;
    let disbursements = 0;

    for (const f of candFilings) {
      receipts += f.financialSummary.totalReceipts;
      disbursements += f.financialSummary.totalDisbursements;
    }

    officeCandidates.get(cand.office)?.set(cand.candidateId, {
      receipts,
      disbursements,
      incumbentStatus: cand.incumbentChallengeStatus,
    });
  }

  const fundraisingBenchmarks: OfficeFundraisingBenchmark[] = [];
  const offices: FecOffice[] = ["H", "S", "P"];

  for (const office of offices) {
    const dataMap = officeCandidates.get(office);
    if (!dataMap || dataMap.size === 0) continue;

    const allEntries = Array.from(dataMap.values());
    const allReceipts = allEntries.map((e) => e.receipts).sort((a, b) => a - b);
    const allDisbursements = allEntries
      .map((e) => e.disbursements)
      .sort((a, b) => a - b);

    const meanRec =
      allReceipts.reduce((a, b) => a + b, 0) / (allReceipts.length || 1);
    const meanDis =
      allDisbursements.reduce((a, b) => a + b, 0) /
      (allDisbursements.length || 1);

    fundraisingBenchmarks.push({
      office,
      category: "all",
      sampleSize: allReceipts.length,
      medianReceipts: Math.round(computePercentile(allReceipts, 50)),
      p25Receipts: Math.round(computePercentile(allReceipts, 25)),
      p75Receipts: Math.round(computePercentile(allReceipts, 75)),
      p90Receipts: Math.round(computePercentile(allReceipts, 90)),
      meanReceipts: Math.round(meanRec),
      medianDisbursements: Math.round(computePercentile(allDisbursements, 50)),
      meanDisbursements: Math.round(meanDis),
    });

    // Incumbents vs Challengers vs Open
    for (const status of ["I", "C", "O"] as const) {
      const categoryLabel =
        status === "I"
          ? "incumbent"
          : status === "C"
            ? "challenger"
            : "open_seat";
      const subset = allEntries.filter((e) => e.incumbentStatus === status);
      if (subset.length === 0) continue;

      const subReceipts = subset.map((e) => e.receipts).sort((a, b) => a - b);
      const subDisbursements = subset
        .map((e) => e.disbursements)
        .sort((a, b) => a - b);

      fundraisingBenchmarks.push({
        office,
        category: categoryLabel,
        sampleSize: subset.length,
        medianReceipts: Math.round(computePercentile(subReceipts, 50)),
        p25Receipts: Math.round(computePercentile(subReceipts, 25)),
        p75Receipts: Math.round(computePercentile(subReceipts, 75)),
        p90Receipts: Math.round(computePercentile(subReceipts, 90)),
        meanReceipts: Math.round(
          subReceipts.reduce((a, b) => a + b, 0) / (subReceipts.length || 1),
        ),
        medianDisbursements: Math.round(
          computePercentile(subDisbursements, 50),
        ),
        meanDisbursements: Math.round(
          subDisbursements.reduce((a, b) => a + b, 0) /
            (subDisbursements.length || 1),
        ),
      });
    }
  }

  // 2. Campaign Burn Rate by Phase
  const phaseBurnBuckets: Record<
    CampaignPhase,
    { receipts: number; disbursements: number; count: number; ratios: number[] }
  > = {
    early_off_year: { receipts: 0, disbursements: 0, count: 0, ratios: [] },
    primary_season: { receipts: 0, disbursements: 0, count: 0, ratios: [] },
    general_sprint: { receipts: 0, disbursements: 0, count: 0, ratios: [] },
    post_election_wind_down: {
      receipts: 0,
      disbursements: 0,
      count: 0,
      ratios: [],
    },
  };

  for (const filing of activeFilings) {
    const phase = classifyFilingPhase(filing);
    const rec = filing.financialSummary.totalReceipts;
    const dis = filing.financialSummary.totalDisbursements;
    phaseBurnBuckets[phase].receipts += rec;
    phaseBurnBuckets[phase].disbursements += dis;
    phaseBurnBuckets[phase].count += 1;
    if (rec > 0) {
      phaseBurnBuckets[phase].ratios.push(dis / rec);
    }
  }

  const phaseLabels: Record<CampaignPhase, { label: string; desc: string }> = {
    early_off_year: {
      label: "Early Off-Year (Foundation)",
      desc: "Off-year fundraising focus with staff, consulting, and initial overhead.",
    },
    primary_season: {
      label: "Primary Season (Mobilization)",
      desc: "Primary campaign operations, early media buys, and voter contact.",
    },
    general_sprint: {
      label: "General Sprint (Peak Spend)",
      desc: "Heavy broadcast/digital advertising and spending down cash reserves.",
    },
    post_election_wind_down: {
      label: "Post-Election Wind-Down",
      desc: "Settling outstanding debts, compliance fees, and surplus management.",
    },
  };

  const burnRatesByPhase: PhaseBurnRateBenchmark[] = (
    Object.keys(phaseBurnBuckets) as CampaignPhase[]
  ).map((phase) => {
    const bucket = phaseBurnBuckets[phase];
    const sortedRatios = [...bucket.ratios].sort((a, b) => a - b);
    const median = computePercentile(sortedRatios, 50);
    const mean =
      bucket.receipts > 0 ? bucket.disbursements / bucket.receipts : 0;

    return {
      phase,
      phaseLabel: phaseLabels[phase].label,
      sampleReports: bucket.count,
      medianBurnRate: Math.round(median * 1000) / 1000,
      meanBurnRate: Math.round(mean * 1000) / 1000,
      description: phaseLabels[phase].desc,
    };
  });

  // 3. Debt Prevalence
  const committeesWithLoans = new Set(
    corpus.loans
      .filter((l) => l.loanBalanceRemaining > 0)
      .map((l) => l.committeeId),
  );
  const committeesWithVendorDebts = new Set(
    corpus.debts
      .filter((d) => d.endingBalanceThisPeriod > 0)
      .map((d) => d.committeeId),
  );
  const committeesWithAnyDebt = new Set([
    ...committeesWithLoans,
    ...committeesWithVendorDebts,
  ]);

  const totalCandidateLoans = corpus.loans
    .filter((l) => l.isCandidatePersonalLoan)
    .reduce((sum, l) => sum + l.loanBalanceRemaining, 0);
  const totalVendorDebts = corpus.debts.reduce(
    (sum, d) => sum + d.endingBalanceThisPeriod,
    0,
  );
  const totalAllDebt = totalCandidateLoans + totalVendorDebts;

  const totalSampleCommittees = corpus.committees.length || 1;
  const debtPrevalence: DebtPrevalenceBenchmark = {
    sampleCommittees: corpus.committees.length,
    percentCommitteesWithDebt:
      Math.round((committeesWithAnyDebt.size / totalSampleCommittees) * 1000) /
      10,
    percentCommitteesWithCandidateLoans:
      Math.round((committeesWithLoans.size / totalSampleCommittees) * 1000) /
      10,
    percentCommitteesWithVendorDebts:
      Math.round(
        (committeesWithVendorDebts.size / totalSampleCommittees) * 1000,
      ) / 10,
    medianDebtAmountWhenPresent: Math.round(
      computePercentile(
        corpus.filings
          .map((f) => f.financialSummary.debtsOwedByCommittee)
          .filter((d) => d > 0)
          .sort((a, b) => a - b),
        50,
      ),
    ),
    candidateLoanShareOfTotalDebt:
      totalAllDebt > 0
        ? Math.round((totalCandidateLoans / totalAllDebt) * 1000) / 1000
        : 0,
    vendorDebtShareOfTotalDebt:
      totalAllDebt > 0
        ? Math.round((totalVendorDebts / totalAllDebt) * 1000) / 1000
        : 0,
    meanDebtToReceiptsRatio:
      corpus.filings.reduce(
        (sum, f) => sum + f.financialSummary.totalReceipts,
        0,
      ) > 0
        ? Math.round(
            (totalAllDebt /
              corpus.filings.reduce(
                (sum, f) => sum + f.financialSummary.totalReceipts,
                0,
              )) *
              1000,
          ) / 1000
        : 0,
  };

  // 4. Donor Distributions
  let grandTotalReceipts = 0;
  let grandUnitemized = 0;
  let grandItemized = 0;
  let grandPac = 0;
  let grandSelf = 0;
  let grandTransfers = 0;

  for (const f of activeFilings) {
    grandTotalReceipts += f.financialSummary.totalReceipts;
    grandUnitemized += f.financialSummary.individualUnitemizedContributions;
    grandItemized += f.financialSummary.individualItemizedContributions;
    grandPac += f.financialSummary.otherPoliticalCommitteeContributions;
    grandSelf +=
      f.financialSummary.candidateContributions +
      f.financialSummary.loansMadeByCandidate;
    grandTransfers += f.financialSummary.transfersFromOtherAuthorizedCommittees;
  }

  const normDenominator = grandTotalReceipts || 1;
  const donorDistributions: DonorDistributionBenchmark = {
    sampleCommittees: corpus.committees.length,
    unitemizedSmallDollarShare:
      Math.round((grandUnitemized / normDenominator) * 1000) / 1000,
    itemizedIndividualShare:
      Math.round((grandItemized / normDenominator) * 1000) / 1000,
    pacContributionShare:
      Math.round((grandPac / normDenominator) * 1000) / 1000,
    candidateSelfFundingShare:
      Math.round((grandSelf / normDenominator) * 1000) / 1000,
    transfersAndOtherShare:
      Math.round((grandTransfers / normDenominator) * 1000) / 1000,
  };

  // 5. Independent Expenditures Scale
  const candidateDisbursements = activeFilings
    .filter((f) => ["F3", "F3P"].includes(f.formType))
    .reduce((sum, f) => sum + f.financialSummary.totalDisbursements, 0);

  const totalIe = corpus.independentExpenditures.reduce(
    (sum, ie) => sum + ie.amount,
    0,
  );
  const supportIe = corpus.independentExpenditures
    .filter((ie) => ie.supportOppose === "S")
    .reduce((sum, ie) => sum + ie.amount, 0);
  const opposeIe = corpus.independentExpenditures
    .filter((ie) => ie.supportOppose === "O")
    .reduce((sum, ie) => sum + ie.amount, 0);

  const independentExpenditures: IndependentExpenditureScaleBenchmark = {
    sampleContests:
      new Set(corpus.independentExpenditures.map((ie) => ie.candidateId))
        .size || 1,
    totalCandidateDisbursements: Math.round(candidateDisbursements),
    totalIndependentExpenditures: Math.round(totalIe),
    outsideSpendingToCandidateSpendingRatio:
      candidateDisbursements > 0
        ? Math.round((totalIe / candidateDisbursements) * 1000) / 1000
        : 0,
    supportShareOfOutsideSpending:
      totalIe > 0 ? Math.round((supportIe / totalIe) * 1000) / 1000 : 0,
    opposeShareOfOutsideSpending:
      totalIe > 0 ? Math.round((opposeIe / totalIe) * 1000) / 1000 : 0,
  };

  // 6. Committee Relationships
  const candidatesWithPcc = corpus.candidates.filter((c) =>
    Boolean(c.principalCampaignCommitteeId),
  ).length;
  const candidatesWithLeadershipPac = corpus.relationships.filter(
    (r) => r.designation === "D",
  ).length;
  const candidatesWithJfc = corpus.relationships.filter(
    (r) => r.designation === "J",
  ).length;

  const totalCand = corpus.candidates.length || 1;
  const committeeRelationships: CommitteeRelationshipBenchmark = {
    totalCandidates: corpus.candidates.length,
    percentCandidatesWithPcc:
      Math.round((candidatesWithPcc / totalCand) * 1000) / 10,
    percentCandidatesWithLeadershipPac:
      Math.round((candidatesWithLeadershipPac / totalCand) * 1000) / 10,
    percentCandidatesWithJointFundraising:
      Math.round((candidatesWithJfc / totalCand) * 1000) / 10,
    averageCommitteesPerCandidate:
      Math.round((corpus.relationships.length / totalCand) * 100) / 100,
  };

  // 7. Filing Cadence
  const quarterly = corpus.filings.filter((f) =>
    ["Q1", "Q2", "Q3", "YE"].includes(f.reportType),
  ).length;
  const monthly = corpus.filings.filter((f) =>
    /^M[0-9]+$/.test(f.reportType),
  ).length;
  const preBursts = corpus.filings.filter((f) =>
    ["12P", "12G", "30G"].includes(f.reportType),
  ).length;
  const fastNotices = corpus.filings.filter(
    (f) =>
      ["24", "48"].includes(f.reportType) || ["F24", "F5"].includes(f.formType),
  ).length;
  const amendedCount = corpus.filings.filter(
    (f) => f.amendmentChain.amendmentIndicator === "A",
  ).length;

  const filingCadence: FilingCadenceBenchmark = {
    totalFilings: corpus.filings.length,
    quarterlyFilingsCount: quarterly,
    monthlyFilingsCount: monthly,
    preElectionBurstsCount: preBursts,
    fastNoticeBurstsCount: fastNotices,
    amendmentRatePercent:
      corpus.filings.length > 0
        ? Math.round((amendedCount / corpus.filings.length) * 1000) / 10
        : 0,
  };

  return {
    schemaVersion: "1.0.0",
    vintage,
    generatedAt: "2026-08-28T18:00:00.000Z",
    fundraisingBenchmarks,
    burnRatesByPhase,
    debtPrevalence,
    donorDistributions,
    independentExpenditures,
    committeeRelationships,
    filingCadence,
  };
}
