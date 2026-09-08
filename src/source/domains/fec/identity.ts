/**
 * FEC identifier grammars and official vectors.
 *
 * The vectors are real registrations read from the Commission's own bulk files,
 * chosen for the shapes that break naive readers: a Senate candidate whose
 * district is published as `00`, a presidential candidate whose identifier has
 * no state segment, and a committee registered to no candidate at all.
 */

/** `H`/`S`/`P`, an election-year digit, a two-character state or office segment, five digits. */
export const CANDIDATE_ID_PATTERN = /^[HSP][0-9][A-Z0-9]{2}[0-9]{5}$/;

/** `C` followed by eight digits. */
export const COMMITTEE_ID_PATTERN = /^C[0-9]{8}$/;

export function isCandidateId(value: string): boolean {
  return CANDIDATE_ID_PATTERN.test(value);
}

export function isCommitteeId(value: string): boolean {
  return COMMITTEE_ID_PATTERN.test(value);
}

export interface FecCandidateVector {
  readonly candidateId: string;
  readonly officeCode: string;
  readonly officeStateCode: string;
  readonly officeDistrict: string;
  readonly note: string;
}

export const OFFICIAL_FEC_CANDIDATE_VECTORS: readonly FecCandidateVector[] = [
  {
    candidateId: "H0AL01055",
    officeCode: "H",
    officeStateCode: "AL",
    officeDistrict: "01",
    note: "A House candidate: the identifier's state segment and the office state agree, and the district is a real district number.",
  },
  {
    candidateId: "H0AK00105",
    officeCode: "H",
    officeStateCode: "AK",
    officeDistrict: "00",
    note: "Alaska's at-large House seat, published as district 00 — the same 00 the Census uses for at-large districts.",
  },
];

export interface FecCommitteeVector {
  readonly committeeId: string;
  readonly committeeName: string;
  readonly note: string;
}

export const OFFICIAL_FEC_COMMITTEE_VECTORS: readonly FecCommitteeVector[] = [
  {
    committeeId: "C00000059",
    committeeName: "HALLMARK CARDS, INC. PAC (HALLPAC)",
    note: "The first committee in the master file: a corporate PAC linked to no candidate, which is why the candidate link is nullable.",
  },
  {
    committeeId: "C00000422",
    committeeName: "AMERICAN MEDICAL ASSOCIATION POLITICAL ACTION COMMITTEE",
    note: "A trade association PAC, held as a second stable vector near the head of the file.",
  },
];
