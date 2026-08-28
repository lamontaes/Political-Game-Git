/**
 * Campaign Finance Calibration Types for Simulation & Game Design
 *
 * Defines structured statistical calibration parameters derived from FEC data.
 */

import type { FecOffice } from "./types";

export type CampaignPhase =
  | "early_off_year" // Year before election, Q1-Q4
  | "primary_season" // Election year, Q1-Q2 / Pre-Primary
  | "general_sprint" // Election year, Q3 / Pre-General / Post-General
  | "post_election_wind_down"; // Year-End / Post-General reconciliation

export interface OfficeFundraisingBenchmark {
  office: FecOffice;
  category: "all" | "incumbent" | "challenger" | "open_seat";
  sampleSize: number;
  medianReceipts: number;
  p25Receipts: number;
  p75Receipts: number;
  p90Receipts: number;
  meanReceipts: number;
  medianDisbursements: number;
  meanDisbursements: number;
}

export interface PhaseBurnRateBenchmark {
  phase: CampaignPhase;
  phaseLabel: string;
  sampleReports: number;
  medianBurnRate: number; // disbursements / receipts ratio
  meanBurnRate: number;
  description: string;
}

export interface DebtPrevalenceBenchmark {
  sampleCommittees: number;
  percentCommitteesWithDebt: number; // 0.0 to 100.0
  percentCommitteesWithCandidateLoans: number;
  percentCommitteesWithVendorDebts: number;
  medianDebtAmountWhenPresent: number;
  candidateLoanShareOfTotalDebt: number; // 0.0 to 1.0
  vendorDebtShareOfTotalDebt: number; // 0.0 to 1.0
  meanDebtToReceiptsRatio: number;
}

export interface DonorDistributionBenchmark {
  sampleCommittees: number;
  unitemizedSmallDollarShare: number; // < $200 (0.0 to 1.0)
  itemizedIndividualShare: number; // Individual >= $200 (0.0 to 1.0)
  pacContributionShare: number; // Other political committees (0.0 to 1.0)
  candidateSelfFundingShare: number; // Candidate contributions & loans (0.0 to 1.0)
  transfersAndOtherShare: number; // (0.0 to 1.0)
}

export interface IndependentExpenditureScaleBenchmark {
  sampleContests: number;
  totalCandidateDisbursements: number;
  totalIndependentExpenditures: number;
  outsideSpendingToCandidateSpendingRatio: number; // outside / candidate
  supportShareOfOutsideSpending: number; // 0.0 to 1.0
  opposeShareOfOutsideSpending: number; // 0.0 to 1.0
}

export interface CommitteeRelationshipBenchmark {
  totalCandidates: number;
  percentCandidatesWithPcc: number;
  percentCandidatesWithLeadershipPac: number;
  percentCandidatesWithJointFundraising: number;
  averageCommitteesPerCandidate: number;
}

export interface FilingCadenceBenchmark {
  totalFilings: number;
  quarterlyFilingsCount: number;
  monthlyFilingsCount: number;
  preElectionBurstsCount: number; // 12P, 12G, 30G
  fastNoticeBurstsCount: number; // 24-hr, 48-hr notices
  amendmentRatePercent: number; // % of original filings that get amended
}

export interface CampaignFinanceCalibrationProfile {
  schemaVersion: string;
  vintage: string;
  generatedAt: string;
  fundraisingBenchmarks: OfficeFundraisingBenchmark[];
  burnRatesByPhase: PhaseBurnRateBenchmark[];
  debtPrevalence: DebtPrevalenceBenchmark;
  donorDistributions: DonorDistributionBenchmark;
  independentExpenditures: IndependentExpenditureScaleBenchmark;
  committeeRelationships: CommitteeRelationshipBenchmark;
  filingCadence: FilingCadenceBenchmark;
}
