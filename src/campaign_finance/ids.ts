/**
 * ID Validators and Formatters for Federal Campaign Finance Entities
 */

import type { FecOffice } from "./types";

/**
 * Validates a candidate ID:
 * Format: [H|S|P][0-9][A-Z0-9]{2}[0-9]{5} (9 characters)
 * e.g., H6KY06123, S0KY00123, P80001234
 */
export function isValidCandidateId(candidateId: string): boolean {
  if (typeof candidateId !== "string") return false;
  return /^[HSP][0-9][A-Z0-9]{2}[0-9]{5}$/.test(candidateId);
}

export function parseCandidateOffice(candidateId: string): FecOffice {
  if (!isValidCandidateId(candidateId)) {
    throw new Error(`Invalid FEC candidate ID format: "${candidateId}"`);
  }
  return candidateId.charAt(0) as FecOffice;
}

/**
 * Validates a committee ID:
 * Format: C[0-9]{8} (9 characters)
 * e.g., C00473538, C00193433, C00703975
 */
export function isValidCommitteeId(committeeId: string): boolean {
  if (typeof committeeId !== "string") return false;
  return /^C[0-9]{8}$/.test(committeeId);
}

/**
 * Validates a filing ID (positive integer as string or number)
 */
export function isValidFilingId(filingId: string | number): boolean {
  const str = String(filingId).trim();
  return /^[0-9]+$/.test(str) && Number(str) > 0;
}

/**
 * Validates a 4-digit election cycle (even year >= 1970)
 */
export function isValidElectionCycle(cycle: number): boolean {
  return (
    Number.isInteger(cycle) && cycle >= 1970 && cycle <= 2100 && cycle % 2 === 0
  );
}

/**
 * Generates a canonical relationship ID
 */
export function createRelationshipId(
  candidateId: string,
  committeeId: string,
  cycle: number,
  designation: string,
): string {
  return `rel-${candidateId}-${committeeId}-${cycle}-${designation}`;
}
