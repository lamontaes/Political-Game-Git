/**
 * Campaign Finance Corpus Compiler
 *
 * Compiles raw fixtures and OpenFEC source streams into a validated,
 * normalized campaign finance corpus with amendment resolution and calibration metrics.
 */

import { resolveFilingAmendments } from "./amendment_resolver";
import { computeSha256, createFecProvenance } from "./provenance";
import type {
  CandidateCommitteeRelationship,
  FecCampaignFinanceCorpus,
  FecCandidate,
  FecCommittee,
  FecDebtRecord,
  FecDisbursementItem,
  FecFilingReport,
  FecIndependentExpenditure,
  FecLoanRecord,
  FecReceiptItem,
} from "./types";
import { validateCampaignFinanceCorpus } from "./validator";

export interface CompilerInput {
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

export function compileCampaignFinanceCorpus(
  input: CompilerInput,
): FecCampaignFinanceCorpus {
  // 1. Resolve amendments across all filings
  const resolvedFilings = resolveFilingAmendments(input.filings);

  // 2. Sort all collections canonically by primary keys
  const sortedCandidates = [...input.candidates].sort((a, b) =>
    a.candidateId.localeCompare(b.candidateId),
  );
  const sortedCommittees = [...input.committees].sort((a, b) =>
    a.committeeId.localeCompare(b.committeeId),
  );
  const sortedRelationships = [...input.relationships].sort((a, b) =>
    a.relationshipId.localeCompare(b.relationshipId),
  );
  const sortedFilings = [...resolvedFilings].sort(
    (a, b) => Number(a.filingId) - Number(b.filingId),
  );
  const sortedReceipts = [...input.receipts].sort((a, b) =>
    a.transactionId.localeCompare(b.transactionId),
  );
  const sortedDisbursements = [...input.disbursements].sort((a, b) =>
    a.transactionId.localeCompare(b.transactionId),
  );
  const sortedLoans = [...input.loans].sort((a, b) =>
    a.loanId.localeCompare(b.loanId),
  );
  const sortedDebts = [...input.debts].sort((a, b) =>
    a.debtId.localeCompare(b.debtId),
  );
  const sortedIe = [...input.independentExpenditures].sort((a, b) =>
    a.expenditureId.localeCompare(b.expenditureId),
  );

  const partialCorpus = {
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-28T18:00:00.000Z",
    candidates: sortedCandidates,
    committees: sortedCommittees,
    relationships: sortedRelationships,
    filings: sortedFilings,
    receipts: sortedReceipts,
    disbursements: sortedDisbursements,
    loans: sortedLoans,
    debts: sortedDebts,
    independentExpenditures: sortedIe,
  };

  const corpusChecksum = computeSha256(JSON.stringify(partialCorpus));
  const provenance = createFecProvenance(
    "https://api.open.fec.gov/v1/",
    corpusChecksum,
    "curated_fec_fixture",
  );

  const corpus: FecCampaignFinanceCorpus = {
    ...partialCorpus,
    provenance,
  };

  // 3. Validate
  const valResult = validateCampaignFinanceCorpus(corpus);
  if (!valResult.valid) {
    throw new Error(
      `Campaign Finance Corpus Validation Failed:\n${valResult.errors.join("\n")}`,
    );
  }

  return corpus;
}
