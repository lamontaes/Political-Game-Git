/**
 * OpenFEC Raw API Provider Adapter
 *
 * Normalizes OpenFEC endpoint responses into typed domain entities.
 */

import { isValidCandidateId, isValidCommitteeId } from "../ids";
import { computeSha256, createFecProvenance } from "../provenance";
import type {
  CandidateCommitteeRelationship,
  FecCandidate,
  FecCommittee,
  FecCommitteeDesignation,
  FecCommitteeType,
  FecDisbursementCategory,
  FecDisbursementItem,
  FecFilingReport,
  FecFormType,
  FecIncumbentStatus,
  FecIndependentExpenditure,
  FecOffice,
  FecReceiptItem,
  FecRecordClass,
  FecSupportOppose,
} from "../types";

export interface RawOpenFecCandidate {
  candidate_id: string;
  name: string;
  office: string;
  state: string;
  district?: string;
  party?: string;
  party_full?: string;
  cycles?: number[];
  incumbent_challenge?: string;
  principal_committees?: Array<{
    committee_id: string;
    name: string;
    designation?: string;
    committee_type?: string;
    cycles?: number[];
  }>;
}

export interface RawOpenFecCommittee {
  committee_id: string;
  name: string;
  committee_type: string;
  committee_type_full?: string;
  designation: string;
  designation_full?: string;
  party?: string;
  state?: string;
  treasurer_name?: string;
  sponsor_candidate_id?: string;
  candidate_ids?: string[];
  cycles?: number[];
}

export interface RawOpenFecReport {
  file_number: number | string;
  committee_id: string;
  candidate_id?: string;
  cycle: number;
  report_year: number;
  report_type: string;
  report_type_full?: string;
  form_type?: string;
  coverage_start_date: string;
  coverage_end_date: string;
  receipt_date: string;
  amendment_indicator?: string;
  amendment_chain?: number[];
  previous_file_number?: number | string;
  most_recent_file_number?: number | string;
  // Financial lines
  total_receipts?: number;
  total_disbursements?: number;
  cash_on_hand_beginning_period?: number;
  cash_on_hand_close_period?: number;
  debts_owed_by_committee?: number;
  debts_owed_to_committee?: number;
  individual_itemized_contributions?: number;
  individual_unitemized_contributions?: number;
  other_political_committee_contributions?: number;
  transfers_from_other_authorized_committee?: number;
  candidate_contributions?: number;
  loans_made_by_candidate?: number;
  all_other_loans?: number;
  operating_expenditures?: number;
  refunded_individual_contributions?: number;
  independent_expenditures?: number;
  net_contributions?: number;
  net_operating_expenditures?: number;
}

export interface RawOpenFecReceipt {
  sub_id?: string;
  transaction_id?: string;
  file_number: number | string;
  committee_id: string;
  contributor_name: string;
  entity_type?: string;
  contributor_occupation?: string;
  contributor_employer?: string;
  contributor_state?: string;
  contribution_receipt_date: string;
  contribution_receipt_amount: number;
  contributor_aggregate_ytd?: number;
  memo_text?: string;
}

export interface RawOpenFecDisbursement {
  sub_id?: string;
  transaction_id?: string;
  file_number: number | string;
  committee_id: string;
  recipient_name: string;
  disbursement_description: string;
  disbursement_date: string;
  disbursement_amount: number;
  memo_text?: string;
}

export interface RawOpenFecIndependentExpenditure {
  sub_id?: string;
  file_number: number | string;
  committee_id: string;
  committee_name?: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_office?: string;
  candidate_state?: string;
  candidate_district?: string;
  support_oppose_indicator: string;
  payee_name: string;
  expenditure_date: string;
  dissemination_date?: string;
  expenditure_amount: number;
  expenditure_description: string;
}

export function adaptCandidate(
  raw: RawOpenFecCandidate,
  recordClass: FecRecordClass = "actual_openfec",
): FecCandidate {
  if (!isValidCandidateId(raw.candidate_id)) {
    throw new Error(`Invalid Candidate ID format: ${raw.candidate_id}`);
  }

  const office = (raw.office?.toUpperCase() ||
    raw.candidate_id.charAt(0)) as FecOffice;
  const state = raw.state?.toUpperCase() || (office === "P" ? "US" : "KY");
  const district = raw.district ? String(raw.district).padStart(2, "0") : "00";
  const party = raw.party?.toUpperCase() || "IND";

  let partyAffiliation = raw.party_full || party;
  if (party === "REP") partyAffiliation = "Republican Party";
  if (party === "DEM") partyAffiliation = "Democratic Party";
  if (party === "LIB") partyAffiliation = "Libertarian Party";

  const cycles =
    raw.cycles && raw.cycles.length > 0
      ? [...raw.cycles].sort((a, b) => a - b)
      : [2024];
  const incumbentChallengeStatus = (raw.incumbent_challenge?.toUpperCase() ||
    "U") as FecIncumbentStatus;

  const firstCommittee =
    raw.principal_committees && raw.principal_committees.length > 0
      ? raw.principal_committees[0]
      : undefined;
  const pcc = firstCommittee?.committee_id ?? "";

  return {
    candidateId: raw.candidate_id,
    name: raw.name.toUpperCase(),
    office,
    state,
    district,
    party,
    partyAffiliation,
    cycles,
    incumbentChallengeStatus,
    principalCampaignCommitteeId: pcc,
    recordClass,
    flags: {
      isFederalCandidate: true,
      hasActivePcc: Boolean(pcc),
    },
  };
}

export function adaptCommittee(
  raw: RawOpenFecCommittee,
  recordClass: FecRecordClass = "actual_openfec",
): FecCommittee {
  if (!isValidCommitteeId(raw.committee_id)) {
    throw new Error(`Invalid Committee ID format: ${raw.committee_id}`);
  }

  const committeeType = (raw.committee_type?.toUpperCase() ||
    "N") as FecCommitteeType;
  const designation = (raw.designation?.toUpperCase() ||
    "U") as FecCommitteeDesignation;

  const typeLabels: Record<string, string> = {
    H: "House Principal/Authorized",
    S: "Senate Principal/Authorized",
    P: "Presidential Principal/Authorized",
    N: "PAC - Nonqualified",
    Q: "PAC - Qualified",
    O: "Super PAC (Independent Expenditure-Only)",
    U: "Single-Candidate Super PAC",
    X: "Party - Nonqualified",
    Y: "Party - Qualified",
    Z: "National Party Nonfederal",
    W: "Leadership PAC",
  };

  const designationLabels: Record<string, string> = {
    P: "Principal Campaign Committee",
    A: "Authorized by Candidate",
    J: "Joint Fundraising Committee",
    D: "Leadership PAC",
    U: "Unauthorized",
    B: "Lobbyist/Registrant PAC",
  };

  const sponsor =
    raw.sponsor_candidate_id ||
    (raw.candidate_ids && raw.candidate_ids.length > 0
      ? raw.candidate_ids[0]
      : null);

  return {
    committeeId: raw.committee_id,
    name: raw.name.toUpperCase(),
    committeeType,
    committeeTypeLabel:
      raw.committee_type_full ||
      typeLabels[committeeType] ||
      "Political Committee",
    designation,
    designationLabel:
      raw.designation_full || designationLabels[designation] || "Unauthorized",
    party: raw.party?.toUpperCase() || null,
    state: raw.state?.toUpperCase() || "US",
    treasurerName: raw.treasurer_name?.toUpperCase() || "TREASURER",
    sponsorCandidateId: sponsor ?? null,
    cycles:
      raw.cycles && raw.cycles.length > 0
        ? [...raw.cycles].sort((a, b) => a - b)
        : [2024],
    recordClass,
  };
}

export function adaptCandidateCommitteeRelationship(
  candidate: FecCandidate,
  committee: FecCommittee,
  cycle: number,
  recordClass: FecRecordClass = "actual_openfec",
): CandidateCommitteeRelationship {
  const isPcc =
    candidate.principalCampaignCommitteeId === committee.committeeId ||
    committee.designation === "P";
  return {
    relationshipId: `rel-${candidate.candidateId}-${committee.committeeId}-${cycle}-${committee.designation}`,
    candidateId: candidate.candidateId,
    committeeId: committee.committeeId,
    cycle,
    designation: committee.designation,
    committeeType: committee.committeeType,
    effectiveDateRange: {
      startYear: cycle - 1,
      endYear: cycle,
    },
    isPrincipalCampaignCommittee: isPcc,
    recordClass,
  };
}

export function adaptReport(
  raw: RawOpenFecReport,
  sourceUrl = "https://api.open.fec.gov/v1/reports/",
  recordClass: FecRecordClass = "actual_openfec",
): FecFilingReport {
  const filingId = String(raw.file_number);
  const ind = (raw.amendment_indicator?.toUpperCase() || "N") as
    "N" | "A" | "T";

  const formType = (raw.form_type?.toUpperCase() || "F3") as FecFormType;
  const rawPayloadStr = JSON.stringify(raw);
  const checksum = computeSha256(rawPayloadStr);

  const itemizedInd = Number(raw.individual_itemized_contributions || 0);
  const unitemizedInd = Number(raw.individual_unitemized_contributions || 0);
  const totalInd = itemizedInd + unitemizedInd;

  const totalReceipts = Number(raw.total_receipts || 0);
  const totalDisbursements = Number(raw.total_disbursements || 0);
  const cashBeginning = Number(raw.cash_on_hand_beginning_period || 0);
  const cashClose = Number(
    raw.cash_on_hand_close_period ||
      cashBeginning + totalReceipts - totalDisbursements,
  );

  return {
    filingId,
    committeeId: raw.committee_id,
    candidateId: raw.candidate_id || null,
    cycle: raw.cycle,
    reportYear: raw.report_year,
    reportType: raw.report_type.toUpperCase(),
    reportTypeDescription: raw.report_type_full || raw.report_type,
    formType,
    coverageStartDate: raw.coverage_start_date.substring(0, 10),
    coverageEndDate: raw.coverage_end_date.substring(0, 10),
    receiptDate: raw.receipt_date.substring(0, 10),
    amendmentChain: {
      amendmentIndicator: ind,
      amendmentVersion: ind === "A" ? 1 : 0,
      amendsFilingId:
        raw.previous_file_number != null
          ? String(raw.previous_file_number)
          : null,
      isLatestActiveAmendment: true,
      supersededByFilingId: null,
    },
    financialSummary: {
      totalReceipts,
      totalDisbursements,
      cashOnHandBeginningPeriod: cashBeginning,
      cashOnHandClosePeriod: cashClose,
      debtsOwedByCommittee: Number(raw.debts_owed_by_committee || 0),
      debtsOwedToCommittee: Number(raw.debts_owed_to_committee || 0),
      individualContributionsTotal: totalInd,
      individualItemizedContributions: itemizedInd,
      individualUnitemizedContributions: unitemizedInd,
      otherPoliticalCommitteeContributions: Number(
        raw.other_political_committee_contributions || 0,
      ),
      transfersFromOtherAuthorizedCommittees: Number(
        raw.transfers_from_other_authorized_committee || 0,
      ),
      candidateContributions: Number(raw.candidate_contributions || 0),
      loansMadeByCandidate: Number(raw.loans_made_by_candidate || 0),
      otherLoans: Number(raw.all_other_loans || 0),
      operatingExpenditures: Number(raw.operating_expenditures || 0),
      refunds: Number(raw.refunded_individual_contributions || 0),
      independentExpendituresTotal: Number(raw.independent_expenditures || 0),
      netContributions: Number(
        raw.net_contributions ||
          totalReceipts - Number(raw.refunded_individual_contributions || 0),
      ),
      netOperatingExpenditures: Number(
        raw.net_operating_expenditures ||
          Number(raw.operating_expenditures || totalDisbursements),
      ),
    },
    recordClass,
    provenance: createFecProvenance(
      sourceUrl,
      checksum,
      "openfec_api",
      recordClass,
      "official_reported",
    ),
  };
}

function categorizeDisbursement(purpose: string): FecDisbursementCategory {
  const p = purpose.toUpperCase();
  if (
    p.includes("AD") ||
    p.includes("MEDIA") ||
    p.includes("TV") ||
    p.includes("DIGITAL") ||
    p.includes("RADIO") ||
    p.includes("BROADCAST")
  ) {
    return "media_advertising";
  }
  if (p.includes("POLL") || p.includes("SURVEY") || p.includes("RESEARCH")) {
    return "polling_research";
  }
  if (
    p.includes("PAYROLL") ||
    p.includes("SALARY") ||
    p.includes("STAFF") ||
    p.includes("WAGE")
  ) {
    return "payroll_staff";
  }
  if (p.includes("CONSULT")) {
    return "consulting";
  }
  if (
    p.includes("TRAVEL") ||
    p.includes("HOTEL") ||
    p.includes("AIRFARE") ||
    p.includes("EVENT") ||
    p.includes("CATERING")
  ) {
    return "travel_events";
  }
  if (
    p.includes("FEE") ||
    p.includes("MERCHANT") ||
    p.includes("CREDIT CARD") ||
    p.includes("FUNDRAIS")
  ) {
    return "fundraising_fees";
  }
  if (p.includes("MAIL") || p.includes("POSTAGE") || p.includes("PRINT")) {
    return "mail_postage";
  }
  if (p.includes("TRANSFER") || p.includes("REFUND")) {
    return "transfers_refunds";
  }
  if (p.includes("LOAN") || p.includes("REPAYMENT")) {
    return "loan_repayments";
  }
  return "other";
}

export function adaptDisbursement(
  raw: RawOpenFecDisbursement,
  recordClass: FecRecordClass = "actual_openfec",
): FecDisbursementItem {
  return {
    transactionId:
      raw.transaction_id ||
      raw.sub_id ||
      `SB-${raw.file_number}-${Math.random().toString(36).substring(2, 8)}`,
    filingId: String(raw.file_number),
    committeeId: raw.committee_id,
    recipientName: raw.recipient_name.toUpperCase(),
    disbursementPurpose: raw.disbursement_description.toUpperCase(),
    disbursementCategory: categorizeDisbursement(raw.disbursement_description),
    disbursementDate: raw.disbursement_date.substring(0, 10),
    disbursementAmount: Number(raw.disbursement_amount),
    memoText: raw.memo_text || null,
    recordClass,
  };
}

export function adaptReceipt(
  raw: RawOpenFecReceipt,
  recordClass: FecRecordClass = "actual_openfec",
): FecReceiptItem {
  const entityType = raw.entity_type?.toUpperCase();
  let contributorType:
    "individual" | "pac" | "party" | "candidate" | "transfer" | "other" =
    "individual";
  if (entityType === "PAC" || entityType === "COM") contributorType = "pac";
  else if (entityType === "PTY") contributorType = "party";
  else if (entityType === "CAN") contributorType = "candidate";

  const isItemized =
    Number(raw.contribution_receipt_amount) >= 200 ||
    Number(raw.contributor_aggregate_ytd || 0) >= 200;

  return {
    transactionId:
      raw.transaction_id ||
      raw.sub_id ||
      `SA-${raw.file_number}-${Math.random().toString(36).substring(2, 8)}`,
    filingId: String(raw.file_number),
    committeeId: raw.committee_id,
    contributorName: raw.contributor_name.toUpperCase(),
    contributorType,
    contributorOccupation: raw.contributor_occupation?.toUpperCase() || null,
    contributorEmployer: raw.contributor_employer?.toUpperCase() || null,
    contributorState: raw.contributor_state?.toUpperCase() || null,
    contributionDate: raw.contribution_receipt_date.substring(0, 10),
    contributionAmount: Number(raw.contribution_receipt_amount),
    aggregateAmountYtd: Number(
      raw.contributor_aggregate_ytd || raw.contribution_receipt_amount,
    ),
    memoText: raw.memo_text || null,
    isItemized,
    recordClass,
  };
}

export function adaptIndependentExpenditure(
  raw: RawOpenFecIndependentExpenditure,
  recordClass: FecRecordClass = "actual_openfec",
): FecIndependentExpenditure {
  const office = (raw.candidate_office?.toUpperCase() ||
    raw.candidate_id?.charAt(0) ||
    "H") as FecOffice;
  const supportOppose = (
    raw.support_oppose_indicator?.toUpperCase() === "O" ? "O" : "S"
  ) as FecSupportOppose;

  return {
    expenditureId:
      raw.sub_id ||
      `SE-${raw.file_number}-${Math.random().toString(36).substring(2, 8)}`,
    filingId: String(raw.file_number),
    committeeId: raw.committee_id,
    committeeName:
      raw.committee_name?.toUpperCase() || "OUTSIDE EXPENDITURE COMMITTEE",
    candidateId: raw.candidate_id,
    candidateName: raw.candidate_name?.toUpperCase() || "TARGET CANDIDATE",
    officeSought: office,
    state: raw.candidate_state?.toUpperCase() || (office === "P" ? "US" : "KY"),
    district: raw.candidate_district
      ? String(raw.candidate_district).padStart(2, "0")
      : null,
    supportOppose,
    payeeName: raw.payee_name.toUpperCase(),
    disbursementDate: raw.expenditure_date.substring(0, 10),
    disseminationDate: (
      raw.dissemination_date || raw.expenditure_date
    ).substring(0, 10),
    amount: Number(raw.expenditure_amount),
    purpose: raw.expenditure_description.toUpperCase(),
    recordClass,
  };
}
