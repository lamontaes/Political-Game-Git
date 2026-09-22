import type { EntityId, IsoDate } from "../types";

/**
 * PRESS46 record family (CRUNCH46 §10, ALIVE44 chunks 4–5).
 *
 * One optional, sequenced history family. Each record indexes occurrences that
 * already live elsewhere — events, claims, knowledge, evidence, resource flows
 * and publications — and never duplicates their truth. Everything a person
 * could come to know is still an ordinary event plus a knowledge record.
 */
export const PRESS_CONTRACT_VERSION = "press46/v1" as const;
/** CRUNCH46 §13 director-authored initial balancing; not empirical fitting. */
export const PRESS_POLICY_VERSION = "crunch46-provisional-v1" as const;

export const MEDIA_SCOPES = ["national", "state", "regional", "local"] as const;
export type MediaScope = (typeof MEDIA_SCOPES)[number];

export const MEDIA_PRODUCTS = [
  "general-newspaper",
  "public-affairs-broadcaster",
  "politics-publication",
  "state-newsroom",
  "community-outlet",
] as const;
export type MediaProduct = (typeof MEDIA_PRODUCTS)[number];

export const MEDIA_MEDIUMS = [
  "text",
  "broadcast",
  "audio",
  "newsletter",
  "digital",
] as const;
export type MediaMedium = (typeof MEDIA_MEDIUMS)[number];

export const MEDIA_BEATS = [
  "general-assignment",
  "congress",
  "statehouse",
  "local-government",
  "campaigns",
  "business-economy",
  "public-safety",
  "investigations",
  "international",
] as const;
export type MediaBeat = (typeof MEDIA_BEATS)[number];

export const MEDIA_RESOURCE_TIERS = ["small", "standard", "major"] as const;
export type MediaResourceTier = (typeof MEDIA_RESOURCE_TIERS)[number];

/** §13: authored workload limit, not a quality score. */
export const MEDIA_ACTIVE_ASSIGNMENT_CAPACITY: Readonly<
  Record<MediaResourceTier, number>
> = { small: 1, standard: 3, major: 8 };

export const MEDIA_CADENCES = ["continuous", "daily", "periodic"] as const;
export type MediaCadence = (typeof MEDIA_CADENCES)[number];

/** ALIVE44 R1–R8. */
export const STORY_FAMILIES = [
  "scheduled-beat",
  "press-request",
  "records",
  "allegation",
  "economy-release",
  "campaign-activity",
  "breaking-crisis",
  "follow-up",
] as const;
export type StoryFamily = (typeof STORY_FAMILIES)[number];

export const LEAD_ROUTES = [
  "public-record",
  "witnessed-event",
  "source-tip",
  "press-release",
  "editor-assignment",
  "player-contact",
] as const;
export type LeadRoute = (typeof LEAD_ROUTES)[number];

export const STORY_DECISIONS = [
  "assigned",
  "queued",
  "declined",
  "response-requested",
  "subject-responded",
  "held",
  "narrowed",
  "published",
  "corrected",
] as const;
export type StoryDecision = (typeof STORY_DECISIONS)[number];

/**
 * Ground rules agreed before disclosure (AP/Reuters via ALIVE44 chunk 5).
 * `background` requires the exact negotiated attribution label.
 */
export const SOURCE_TERMS = [
  "on-record",
  "background",
  "deep-background",
  "off-record",
] as const;
export type SourceTerms = (typeof SOURCE_TERMS)[number];

export const SOURCE_TERMS_GLOSSARY: Readonly<Record<SourceTerms, string>> = {
  "on-record":
    "On the record: what you say can be published with your name on it.",
  background:
    "Background: what you say can be published, but only credited to the exact description you both agreed, never your name.",
  "deep-background":
    "Deep background: the reporter may use the information without crediting any source at all. Only some outlets accept this.",
  "off-record":
    "Off the record: what you say cannot be published from this conversation. The reporter may still try to confirm it independently with other sources.",
};

export function sourceTermsPubliclyUsable(terms: SourceTerms): boolean {
  return terms !== "off-record";
}

export function sourceTermsAttributable(terms: SourceTerms): boolean {
  return terms === "on-record" || terms === "background";
}

/** ALIVE44 chunk 4 first families. */
export const MISCONDUCT_FAMILIES = ["M1", "M2", "M7"] as const;
export type MisconductFamily = (typeof MISCONDUCT_FAMILIES)[number];

export const MISCONDUCT_FAMILY_LABELS: Readonly<
  Record<MisconductFamily, string>
> = {
  M1: "Campaign funds used for personal purposes",
  M2: "Undisclosed conflict of interest",
  M7: "Public funds spent outside their authorized purpose",
};

export const EVIDENCE_BEARINGS = [
  "supports",
  "contradicts",
  "context",
] as const;
export type EvidenceBearing = (typeof EVIDENCE_BEARINGS)[number];

export const PROCEDURE_KEYS = [
  "fec-enforcement",
  "ky-legislative-ethics",
  "simulated-inquiry",
  // A body generated per state from an UNRESEARCHED range, for campaign money
  // and for legislators whose state's own body has not been read
  // (`generated-state-oversight.ts`).
  "generated-state-oversight",
  // Researched state legislative ethics bodies. Each key names one state's
  // body; the table behind them is `state-ethics-bodies.ts`, and a key here
  // with no row there (or the reverse) is a type error rather than a silent
  // route to somebody else's commission.
  "state-legislative-ethics:us-ak",
  "state-legislative-ethics:us-ne",
  "state-legislative-ethics:us-mn",
  "state-legislative-ethics:us-il",
  "state-legislative-ethics:us-md",
  "state-legislative-ethics:us-mo",
  "state-legislative-ethics:us-nv",
  "state-legislative-ethics:us-oh",
  "state-legislative-ethics:us-dc",
  "state-legislative-ethics:us-nc",
  "state-legislative-ethics:us-wa",
  "state-legislative-ethics:us-al",
  "state-legislative-ethics:us-ct",
  "state-legislative-ethics:us-fl",
  "state-legislative-ethics:us-hi",
  "state-legislative-ethics:us-nj",
  "state-legislative-ethics:us-ny",
  "state-legislative-ethics:us-pa",
  "state-legislative-ethics:us-ri",
  "state-legislative-ethics:us-sc",
  "state-legislative-ethics:us-or",
  "state-legislative-ethics:us-wi",
  "state-legislative-ethics:us-tx",
] as const;
export type ProcedureKey = (typeof PROCEDURE_KEYS)[number];

export const PROCEEDING_OUTCOMES = [
  "insufficient-complaint",
  "dismissed",
  "no-reason-to-believe",
  "reason-to-believe",
  "probable-cause",
  "conciliation",
  "finding",
  "confidential-reprimand",
  "report-issued",
] as const;
export type ProceedingOutcome = (typeof PROCEEDING_OUTCOMES)[number];

export const RESPONDER_ROLES = [
  "subject",
  "party",
  "staff",
  "contact",
  "reporter",
] as const;
export type ResponderRole = (typeof RESPONDER_ROLES)[number];

export const MATTER_RESPONSES = [
  "deny",
  "acknowledge",
  "correct-record",
  "decline-comment",
  "cooperate",
  "contest",
  "resign",
  "request-explanation",
  "defend",
  "distance",
  "maintain-support",
  "call-for-resignation",
  "no-action",
] as const;
export type MatterResponse = (typeof MATTER_RESPONSES)[number];

interface PressRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
}

export interface MediaOutletRecord extends PressRecordBase {
  readonly kind: "media-outlet";
  readonly organizationId: EntityId;
  readonly name: string;
  readonly product: MediaProduct;
  readonly scope: MediaScope;
  /** Empty for a national product; the World has no national jurisdiction. */
  readonly primaryJurisdictionIds: readonly EntityId[];
  readonly mediums: readonly MediaMedium[];
  readonly beats: readonly MediaBeat[];
  readonly resourceTier: MediaResourceTier;
  readonly cadence: MediaCadence;
  readonly acceptsDeepBackground: boolean;
  readonly establishedAt: IsoDate;
  readonly policyVersion: typeof PRESS_POLICY_VERSION;
  readonly provenanceNote: string;
}

export interface ReporterRoleRecord extends PressRecordBase {
  readonly kind: "reporter-role";
  readonly outletId: EntityId;
  readonly personId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly workRoleId: EntityId;
  readonly title: string;
  readonly beats: readonly MediaBeat[];
  readonly geographyJurisdictionIds: readonly EntityId[];
  readonly startedAt: IsoDate;
}

export interface StoryLeadRecord extends PressRecordBase {
  readonly kind: "story-lead";
  readonly outletId: EntityId;
  readonly family: StoryFamily;
  readonly route: LeadRoute;
  readonly basisEventIds: readonly EntityId[];
  readonly subjectPersonIds: readonly EntityId[];
  readonly jurisdictionId: EntityId | null;
  readonly matterId: EntityId | null;
  /** The earlier publication this lead follows up, when one exists. */
  readonly followsPublicationId: EntityId | null;
  readonly receivedAt: IsoDate;
}

export interface StoryDispositionRecord extends PressRecordBase {
  readonly kind: "story-disposition";
  readonly leadId: EntityId;
  readonly decision: StoryDecision;
  readonly reporterPersonId: EntityId | null;
  readonly reasonKey: string;
  readonly decidedAt: IsoDate;
  readonly decisionTraceId: EntityId | null;
  /** The occurrence this step wrote (request, response, story), if any. */
  readonly eventId: EntityId | null;
  readonly publicationId: EntityId | null;
  readonly responseDueAt: IsoDate | null;
  /** Contributions a published story actually used. */
  readonly contributionIds: readonly EntityId[];
}

export interface SourceAgreementRecord extends PressRecordBase {
  readonly kind: "source-agreement";
  readonly outletId: EntityId;
  readonly reporterPersonId: EntityId;
  readonly sourcePersonId: EntityId;
  readonly leadId: EntityId | null;
  readonly terms: SourceTerms;
  /** Exact public description for background; null otherwise. */
  readonly attributionLabel: string | null;
  readonly agreedAt: IsoDate;
  readonly agreementEventId: EntityId;
  readonly publiclyUsable: boolean;
  readonly attributable: boolean;
}

export interface SourceContributionRecord extends PressRecordBase {
  readonly kind: "source-contribution";
  readonly agreementId: EntityId;
  readonly contributionEventId: EntityId;
  readonly claimId: EntityId | null;
  /** Earlier events the source disclosed or leaked. */
  readonly disclosedEventIds: readonly EntityId[];
  readonly leakedEvidenceArtifactIds: readonly EntityId[];
  readonly leak: boolean;
  readonly subjectPersonIds: readonly EntityId[];
  readonly contributedAt: IsoDate;
}

export interface FinancialOccurrenceRecord extends PressRecordBase {
  readonly kind: "financial-occurrence";
  readonly family: MisconductFamily;
  readonly actorPersonIds: readonly EntityId[];
  /** Private occurrence event: who did what, when. */
  readonly occurrenceEventId: EntityId;
  readonly resourceFlowIds: readonly EntityId[];
  /** Record evidence created by the act itself (a ledger entry, a filing). */
  readonly recordEvidenceArtifactIds: readonly EntityId[];
  /** Source reference of the duty breached, when a rule establishes one. */
  readonly dutyReference: string | null;
  readonly intentional: boolean;
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
}

export interface MatterRecord extends PressRecordBase {
  readonly kind: "matter";
  readonly family: MisconductFamily;
  readonly subjectPersonIds: readonly EntityId[];
  /** Null when nothing actually happened: a false or mistaken allegation. */
  readonly occurrenceId: EntityId | null;
  readonly openedAt: IsoDate;
  readonly originEventId: EntityId;
  readonly jurisdictionId: EntityId | null;
}

export interface MatterAllegationRecord extends PressRecordBase {
  readonly kind: "matter-allegation";
  readonly matterId: EntityId;
  readonly allegerPersonId: EntityId | null;
  readonly allegationEventId: EntityId;
  readonly claimId: EntityId | null;
  readonly statement: string;
  readonly publicAllegation: boolean;
  readonly allegedAt: IsoDate;
}

export interface MatterEvidenceLinkRecord extends PressRecordBase {
  readonly kind: "matter-evidence-link";
  readonly matterId: EntityId;
  readonly evidenceArtifactId: EntityId;
  readonly bearing: EvidenceBearing;
  readonly linkedAt: IsoDate;
}

export interface MatterProceedingRecord extends PressRecordBase {
  readonly kind: "matter-proceeding";
  readonly matterId: EntityId;
  readonly procedureKey: ProcedureKey;
  readonly institutionLabel: string;
  readonly complainantPersonId: EntityId | null;
  readonly respondentPersonIds: readonly EntityId[];
  readonly openedAt: IsoDate;
  readonly openingEventId: EntityId;
  readonly confidentialWhilePending: boolean;
  /** Present only for an explicitly simulated inquiry. */
  readonly simulatedDisclosure: string | null;
}

export interface ProceedingStepRecord extends PressRecordBase {
  readonly kind: "proceeding-step";
  readonly proceedingId: EntityId;
  readonly step: string;
  readonly at: IsoDate;
  readonly eventId: EntityId;
  /** Next deadline this step set, from the rule pack or an authored interval. */
  readonly nextDueAt: IsoDate | null;
  readonly nextDueBasis: "rule" | "authored" | null;
  readonly outcome: ProceedingOutcome | null;
  readonly closes: boolean;
  readonly publicStep: boolean;
  readonly evidenceArtifactIds: readonly EntityId[];
}

export interface MatterResponseRecord extends PressRecordBase {
  readonly kind: "matter-response";
  readonly matterId: EntityId;
  readonly actorPersonId: EntityId;
  readonly actorRole: ResponderRole;
  readonly response: MatterResponse;
  readonly eventId: EntityId;
  readonly decisionTraceId: EntityId | null;
  /** Knowledge the responder actually held when responding. */
  readonly knowledgeIds: readonly EntityId[];
  readonly respondedAt: IsoDate;
}

/**
 * Who owns an outlet, and what an owner decided for everything it holds.
 *
 * An owner is an ordinary organization; these records index it, its holdings
 * over time, and each coordinated decision it took. Ownership is append-only:
 * a sale supersedes the earlier holding rather than editing it.
 */
export const OUTLET_OWNERSHIP_BASES = [
  "founding-owner",
  "acquisition",
] as const;
export type OutletOwnershipBasis = (typeof OUTLET_OWNERSHIP_BASES)[number];

export interface MediaOwnerRecord extends PressRecordBase {
  readonly kind: "media-owner";
  readonly organizationId: EntityId;
  /** The ownership pack and row this owner was drawn from. */
  readonly packId: string;
  readonly rowKey: string;
  readonly name: string;
  /** Descriptive only; behavior comes from the row's practices. */
  readonly ownerKind: string;
  readonly establishedAt: IsoDate;
}

export interface OutletOwnershipRecord extends PressRecordBase {
  readonly kind: "outlet-ownership";
  readonly outletId: EntityId;
  readonly ownerId: EntityId;
  readonly basis: OutletOwnershipBasis;
  readonly effectiveAt: IsoDate;
  /** The acquisition event; null for the owner an outlet was founded under. */
  readonly eventId: EntityId | null;
  readonly supersedesOwnershipId: EntityId | null;
}

export interface OwnerDirectiveRecord extends PressRecordBase {
  readonly kind: "owner-directive";
  readonly ownerId: EntityId;
  readonly practiceKey: string;
  /** The rule the practice asked for, as the pack named it. */
  readonly effect: string;
  /**
   * False when the effect is not coded yet. The blanket rule then applies: the
   * decision is recorded against every outlet the owner holds and nothing
   * downstream changes.
   */
  readonly simulated: boolean;
  readonly outletIds: readonly EntityId[];
  readonly decidedAt: IsoDate;
  readonly eventId: EntityId;
  /** Newsroom jobs this decision ended. */
  readonly endedWorkRelationshipIds: readonly EntityId[];
  /** The ownership record an acquisition wrote. */
  readonly ownershipId: EntityId | null;
}

export type PressRecord =
  | MediaOutletRecord
  | ReporterRoleRecord
  | StoryLeadRecord
  | StoryDispositionRecord
  | SourceAgreementRecord
  | SourceContributionRecord
  | FinancialOccurrenceRecord
  | MatterRecord
  | MatterAllegationRecord
  | MatterEvidenceLinkRecord
  | MatterProceedingRecord
  | ProceedingStepRecord
  | MatterResponseRecord
  | MediaOwnerRecord
  | OutletOwnershipRecord
  | OwnerDirectiveRecord;

export type PressRecordKind = PressRecord["kind"];
export type PressRecordOf<K extends PressRecordKind> = Extract<
  PressRecord,
  { kind: K }
>;

/** Input for an append: everything but the identity the writer assigns. */
export type PressRecordInput<K extends PressRecordKind> = Omit<
  PressRecordOf<K>,
  "id" | "sequence" | "recordedAt"
>;

export const MEDIA_OUTLET_KEY_PREFIX = "media:" as const;
export type MediaOutletKey = `${typeof MEDIA_OUTLET_KEY_PREFIX}${EntityId}`;

export function mediaOutletKey(outletId: EntityId): MediaOutletKey {
  return `${MEDIA_OUTLET_KEY_PREFIX}${outletId}`;
}
