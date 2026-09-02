/**
 * Official Federal Election Commission (FEC) Corpus Types
 *
 * Provides identity, linkage, and metadata schemas for FEC bulk data sources:
 * - Candidate Master (`cn.txt`)
 * - Committee Master (`cm.txt`)
 * - Candidate-Committee Linkage (`ccl.txt`)
 */

export type FecOfficeCode = "H" | "S" | "P" | "UNKNOWN";

export type FecIncumbentChallengerCode = "I" | "C" | "O" | "UNKNOWN";

export type FecCandidateStatusCode = "C" | "F" | "N" | "P" | "UNKNOWN";

export type FecCommitteeDesignationCode =
  | "A" // Authorized by candidate
  | "B" // Lobbyist/Registrant PAC
  | "D" // Leadership PAC
  | "J" // Joint fundraiser
  | "P" // Principal campaign committee of candidate
  | "U" // Unauthorized
  | "UNKNOWN";

export type FecCommitteeTypeCode =
  | "C" // Communication Cost
  | "E" // Electioneering Communication
  | "H" // House
  | "I" // Independent Expenditure (Single Candidate)
  | "N" // PAC - Nonqualified
  | "O" // Super PAC (Independent Expenditure-Only)
  | "P" // Presidential
  | "Q" // PAC - Qualified
  | "S" // Senate
  | "U" // Single Candidate Independent Expenditure
  | "V" // PAC with Non-Contribution Account - Qualified
  | "W" // PAC with Non-Contribution Account - Nonqualified
  | "X" // Party - Nonqualified
  | "Y" // Party - Qualified
  | "Z" // National Party Nonfederal Account
  | "UNKNOWN";

export type FecFilingFrequencyCode =
  | "A" // Administratively terminated
  | "D" // Debt trigger
  | "M" // Monthly
  | "Q" // Quarterly
  | "T" // Terminated
  | "W" // Waived
  | "UNKNOWN";

export type FecInterestGroupCategoryCode =
  | "C" // Corporation
  | "L" // Labor Organization
  | "M" // Membership Organization
  | "T" // Trade Association
  | "V" // Cooperative
  | "W" // Corp without Capital Stock
  | "UNKNOWN";

export interface FecCandidateRecord {
  /** Candidate ID (e.g., 'H0AL01055') */
  readonly candidateId: string;
  /** Candidate name as published by FEC (e.g., 'CARL, JERRY LEE, JR') */
  readonly candidateName: string;
  /** Party affiliation code if published (e.g., 'REP', 'DEM', 'IND') */
  readonly partyAffiliation: string | null;
  /** Election year/cycle (e.g., 2024) */
  readonly electionYear: number;
  /** Office state code (e.g., 'AL', 'US') */
  readonly officeState: string;
  /** Office sought code (H = House, S = Senate, P = President) */
  readonly office: FecOfficeCode;
  /** District number string ('00' for At-Large/Senate/President, or '01', '02', etc.) */
  readonly district: string;
  /** Incumbent / Challenger / Open status code */
  readonly incumbentChallengerStatus: FecIncumbentChallengerCode;
  /** Candidate status code */
  readonly candidateStatus: FecCandidateStatusCode;
  /** Principal Campaign Committee ID if published (e.g., 'C00697789') */
  readonly principalCampaignCommitteeId: string | null;
  /** Mailing address street 1 */
  readonly street1: string | null;
  /** Mailing address street 2 */
  readonly street2: string | null;
  /** Mailing city */
  readonly city: string | null;
  /** Mailing state */
  readonly state: string | null;
  /** Mailing zip code */
  readonly zipCode: string | null;
}

export interface FecCommitteeRecord {
  /** Committee ID (e.g., 'C00000059') */
  readonly committeeId: string;
  /** Committee name as published by FEC */
  readonly committeeName: string;
  /** Treasurer name */
  readonly treasurerName: string | null;
  /** Street address 1 */
  readonly street1: string | null;
  /** Street address 2 */
  readonly street2: string | null;
  /** City */
  readonly city: string | null;
  /** State */
  readonly state: string | null;
  /** Zip code */
  readonly zipCode: string | null;
  /** Committee designation code */
  readonly designation: FecCommitteeDesignationCode;
  /** Committee type code */
  readonly committeeType: FecCommitteeTypeCode;
  /** Party affiliation if published */
  readonly partyAffiliation: string | null;
  /** Filing frequency code */
  readonly filingFrequency: FecFilingFrequencyCode;
  /** Interest group category code */
  readonly interestGroupCategory: FecInterestGroupCategoryCode;
  /** Connected organization name */
  readonly connectedOrganizationName: string | null;
  /** Linked candidate ID if published directly in committee master */
  readonly candidateId: string | null;
}

export interface FecLinkageRecord {
  /** Candidate ID */
  readonly candidateId: string;
  /** Candidate election year */
  readonly candidateElectionYear: number;
  /** FEC election cycle year */
  readonly fecElectionYear: number;
  /** Linked Committee ID */
  readonly committeeId: string;
  /** Committee type code at linkage time */
  readonly committeeType: FecCommitteeTypeCode;
  /** Committee designation code at linkage time */
  readonly committeeDesignation: FecCommitteeDesignationCode;
  /** Linkage ID from source */
  readonly linkageId: string;
}

export interface FecSourceArtifactManifest {
  readonly artifactName: string;
  readonly sourceUrl: string;
  readonly retrievalTimestamp: string;
  readonly sha256Hex: string;
  readonly recordCount: number;
}

export interface FecCorpusManifest {
  readonly schemaVersion: "1.0.0";
  readonly cycle: number;
  readonly compiledAt: string;
  readonly sourceArtifacts: readonly FecSourceArtifactManifest[];
  readonly totalCandidates: number;
  readonly totalCommittees: number;
  readonly totalLinkages: number;
}

export interface FecCorpusDataset {
  readonly manifest: FecCorpusManifest;
  readonly candidates: readonly FecCandidateRecord[];
  readonly committees: readonly FecCommitteeRecord[];
  readonly linkages: readonly FecLinkageRecord[];
}
