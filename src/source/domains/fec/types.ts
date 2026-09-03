/**
 * Federal Election Commission candidate, committee and linkage identity.
 *
 * A record establishes that a committee or candidate is registered with the FEC
 * under this identifier, with the name, office, state, district and party code
 * the Commission's own bulk file states. It establishes nothing else. There is
 * no ideology here, no election result, no money, no measure of viability, and
 * no way to derive one: a party affiliation code is the code the filer gave the
 * Commission, and "registered a candidacy" is not "ran", "won", or "mattered".
 *
 * Codes are carried verbatim rather than translated into categories of this
 * substrate's invention, so a reader checks them against the FEC's own data
 * dictionary rather than against this compiler.
 */

import type { Evidence } from "../../core/index";

export type FecRecordKind = "candidate" | "committee" | "linkage";

export interface FecCandidateRecord {
  readonly recordKind: "candidate";
  readonly recordId: string;
  readonly candidateId: string;
  readonly candidateName: string;
  /** The filer's own party code. Not interpreted, not normalized. */
  readonly partyAffiliationCode: string | null;
  readonly electionYear: number | null;
  readonly officeStateCode: string | null;
  /** `H`, `S` or `P`, as published. */
  readonly officeCode: string | null;
  /** House district as published; `00` for at-large, `00` for Senate rows. */
  readonly officeDistrict: string | null;
  /** Incumbent / Challenger / Open-seat code, verbatim. */
  readonly incumbentChallengerOpenCode: string | null;
  /** Candidate status code, verbatim. */
  readonly candidateStatusCode: string | null;
  /** The principal campaign committee the filing designates. */
  readonly principalCampaignCommitteeId: string | null;
  readonly mailingCity: string | null;
  readonly mailingStateCode: string | null;
  readonly mailingZip: string | null;
  readonly evidence: Evidence;
}

export interface FecCommitteeRecord {
  readonly recordKind: "committee";
  readonly recordId: string;
  readonly committeeId: string;
  readonly committeeName: string;
  readonly treasurerName: string | null;
  readonly committeeCity: string | null;
  readonly committeeStateCode: string | null;
  readonly committeeZip: string | null;
  /** Designation code (`P` principal, `A` authorized, `U` unauthorized, …). */
  readonly committeeDesignationCode: string | null;
  /** Committee type code, verbatim. */
  readonly committeeTypeCode: string | null;
  readonly partyAffiliationCode: string | null;
  readonly filingFrequencyCode: string | null;
  readonly organizationTypeCode: string | null;
  readonly connectedOrganizationName: string | null;
  /** The candidate a committee is linked to in this file, if any. */
  readonly candidateId: string | null;
  readonly evidence: Evidence;
}

export interface FecLinkageRecord {
  readonly recordKind: "linkage";
  readonly recordId: string;
  readonly linkageId: string;
  readonly candidateId: string;
  readonly committeeId: string;
  readonly candidateElectionYear: number | null;
  readonly fecElectionYear: number | null;
  readonly committeeTypeCode: string | null;
  readonly committeeDesignationCode: string | null;
  readonly evidence: Evidence;
}

export type FecRecord = FecCandidateRecord | FecCommitteeRecord | FecLinkageRecord;
