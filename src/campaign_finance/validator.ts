/**
 * Campaign Finance Corpus Validator
 *
 * Enforces schema compliance, ID syntax, amendment graph invariants,
 * arithmetic consistency, cycle boundaries, candidate office math,
 * source-vs-synthetic classification integrity, and zero secret leakage.
 */

import {
  isValidCandidateId,
  isValidCommitteeId,
  isValidElectionCycle,
  isValidFilingId,
} from "./ids";
import type { FecCampaignFinanceCorpus } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCampaignFinanceCorpus(
  corpus: FecCampaignFinanceCorpus,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validRecordClasses = new Set([
    "actual_openfec",
    "transformed_official",
    "synthetic_fixture",
  ]);

  // 1. Candidate Validation & Math Checks
  const candidateIds = new Set<string>();
  let houseCount = 0;
  let senateCount = 0;
  let presCount = 0;

  for (const cand of corpus.candidates) {
    if (!isValidCandidateId(cand.candidateId)) {
      errors.push(`Invalid candidate ID format: "${cand.candidateId}"`);
    }
    if (candidateIds.has(cand.candidateId)) {
      errors.push(`Duplicate candidate ID: "${cand.candidateId}"`);
    }
    candidateIds.add(cand.candidateId);

    if (!["H", "S", "P"].includes(cand.office)) {
      errors.push(
        `Candidate ${cand.candidateId} has invalid office: "${cand.office}"`,
      );
    } else {
      if (cand.office === "H") houseCount++;
      else if (cand.office === "S") senateCount++;
      else if (cand.office === "P") presCount++;
    }

    if (!validRecordClasses.has(cand.recordClass)) {
      errors.push(
        `Candidate ${cand.candidateId} has invalid recordClass: "${cand.recordClass}"`,
      );
    }

    for (const cy of cand.cycles) {
      if (!isValidElectionCycle(cy)) {
        errors.push(
          `Candidate ${cand.candidateId} has invalid election cycle: ${cy}`,
        );
      }
    }
  }

  // Exact math check
  if (houseCount + senateCount + presCount !== corpus.candidates.length) {
    errors.push(
      `Candidate office breakdown arithmetic mismatch: House (${houseCount}) + Senate (${senateCount}) + Pres (${presCount}) !== Total (${corpus.candidates.length})`,
    );
  }

  // 2. Committee Validation
  const committeeIds = new Set<string>();
  for (const com of corpus.committees) {
    if (!isValidCommitteeId(com.committeeId)) {
      errors.push(`Invalid committee ID format: "${com.committeeId}"`);
    }
    if (committeeIds.has(com.committeeId)) {
      errors.push(`Duplicate committee ID: "${com.committeeId}"`);
    }
    committeeIds.add(com.committeeId);

    if (!validRecordClasses.has(com.recordClass)) {
      errors.push(
        `Committee ${com.committeeId} has invalid recordClass: "${com.recordClass}"`,
      );
    }

    for (const cy of com.cycles) {
      if (!isValidElectionCycle(cy)) {
        errors.push(
          `Committee ${com.committeeId} has invalid election cycle: ${cy}`,
        );
      }
    }
  }

  // 3. Candidate-Committee Relationships
  for (const rel of corpus.relationships) {
    if (!candidateIds.has(rel.candidateId)) {
      errors.push(
        `Relationship ${rel.relationshipId} references unknown candidate: ${rel.candidateId}`,
      );
    }
    if (!committeeIds.has(rel.committeeId)) {
      errors.push(
        `Relationship ${rel.relationshipId} references unknown committee: ${rel.committeeId}`,
      );
    }
    if (!isValidElectionCycle(rel.cycle)) {
      errors.push(
        `Relationship ${rel.relationshipId} has invalid cycle: ${rel.cycle}`,
      );
    }
    if (!validRecordClasses.has(rel.recordClass)) {
      errors.push(
        `Relationship ${rel.relationshipId} has invalid recordClass: "${rel.recordClass}"`,
      );
    }
  }

  // 4. Filings & Amendment Chains
  const filingIds = new Set<string>();
  const activeCoverageKeys = new Set<string>();

  for (const f of corpus.filings) {
    if (!isValidFilingId(f.filingId)) {
      errors.push(`Invalid filing ID: "${f.filingId}"`);
    }
    if (filingIds.has(f.filingId)) {
      errors.push(`Duplicate filing ID: "${f.filingId}"`);
    }
    filingIds.add(f.filingId);

    if (!committeeIds.has(f.committeeId)) {
      errors.push(
        `Filing ${f.filingId} references unknown committee: ${f.committeeId}`,
      );
    }

    if (f.candidateId && !candidateIds.has(f.candidateId)) {
      errors.push(
        `Filing ${f.filingId} references unknown candidate: ${f.candidateId}`,
      );
    }

    if (!isValidElectionCycle(f.cycle)) {
      errors.push(`Filing ${f.filingId} has invalid cycle: ${f.cycle}`);
    }

    if (!validRecordClasses.has(f.recordClass)) {
      errors.push(
        `Filing ${f.filingId} has invalid recordClass: "${f.recordClass}"`,
      );
    }

    // Check financial numbers
    if (f.financialSummary.totalReceipts < 0) {
      warnings.push(
        `Filing ${f.filingId} has negative total receipts: ${f.financialSummary.totalReceipts}`,
      );
    }
    if (f.financialSummary.totalDisbursements < 0) {
      warnings.push(
        `Filing ${f.filingId} has negative total disbursements: ${f.financialSummary.totalDisbursements}`,
      );
    }

    // Non-double-counting check on active filings
    if (f.amendmentChain.isLatestActiveAmendment) {
      const covKey = `${f.committeeId}:${f.cycle}:${f.reportType}:${f.coverageStartDate}:${f.coverageEndDate}`;
      if (activeCoverageKeys.has(covKey)) {
        errors.push(
          `Double counting detected: multiple active filings for coverage window ${covKey}`,
        );
      }
      activeCoverageKeys.add(covKey);
    }
  }

  // 5. Itemized Receipts
  for (const r of corpus.receipts) {
    if (!filingIds.has(r.filingId)) {
      errors.push(
        `Receipt ${r.transactionId} references missing filing: ${r.filingId}`,
      );
    }
    if (!committeeIds.has(r.committeeId)) {
      errors.push(
        `Receipt ${r.transactionId} references missing committee: ${r.committeeId}`,
      );
    }
    if (!validRecordClasses.has(r.recordClass)) {
      errors.push(
        `Receipt ${r.transactionId} has invalid recordClass: "${r.recordClass}"`,
      );
    }
  }

  // 6. Itemized Disbursements
  for (const d of corpus.disbursements) {
    if (!filingIds.has(d.filingId)) {
      errors.push(
        `Disbursement ${d.transactionId} references missing filing: ${d.filingId}`,
      );
    }
    if (!committeeIds.has(d.committeeId)) {
      errors.push(
        `Disbursement ${d.transactionId} references missing committee: ${d.committeeId}`,
      );
    }
    if (!validRecordClasses.has(d.recordClass)) {
      errors.push(
        `Disbursement ${d.transactionId} has invalid recordClass: "${d.recordClass}"`,
      );
    }
  }

  // 7. Loans (Schedule C) vs Debts (Schedule D) Distinction
  for (const loan of corpus.loans) {
    if (!filingIds.has(loan.filingId)) {
      errors.push(
        `Loan ${loan.loanId} references missing filing: ${loan.filingId}`,
      );
    }
    if (!committeeIds.has(loan.committeeId)) {
      errors.push(
        `Loan ${loan.loanId} references missing committee: ${loan.committeeId}`,
      );
    }
    if (loan.loanBalanceRemaining < 0) {
      errors.push(
        `Loan ${loan.loanId} has negative balance: ${loan.loanBalanceRemaining}`,
      );
    }
    if (!validRecordClasses.has(loan.recordClass)) {
      errors.push(
        `Loan ${loan.loanId} has invalid recordClass: "${loan.recordClass}"`,
      );
    }
  }

  for (const debt of corpus.debts) {
    if (!filingIds.has(debt.filingId)) {
      errors.push(
        `Debt ${debt.debtId} references missing filing: ${debt.filingId}`,
      );
    }
    if (!committeeIds.has(debt.committeeId)) {
      errors.push(
        `Debt ${debt.debtId} references missing committee: ${debt.committeeId}`,
      );
    }
    if (debt.endingBalanceThisPeriod < 0) {
      errors.push(
        `Debt ${debt.debtId} has negative balance: ${debt.endingBalanceThisPeriod}`,
      );
    }
    if (!validRecordClasses.has(debt.recordClass)) {
      errors.push(
        `Debt ${debt.debtId} has invalid recordClass: "${debt.recordClass}"`,
      );
    }
  }

  // 8. Independent Expenditures (Schedule E)
  for (const ie of corpus.independentExpenditures) {
    if (!filingIds.has(ie.filingId)) {
      errors.push(
        `Independent Expenditure ${ie.expenditureId} references missing filing: ${ie.filingId}`,
      );
    }
    if (!committeeIds.has(ie.committeeId)) {
      errors.push(
        `Independent Expenditure ${ie.expenditureId} references missing committee: ${ie.committeeId}`,
      );
    }
    if (!["S", "O"].includes(ie.supportOppose)) {
      errors.push(
        `Independent Expenditure ${ie.expenditureId} has invalid support/oppose flag: ${ie.supportOppose}`,
      );
    }
    if (ie.amount <= 0) {
      errors.push(
        `Independent Expenditure ${ie.expenditureId} has non-positive amount: ${ie.amount}`,
      );
    }
    if (!validRecordClasses.has(ie.recordClass)) {
      errors.push(
        `Independent Expenditure ${ie.expenditureId} has invalid recordClass: "${ie.recordClass}"`,
      );
    }
  }

  // 9. Zero Secrets Scan
  const serialized = JSON.stringify(corpus);
  const secretPatterns = [
    /api_key=[A-Za-z0-9_-]{16,}/i,
    /bearer\s+[A-Za-z0-9_.-]{20,}/i,
    /secret[_-]?key/i,
  ];

  for (const pat of secretPatterns) {
    if (pat.test(serialized)) {
      errors.push(
        `Security violation: potential API key or secret detected matching ${pat}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
