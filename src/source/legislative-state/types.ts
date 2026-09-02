/**
 * National Legislative Source Corpus Types
 *
 * Standardized data models for legislative source records ingested from
 * Open States, LegiScan, and official legislative sources.
 *
 * These records represent source evidence with retained official URLs,
 * provenance, and conservative derived lifecycles.
 */

export type LegislativeProvider =
  "openstates" | "legiscan" | "official_direct" | "manual_research";

export type JurisdictionClassification =
  "state" | "federal" | "territory" | "district" | "local";

export type ChamberStructure =
  "bicameral" | "unicameral" | "nonpartisan_unicameral" | "council" | "other";

export type ChamberType =
  | "upper"
  | "lower"
  | "unicameral"
  | "council"
  | "joint"
  | "executive"
  | "committee"
  | "other";

export type MeasureClassification =
  | "bill"
  | "resolution"
  | "joint_resolution"
  | "concurrent_resolution"
  | "constitutional_amendment"
  | "memorial"
  | "order"
  | "other";

export type DerivedLifecycleStatus =
  | "introduced"
  | "active"
  | "chamber-passed"
  | "became-law"
  | "vetoed"
  | "explicitly-failed"
  | "withdrawn"
  | "session-ended-unresolved"
  | "unknown";

export type SessionClassification =
  "regular" | "special" | "extraordinary" | "organizational" | "unknown";

export type SessionState =
  "active" | "adjourned_sine_die" | "completed" | "historical" | "unknown";

export type SponsorshipType =
  "primary" | "cosponsor" | "sponsor" | "joint_sponsor" | "author" | "other";

export type ConfidenceLevel =
  "official" | "provider_standardized" | "derived" | "unverified_research";

export interface SourceProvenance {
  provider: LegislativeProvider;
  providerId: string;
  officialUrl: string | null;
  providerUrl: string | null;
  retrievalTimestamp: string;
  compilerVersion: string;
  sha256: string;
  confidence: ConfidenceLevel;
}

export interface BecameLawEvidence {
  signedDate?: string;
  effectiveDate?: string;
  chapterOrActId?: string;
  vetoOverridden?: boolean;
  withoutSignature?: boolean;
  description?: string;
}

export interface VetoEvidence {
  vetoDate?: string;
  vetoType?: "full" | "line_item" | "pocket";
  description?: string;
}

export interface FailureEvidence {
  failureDate?: string;
  actingBody?: ChamberType;
  stage?: string;
  description?: string;
}

export interface LegislativeLifecycleSummary {
  status: DerivedLifecycleStatus;
  stageDate: string | null;
  terminalState: boolean;
  becameLawEvidence: BecameLawEvidence | null;
  vetoEvidence: VetoEvidence | null;
  failureEvidence: FailureEvidence | null;
  rationale: string;
}

export interface LegislativeJurisdictionSourceRecord {
  sourceKey: string;
  provider: LegislativeProvider;
  providerJurisdictionId: string;
  name: string;
  classification: JurisdictionClassification;
  chamberStructure: ChamberStructure;
  sourceUrl: string | null;
  officialWebsiteUrl: string | null;
  retrievalTimestamp: string;
  asOfDate: string | null;
  provenance: SourceProvenance;
}

export interface LegislativeSessionSourceRecord {
  sessionId: string;
  jurisdictionKey: string;
  providerSessionId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  classification: SessionClassification;
  sessionState: SessionState;
  sineDie: boolean;
  provenance: SourceProvenance;
}

export interface LegislativeMeasureSourceRecord {
  measureId: string;
  jurisdictionKey: string;
  sessionId: string;
  providerMeasureId: string;
  identifier: string;
  title: string;
  classification: MeasureClassification;
  chamberOrigin: ChamberType;
  officialUrl: string | null;
  providerUrl: string | null;
  rawProviderStatus: string | null;
  derivedLifecycle: LegislativeLifecycleSummary;
  subjects: string[];
  summary: string | null;
  retrievalTimestamp: string;
  provenance: SourceProvenance;
}

export interface LegislativeTextVersionSourceRecord {
  textVersionId: string;
  measureId: string;
  providerDocumentId: string;
  versionLabel: string;
  versionDate: string | null;
  documentUrl: string | null;
  officialUrl: string | null;
  mediaType: string | null;
  contentHash: string | null;
  provenance: SourceProvenance;
}

export interface LegislativeActionSourceRecord {
  actionId: string;
  measureId: string;
  actionDate: string;
  actingBody: ChamberType;
  actingBodyName: string | null;
  providerClassifications: string[];
  rawDescription: string;
  sourceUrl: string | null;
  officialUrl: string | null;
  sequenceIndex: number;
  provenance: SourceProvenance;
}

export interface RollCallEntry {
  personId: string | null;
  personName: string;
  option: "yes" | "no" | "other" | "absent" | "excused" | "nv";
  rawOption?: string;
}

export interface LegislativeVoteSourceRecord {
  voteId: string;
  measureId: string;
  chamber: ChamberType;
  motion: string;
  date: string;
  passed: boolean;
  yeas: number;
  nays: number;
  otherCounts: Record<string, number>;
  rollCall: RollCallEntry[];
  providerClassification: string | null;
  officialUrl: string | null;
  sourceUrl: string | null;
  provenance: SourceProvenance;
}

export interface LegislativeSponsorSourceRecord {
  sponsorId: string;
  measureId: string;
  personProviderId: string | null;
  personName: string;
  sponsorshipType: SponsorshipType;
  isPrimary: boolean;
  provenance: SourceProvenance;
}

export interface JurisdictionCoverageSummary {
  sourceKey: string;
  name: string;
  classification: JurisdictionClassification;
  chamberStructure: ChamberStructure;
  officialWebsiteUrl: string | null;
  providerJurisdictionId: string;
  availableSessionsCount: number;
  recentSessions: string[];
  totalMeasuresTracked: number;
  totalActionsTracked: number;
  totalVotesTracked: number;
  lastRetrievedTimestamp: string;
}

export interface NationalCoverageManifest {
  manifestVersion: string;
  generatedAt: string;
  totalJurisdictions: number;
  totalSessionsIndexed: number;
  totalMeasuresSampled: number;
  totalActionsSampled: number;
  totalVotesSampled: number;
  jurisdictions: Record<string, JurisdictionCoverageSummary>;
  providers: {
    primary: {
      name: string;
      documentationUrl: string;
      bulkDataUrl: string;
    };
    secondary: {
      name: string;
      documentationUrl: string;
      datasetsUrl: string;
    };
  };
  sha256: string;
}

export interface NormalizedCorpusPackage {
  manifest: NationalCoverageManifest;
  jurisdictions: LegislativeJurisdictionSourceRecord[];
  sessions: LegislativeSessionSourceRecord[];
  measures: LegislativeMeasureSourceRecord[];
  textVersions: LegislativeTextVersionSourceRecord[];
  actions: LegislativeActionSourceRecord[];
  votes: LegislativeVoteSourceRecord[];
  sponsors: LegislativeSponsorSourceRecord[];
  buildMetadata: {
    compiledAt: string;
    compilerVersion: string;
    recordCounts: Record<string, number>;
    checksum: string;
  };
}

export interface ClaimedChamberVote {
  chamber: ChamberType;
  motion?: string;
  date?: string;
  yeas: number;
  nays: number;
}

export interface ResearchValidationEpisode {
  episodeId: string;
  jurisdictionKey: string;
  sessionId: string;
  measureIdentifier: string;
  claimedTitle?: string;
  claimedChamberVotes?: ClaimedChamberVote[];
  claimedSignedDate?: string;
  claimedActsChapter?: string;
  claimedLifecycle?: DerivedLifecycleStatus;
  claimedSessionType?: SessionClassification;
}

export interface ValidationDiscrepancy {
  field: string;
  claimedValue: unknown;
  corpusValue: unknown;
  severity: "critical_contradiction" | "mismatch" | "unverified";
  explanation: string;
}

export interface ResearchValidationResult {
  episodeId: string;
  measureIdentifier: string;
  valid: boolean;
  discrepancies: ValidationDiscrepancy[];
  matchSummary: string;
}
