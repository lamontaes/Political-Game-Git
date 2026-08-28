/**
 * Federal Election Commission (OpenFEC) Source Corpus Types
 *
 * Provides normalized domain models for federal candidates, committees,
 * filings/reports, itemized receipts/disbursements, loans, debts, and independent
 * expenditures, with strict amendment chain tracking and calibration outputs.
 */

export type FecOffice = "H" | "S" | "P"; // House, Senate, Presidential

export type FecIncumbentStatus = "I" | "C" | "O" | "U"; // Incumbent, Challenger, Open, Unknown

export type FecCommitteeType =
  | "H" // House Authorized/Principal
  | "S" // Senate Authorized/Principal
  | "P" // Presidential Authorized/Principal
  | "N" // PAC - Nonqualified
  | "Q" // PAC - Qualified
  | "O" // Super PAC (Independent Expenditure-Only)
  | "U" // Single-Candidate Super PAC
  | "X" // Party - Nonqualified
  | "Y" // Party - Qualified
  | "Z" // National Party Nonfederal
  | "W"; // Leadership PAC

export type FecCommitteeDesignation =
  | "P" // Principal Campaign Committee
  | "A" // Authorized by Candidate
  | "J" // Joint Fundraising Committee
  | "D" // Leadership PAC
  | "U" // Unauthorized
  | "B"; // Lobbyist/Registrant PAC

export type FecFormType =
  | "F3" // House/Senate Campaign Financial Report
  | "F3P" // Presidential Campaign Financial Report
  | "F3X" // PAC/Party Committee Financial Report
  | "F3L" // Bundled Contributions Report
  | "F5" // Non-Committee Independent Expenditure Report
  | "F24" // 24-Hour / 48-Hour Independent Expenditure Notice
  | "F99"; // Miscellaneous Text Filing

export type FecAmendmentIndicator = "N" | "A" | "T"; // New, Amendment, Termination

export type FecContributorType =
  "individual" | "pac" | "party" | "candidate" | "transfer" | "other";

export type FecDisbursementCategory =
  | "media_advertising"
  | "polling_research"
  | "payroll_staff"
  | "consulting"
  | "travel_events"
  | "fundraising_fees"
  | "mail_postage"
  | "transfers_refunds"
  | "loan_repayments"
  | "other";

export type FecLenderType =
  | "candidate_personal"
  | "bank_institution"
  | "commercial"
  | "individual_endorsed"
  | "other";

export type FecDebtCategory =
  | "vendor_services"
  | "media_production"
  | "legal_compliance"
  | "travel_logistics"
  | "unpaid_consulting"
  | "other";

export type FecSupportOppose = "S" | "O"; // Support or Oppose

export interface FecProvenance {
  source: "openfec_api" | "fec_bulk_data" | "curated_fec_fixture";
  sourceUrl: string;
  retrievalTimestamp: string;
  apiVersion: string;
  recordChecksum: string;
  amendmentPolicy: "exclude_superseded_in_aggregates";
  license: "public_domain_us_gov";
}

export interface FecCandidate {
  candidateId: string; // e.g. "H6KY06123", "S0KY00123", "P80001234"
  name: string; // e.g. "BARR, ANDY"
  office: FecOffice;
  state: string; // e.g. "KY" or "US"
  district: string; // e.g. "06" or "00"
  party: string; // e.g. "REP", "DEM", "LIB", "IND"
  partyAffiliation: string; // Normalized label e.g. "Republican Party"
  cycles: number[]; // e.g. [2020, 2022, 2024]
  incumbentChallengeStatus: FecIncumbentStatus;
  principalCampaignCommitteeId: string; // e.g. "C00473538"
  flags: {
    isFederalCandidate: boolean;
    hasActivePcc: boolean;
  };
}

export interface FecCommittee {
  committeeId: string; // e.g. "C00473538"
  name: string; // e.g. "ANDY BARR FOR CONGRESS"
  committeeType: FecCommitteeType;
  committeeTypeLabel: string;
  designation: FecCommitteeDesignation;
  designationLabel: string;
  party: string | null;
  state: string;
  treasurerName: string;
  sponsorCandidateId: string | null;
  cycles: number[];
}

export interface CandidateCommitteeRelationship {
  relationshipId: string; // e.g. "rel-H6KY06123-C00473538-2024-P"
  candidateId: string;
  committeeId: string;
  cycle: number;
  designation: FecCommitteeDesignation;
  committeeType: FecCommitteeType;
  effectiveDateRange: {
    startYear: number;
    endYear: number;
  };
  isPrincipalCampaignCommittee: boolean;
}

export interface FecFinancialSummary {
  totalReceipts: number;
  totalDisbursements: number;
  cashOnHandBeginningPeriod: number;
  cashOnHandClosePeriod: number;
  debtsOwedByCommittee: number;
  debtsOwedToCommittee: number;
  individualContributionsTotal: number;
  individualItemizedContributions: number;
  individualUnitemizedContributions: number;
  otherPoliticalCommitteeContributions: number; // PACs
  transfersFromOtherAuthorizedCommittees: number;
  candidateContributions: number;
  loansMadeByCandidate: number;
  otherLoans: number;
  operatingExpenditures: number;
  refunds: number;
  independentExpendituresTotal: number;
  netContributions: number;
  netOperatingExpenditures: number;
}

export interface FecAmendmentChain {
  amendmentIndicator: FecAmendmentIndicator;
  amendmentVersion: number; // 0 for original, 1 for 1st amendment, etc.
  amendsFilingId: string | null;
  isLatestActiveAmendment: boolean;
  supersededByFilingId: string | null;
}

export interface FecFilingReport {
  filingId: string; // Raw FEC filing sequence / document number e.g. "1789234"
  committeeId: string;
  candidateId: string | null;
  cycle: number;
  reportYear: number;
  reportType: string; // e.g. "Q1", "Q2", "Q3", "YE", "12P", "12G", "30G", "M2", "24", "48"
  reportTypeDescription: string;
  formType: FecFormType;
  coverageStartDate: string; // ISO YYYY-MM-DD
  coverageEndDate: string; // ISO YYYY-MM-DD
  receiptDate: string; // ISO YYYY-MM-DD or timestamp
  amendmentChain: FecAmendmentChain;
  financialSummary: FecFinancialSummary;
  provenance: FecProvenance;
}

export interface FecReceiptItem {
  transactionId: string; // Raw or synthesized stable ID e.g. "SA11AI-1001"
  filingId: string;
  committeeId: string;
  contributorName: string;
  contributorType: FecContributorType;
  contributorOccupation: string | null;
  contributorEmployer: string | null;
  contributorState: string | null;
  contributionDate: string; // ISO YYYY-MM-DD
  contributionAmount: number;
  aggregateAmountYtd: number;
  memoText: string | null;
  isItemized: boolean;
}

export interface FecDisbursementItem {
  transactionId: string; // Raw or synthesized stable ID e.g. "SB17-2001"
  filingId: string;
  committeeId: string;
  recipientName: string;
  disbursementPurpose: string;
  disbursementCategory: FecDisbursementCategory;
  disbursementDate: string; // ISO YYYY-MM-DD
  disbursementAmount: number;
  memoText: string | null;
}

export interface FecLoanRecord {
  loanId: string; // e.g. "SC10-5001"
  filingId: string;
  committeeId: string;
  lenderName: string;
  lenderType: FecLenderType;
  isCandidatePersonalLoan: boolean;
  originalLoanAmount: number;
  cumulativePaymentToDate: number;
  loanBalanceRemaining: number;
  loanIncurredDate: string; // ISO YYYY-MM-DD
  loanDueDate: string | null;
  interestRate: number | null;
  isSecured: boolean;
}

export interface FecDebtRecord {
  debtId: string; // e.g. "SD10-6001"
  filingId: string;
  committeeId: string;
  creditorName: string;
  debtNature: string;
  debtCategory: FecDebtCategory;
  beginningBalanceThisPeriod: number;
  amountIncurredThisPeriod: number;
  amountPaidThisPeriod: number;
  endingBalanceThisPeriod: number;
  isDebtOwedByCommittee: boolean;
}

export interface FecIndependentExpenditure {
  expenditureId: string; // e.g. "SE-7001"
  filingId: string;
  committeeId: string; // Outside spender (Super PAC / non-committee)
  committeeName: string;
  candidateId: string; // Targeted candidate
  candidateName: string;
  officeSought: FecOffice;
  state: string;
  district: string | null;
  supportOppose: FecSupportOppose;
  payeeName: string;
  disbursementDate: string; // ISO YYYY-MM-DD
  disseminationDate: string; // ISO YYYY-MM-DD
  amount: number;
  purpose: string;
}

export interface FecCampaignFinanceCorpus {
  schemaVersion: string;
  generatedAt: string;
  provenance: FecProvenance;
  candidates: FecCandidate[];
  committees: FecCommittee[];
  relationships: CandidateCommitteeRelationship[];
  filings: FecFilingReport[];
  receipts: FecReceiptItem[];
  disbursements: FecDisbursementItem[];
  loans: FecLoanRecord[];
  debts: FecDebtRecord[];
  independentExpenditures: FecIndependentExpenditure[];
}
