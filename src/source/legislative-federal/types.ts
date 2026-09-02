/**
 * Federal Legislative Source Corpus - Core Type Definitions
 *
 * Dedicated provider-specific data structures for Congress.gov and GovInfo APIs.
 * Pure TypeScript, zero simulation dependencies, decoupled from state legislation schemas.
 */

export type FederalChamber = "house" | "senate" | "joint" | "president";

export type FederalMeasureType =
  "hr" | "s" | "hjres" | "sjres" | "hconres" | "sconres" | "hres" | "sres";

export type FederalAmendmentType = "hamdt" | "samdt";

export type FederalDerivedLifecycleStatus =
  | "introduced"
  | "committee-activity"
  | "chamber-passed"
  | "both-chambers-passed"
  | "presented-to-president"
  | "signed-became-law"
  | "vetoed"
  | "veto-override"
  | "explicitly-failed-or-withdrawn"
  | "unresolved";

export interface FederalSessionRecord {
  sessionNumber: number;
  chamber?: FederalChamber;
  startDate: string;
  endDate?: string | null;
  sineDie: boolean;
}

export interface FederalCongressRecord {
  congressNumber: number;
  name: string;
  startYear: number;
  endYear: number;
  sessions: FederalSessionRecord[];
}

export interface FederalRecordedVoteRef {
  congress: number;
  chamber: FederalChamber;
  rollNumber: number;
  url?: string | null;
}

export interface FederalActionRecord {
  actionId: string;
  sequence: number;
  actionDate: string;
  actingChamber: FederalChamber;
  actionCode?: string | null;
  actionType?: string | null;
  rawDescription: string;
  officialCitation?: string | null;
  recordedVoteRef?: FederalRecordedVoteRef | null;
  sourceUrl?: string | null;
}

export interface FederalAmendmentRecord {
  amendmentId: string;
  amendmentType: FederalAmendmentType;
  amendmentNumber: number;
  congress: number;
  parentMeasureId: string;
  chamber: FederalChamber;
  description?: string | null;
  purpose?: string | null;
  sponsorBioguideId?: string | null;
  sponsorName?: string | null;
  sponsorParty?: string | null;
  sponsorState?: string | null;
  offeredDate: string;
  rawStatus: string;
  isAgreedTo: boolean;
  isFailed: boolean;
  isWithdrawn: boolean;
  sourceUrl?: string | null;
}

export interface FederalSponsorRecord {
  bioguideId: string;
  fullName: string;
  chamber: FederalChamber;
  party?: string | null;
  state: string;
  district?: number | null;
  isPrimary: boolean;
  dateCosponsored?: string | null;
  dateWithdrawn?: string | null;
}

export interface FederalSubcommitteeRecord {
  systemCode: string;
  name: string;
}

export interface FederalCommitteeRecord {
  systemCode: string;
  chamber: FederalChamber;
  name: string;
  subcommittees?: FederalSubcommitteeRecord[];
  activityTypes?: string[];
  referralDate?: string | null;
  reportedDate?: string | null;
}

export interface FederalTextFormat {
  formatType: "xml" | "pdf" | "html" | "txt" | "formatted_text";
  url: string;
  sha256?: string | null;
}

export interface FederalTextVersionRecord {
  versionCode: string;
  versionName: string;
  date: string;
  govinfoPackageId?: string | null;
  formats: FederalTextFormat[];
  contentSha256?: string | null;
}

export type FederalVoteCast = "Yea" | "Nay" | "Present" | "Not Voting";

export interface FederalHouseVoteMemberTally {
  bioguideId: string;
  name: string;
  state: string;
  party: string;
  voteCast: FederalVoteCast;
}

export interface FederalVoteTotals {
  yea: number;
  nay: number;
  present: number;
  notVoting: number;
}

export interface FederalHouseVoteRecord {
  voteId: string;
  congress: number;
  session: number;
  rollNumber: number;
  chamber: "house";
  voteDate: string;
  question: string;
  result: string;
  voteType: string;
  totals: FederalVoteTotals;
  partyTotals?: Record<string, FederalVoteTotals>;
  memberVotes?: FederalHouseVoteMemberTally[];
  officialSourceUrl?: string | null;
  relatedMeasureId?: string | null;
}

export interface FederalProvenanceMetadata {
  primarySource: "Congress.gov API";
  secondaryDocumentSource: "GovInfo API";
  retrievedAt: string;
  schemaVersion: string;
  recordSha256: string;
}

export interface FederalDerivedLifecycle {
  status: FederalDerivedLifecycleStatus;
  detail: string;
  enactmentDate?: string | null;
  vetoDate?: string | null;
  vetoOverrideDate?: string | null;
  failureReason?: string | null;
}

export interface FederalMeasureRecord {
  measureId: string;
  congress: number;
  measureType: FederalMeasureType;
  measureNumber: number;
  displayNumber: string;
  title: string;
  originChamber: "house" | "senate";
  introducedDate: string;
  policyArea?: string | null;
  legislativeSubjects?: string[];
  sponsors: FederalSponsorRecord[];
  committees: FederalCommitteeRecord[];
  actions: FederalActionRecord[];
  amendments: FederalAmendmentRecord[];
  textVersions: FederalTextVersionRecord[];
  houseVotes: FederalHouseVoteRecord[];
  publicLawNumber?: string | null;
  rawProviderStatus: string;
  derivedLifecycle: FederalDerivedLifecycle;
  officialCongressGovUrl: string;
  govinfoPackageId?: string | null;
  provenance: FederalProvenanceMetadata;
}

export interface FederalCorpusBundle {
  schemaVersion: string;
  generatedAt: string;
  primarySource: string;
  secondaryDocumentSource: string;
  corpusSha256: string;
  congresses: FederalCongressRecord[];
  measures: FederalMeasureRecord[];
  houseVotes: FederalHouseVoteRecord[];
}

export interface FederalCoverageManifestCongressEntry {
  congressNumber: number;
  name: string;
  startYear: number;
  endYear: number;
  measureCount: number;
  enactedLawCount: number;
  vetoCount: number;
  vetoOverrideCount: number;
  resolutionCount: number;
  amendmentCount: number;
  houseVoteCount: number;
  textVersionCount: number;
}

export interface FederalCoverageManifest {
  manifestVersion: string;
  generatedAt: string;
  primarySource: string;
  secondaryDocumentSource: string;
  totalMeasures: number;
  totalEnactedLaws: number;
  totalVetoes: number;
  totalVetoOverrides: number;
  totalHouseVotes: number;
  totalAmendments: number;
  congresses: FederalCoverageManifestCongressEntry[];
  corpusSha256: string;
}
