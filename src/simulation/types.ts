declare const entityIdBrand: unique symbol;
declare const isoDateBrand: unique symbol;
declare const currencyCodeBrand: unique symbol;

export type EntityId = string & { readonly [entityIdBrand]: true };
export type IsoDate = string & { readonly [isoDateBrand]: true };
export type CurrencyCode = string & { readonly [currencyCodeBrand]: true };

export interface SimulationMoment {
  readonly date: IsoDate;
  readonly minuteOfDay: number;
  /** IANA timezone identity retained for geographic and later travel context. */
  readonly timeZone: string;
  /** Explicit offset makes the represented instant deterministic and replayable. */
  readonly utcOffsetMinutes: number;
}

export type EntityKind =
  | "appraisal"
  | "belief"
  | "causal-mechanism-definition"
  | "causal-process"
  | "care-responsibility"
  | "care-state"
  | "child-authority"
  | "child-authority-state"
  | "claim"
  | "commitment"
  | "decision"
  | "decision-trace"
  | "development-proposal"
  | "dwelling"
  | "dwelling-occupancy"
  | "dwelling-occupancy-state"
  | "evidence-artifact"
  | "evidence-discovery"
  | "event"
  | "education-enrollment"
  | "education-enrollment-state"
  | "effect-activation"
  | "election-contest"
  | "election-contest-result"
  | "executive-disposition"
  | "legislative-action"
  | "legislative-amendment"
  | "legislative-committee-action"
  | "legislative-enactment"
  | "legislative-measure"
  | "legislative-referral"
  | "legislative-vote"
  | "fact"
  | "goal"
  | "goal-state"
  | "household"
  | "household-location"
  | "household-membership"
  | "household-membership-state"
  | "housing-tenure"
  | "housing-tenure-state"
  | "jurisdiction"
  | "kinship"
  | "knowledge"
  | "life-commitment"
  | "life-load-resolution"
  | "memory"
  | "metric-observation"
  | "metric-state"
  | "mortality-check-plan"
  | "mortality-check-result"
  | "mortality-table-definition"
  | "organization"
  | "organization-participation"
  | "organization-participation-state"
  | "organization-profile"
  | "person"
  | "person-death"
  | "person-functional-capacity"
  | "personal-value"
  | "personality-tendency"
  | "personality-tendency-definition"
  | "policy-domain"
  | "policy-issue"
  | "policy-alternative"
  | "policy-baseline"
  | "policy-estimate"
  | "policy-implementation-profile"
  | "policy-operation"
  | "policy-realization"
  | "principle"
  | "principle-definition"
  | "proposition-exposure"
  | "proposition"
  | "public-position"
  | "perception"
  | "relationship"
  | "resource-flow"
  | "resource-flow-terms"
  | "resource-obligation"
  | "resource-obligation-state"
  | "resource-position"
  | "resource-transfer-outcome"
  | "scheduled-activity"
  | "scheduled-activity-state"
  | "snapshot"
  | "subject"
  | "subject-knowledge"
  | "temporary-state"
  | "future-due-item"
  | "future-due-item-state"
  | "incident"
  | "incident-definition"
  | "incident-state"
  | "incident-transition-plan"
  | "value-definition"
  | "partnership"
  | "partnership-state"
  | "work-relationship"
  | "work-role"
  | "work-status"
  | "world-metric-definition"
  | "work-item"
  | "work-item-state"
  | "world";

export type DataStatus =
  "placeholder" | "candidate" | "approved" | "superseded";

export interface JurisdictionDataProvenance {
  readonly asOf: IsoDate | null;
  readonly source: string | null;
  readonly jurisdiction: EntityId;
  readonly status: DataStatus;
}

export interface Jurisdiction {
  readonly id: EntityId;
  readonly slug: string;
  readonly name: string;
  readonly kind: string;
  readonly parentName: string | null;
  readonly provenance: JurisdictionDataProvenance;
}

export interface PolicyDomainDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
}

export interface PolicyIssueDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly domainId: EntityId;
  readonly name: string;
  readonly description: string;
}

export interface PropositionParameter {
  readonly key: string;
  readonly value: string;
}

export interface PolicyPropositionDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly issueId: EntityId;
  readonly name: string;
  readonly question: string;
  readonly parameters: readonly PropositionParameter[];
  readonly tags: readonly string[];
}

export type KnowledgeSubjectScope =
  "domain" | "issue" | "proposition" | "technical";

export interface KnowledgeSubjectDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
  readonly scope: KnowledgeSubjectScope;
  readonly referenceId: EntityId | null;
  readonly tags: readonly string[];
}

export interface PoliticalPrincipleDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
}

export interface PolicyCatalog {
  readonly catalogVersion: string;
  readonly domains: Readonly<Record<string, PolicyDomainDefinition>>;
  readonly domainOrder: readonly EntityId[];
  readonly issues: Readonly<Record<string, PolicyIssueDefinition>>;
  readonly issueOrder: readonly EntityId[];
  readonly propositions: Readonly<Record<string, PolicyPropositionDefinition>>;
  readonly propositionOrder: readonly EntityId[];
  readonly subjects: Readonly<Record<string, KnowledgeSubjectDefinition>>;
  readonly subjectOrder: readonly EntityId[];
  readonly principles: Readonly<Record<string, PoliticalPrincipleDefinition>>;
  readonly principleOrder: readonly EntityId[];
}

export interface PersonalityExpressionDefinition {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface PersonalityTendencyDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
  readonly expressions: readonly PersonalityExpressionDefinition[];
}

export interface PersonalValueDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
}

export interface MindCatalog {
  readonly catalogVersion: "mind-catalog-v1";
  readonly tendencies: Readonly<Record<string, PersonalityTendencyDefinition>>;
  readonly tendencyOrder: readonly EntityId[];
  readonly values: Readonly<Record<string, PersonalValueDefinition>>;
  readonly valueOrder: readonly EntityId[];
}

export type PersonDetailLevel = "lightweight" | "materialized";

export type PersonFactKind =
  | "birth-date"
  | "birthplace"
  | "residence"
  | "family-relationship"
  | "education"
  | "occupation";

export type FactProvenanceMethod =
  "procedural-placeholder" | "simulated-event" | "manual";

export interface FactProvenance {
  readonly method: FactProvenanceMethod;
  readonly sourceEventId: EntityId | null;
  readonly note: string | null;
}

interface PersonFactBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly kind: PersonFactKind;
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly summary: string;
  readonly provenance: FactProvenance;
}

export interface BirthDateFact extends PersonFactBase {
  readonly kind: "birth-date";
  readonly jurisdictionId: null;
}

export interface BirthplaceFact extends PersonFactBase {
  readonly kind: "birthplace";
  readonly jurisdictionId: EntityId;
}

export interface ResidenceFact extends PersonFactBase {
  readonly kind: "residence";
  readonly jurisdictionId: EntityId;
  readonly endedAt: IsoDate | null;
}

export type FamilyRelationshipNamespace =
  "lineal" | "collateral" | "extended" | "custom";
export type FamilyRelationshipKind = `${FamilyRelationshipNamespace}:${string}`;

export interface FamilyRelationshipFact extends PersonFactBase {
  readonly kind: "family-relationship";
  readonly jurisdictionId: null;
  readonly relatedPersonId: EntityId;
  readonly relationship: FamilyRelationshipKind;
  readonly endedAt: IsoDate | null;
}

export type EducationStatus = "attended" | "completed" | "ongoing" | "withdrew";

export interface EducationFact extends PersonFactBase {
  readonly kind: "education";
  readonly institution: string;
  readonly field: string | null;
  readonly credential: string | null;
  readonly endedAt: IsoDate | null;
  readonly status: EducationStatus;
  readonly subjectIds: readonly EntityId[];
}

export type OccupationStatus = "ended" | "ongoing";

export interface OccupationFact extends PersonFactBase {
  readonly kind: "occupation";
  readonly employer: string;
  readonly title: string;
  readonly endedAt: IsoDate | null;
  readonly status: OccupationStatus;
  readonly subjectIds: readonly EntityId[];
}

export type PersonFact =
  | BirthDateFact
  | BirthplaceFact
  | ResidenceFact
  | FamilyRelationshipFact
  | EducationFact
  | OccupationFact;

/**
 * Pronouns, as a closed set of the forms English actually needs.
 *
 * A key rather than a free string: the game has to conjugate around these
 * ("she has" against "they have"), and a set it cannot conjugate is a set it
 * would get wrong in a sentence. Three is what the language has grammatically
 * distinct forms for, not a claim that three is how many kinds of person there
 * are.
 */
export type PronounSetKey = "she-her" | "he-him" | "they-them";

/**
 * What somebody's gender is, as far as the record goes.
 *
 * Deliberately kept separate from `PronounSetKey`. They usually agree, and
 * collapsing them into one field would make it impossible for them to
 * disagree — which is a thing about real people that a record should be able
 * to hold. `unstated` is a real value and the default: it means the world has
 * not been told, and it must never be filled in by guessing.
 */
export type GenderIdentityKey = "female" | "male" | "nonbinary" | "unstated";

/**
 * A person's own gender and pronouns.
 *
 * Optional on a person, and absent means unknown rather than neutral-by-
 * default: a reader that finds no identity says `they`, and says it about
 * everybody it does not know, rather than mixing a guess into half the
 * sentences. Never derived from a name — the name corpus carries no
 * demographic attribute at all, by an older and deliberate decision, so a name
 * is not evidence about this and must not be read as though it were.
 */
export interface PersonIdentity {
  readonly gender: GenderIdentityKey;
  readonly pronouns: PronounSetKey;
}

export interface PersonAppearance {
  readonly seed: string;
  readonly recipeVersion: string;
  /**
   * Character catalog generation this person's appearance is pinned to.
   * Presentation resolves the modular recipe against exactly this frozen
   * generation so later library growth cannot change an established person.
   * Absent on people created before pinning existed; presentation treats
   * absence as the first generation. This is an appearance pin, not biography.
   */
  readonly catalogGeneration?: number;
}

export type PersonGenerationProfile = "production" | "stress";

export interface PersonDetails {
  readonly generatorVersion: "person-materialization-v4";
  readonly generatedFacts: readonly PersonFact[];
}

export interface PersonFactConstraint {
  readonly personId: EntityId;
  readonly kind: PersonFactKind;
}

interface PersonCore {
  readonly id: EntityId;
  readonly generationKey: string;
  readonly generatorVersion?: string;
  readonly corpusVersion?: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
  readonly appearance?: PersonAppearance;
  /**
   * Gender and pronouns, when the world has them.
   *
   * Absent on everybody created before this existed, which is why it is
   * optional rather than defaulted at the type: a person the record says
   * nothing about is a different thing from a person the record says is
   * non-binary, and the presentation layer treats them differently.
   */
  readonly identity?: PersonIdentity;
  readonly establishedFacts: readonly PersonFact[];
}

export interface LightweightPerson extends PersonCore {
  readonly detailLevel: "lightweight";
  readonly details?: never;
}

export interface MaterializedPerson extends PersonCore {
  readonly detailLevel: "materialized";
  readonly details: PersonDetails;
}

export type Person = LightweightPerson | MaterializedPerson;

export type EventVisibility = "private" | "limited" | "public";
export type EventType = `${string}.${string}`;

export type EventParticipantRoleNamespace =
  | "agency"
  | "presence"
  | "focus"
  | "impact"
  | "observation"
  | "coordination"
  | "other";
export type EventParticipantRole = `${EventParticipantRoleNamespace}:${string}`;

export interface EventParticipant {
  readonly personId: EntityId;
  readonly role: EventParticipantRole;
  readonly detail: string | null;
}

export interface EventLocation {
  readonly jurisdictionId: EntityId | null;
  readonly label: string;
  readonly setting: string | null;
}

export interface EventContext {
  readonly location: EventLocation | null;
  readonly socialContext: string | null;
  readonly pressure: string | null;
  readonly choice: string | null;
  readonly motivation: string | null;
  readonly immediateReaction: string | null;
}

export interface HistoricalEvent {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly type: EventType;
  readonly occurredAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly involvedEntityIds: readonly EntityId[];
  readonly participants: readonly EventParticipant[];
  readonly personFactConstraints: readonly PersonFactConstraint[];
  readonly visibility: EventVisibility;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly context: EventContext;
}

export type MemoryStrength = "faint" | "moderate" | "strong" | "defining";

export interface MemoryRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly eventId: EntityId;
  readonly formedAt: IsoDate;
  readonly rememberedSummary: string;
  readonly interpretation: string;
  readonly strength: MemoryStrength;
  readonly relevanceTags: readonly string[];
  readonly supersedesMemoryId: EntityId | null;
}

export type KnowledgeAccuracy =
  "accurate" | "partial" | "inaccurate" | "unknown";
export type KnowledgeConfidence = "low" | "medium" | "high";

export type KnowledgeSource =
  | { readonly kind: "direct" }
  | {
      readonly kind: "told-by";
      readonly sourcePersonId: EntityId;
      readonly claimId: EntityId | null;
    }
  | { readonly kind: "public-record"; readonly reference: string }
  | {
      readonly kind: "media";
      readonly outlet: string;
      readonly reference: string | null;
    }
  | {
      readonly kind: "rumor";
      readonly sourcePersonId: EntityId | null;
      readonly chainDescription: string | null;
    };

export interface EventKnowledgeRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly eventId: EntityId;
  readonly learnedAt: IsoDate;
  readonly believedSummary: string;
  readonly accuracy: KnowledgeAccuracy;
  readonly confidence: KnowledgeConfidence;
  readonly source: KnowledgeSource;
}

export type ClaimAudience = "private" | "limited" | "public";
export type ClaimRelationshipToTruth =
  "consistent" | "contradicts" | "reframes" | "unknown";

export type ClaimProvenance =
  | { readonly kind: "direct-record" }
  | {
      readonly kind: "reported-by";
      readonly reporterPersonId: EntityId;
    }
  | { readonly kind: "public-record"; readonly reference: string }
  | {
      readonly kind: "media-record";
      readonly outlet: string;
      readonly reference: string | null;
    };

export interface ClaimRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly speakerPersonId: EntityId;
  readonly eventId: EntityId;
  readonly madeAt: IsoDate;
  readonly audience: ClaimAudience;
  readonly statement: string;
  readonly relationshipToTruth: ClaimRelationshipToTruth;
  readonly provenance: ClaimProvenance;
}

export type RelationshipInteractionNamespace =
  | "contact"
  | "work"
  | "experience"
  | "support"
  | "exchange"
  | "conflict"
  | "commitment"
  | "care"
  | "mentorship"
  | "other";
export type RelationshipInteractionKind =
  `${RelationshipInteractionNamespace}:${string}`;

export type RelationshipChange =
  "formed" | "strengthened" | "maintained" | "strained" | "ended";

export type RelationshipSignificance = "minor" | "meaningful" | "major";

export interface RelationshipInteraction {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personIds: readonly [EntityId, EntityId];
  readonly eventId: EntityId | null;
  readonly occurredAt: IsoDate;
  readonly kind: RelationshipInteractionKind;
  readonly change: RelationshipChange;
  readonly significance: RelationshipSignificance;
  readonly summary: string;
  readonly tags: readonly string[];
}

export type BeliefPosition = "support" | "oppose" | "uncertain" | "conflicted";
export type BeliefConviction = "tentative" | "moderate" | "strong" | "settled";
export type PoliticalSalience = "low" | "moderate" | "high" | "central";
export type PoliticalFlexibility =
  "open" | "negotiable" | "conditional" | "firm";
export type BeliefFormationReasonNamespace =
  | "reflection"
  | "evidence"
  | "experience"
  | "proposal"
  | "repositioning"
  | "cue"
  | "deliberation"
  | "other";
export type BeliefFormationReason =
  `${BeliefFormationReasonNamespace}:${string}`;
export type PoliticalCueNamespace =
  "person" | "information" | "organization" | "media" | "community" | "other";
export type PoliticalCueKind = `${PoliticalCueNamespace}:${string}`;

export interface PoliticalCue {
  readonly kind: PoliticalCueKind;
  readonly sourcePersonId: EntityId | null;
  readonly sourceLabel: string;
}

export interface BeliefFormationContext {
  readonly reason: BeliefFormationReason;
  readonly relevantEventIds: readonly EntityId[];
  readonly sourceFactIds: readonly EntityId[];
  readonly propositionExposureIds: readonly EntityId[];
  readonly memoryIds: readonly EntityId[];
  readonly eventKnowledgeIds: readonly EntityId[];
  readonly claimIds: readonly EntityId[];
  readonly relationshipInteractionIds: readonly EntityId[];
  readonly subjectKnowledgeIds: readonly EntityId[];
  readonly decisionTraceIds: readonly EntityId[];
  readonly cue: PoliticalCue | null;
  readonly evidenceReference: string | null;
  readonly note: string | null;
}

export type PropositionExposureProvenance =
  | { readonly kind: "direct-experience"; readonly eventId: EntityId }
  | {
      readonly kind: "told-by";
      readonly sourcePersonId: EntityId;
      readonly claimId: EntityId | null;
    }
  | { readonly kind: "public-record"; readonly reference: string }
  | {
      readonly kind: "media";
      readonly outlet: string;
      readonly reference: string | null;
    }
  | {
      readonly kind: "organization";
      readonly organizationLabel: string;
      readonly reference: string | null;
    }
  | { readonly kind: "manual"; readonly note: string };

export interface PropositionExposureRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly encounteredAt: IsoDate;
  readonly summary: string;
  readonly provenance: PropositionExposureProvenance;
}

export interface PrivateBeliefRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly formedAt: IsoDate;
  readonly position: BeliefPosition;
  readonly conviction: BeliefConviction;
  readonly salience: PoliticalSalience;
  readonly flexibility: PoliticalFlexibility;
  readonly rationale: string | null;
  readonly formation: BeliefFormationContext;
  readonly supersedesBeliefId: EntityId | null;
}

export type PublicPositionStance =
  "support" | "oppose" | "undecided" | "conflicted" | "withheld";

export interface PublicPositionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly statedAt: IsoDate;
  readonly stance: PublicPositionStance;
  readonly statement: string;
  readonly audience: "limited" | "public";
  readonly venue: string | null;
  readonly sourceEventId: EntityId | null;
  readonly supersedesPublicPositionId: EntityId | null;
}

export type CampaignCommitmentStance =
  "support" | "oppose" | "seek-modification" | "defer";
export type CampaignCommitmentLevel = "aspiration" | "conditional" | "pledge";

export interface CampaignCommitmentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly madeAt: IsoDate;
  readonly stance: CampaignCommitmentStance;
  readonly level: CampaignCommitmentLevel;
  readonly statement: string;
  readonly conditions: string | null;
  readonly sourceEventId: EntityId | null;
  readonly supersedesCommitmentId: EntityId | null;
}

export type PrincipleStance = "endorses" | "rejects" | "conflicted";

export interface PrincipleRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly principleId: EntityId;
  readonly formedAt: IsoDate;
  readonly stance: PrincipleStance;
  readonly conviction: BeliefConviction;
  readonly flexibility: PoliticalFlexibility;
  readonly qualification: string | null;
  readonly formation: BeliefFormationContext;
  readonly supersedesPrincipleRecordId: EntityId | null;
}

export type SubjectFamiliarity = "aware" | "familiar" | "deep";
export type SubjectUnderstanding =
  "minimal" | "working" | "advanced" | "expert";
export type SubjectExpertise =
  "none" | "basic" | "practitioner" | "specialist" | "authority";
export type PracticalExperience = "none" | "indirect" | "direct" | "extensive";

export type SubjectKnowledgeProvenance =
  | { readonly kind: "person-facts"; readonly factIds: readonly EntityId[] }
  | {
      readonly kind: "historical-events";
      readonly eventIds: readonly EntityId[];
    }
  | { readonly kind: "study"; readonly reference: string }
  | {
      readonly kind: "trusted-report";
      readonly sourcePersonId: EntityId;
      readonly reference: string | null;
    }
  | { readonly kind: "manual"; readonly note: string };

export interface SubjectKnowledgeRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly subjectId: EntityId;
  readonly recordedAt: IsoDate;
  readonly familiarity: SubjectFamiliarity;
  readonly understanding: SubjectUnderstanding;
  readonly expertise: SubjectExpertise;
  readonly practicalExperience: PracticalExperience;
  readonly provenance: SubjectKnowledgeProvenance;
  readonly supersedesKnowledgeId: EntityId | null;
}

export type MindRecordProvenanceKind =
  "authored" | "reflection" | "development-proposal" | "player-choice";

export type MindSourceReference =
  | { readonly kind: "person-fact"; readonly factId: EntityId }
  | {
      readonly kind: "personality-tendency";
      readonly tendencyRecordId: EntityId;
    }
  | { readonly kind: "personal-value"; readonly valueRecordId: EntityId }
  | { readonly kind: "goal-state"; readonly goalStateId: EntityId }
  | {
      readonly kind: "temporary-state";
      readonly temporaryStateId: EntityId;
    }
  | { readonly kind: "historical-event"; readonly eventId: EntityId }
  | { readonly kind: "memory"; readonly memoryId: EntityId }
  | {
      readonly kind: "event-knowledge";
      readonly knowledgeId: EntityId;
    }
  | { readonly kind: "claim"; readonly claimId: EntityId }
  | {
      readonly kind: "relationship-interaction";
      readonly interactionId: EntityId;
    }
  | {
      readonly kind: "proposition-exposure";
      readonly exposureId: EntityId;
    }
  | { readonly kind: "private-belief"; readonly beliefId: EntityId }
  | {
      readonly kind: "political-principle";
      readonly principleRecordId: EntityId;
    }
  | {
      readonly kind: "subject-knowledge";
      readonly subjectKnowledgeId: EntityId;
    }
  | { readonly kind: "appraisal"; readonly appraisalId: EntityId }
  | { readonly kind: "perception"; readonly perceptionId: EntityId }
  | {
      readonly kind: "decision-trace";
      readonly decisionTraceId: EntityId;
    }
  | {
      readonly kind: "life-load-resolution";
      readonly lifeLoadResolutionId: EntityId;
    }
  | {
      readonly kind: "life-history";
      readonly reference: LifeHistoryRecordReference;
    };

export interface MindRecordProvenance {
  readonly kind: MindRecordProvenanceKind;
  readonly sourceRefs: readonly MindSourceReference[];
  readonly note: string | null;
}

export type MindStrength = "subtle" | "moderate" | "strong" | "defining";
export type MindConfidence = "low" | "medium" | "high";

export interface PersonalityTendencyRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly tendencyId: EntityId;
  readonly recordedAt: IsoDate;
  readonly expressionKey: string;
  readonly strength: MindStrength;
  readonly confidence: MindConfidence;
  readonly scopeTags: readonly string[];
  readonly provenance: MindRecordProvenance;
  readonly supersedesTendencyId: EntityId | null;
}

export type ValueOrientation =
  "embraces" | "questions" | "rejects" | "conflicted";
export type ValueSalience = "low" | "moderate" | "high" | "central";

export interface PersonalValueRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly valueId: EntityId;
  readonly recordedAt: IsoDate;
  readonly orientation: ValueOrientation;
  readonly strength: MindStrength;
  readonly salience: ValueSalience;
  readonly qualification: string | null;
  readonly provenance: MindRecordProvenance;
  readonly supersedesValueId: EntityId | null;
}

export type GoalPriority = "low" | "moderate" | "high" | "critical";
export type GoalStatus =
  "proposed" | "active" | "completed" | "failed" | "abandoned" | "superseded";

export interface GoalStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly goalId: EntityId;
  readonly goalKey: string;
  readonly personId: EntityId;
  readonly createdAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly objective: string;
  readonly domain: string;
  readonly scope: string;
  readonly priority: GoalPriority;
  readonly status: GoalStatus;
  readonly targetEntityId: EntityId | null;
  readonly deadline: IsoDate | null;
  readonly outcome: string | null;
  readonly provenance: MindRecordProvenance;
  readonly replacesGoalId: EntityId | null;
  readonly supersedesGoalStateId: EntityId | null;
}

export type AppraisalValence = "positive" | "negative" | "mixed" | "neutral";

export interface AppraisalMeaning {
  readonly key: string;
  readonly label: string;
  readonly valence: AppraisalValence;
  readonly intensity: MindStrength;
}

export interface AppraisalRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly eventId: EntityId;
  readonly memoryId: EntityId | null;
  readonly eventKnowledgeId: EntityId | null;
  readonly appraisedAt: IsoDate;
  readonly meanings: readonly AppraisalMeaning[];
  readonly interpretation: string;
  readonly confidence: MindConfidence;
  readonly involvedPersonIds: readonly EntityId[];
  readonly provenance: MindRecordProvenance;
  readonly supersedesAppraisalId: EntityId | null;
}

export type PerceptionSubjectNamespace =
  "entity" | "mind" | "context" | "domain";
export type PerceptionSubjectKind = `${PerceptionSubjectNamespace}:${string}`;
export type SourceCredibility = "unknown" | "low" | "medium" | "high";

export type PerceptionSource =
  | { readonly kind: "person-fact"; readonly factId: EntityId }
  | {
      readonly kind: "life-history";
      readonly reference: LifeHistoryRecordReference;
    }
  | {
      readonly kind: "proposition-exposure";
      readonly exposureId: EntityId;
    }
  | {
      readonly kind: "subject-knowledge";
      readonly subjectKnowledgeId: EntityId;
    }
  | { readonly kind: "appraisal"; readonly appraisalId: EntityId }
  | {
      readonly kind: "event-knowledge";
      readonly knowledgeId: EntityId;
    }
  | { readonly kind: "memory"; readonly memoryId: EntityId }
  | {
      readonly kind: "heard-claim";
      readonly claimId: EntityId;
      readonly knowledgeId: EntityId;
    }
  | {
      readonly kind: "inference";
      readonly basisPerceptionIds: readonly EntityId[];
    }
  | {
      readonly kind: "trusted-cue";
      readonly sourcePersonId: EntityId;
      readonly communicationRecordIds: readonly EntityId[];
      readonly relationshipInteractionIds: readonly EntityId[];
      readonly sourceLabel: string;
    }
  | {
      readonly kind: "relationship-derived";
      readonly sourcePersonId: EntityId;
      readonly relationshipInteractionIds: readonly EntityId[];
    }
  | { readonly kind: "authored"; readonly note: string };

export interface PerceptionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly perceivedAt: IsoDate;
  readonly subjectKind: PerceptionSubjectKind;
  readonly subjectKey: string;
  readonly subjectEntityId: EntityId | null;
  readonly assertion: string;
  readonly confidence: MindConfidence;
  readonly sourceCredibility: SourceCredibility;
  readonly source: PerceptionSource;
  readonly supersedesPerceptionId: EntityId | null;
}

export interface TemporaryStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly stateKey: string;
  readonly label: string;
  readonly recordedAt: IsoDate;
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
  readonly intensity: MindStrength;
  readonly decisionTags: readonly string[];
  readonly provenance: MindRecordProvenance;
}

export type LifeRecordProvenance =
  | { readonly kind: "authored"; readonly note: string }
  | {
      /** Deterministic pre-play/history construction, distinct from manual authorship. */
      readonly kind: "generated";
      readonly generatorKey: string;
    }
  | { readonly kind: "simulated-event"; readonly eventId: EntityId }
  | {
      readonly kind: "source-record";
      readonly reference: string;
      readonly asOf: IsoDate;
    };

export type OrganizationClassificationNamespace =
  | "sector"
  | "membership"
  | "service"
  | "enterprise"
  | "community"
  | "international"
  | "custom";
export type OrganizationClassification =
  `${OrganizationClassificationNamespace}:${string}`;

export interface Organization {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly formedAt: IsoDate;
  readonly detailLevel: "lightweight" | "detailed";
  readonly provenance: LifeRecordProvenance;
}

export interface OrganizationProfileRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly organizationId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly name: string;
  readonly classification: OrganizationClassification;
  readonly locationJurisdictionId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesProfileId: EntityId | null;
}

export type EducationProgramNamespace =
  "schooling" | "postsecondary" | "training" | "custom";
export type EducationProgramKind = `${EducationProgramNamespace}:${string}`;
export type EducationContextNamespace =
  "program" | "stage" | "track" | "custom";
export type EducationContextKind = `${EducationContextNamespace}:${string}`;

export interface EducationEnrollment {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly organizationId: EntityId;
  /** When this enrollment, including an expected future enrollment, became known. */
  readonly recordedAt: IsoDate;
  /** The actual or expected date on which participation in the program begins. */
  readonly startedAt: IsoDate;
  readonly programKind: EducationProgramKind;
  readonly provenance: LifeRecordProvenance;
}

export type EducationEnrollmentStatus =
  "expected" | "active" | "completed" | "withdrawn" | "transferred" | "ended";

export interface EducationEnrollmentStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly enrollmentId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: EducationEnrollmentStatus;
  readonly contextKind: EducationContextKind;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type OrganizationParticipationNamespace =
  "membership" | "activity" | "affiliation" | "leadership" | "custom";
export type OrganizationParticipationKind =
  `${OrganizationParticipationNamespace}:${string}`;
export type OrganizationParticipationRoleNamespace =
  "member" | "participant" | "leader" | "advisor" | "custom";
export type OrganizationParticipationRoleKind =
  `${OrganizationParticipationRoleNamespace}:${string}`;

export interface OrganizationParticipation {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly organizationId: EntityId;
  readonly recordedAt: IsoDate;
  readonly startedAt: IsoDate;
  readonly kind: OrganizationParticipationKind;
  readonly provenance: LifeRecordProvenance;
}

export type OrganizationParticipationStatus =
  "expected" | "active" | "inactive" | "ended";

export interface OrganizationParticipationStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly participationId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: OrganizationParticipationStatus;
  readonly roleKind: OrganizationParticipationRoleKind | null;
  readonly context: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type WorkRelationshipNamespace =
  | "employment"
  | "independent"
  | "training"
  | "volunteer"
  | "family-work"
  | "service"
  | "custom";
export type WorkRelationshipKind = `${WorkRelationshipNamespace}:${string}`;
export type OccupationClassificationNamespace =
  "occupation" | "profession" | "trade" | "practice" | "service" | "custom";
export type OccupationClassification =
  `${OccupationClassificationNamespace}:${string}`;
export type WorkCompensation = "paid" | "unpaid" | "mixed" | "in-kind";
export type WorkAuthority =
  "directed" | "shared" | "self-directed" | "directs-others";
export type WorkDependency = "independent" | "partly-dependent" | "dependent";
export type WorkEconomicRisk = "organization-borne" | "shared" | "person-borne";

export interface ExpectedWeeklyTimeRange {
  readonly minimumHours: number;
  readonly maximumHours: number;
}

export type AttentionDemand = "low" | "moderate" | "high" | "continuous";
export type ConcurrencyPotential =
  "mostly-concurrent" | "partly-concurrent" | "mostly-exclusive";
export type ScheduleRigidity = "flexible" | "mixed" | "rigid";
export type Interruptibility =
  "interruptible" | "limited" | "non-interruptible";

export interface TimeDemandProfile {
  readonly expectedWeekly: ExpectedWeeklyTimeRange;
  readonly attention: AttentionDemand;
  readonly concurrency: ConcurrencyPotential;
  readonly scheduleRigidity: ScheduleRigidity;
  readonly interruptibility: Interruptibility;
  readonly locationJurisdictionId: EntityId | null;
}

export interface WorkRelationship {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly organizationId: EntityId | null;
  /** When this relationship, including an expected future engagement, became known. */
  readonly recordedAt: IsoDate;
  /** The actual or expected date on which the work begins. */
  readonly startedAt: IsoDate;
  readonly kind: WorkRelationshipKind;
  readonly compensation: WorkCompensation;
  readonly authority: WorkAuthority;
  readonly dependency: WorkDependency;
  readonly economicRisk: WorkEconomicRisk;
  readonly provenance: LifeRecordProvenance;
}

export type WorkRelationshipStatus =
  "expected" | "active" | "temporarily-inactive" | "ended";

export interface WorkStatusRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly workRelationshipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: WorkRelationshipStatus;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStatusId: EntityId | null;
}

export interface WorkRoleRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly workRelationshipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly title: string;
  readonly occupationClassification: OccupationClassification | null;
  readonly locationJurisdictionId: EntityId | null;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesRoleId: EntityId | null;
}

export interface Household {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly formedAt: IsoDate;
  readonly label: string;
  readonly provenance: LifeRecordProvenance;
}

export type HouseholdLocationNamespace =
  "residence" | "temporary" | "institutional" | "custom";
export type HouseholdLocationKind = `${HouseholdLocationNamespace}:${string}`;

export interface HouseholdLocationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly householdId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly label: string;
  readonly kind: HouseholdLocationKind;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesLocationId: EntityId | null;
}

export type HouseholdMembershipNamespace =
  "resident" | "student" | "shared-care" | "custom";
export type HouseholdMembershipKind =
  `${HouseholdMembershipNamespace}:${string}`;
export type ResidenceRole = "primary" | "secondary" | "shared";

export interface HouseholdMembership {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly householdId: EntityId;
  readonly startedAt: IsoDate;
  readonly provenance: LifeRecordProvenance;
}

export type HouseholdMembershipStatus = "resident" | "ended";

export interface HouseholdMembershipStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly membershipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: HouseholdMembershipStatus;
  readonly residenceRole: ResidenceRole;
  readonly kind: HouseholdMembershipKind;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type KinshipNamespace = "lineal" | "collateral" | "extended" | "custom";
export type KinshipKind = `${KinshipNamespace}:${string}`;

export interface KinshipRelationship {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personIds: readonly [EntityId, EntityId];
  readonly establishedAt: IsoDate;
  readonly kind: KinshipKind;
  readonly provenance: LifeRecordProvenance;
}

export type PartnershipNamespace = "romantic" | "legal" | "custom";
export type PartnershipKind = `${PartnershipNamespace}:${string}`;

export interface Partnership {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personIds: readonly [EntityId, EntityId];
  readonly startedAt: IsoDate;
  readonly kind: PartnershipKind;
  readonly provenance: LifeRecordProvenance;
}

export type PartnershipStatus = "active" | "ended";

export interface PartnershipStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly partnershipId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: PartnershipStatus;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type CareNamespace =
  "personal" | "supportive" | "supervision" | "coordination" | "custom";
export type CareKind = `${CareNamespace}:${string}`;
export type CareResponsibilityShare = "supporting" | "shared" | "primary";

export interface CareResponsibility {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly caregiverPersonId: EntityId;
  readonly recipientPersonId: EntityId;
  readonly startedAt: IsoDate;
  readonly kind: CareKind;
  readonly provenance: LifeRecordProvenance;
}

export type CareResponsibilityStatus = "active" | "ended";

export interface CareResponsibilityStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly careResponsibilityId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: CareResponsibilityStatus;
  readonly share: CareResponsibilityShare;
  readonly context: string;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type ChildAuthorityNamespace =
  "parental" | "guardianship" | "custody" | "protective" | "custom";
export type ChildAuthorityKind = `${ChildAuthorityNamespace}:${string}`;
export type ChildAuthorityBasisNamespace =
  "legal" | "administrative" | "consensual" | "custom";
export type ChildAuthorityBasisKind =
  `${ChildAuthorityBasisNamespace}:${string}`;

export type ChildAuthorityHolder =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "organization"; readonly organizationId: EntityId };

export interface ChildAuthority {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly childPersonId: EntityId;
  readonly holder: ChildAuthorityHolder;
  readonly establishedAt: IsoDate;
  readonly kind: ChildAuthorityKind;
  readonly provenance: LifeRecordProvenance;
}

export type ChildAuthorityStatus = "active" | "ended";

export interface ChildAuthorityStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly childAuthorityId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: ChildAuthorityStatus;
  readonly basisKind: ChildAuthorityBasisKind;
  readonly context: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type LifeCommitmentNamespace =
  "civic" | "community" | "personal" | "religious" | "custom";
export type LifeCommitmentKind = `${LifeCommitmentNamespace}:${string}`;

export interface LifeCommitmentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate | null;
  readonly kind: LifeCommitmentKind;
  readonly label: string;
  readonly timeDemand: TimeDemandProfile;
  readonly provenance: LifeRecordProvenance;
}

export type LifeLoadContributor =
  | {
      readonly kind: "work-role";
      readonly recordId: EntityId;
      readonly label: string;
      readonly timeDemand: TimeDemandProfile;
    }
  | {
      readonly kind: "care-responsibility";
      readonly recordId: EntityId;
      readonly label: string;
      readonly timeDemand: TimeDemandProfile;
    }
  | {
      readonly kind: "life-commitment";
      readonly recordId: EntityId;
      readonly label: string;
      readonly timeDemand: TimeDemandProfile;
    };

export type LifeLoadBand =
  "sustainable" | "demanding" | "overloaded" | "severe";
export type CoordinationPressure = "low" | "moderate" | "high" | "severe";

export interface LifeLoadAssessment {
  readonly personId: EntityId;
  readonly cutoff: HistoricalCutoff;
  readonly expectedWeekly: ExpectedWeeklyTimeRange;
  readonly exclusiveEquivalentWeekly: ExpectedWeeklyTimeRange;
  readonly coordinationPressure: CoordinationPressure;
  readonly loadBand: LifeLoadBand;
  readonly contributors: readonly LifeLoadContributor[];
}

export type EffortMode = "normal" | "push" | "recover";
export type RecoveryLevel = "limited" | "adequate" | "substantial";
export type OutputPotential = "reduced" | "ordinary" | "elevated";
export type FutureCapacity = "depleted" | "reduced" | "ordinary" | "restored";

export interface LifeLoadResolutionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly cutoff: HistoricalCutoff;
  readonly effortMode: EffortMode;
  readonly recovery: RecoveryLevel;
  readonly loadBand: LifeLoadBand;
  readonly priorFatigue: MindStrength | null;
  readonly resultingFatigue: MindStrength | null;
  readonly immediateOutputPotential: OutputPotential;
  readonly futureCapacity: FutureCapacity;
  readonly expectedWeekly: ExpectedWeeklyTimeRange;
  readonly exclusiveEquivalentWeekly: ExpectedWeeklyTimeRange;
  readonly contributorRefs: readonly LifeLoadContributor[];
}

export interface HistoricalCutoff {
  readonly asOfDate: IsoDate;
  readonly historySequenceExclusive: number;
}

export type QuantityUnitKey = `${string}:${string}`;

export interface ExactQuantity {
  readonly numerator: number;
  readonly denominator: number;
  readonly unit: QuantityUnitKey;
}

export type WorldMetricValue =
  | { readonly kind: "quantity"; readonly quantity: ExactQuantity }
  | { readonly kind: "money"; readonly money: MoneyAmount };

export type MetricMeasureNature = "stock" | "flow" | "rate" | "index";
export type ReferencePeriodKind = "point" | "interval";
export type MetricAggregationKind =
  "not-aggregatable" | "sum-compatible" | "derived-only";
export type MetricStateSemantics = "primitive" | "derived";
export type MetricDomainKey = `${string}.${string}`;
export type MetricSegmentKey = `${string}.${string}`;

export type MetricReferencePeriod =
  | { readonly kind: "point"; readonly at: IsoDate }
  | {
      readonly kind: "interval";
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    };

export interface MetricScope {
  readonly jurisdictionId: EntityId;
  readonly segmentKey: MetricSegmentKey | null;
}

export interface WorldMetricDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
  readonly domainKey: MetricDomainKey;
  readonly valueKind: WorldMetricValue["kind"];
  readonly quantityUnit: QuantityUnitKey | null;
  readonly measureNature: MetricMeasureNature;
  readonly referencePeriodKind: ReferencePeriodKind;
  readonly denominatorMetricId: EntityId | null;
  readonly aggregationKind: MetricAggregationKind;
  readonly aggregationNote: string;
  readonly stateSemantics: MetricStateSemantics;
  readonly tags: readonly string[];
}

export interface WorldMetricCatalog {
  readonly catalogVersion: "world-metric-catalog-v2";
  readonly definitions: Readonly<Record<string, WorldMetricDefinition>>;
  readonly definitionOrder: readonly EntityId[];
}

export type CausalMechanismResponseCurve =
  { readonly kind: "linear" } | { readonly kind: "bounded-ease-out" };

export interface CausalMechanismDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
  readonly domainKey: MetricDomainKey;
  readonly responseCurve: CausalMechanismResponseCurve;
  readonly tags: readonly string[];
}

export interface CausalMechanismCatalog {
  readonly catalogVersion: "causal-mechanism-catalog-v1";
  readonly definitions: Readonly<Record<string, CausalMechanismDefinition>>;
  readonly definitionOrder: readonly EntityId[];
}

export type CausalProcessKind = `${string}:${string}`;
export type EffectRealizationKind = `${string}:${string}`;

export type CausalRecordProvenance =
  | {
      readonly kind: "simulated";
      readonly sourceEntityIds: readonly EntityId[];
    }
  | {
      readonly kind: "initialization";
      readonly sourceReference: MetricSourceReference | null;
    }
  | { readonly kind: "authored"; readonly note: string };

export interface CausalProcessRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly kind: CausalProcessKind;
  readonly effectiveAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly sourceEntityIds: readonly EntityId[];
  readonly parentCausalIds: readonly EntityId[];
  readonly provenance: CausalRecordProvenance;
}

export type EffectDirection = "increase" | "decrease";

export type EffectThreshold =
  | { readonly kind: "target-at-least"; readonly value: WorldMetricValue }
  | { readonly kind: "target-at-most"; readonly value: WorldMetricValue };

export type EffectTargetBound =
  | { readonly kind: "minimum"; readonly value: WorldMetricValue }
  | { readonly kind: "maximum"; readonly value: WorldMetricValue };

/**
 * States the period meaning of an effect magnitude without inventing a
 * recurrence, cadence, or implicit duration conversion.
 *
 * A point metric's target point supplies its own basis. An interval metric
 * stores one exact calibrated interval total and can contribute only to that
 * same interval.
 */
export type EffectMagnitudeBasis =
  | { readonly kind: "point-at-target" }
  | {
      readonly kind: "interval-total";
      readonly referencePeriod: Extract<
        MetricReferencePeriod,
        { readonly kind: "interval" }
      >;
    };

export interface EffectActivationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly mechanismDefinitionId: EntityId;
  readonly causalProcessId: EntityId;
  readonly targetMetricId: EntityId;
  readonly targetScope: MetricScope;
  readonly direction: EffectDirection;
  readonly magnitude: WorldMetricValue;
  readonly magnitudeBasis: EffectMagnitudeBasis;
  readonly activatedAt: IsoDate;
  readonly onsetAt: IsoDate;
  readonly maturesAt: IsoDate;
  readonly endsAt: IsoDate | null;
  readonly threshold: EffectThreshold | null;
  readonly targetBound: EffectTargetBound | null;
  readonly realizationKind: EffectRealizationKind;
  readonly sourceEntityIds: readonly EntityId[];
  readonly recordedAt: IsoDate;
}

export type IncidentSemanticKey = `${string}:${string}`;
export type IncidentOccurrenceMode = "probabilistic" | "actor-initiated";
export type IncidentStatus = "active" | "resolved";
export type IncidentRuleComparison = "at-least" | "at-most";

export type IncidentMetricReference =
  | { readonly kind: "at-evaluation" }
  | { readonly kind: "exact"; readonly referencePeriod: MetricReferencePeriod };

export type IncidentRule =
  | {
      readonly kind: "metric-comparison";
      readonly stableKey: IncidentSemanticKey;
      readonly metricId: EntityId;
      readonly reference: IncidentMetricReference;
      readonly comparison: IncidentRuleComparison;
      readonly threshold: WorldMetricValue;
      readonly reasonKey: IncidentSemanticKey;
    }
  | {
      readonly kind: "historical-event";
      readonly stableKey: IncidentSemanticKey;
      readonly eventType: EventType | null;
      readonly eventTag: string | null;
      readonly reasonKey: IncidentSemanticKey;
    }
  | {
      readonly kind: "incident-state";
      readonly stableKey: IncidentSemanticKey;
      readonly definitionId: EntityId;
      readonly status: IncidentStatus;
      readonly phaseKey: IncidentSemanticKey | null;
      readonly reasonKey: IncidentSemanticKey;
    };

export interface IncidentLikelihoodModifier {
  readonly kind: "active-incident-factor";
  readonly stableKey: IncidentSemanticKey;
  readonly definitionId: EntityId;
  readonly factor: ExactQuantity;
  readonly reasonKey: IncidentSemanticKey;
}

export interface IncidentDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly label: string;
  readonly description: string;
  readonly incidentKind: IncidentSemanticKey;
  readonly occurrenceMode: IncidentOccurrenceMode;
  readonly baseLikelihood: ExactQuantity;
  readonly prerequisites: readonly IncidentRule[];
  readonly blockers: readonly IncidentRule[];
  readonly likelihoodModifiers: readonly IncidentLikelihoodModifier[];
  readonly tags: readonly string[];
}

export interface IncidentCatalog {
  readonly catalogVersion: "incident-catalog-v1";
  readonly definitions: Readonly<Record<string, IncidentDefinition>>;
  readonly definitionOrder: readonly EntityId[];
}

export type VitalitySemanticKey = `${string}:${string}`;

export interface MortalityRateEntry {
  readonly age: number;
  readonly annualProbability: ExactQuantity;
}

export interface MortalityTableDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly label: string;
  readonly description: string;
  readonly sourceKey: VitalitySemanticKey;
  readonly rates: readonly MortalityRateEntry[];
}

export interface VitalityCatalog {
  readonly catalogVersion: "vitality-catalog-v1";
  readonly mortalityTables: Readonly<Record<string, MortalityTableDefinition>>;
  readonly mortalityTableOrder: readonly EntityId[];
}

export type VitalityRecordProvenance =
  | {
      readonly kind: "simulated";
      readonly sourceEntityIds: readonly EntityId[];
    }
  | { readonly kind: "authored"; readonly note: string };

export interface MortalityCheckPlanRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly mortalityTableId: EntityId;
  readonly checkYear: number;
  readonly dueAt: IsoDate;
  readonly age: number;
  readonly annualProbability: ExactQuantity;
  readonly recordedAt: IsoDate;
  readonly provenance: VitalityRecordProvenance;
}

export interface MortalityRngResult {
  readonly version: "mortality-rng-v1";
  readonly key: string;
  readonly draw: number;
  readonly drawRangeExclusive: 4294967296;
  readonly died: boolean;
}

export interface MortalityCheckResultRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly planId: EntityId;
  readonly checkedAt: IsoDate;
  readonly outcome: "survived" | "died";
  readonly rng: MortalityRngResult;
  readonly deathEventId: EntityId | null;
  readonly deathRecordId: EntityId | null;
  readonly provenance: VitalityRecordProvenance;
}

export interface PersonDeathRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly diedAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly eventId: EntityId;
  readonly causeKey: VitalitySemanticKey;
  readonly sourceEntityIds: readonly EntityId[];
  readonly provenance: VitalityRecordProvenance;
}

export type PersonFunctionalCapacityStatus =
  "capable" | "limited" | "incapacitated";

export interface PersonFunctionalCapacityRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly status: PersonFunctionalCapacityStatus;
  readonly eventId: EntityId;
  readonly reasonKey: VitalitySemanticKey;
  readonly sourceEntityIds: readonly EntityId[];
  readonly supersedesCapacityId: EntityId | null;
  readonly provenance: VitalityRecordProvenance;
}

export type EvidenceSemanticKey = `${string}:${string}`;
export type EvidenceAccess = "public" | "restricted" | "private" | "sealed";

export type EvidenceRecordProvenance =
  | {
      readonly kind: "simulated";
      readonly sourceEntityIds: readonly EntityId[];
    }
  | { readonly kind: "authored"; readonly note: string };

export interface EvidenceArtifactRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly evidenceKind: EvidenceSemanticKey;
  readonly createdAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly relatedEntityIds: readonly EntityId[];
  readonly access: EvidenceAccess;
  readonly description: string | null;
  readonly provenance: EvidenceRecordProvenance;
}

export interface EvidenceDiscoveryRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly evidenceArtifactId: EntityId;
  readonly discoveredAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly methodKey: EvidenceSemanticKey;
  readonly discoveryEventId: EntityId;
  readonly provenance: EvidenceRecordProvenance;
}

export interface IncidentRuleEvaluation {
  readonly ruleStableKey: IncidentSemanticKey;
  readonly kind: IncidentRule["kind"];
  readonly status: "satisfied" | "unsatisfied" | "unavailable";
  readonly reasonKey: IncidentSemanticKey;
  readonly context: string;
  readonly sourceEntityIds: readonly EntityId[];
}

export interface IncidentLikelihoodModifierEvaluation {
  readonly modifierStableKey: IncidentSemanticKey;
  readonly applied: boolean;
  readonly factor: ExactQuantity;
  readonly reasonKey: IncidentSemanticKey;
  readonly sourceEntityIds: readonly EntityId[];
}

export interface IncidentRngResult {
  readonly key: string;
  readonly draw: number;
  readonly drawRangeExclusive: 4294967296;
  readonly occurred: boolean;
}

export interface IncidentConsequencePlan {
  readonly stableKey: IncidentSemanticKey;
  readonly targetMetricId: EntityId;
  readonly targetScope: MetricScope;
  readonly referencePeriod: MetricReferencePeriod;
  readonly direction: EffectDirection;
  readonly baseMagnitude: WorldMetricValue;
  readonly magnitudeBasis: EffectMagnitudeBasis;
  readonly mechanismDefinitionId: EntityId;
  readonly onsetAt: IsoDate;
  readonly maturesAt: IsoDate;
  readonly endsAt: IsoDate | null;
  readonly realizationKind: EffectRealizationKind;
}

export interface IncidentAppliedConsequencePlan extends IncidentConsequencePlan {
  readonly scaledMagnitude: WorldMetricValue;
}

export interface IncidentEvaluation {
  readonly definitionId: EntityId;
  readonly evaluationKey: string;
  readonly scope: MetricScope;
  readonly evaluatedAt: IsoDate;
  readonly cutoff: HistoricalCutoff;
  readonly prerequisiteResults: readonly IncidentRuleEvaluation[];
  readonly blockerResults: readonly IncidentRuleEvaluation[];
  readonly baseLikelihood: ExactQuantity;
  readonly appliedLikelihoodModifiers: readonly IncidentLikelihoodModifierEvaluation[];
  readonly likelihood: ExactQuantity;
  readonly rng: IncidentRngResult | null;
  readonly exposure: ExactQuantity;
  readonly vulnerability: ExactQuantity;
  readonly resilience: ExactQuantity;
  readonly impactShare: ExactQuantity;
  readonly consequences: readonly IncidentAppliedConsequencePlan[];
  readonly occurred: boolean;
}

export interface IncidentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly definitionId: EntityId;
  readonly incidentKind: IncidentSemanticKey;
  readonly scope: MetricScope;
  readonly onsetAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly rootCausalProcessId: EntityId;
  readonly onsetEventId: EntityId;
  readonly occurrence: IncidentEvaluation;
  readonly provenance: CausalRecordProvenance;
}

export interface IncidentStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly incidentId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: IncidentStatus;
  readonly phaseKey: IncidentSemanticKey;
  readonly eventId: EntityId;
  readonly reasonKey: IncidentSemanticKey | null;
  readonly context: string | null;
  readonly supersedesStateId: EntityId | null;
  readonly provenance: CausalRecordProvenance;
}

export interface IncidentTransitionPlanRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly incidentId: EntityId;
  readonly dueAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly targetStatus: IncidentStatus;
  readonly phaseKey: IncidentSemanticKey;
  readonly reasonKey: IncidentSemanticKey | null;
  readonly context: string | null;
  readonly consequences: readonly IncidentConsequencePlan[];
  readonly provenance: CausalRecordProvenance;
}

export type EffectContributionPhase =
  "not-started" | "ramping" | "mature" | "expired" | "threshold-not-met";

export interface EffectContribution {
  readonly effectActivationId: EntityId;
  readonly causalProcessId: EntityId;
  readonly rootCausalIds: readonly EntityId[];
  readonly phase: EffectContributionPhase;
  readonly factor: ExactQuantity;
  readonly signedValue: WorldMetricValue;
}

export type AggregateMetricEvaluation =
  | {
      readonly status: "available";
      readonly baselineStateId: EntityId;
      readonly metricId: EntityId;
      readonly scope: MetricScope;
      readonly referencePeriod: MetricReferencePeriod;
      readonly evaluatedAt: IsoDate;
      readonly baselineValue: WorldMetricValue;
      readonly resultingValue: WorldMetricValue;
      readonly contributions: readonly EffectContribution[];
      readonly rootCausalIds: readonly EntityId[];
    }
  | {
      readonly status: "unavailable";
      readonly reasonKey: `${string}:${string}`;
      readonly missingMetricIds: readonly EntityId[];
    };

export type DerivedLaborMarket =
  | {
      readonly status: "available";
      readonly residentPopulation: ExactQuantity;
      readonly laborForce: ExactQuantity;
      readonly employedPopulation: ExactQuantity;
      readonly unemployedPopulation: ExactQuantity;
      readonly unemploymentRate: ExactQuantity;
      readonly sourceStateIds: readonly EntityId[];
    }
  | {
      readonly status: "unavailable";
      readonly reasonKey: `${string}:${string}`;
      readonly missingMetricIds: readonly EntityId[];
    };

export type DerivedPurchasingPower =
  | {
      readonly status: "available";
      readonly value: ExactQuantity;
      readonly nominalIncomeStateId: EntityId;
      readonly costLevelStateId: EntityId;
    }
  | {
      readonly status: "unavailable";
      readonly reasonKey: `${string}:${string}`;
      readonly missingMetricIds: readonly EntityId[];
    };

export type DerivedFiscalBalance =
  | {
      readonly status: "available";
      readonly balance: MoneyAmount;
      readonly revenueStateId: EntityId;
      readonly outlaysStateId: EntityId;
    }
  | {
      readonly status: "unavailable";
      readonly reasonKey: `${string}:${string}`;
      readonly missingMetricIds: readonly EntityId[];
    };

export interface MetricSourceReference {
  readonly title: string;
  readonly locator: string | null;
}

export type MetricStateProvenance =
  | {
      readonly kind: "simulated";
      readonly sourceEntityIds: readonly EntityId[];
    }
  | {
      readonly kind: "initialization";
      readonly sourceReference: MetricSourceReference | null;
    }
  | { readonly kind: "authored"; readonly note: string };

export interface WorldMetricStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly metricId: EntityId;
  readonly scope: MetricScope;
  readonly referencePeriod: MetricReferencePeriod;
  readonly value: WorldMetricValue;
  readonly recordedAt: IsoDate;
  readonly provenance: MetricStateProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type MetricObservationUncertainty =
  | { readonly kind: "none" }
  | {
      readonly kind: "range";
      readonly lower: WorldMetricValue;
      readonly upper: WorldMetricValue;
    }
  | {
      readonly kind: "margin-of-error";
      readonly margin: WorldMetricValue;
      readonly confidence: ExactQuantity | null;
    };

export interface WorldMetricObservationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly metricId: EntityId;
  readonly scope: MetricScope;
  readonly referencePeriod: MetricReferencePeriod;
  readonly value: WorldMetricValue;
  readonly sourceSeriesKey: string;
  readonly sourceLabel: string;
  readonly sourceReference: MetricSourceReference | null;
  readonly methodologyKey: string | null;
  readonly releaseDate: IsoDate;
  readonly recordedAt: IsoDate;
  readonly vintageKey: string;
  readonly uncertainty: MetricObservationUncertainty;
  readonly supersedesObservationId: EntityId | null;
  readonly underlyingStateId: EntityId | null;
}

export type QuantitativePolicyAlternativeKind = `${string}:${string}`;
export type PolicySemanticKey = `${string}:${string}`;

export type PolicyRecordProvenance =
  | { readonly kind: "authored"; readonly note: string }
  | {
      readonly kind: "simulated";
      readonly sourceEntityIds: readonly EntityId[];
    }
  | {
      readonly kind: "source-record";
      readonly reference: string;
      readonly asOf: IsoDate;
    };

export interface PolicyAlternativeRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly alternativeKind: QuantitativePolicyAlternativeKind;
  readonly title: string;
  readonly summary: string;
  readonly propositionId: EntityId | null;
  readonly proposedAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly provenance: PolicyRecordProvenance;
}

export type PolicyChangeDirection = "increase" | "decrease";

export type QuantitativePolicyOperation =
  | { readonly kind: "set-level"; readonly value: WorldMetricValue }
  | {
      readonly kind: "absolute-change";
      readonly direction: PolicyChangeDirection;
      readonly magnitude: WorldMetricValue;
    }
  | {
      readonly kind: "relative-change";
      readonly direction: PolicyChangeDirection;
      readonly share: ExactQuantity;
    }
  | {
      readonly kind: "share-of-baseline";
      readonly direction: PolicyChangeDirection;
      readonly sourceBaselineId: EntityId;
      readonly share: ExactQuantity;
    }
  | { readonly kind: "cap"; readonly maximum: WorldMetricValue }
  | { readonly kind: "floor"; readonly minimum: WorldMetricValue };

export interface PolicyOperationTrigger {
  readonly baselineId: EntityId;
  readonly comparison: "at-least" | "at-most";
  readonly threshold: WorldMetricValue;
}

export interface PolicyEffectTiming {
  readonly startsAt: IsoDate;
  readonly maturesAt: IsoDate;
  readonly endsAt: IsoDate | null;
}

export interface PolicyOperationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly alternativeId: EntityId;
  readonly targetMetricId: EntityId;
  readonly targetScope: MetricScope;
  readonly targetReferencePeriod: MetricReferencePeriod;
  readonly targetBaselineId: EntityId;
  readonly operation: QuantitativePolicyOperation;
  readonly trigger: PolicyOperationTrigger | null;
  readonly mechanismDefinitionId: EntityId;
  readonly realizationKind: EffectRealizationKind;
  readonly timing: PolicyEffectTiming;
  readonly recordedAt: IsoDate;
  readonly provenance: PolicyRecordProvenance;
}

export interface PolicyBaselineRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly seriesKey: PolicySemanticKey;
  readonly metricId: EntityId;
  readonly scope: MetricScope;
  readonly referencePeriod: MetricReferencePeriod;
  readonly expectedValue: WorldMetricValue;
  readonly generatedAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly sourceEntityIds: readonly EntityId[];
  readonly methodologyKey: PolicySemanticKey;
  readonly assumptionKeys: readonly PolicySemanticKey[];
  readonly uncertainty: MetricObservationUncertainty;
  readonly provenance: PolicyRecordProvenance;
  readonly supersedesBaselineId: EntityId | null;
}

export type PolicyImplementationFactorKind =
  | "authority"
  | "funding"
  | "administrative-capacity"
  | "enforcement-compliance"
  | "uptake-participation";

export type PolicyImplementationFactorBasis =
  | { readonly kind: "direct" }
  | {
      readonly kind: "resource-ratio";
      readonly required: WorldMetricValue;
      readonly available: WorldMetricValue;
    };

export interface PolicyImplementationFactor {
  readonly kind: PolicyImplementationFactorKind;
  readonly share: ExactQuantity;
  readonly basis: PolicyImplementationFactorBasis;
  readonly reasonKey: PolicySemanticKey;
  readonly explanation: string;
  readonly evidenceEntityIds: readonly EntityId[];
}

export interface PolicyImplementationProfileRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly alternativeId: EntityId;
  readonly operationIds: readonly EntityId[];
  readonly factors: readonly PolicyImplementationFactor[];
  readonly aggregateRule: "multiplicative-v1";
  readonly assessedAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly provenance: PolicyRecordProvenance;
}

export type PolicyImplementationStatus = "full" | "partial" | "blocked";

export interface PolicyEstimatedConsequence {
  readonly operationId: EntityId;
  readonly baselineId: EntityId;
  readonly triggered: boolean;
  readonly baselineValue: WorldMetricValue;
  readonly intendedChange: WorldMetricValue;
  readonly intendedResult: WorldMetricValue;
  readonly implementationShare: ExactQuantity;
  readonly estimatedChange: WorldMetricValue;
  readonly estimatedResult: WorldMetricValue;
  readonly uncertainty: MetricObservationUncertainty;
}

export interface PolicyEstimateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly seriesKey: PolicySemanticKey;
  readonly alternativeId: EntityId;
  readonly operationIds: readonly EntityId[];
  readonly implementationProfileId: EntityId;
  readonly projectedCausalProcessId: EntityId;
  readonly implementationStatus: PolicyImplementationStatus;
  readonly consequences: readonly PolicyEstimatedConsequence[];
  readonly generatedAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly provenance: PolicyRecordProvenance;
  readonly supersedesEstimateId: EntityId | null;
}

export interface PolicyRealizedConsequence {
  readonly operationId: EntityId;
  readonly effectActivationId: EntityId;
  readonly realizedChange: WorldMetricValue;
}

export type PolicyRealizationStatus =
  "full" | "partial" | "blocked" | "not-triggered";

export interface PolicyRealizationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly estimateId: EntityId;
  readonly implementationProfileId: EntityId;
  readonly status: PolicyRealizationStatus;
  readonly realizedAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly actualCausalProcessId: EntityId | null;
  readonly consequences: readonly PolicyRealizedConsequence[];
  readonly reasonKeys: readonly PolicySemanticKey[];
  readonly provenance: PolicyRecordProvenance;
}

export type CanonicalAccess =
  | { readonly kind: "office" }
  | {
      readonly kind: "private";
      readonly personIds: readonly EntityId[];
    };

export interface AuthoredActivityLocation {
  readonly locationKey: string;
  readonly label: string;
  readonly jurisdictionId: EntityId | null;
}

export type ScheduledActivityKind =
  "confirmed" | "tentative" | "flexible" | "travel";

export type ScheduledActivityFlexibility =
  | { readonly kind: "fixed" }
  | {
      readonly kind: "movable";
      readonly earliestStart: SimulationMoment;
      readonly latestEnd: SimulationMoment;
    };

export interface ScheduledActivityRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly createdAt: SimulationMoment;
  readonly title: string;
  readonly summary: string;
  readonly kind: ScheduledActivityKind;
  readonly participantPersonIds: readonly EntityId[];
  readonly responsiblePersonId: EntityId | null;
  readonly location: AuthoredActivityLocation;
  readonly sourceEntityIds: readonly EntityId[];
  readonly flexibility: ScheduledActivityFlexibility;
  readonly access: CanonicalAccess;
}

export type ScheduledActivityStatus = "scheduled" | "completed" | "cancelled";

export type ScheduledActivityStateChange =
  "created" | "rescheduled" | "completed" | "cancelled";

export interface ScheduledActivityStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly activityId: EntityId;
  readonly recordedAt: SimulationMoment;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly status: ScheduledActivityStatus;
  readonly change: ScheduledActivityStateChange;
  readonly outcomeEventId: EntityId | null;
  readonly supersedesStateId: EntityId | null;
}

export type WorkPlayerRequirement = "decision" | "action" | "none";
export type WorkItemStatus =
  "active" | "ready-for-review" | "completed" | "cancelled";

export type WorkFocusTarget =
  | {
      readonly kind: "person";
      readonly personId: EntityId;
    }
  | {
      readonly kind: "legislative-material";
      readonly targetKey: string;
      readonly sourceEntityId: EntityId;
    }
  | {
      readonly kind: "calendar-item";
      readonly scheduledActivityId: EntityId;
    }
  | {
      readonly kind: "other";
      readonly targetKey: string;
      readonly sourceEntityId: EntityId;
    };

export interface AuthoredWorkEffort {
  readonly kind: "authored-duration";
  readonly requiredMinutes: number;
}

export interface WorkItemRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly createdAt: SimulationMoment;
  readonly title: string;
  readonly summary: string;
  readonly jurisdictionId: EntityId | null;
  readonly sourceEntityIds: readonly EntityId[];
  readonly focus: WorkFocusTarget;
  readonly effort: AuthoredWorkEffort | null;
  readonly access: CanonicalAccess;
}

export interface WorkItemStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly workItemId: EntityId;
  readonly recordedAt: SimulationMoment;
  readonly status: WorkItemStatus;
  readonly assignedPersonIds: readonly EntityId[];
  readonly playerRequirement: WorkPlayerRequirement;
  readonly waitingOnPersonIds: readonly EntityId[];
  readonly blocker: string | null;
  readonly completedEffortMinutes: number;
  readonly scheduledActivityId: EntityId | null;
  readonly outcomeEventId: EntityId | null;
  readonly supersedesStateId: EntityId | null;
}

export type FutureTransitionKey = `${string}:${string}`;
export type FutureDueReasonKey = `${string}:${string}`;

export type FutureDueItemProvenance =
  | {
      readonly kind: "simulated";
      readonly sourceEntityIds: readonly EntityId[];
    }
  | { readonly kind: "initialization"; readonly reference: string | null }
  | { readonly kind: "authored"; readonly note: string };

export interface FutureDueItem {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly scheduledAt: IsoDate;
  readonly dueAt: IsoDate;
  readonly transitionKey: FutureTransitionKey;
  readonly entityIds: readonly EntityId[];
  readonly jurisdictionId: EntityId | null;
  readonly provenance: FutureDueItemProvenance;
}

export type FutureDueItemStatus =
  "scheduled" | "resolved" | "cancelled" | "blocked";

export interface FutureDueItemStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly dueItemId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: FutureDueItemStatus;
  readonly reasonKey: FutureDueReasonKey | null;
  readonly context: string | null;
  readonly outcomeEventId: EntityId | null;
  readonly supersedesStateId: EntityId | null;
}

export interface FutureTransitionHandlerResult {
  readonly world: World;
  readonly status: "resolved" | "cancelled" | "blocked";
  readonly reasonKey: FutureDueReasonKey | null;
  readonly context: string | null;
  readonly outcomeEventId: EntityId | null;
}

export type FutureTransitionHandler = (
  world: World,
  dueItem: FutureDueItem,
) => FutureTransitionHandlerResult;

export interface FutureTransitionHandlerRegistry {
  get(transitionKey: FutureTransitionKey): FutureTransitionHandler | undefined;
}

export interface MoneyAmount {
  readonly minorUnits: number;
  readonly currency: CurrencyCode;
}

export type ResourceEndpoint =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId }
  | { readonly kind: "organization"; readonly organizationId: EntityId };

export type ResourcePositionOwner =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId };

export type ResourceFlowBasisNamespace =
  "compensation" | "support" | "housing" | "care" | "obligation" | "custom";
export type ResourceFlowBasisKind = `${ResourceFlowBasisNamespace}:${string}`;
export type ResourceRestrictionNamespace =
  "purpose" | "restricted" | "unrestricted" | "custom";
export type ResourceRestrictionKind =
  `${ResourceRestrictionNamespace}:${string}`;
export type ResourceCadenceNamespace =
  "schedule" | "work" | "support" | "custom";
export type ResourceCadenceKind = `${ResourceCadenceNamespace}:${string}`;

export type ResourceFlowBasisReference =
  | { readonly kind: "work"; readonly workRelationshipId: EntityId }
  | { readonly kind: "care"; readonly careResponsibilityId: EntityId }
  | { readonly kind: "housing"; readonly housingTenureId: EntityId }
  | { readonly kind: "general" };

export interface ResourcePosition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly owner: ResourcePositionOwner;
  readonly openedAt: IsoDate;
  readonly openingBalance: MoneyAmount;
  readonly provenance: LifeRecordProvenance;
}

export interface ResourceFlow {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly source: ResourceEndpoint;
  readonly recipient: ResourceEndpoint;
  readonly recordedAt: IsoDate;
  readonly startsAt: IsoDate;
  readonly basisKind: ResourceFlowBasisKind;
  readonly basisReference: ResourceFlowBasisReference;
  readonly restrictionKind: ResourceRestrictionKind | null;
  readonly jurisdictionId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
}

export type ResourceFlowStatus = "expected" | "active" | "ended";

export interface ResourceFlowTermsRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly resourceFlowId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: ResourceFlowStatus;
  readonly amount: MoneyAmount;
  readonly cadenceKind: ResourceCadenceKind;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesTermsId: EntityId | null;
}

export type ResourceTransferOutcomeStatus =
  "completed" | "partial" | "missed" | "blocked";
export type ResourceOutcomeReasonNamespace =
  "capacity" | "authorization" | "timing" | "dispute" | "custom";
export type ResourceOutcomeReasonKind =
  `${ResourceOutcomeReasonNamespace}:${string}`;

export interface ResourceTransferOutcome {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly resourceFlowId: EntityId;
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly occurredAt: IsoDate;
  readonly status: ResourceTransferOutcomeStatus;
  readonly attemptedAmount: MoneyAmount;
  readonly transferredAmount: MoneyAmount;
  readonly reasonKind: ResourceOutcomeReasonKind | null;
  readonly note: string | null;
  readonly provenance: LifeRecordProvenance;
}

export type ResourceObligationBasisNamespace =
  "housing" | "debt" | "support" | "care" | "custom";
export type ResourceObligationBasisKind =
  `${ResourceObligationBasisNamespace}:${string}`;

export interface ResourceObligation {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly resourceFlowId: EntityId;
  readonly establishedAt: IsoDate;
  readonly basisKind: ResourceObligationBasisKind;
  /** Null for a recurring obligation without a finite debt principal. */
  readonly principal: MoneyAmount | null;
  readonly careResponsibilityId: EntityId | null;
  readonly housingTenureId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
}

export type ResourceObligationStatus = "active" | "satisfied" | "ended";

export interface ResourceObligationStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly resourceObligationId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: ResourceObligationStatus;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type DwellingClassificationNamespace =
  "residential" | "institutional" | "assigned" | "custom";
export type DwellingClassification =
  `${DwellingClassificationNamespace}:${string}`;

export interface Dwelling {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly establishedAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly locationLabel: string;
  readonly classification: DwellingClassification;
  readonly provenance: LifeRecordProvenance;
}

export type DwellingOccupant =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId };
export type DwellingOccupancyNamespace =
  "residence" | "hosted" | "institutional" | "custom";
export type DwellingOccupancyKind = `${DwellingOccupancyNamespace}:${string}`;

export interface DwellingOccupancy {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly occupant: DwellingOccupant;
  readonly dwellingId: EntityId;
  readonly startedAt: IsoDate;
  readonly provenance: LifeRecordProvenance;
}

export type DwellingOccupancyStatus = "active" | "ended";

export interface DwellingOccupancyStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly dwellingOccupancyId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: DwellingOccupancyStatus;
  readonly residenceRole: ResidenceRole;
  readonly kind: DwellingOccupancyKind;
  readonly reason: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

export type HousingTenureHolder =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId }
  | { readonly kind: "organization"; readonly organizationId: EntityId };
export type HousingTenureNamespace =
  "ownership" | "lease" | "assignment" | "hosted" | "custom";
export type HousingTenureKind = `${HousingTenureNamespace}:${string}`;

export interface HousingTenure {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly holder: HousingTenureHolder;
  readonly dwellingId: EntityId;
  readonly startedAt: IsoDate;
  readonly kind: HousingTenureKind;
  readonly provenance: LifeRecordProvenance;
}

export type HousingTenureStatus = "active" | "ended";

export interface HousingTenureStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly housingTenureId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: HousingTenureStatus;
  readonly context: string | null;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesStateId: EntityId | null;
}

/** Finite engine record families that may serve as canonical Stage 5 evidence. */
export type LifeHistoryRecordFamily =
  | "work-relationship"
  | "work-status"
  | "work-role"
  | "household-membership"
  | "household-membership-state"
  | "kinship"
  | "partnership"
  | "partnership-state"
  | "care-responsibility"
  | "care-state"
  | "life-commitment"
  | "life-load-resolution"
  | "education-enrollment"
  | "education-enrollment-state"
  | "organization-participation"
  | "organization-participation-state"
  | "child-authority"
  | "child-authority-state"
  | "resource-position"
  | "resource-flow"
  | "resource-flow-terms"
  | "resource-transfer-outcome"
  | "resource-obligation"
  | "resource-obligation-state"
  | "dwelling"
  | "dwelling-occupancy"
  | "dwelling-occupancy-state"
  | "housing-tenure"
  | "housing-tenure-state";

export interface LifeHistoryRecordReference {
  readonly family: LifeHistoryRecordFamily;
  readonly recordId: EntityId;
}

export type LifeEligibilityActionNamespace =
  "education" | "participation" | "authority" | "work" | "life" | "custom";
export type LifeEligibilityActionKey =
  `${LifeEligibilityActionNamespace}:${string}`;
export type LifeEligibilityReasonNamespace =
  "rule" | "context" | "capacity" | "custom";
export type LifeEligibilityReasonKey =
  `${LifeEligibilityReasonNamespace}:${string}`;

export interface LifeEligibilityRequest {
  readonly actorPersonId: EntityId;
  readonly actionKey: LifeEligibilityActionKey;
  readonly asOfDate: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly contextEntityIds: readonly EntityId[];
}

export interface LifeEligibilityReason {
  readonly key: LifeEligibilityReasonKey;
  readonly explanation: string;
}

export type LifeEligibilityDecision =
  | {
      readonly status: "allowed";
      readonly reasons: readonly LifeEligibilityReason[];
    }
  | {
      readonly status: "blocked";
      readonly reasons: readonly [
        LifeEligibilityReason,
        ...LifeEligibilityReason[],
      ];
    };

export interface LifeEligibilityProvider {
  evaluate(
    world: World,
    request: LifeEligibilityRequest,
  ): LifeEligibilityDecision;
}

export type DecisionSourceNamespace =
  | "mind"
  | "belief"
  | "information"
  | "social"
  | "context"
  | "institution"
  | "domain";
export type DecisionSourceType = `${DecisionSourceNamespace}:${string}`;
export type DecisionDirection = "supports" | "opposes";
export type DecisionImportance = "slight" | "moderate" | "strong" | "decisive";
export type DecisionRandomnessPolicy = "none" | "close-choices";
export type DecisionTraceRetention = "ephemeral" | "durable";

export interface DecisionSubject {
  readonly kind: PerceptionSubjectKind;
  readonly key: string;
  readonly entityId: EntityId | null;
}

export interface DecisionOption {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface DecisionConstraint {
  readonly stableKey: string;
  readonly optionKey: string;
  readonly kind: string;
  readonly explanation: string;
  readonly sourceRefs: readonly MindSourceReference[];
}

export interface DecisionConsideration {
  readonly stableKey: string;
  readonly optionKey: string;
  readonly sourceType: DecisionSourceType;
  readonly direction: DecisionDirection;
  readonly importance: DecisionImportance;
  readonly confidence: MindConfidence;
  readonly explanation: string;
  readonly sourceRefs: readonly MindSourceReference[];
}

export interface DecisionContext {
  readonly stableKey: string;
  readonly decisionType: string;
  readonly actorPersonId: EntityId;
  readonly cutoff: HistoricalCutoff;
  readonly subject: DecisionSubject;
  readonly options: readonly DecisionOption[];
  readonly constraints: readonly DecisionConstraint[];
  readonly considerations: readonly DecisionConsideration[];
  readonly perceptionIds: readonly EntityId[];
  readonly randomness: DecisionRandomnessPolicy;
  readonly retention: DecisionTraceRetention;
}

export type DecisionPreference =
  "strongly-opposed" | "opposed" | "mixed" | "supported" | "strongly-supported";
export type RandomContribution = "none" | "slight-penalty" | "slight-boost";

export interface DecisionOptionEvaluation {
  readonly optionKey: string;
  readonly available: boolean;
  readonly blockedByConstraintKeys: readonly string[];
  readonly considerationKeys: readonly string[];
  readonly preference: DecisionPreference;
  readonly randomContribution: RandomContribution;
  readonly finalRank: number | null;
}

export interface DecisionSourceSnapshot {
  readonly reference: MindSourceReference;
  readonly label: string;
  readonly content: string;
}

export type DecisionOutcomeKind = "selected" | "no-available-option";

export interface DecisionEvaluation {
  readonly decisionId: EntityId;
  readonly context: DecisionContext;
  readonly optionEvaluations: readonly DecisionOptionEvaluation[];
  readonly outcomeKind: DecisionOutcomeKind;
  readonly selectedOptionKey: string | null;
  readonly sourceSnapshots: readonly DecisionSourceSnapshot[];
  readonly rngVersion: "decision-rng-v1";
}

export interface DecisionTraceRecord extends DecisionEvaluation {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
}

export type DevelopmentTarget =
  | {
      readonly kind: "personality";
      readonly tendencyId: EntityId;
      readonly expressionKey: string;
    }
  | { readonly kind: "value"; readonly valueId: EntityId }
  | { readonly kind: "goal"; readonly goalId: EntityId }
  | {
      readonly kind: "relationship";
      readonly otherPersonId: EntityId;
    };

export interface DevelopmentProposal {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly personId: EntityId;
  readonly proposedAt: IsoDate;
  readonly target: DevelopmentTarget;
  readonly direction:
    "strengthen" | "soften" | "reconsider" | "activate" | "retire";
  readonly sourceRefs: readonly MindSourceReference[];
  readonly repetitionKey: string | null;
  readonly rationale: string;
  readonly requiresPlayerChoice: boolean;
}

export type ControlState =
  | { readonly kind: "observer" }
  | { readonly kind: "person"; readonly personId: EntityId };

export type ElectionContestStatus = "pending" | "resolved" | "cancelled";

export interface ElectiveOfficeRef {
  /** Stable semantic identifier for the office, e.g. "mayor", "council:district-1", "school-board:seat-a". */
  readonly officeKey: string;
  /** Human-readable title of the elective office, e.g. "Mayor", "City Council Member, District 1". */
  readonly title: string;
  /** Optional seat, district, or ward designation. */
  readonly seatKey: string | null;
  /** Open taxonomy classification linking to occupation/work semantics if applicable. */
  readonly occupationClassification: OccupationClassification | null;
}

export interface ElectionContestProvenance {
  readonly method: "authored" | "simulated" | "manual";
  readonly sourceEntityIds: readonly EntityId[];
  readonly note: string | null;
}

export interface ElectionContestRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly jurisdictionId: EntityId;
  readonly office: ElectiveOfficeRef;
  readonly electionDate: IsoDate;
  readonly candidatePersonIds: readonly EntityId[];
  readonly scheduledAt: IsoDate;
  readonly provenance: ElectionContestProvenance;
}

export interface CandidateTally {
  readonly candidatePersonId: EntityId;
  readonly votes: number;
  readonly voteShare: number;
}

export interface ElectionContestResultRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly contestId: EntityId;
  readonly resolvedAt: IsoDate;
  readonly winnerPersonId: EntityId;
  readonly tallies: readonly CandidateTally[];
  readonly outcomeEventId: EntityId;
  readonly provenance: ElectionContestProvenance;
}

export interface ScheduleElectionContestInput {
  readonly stableKey: string;
  readonly jurisdictionId: EntityId;
  readonly office: ElectiveOfficeRef;
  readonly electionDate: string;
  readonly candidatePersonIds: readonly EntityId[];
  readonly provenance: ElectionContestProvenance;
}

export interface ResolveElectionContestInput {
  readonly stableKey?: string;
  readonly contestId: EntityId;
  readonly resolvedAt?: string;
  readonly winnerPersonId?: EntityId;
  readonly tallies?: readonly CandidateTally[];
  readonly provenance?: ElectionContestProvenance;
}

export interface CancelElectionContestInput {
  readonly stableKey: string;
  readonly contestId: EntityId;
  readonly effectiveAt: string;
  readonly reason: string;
}

export interface HistoryStore {
  readonly nextSequence: number;
  readonly organizations: readonly Organization[];
  readonly organizationProfiles: readonly OrganizationProfileRecord[];
  readonly educationEnrollments: readonly EducationEnrollment[];
  readonly educationEnrollmentStates: readonly EducationEnrollmentStateRecord[];
  readonly organizationParticipations: readonly OrganizationParticipation[];
  readonly organizationParticipationStates: readonly OrganizationParticipationStateRecord[];
  readonly workRelationships: readonly WorkRelationship[];
  readonly workStatuses: readonly WorkStatusRecord[];
  readonly workRoles: readonly WorkRoleRecord[];
  readonly households: readonly Household[];
  readonly householdLocations: readonly HouseholdLocationRecord[];
  readonly householdMemberships: readonly HouseholdMembership[];
  readonly householdMembershipStates: readonly HouseholdMembershipStateRecord[];
  readonly kinshipRelationships: readonly KinshipRelationship[];
  readonly partnerships: readonly Partnership[];
  readonly partnershipStates: readonly PartnershipStateRecord[];
  readonly careResponsibilities: readonly CareResponsibility[];
  readonly careResponsibilityStates: readonly CareResponsibilityStateRecord[];
  readonly childAuthorities: readonly ChildAuthority[];
  readonly childAuthorityStates: readonly ChildAuthorityStateRecord[];
  readonly lifeCommitments: readonly LifeCommitmentRecord[];
  readonly lifeLoadResolutions: readonly LifeLoadResolutionRecord[];
  readonly resourcePositions: readonly ResourcePosition[];
  readonly resourceFlows: readonly ResourceFlow[];
  readonly resourceFlowTerms: readonly ResourceFlowTermsRecord[];
  readonly resourceTransferOutcomes: readonly ResourceTransferOutcome[];
  readonly resourceObligations: readonly ResourceObligation[];
  readonly resourceObligationStates: readonly ResourceObligationStateRecord[];
  readonly dwellings: readonly Dwelling[];
  readonly dwellingOccupancies: readonly DwellingOccupancy[];
  readonly dwellingOccupancyStates: readonly DwellingOccupancyStateRecord[];
  readonly housingTenures: readonly HousingTenure[];
  readonly housingTenureStates: readonly HousingTenureStateRecord[];
  readonly metricStates: readonly WorldMetricStateRecord[];
  readonly metricObservations: readonly WorldMetricObservationRecord[];
  readonly causalProcesses: readonly CausalProcessRecord[];
  readonly effectActivations: readonly EffectActivationRecord[];
  readonly policyAlternatives: readonly PolicyAlternativeRecord[];
  readonly policyBaselines: readonly PolicyBaselineRecord[];
  readonly policyOperations: readonly PolicyOperationRecord[];
  readonly policyImplementationProfiles: readonly PolicyImplementationProfileRecord[];
  readonly policyEstimates: readonly PolicyEstimateRecord[];
  readonly policyRealizations: readonly PolicyRealizationRecord[];
  readonly incidents: readonly IncidentRecord[];
  readonly incidentStates: readonly IncidentStateRecord[];
  readonly incidentTransitionPlans: readonly IncidentTransitionPlanRecord[];
  readonly mortalityCheckPlans: readonly MortalityCheckPlanRecord[];
  readonly mortalityCheckResults: readonly MortalityCheckResultRecord[];
  readonly personDeaths: readonly PersonDeathRecord[];
  readonly personFunctionalCapacities: readonly PersonFunctionalCapacityRecord[];
  readonly evidenceArtifacts: readonly EvidenceArtifactRecord[];
  readonly evidenceDiscoveries: readonly EvidenceDiscoveryRecord[];
  readonly scheduledActivities: readonly ScheduledActivityRecord[];
  readonly scheduledActivityStates: readonly ScheduledActivityStateRecord[];
  readonly workItems: readonly WorkItemRecord[];
  readonly workItemStates: readonly WorkItemStateRecord[];
  readonly electionContests?: readonly ElectionContestRecord[];
  readonly electionContestResults?: readonly ElectionContestResultRecord[];
  readonly legislativeMeasures?: readonly LegislativeMeasureRecord[];
  readonly legislativeActions?: readonly LegislativeActionRecord[];
  readonly committeeReferrals?: readonly CommitteeReferralRecord[];
  readonly committeeActions?: readonly CommitteeActionRecord[];
  readonly legislativeAmendments?: readonly LegislativeAmendmentRecord[];
  readonly legislativeVotes?: readonly LegislativeVoteRecord[];
  readonly executiveDispositions?: readonly ExecutiveDispositionRecord[];
  readonly legislativeEnactments?: readonly LegislativeEnactmentRecord[];
  readonly futureDueItems: readonly FutureDueItem[];
  readonly futureDueItemStates: readonly FutureDueItemStateRecord[];
  readonly events: readonly HistoricalEvent[];
  readonly memories: readonly MemoryRecord[];
  readonly knowledge: readonly EventKnowledgeRecord[];
  readonly claims: readonly ClaimRecord[];
  readonly relationshipInteractions: readonly RelationshipInteraction[];
  readonly propositionExposures: readonly PropositionExposureRecord[];
  readonly privateBeliefs: readonly PrivateBeliefRecord[];
  readonly publicPositions: readonly PublicPositionRecord[];
  readonly campaignCommitments: readonly CampaignCommitmentRecord[];
  readonly principles: readonly PrincipleRecord[];
  readonly subjectKnowledge: readonly SubjectKnowledgeRecord[];
  readonly personalityTendencies: readonly PersonalityTendencyRecord[];
  readonly personalValues: readonly PersonalValueRecord[];
  readonly goalStates: readonly GoalStateRecord[];
  readonly appraisals: readonly AppraisalRecord[];
  readonly perceptions: readonly PerceptionRecord[];
  readonly temporaryStates: readonly TemporaryStateRecord[];
  readonly decisionTraces: readonly DecisionTraceRecord[];
}

// ---------------------------------------------------------------------------
// Legislation — canonical measures, procedural actions, and recorded votes
// ---------------------------------------------------------------------------

/** How a measure came to exist, for provenance rather than gameplay flavour. */
export type LegislativeMeasureOrigin =
  "member-introduction" | "committee-introduction" | "executive-request";

/**
 * Subject class that institutional rules actually branch on. This is not a
 * topic taxonomy: it exists because real rules impose different thresholds on
 * money bills than on general policy.
 */
export type LegislativeSubjectClass =
  "general-policy" | "appropriation" | "revenue";

export interface LegislativeMeasureRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly jurisdictionId: EntityId;
  /** Rule pack governing this measure for its whole life. */
  readonly rulePackId: string;
  /** Institutional designation, e.g. "HB 214" or "LB 88". */
  readonly designation: string;
  readonly shortTitle: string;
  readonly summary: string;
  readonly origin: LegislativeMeasureOrigin;
  readonly subjectClass: LegislativeSubjectClass;
  readonly originChamberKey: string;
  readonly sponsorPersonId: EntityId | null;
  readonly introducedAt: IsoDate;
  /** Optional link to the office working draft the measure was filed from. */
  readonly sourceDocumentKey: string | null;
  /** Optional links to existing quantitative policy alternatives. */
  readonly policyAlternativeIds: readonly EntityId[];
}

export type LegislativeActionKind =
  | "introduced"
  | "referred"
  | "committee-hearing-held"
  | "committee-reported"
  | "committee-not-reported"
  | "placed-on-calendar"
  | "amendment-adopted"
  | "amendment-rejected"
  | "floor-stage-passed"
  | "floor-stage-failed"
  | "transmitted"
  | "concurred"
  | "concurrence-failed"
  | "enrolled"
  | "presented-to-executive"
  | "signed"
  | "vetoed"
  | "override-chamber-recorded"
  | "override-succeeded"
  | "override-failed"
  | "enacted"
  | "died-on-adjournment";

/**
 * One consequential procedural transition. Actions are append-only and are the
 * durable record of what happened to a measure and why.
 */
export interface LegislativeActionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly kind: LegislativeActionKind;
  readonly occurredAt: IsoDate;
  /** Chamber the action happened in; null for executive and joint action. */
  readonly chamberKey: string | null;
  readonly committeeKey: string | null;
  readonly floorStageKey: string | null;
  /** The actor or body responsible, in plain language. */
  readonly actorLabel: string;
  /** Why this happened, in plain language, for the player-facing record. */
  readonly rationale: string;
  readonly eventId: EntityId;
  readonly voteId: EntityId | null;
  readonly amendmentId: EntityId | null;
}

export interface CommitteeReferralRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly chamberKey: string;
  readonly committeeKey: string;
  readonly referredAt: IsoDate;
  readonly referredByLabel: string;
  /** Position in a sequential referral chain, starting at 1. */
  readonly order: number;
}

/**
 * What a committee recommended when it did report a measure.
 *
 * This is the committee's opinion, not whether the motion to report carried.
 * Kentucky's chambers spell the forms out: a standing committee may report a
 * bill with the expression of opinion that it should pass, that it should pass
 * with a committee amendment or substitute, or that it *should not pass*
 * (House Rule 46; Senate Rule 46). A "should not pass" report is still a
 * report and still reaches the floor.
 */
export type CommitteeRecommendation =
  "favorable" | "unfavorable" | "without-recommendation";

/**
 * What the committee did with the measure.
 *
 * Reporting it and failing to report it are different institutional events
 * with different downstream reachability, so they are different shapes rather
 * than one field with a misleading default. Kentucky's Senate treats a
 * committee that "fails or refuses to report a bill" as its own situation with
 * its own remedy (Senate Rule 48).
 */
export type CommitteeDisposition =
  | {
      readonly kind: "reported";
      readonly recommendation: CommitteeRecommendation;
    }
  | { readonly kind: "not-reported" };

export interface CommitteeActionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly referralId: EntityId;
  readonly actedAt: IsoDate;
  readonly disposition: CommitteeDisposition;
  readonly hearingHeld: boolean;
  readonly voteId: EntityId;
}

export type LegislativeAmendmentStatus = "adopted" | "rejected";

export interface LegislativeAmendmentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly chamberKey: string;
  readonly floorStageKey: string | null;
  readonly offeredAt: IsoDate;
  readonly offeredByPersonId: EntityId | null;
  readonly offeredByLabel: string;
  readonly description: string;
  readonly status: LegislativeAmendmentStatus;
  readonly voteId: EntityId;
}

export type LegislativeVoteForum =
  | { readonly kind: "chamber"; readonly chamberKey: string }
  | {
      readonly kind: "committee";
      readonly chamberKey: string;
      readonly committeeKey: string;
    }
  | { readonly kind: "joint-session"; readonly forumName: string };

export type LegislativeVotePurpose =
  | "committee-report"
  | "floor-stage"
  | "amendment"
  | "concurrence"
  | "veto-override";

/**
 * How a single member disposed of a question. Legislative voting is a record of
 * named members, never a share or a floating tally.
 */
export type LegislativeMemberDisposition =
  "yea" | "nay" | "present-not-voting" | "absent" | "excused";

export interface LegislativeVoteDisposition {
  /** Stable member identity within the seated body. */
  readonly memberKey: string;
  /** Canonical person when the member is simulated; null otherwise. */
  readonly personId: EntityId | null;
  readonly disposition: LegislativeMemberDisposition;
}

export interface LegislativeVoteTally {
  readonly yea: number;
  readonly nay: number;
  readonly presentNotVoting: number;
  readonly absent: number;
  readonly excused: number;
}

export type LegislativeVoteProvenanceMethod =
  "member-decisions" | "authored-fixture";

export interface LegislativeVoteProvenance {
  readonly method: LegislativeVoteProvenanceMethod;
  readonly note: string;
  readonly sourceEntityIds: readonly EntityId[];
}

export interface LegislativeVoteRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly forum: LegislativeVoteForum;
  readonly purpose: LegislativeVotePurpose;
  readonly floorStageKey: string | null;
  readonly takenAt: IsoDate;
  /** Members entitled to vote in this forum. */
  readonly eligibleMembers: number;
  /**
   * Members present. Null means the record does not represent presence, which
   * is different from nobody being present.
   */
  readonly presentMembers: number | null;
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly tally: LegislativeVoteTally;
  /** Plain-language statement of the rule that had to be met. */
  readonly thresholdLabel: string;
  readonly denominatorKind: string;
  readonly denominatorValue: number;
  readonly requiredVotes: number;
  readonly outcome: "passed" | "failed";
  readonly provenance: LegislativeVoteProvenance;
}

export type ExecutiveActionKind =
  "signed" | "vetoed" | "line-item-vetoed" | "became-law-without-signature";

export interface ExecutiveDispositionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly actedAt: IsoDate;
  readonly action: ExecutiveActionKind;
  readonly actorLabel: string;
  readonly rationale: string;
}

export type LegislativeTerminalOutcome =
  | "enacted"
  | "failed-in-committee"
  | "failed-on-floor"
  | "failed-concurrence"
  | "vetoed-and-sustained"
  | "died-on-adjournment";

export interface LegislativeEnactmentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly resolvedAt: IsoDate;
  readonly outcome: LegislativeTerminalOutcome;
  /** Chapter or act designation when the measure became law. */
  readonly actDesignation: string | null;
  /**
   * When the act takes effect. Null means the rule pack did not resolve a
   * default effective-date rule, which is not the same as taking effect now.
   */
  readonly effectiveAt: IsoDate | null;
  readonly outcomeEventId: EntityId;
}

/**
 * Which lineage built a world, and therefore what its contents are allowed to
 * be. A `fixture` world is a developer's diagnostic scaffold and may carry
 * validation-only substrate; a `production` world is somebody's game and may
 * not. The distinction is part of world identity rather than a comment,
 * because the defect it exists to prevent was a production world silently
 * inheriting fixture content through a default argument.
 */
export type WorldLineage = "production" | "fixture";

/** The generator that stamped a world, one per lineage. */
export type WorldGeneratorVersion = "demo-world-v15" | "production-world-v1";

/* -------------------------------------------------------------------------- */
/* Life situations                                                             */
/* -------------------------------------------------------------------------- */

export type FormativePacingBand =
  "early-childhood" | "middle-childhood" | "adolescence";

/**
 * The bands a situation can belong to. Adulthood is one band rather than
 * several because the formative bands are about developing agency, and an
 * adult already has it; what varies after eighteen is circumstance, and
 * circumstance is read from the world rather than from a birthday.
 */
export type LifeSituationBand = FormativePacingBand | "adulthood";

export type FormativeLifeSituationKey =
  | "formative.household-transition"
  | "formative.school-entry"
  | "formative.broken-object"
  | "formative.small-money"
  | "formative.lunch-table"
  | "formative.friend-conflict"
  | "formative.teacher-mentor"
  | "formative.school-rule-input"
  | "formative.care-conflict"
  | "formative.activity-choice"
  | "formative.civic-volunteering"
  | "formative.teen-work-opportunity"
  | "formative.student-organizing"
  | "formative.belief-challenge"
  | "formative.future-preparation"
  | "formative.illness-in-the-house"
  | "formative.money-shortfall"
  | "formative.caring-for-someone"
  | "formative.workplace-rule";

/**
 * The adult families.
 *
 * Keyed to opportunity rather than to a rate: an adult situation is offered
 * because the world already contains the thing it is about — a household with
 * somebody else in it, a job, an obligation, an incident that actually
 * happened — and never because a die said this year was the year. The research
 * is unambiguous that most of these have no defensible national arrival
 * frequency, so none is claimed.
 */
export type AdultLifeSituationKey =
  | "adult.household-standing"
  | "adult.household-repair"
  | "adult.household-money-shortfall"
  | "adult.household-quiet-evening"
  | "adult.family-request"
  | "adult.care-request"
  | "adult.partner-plan"
  | "adult.work-rule-pressure"
  | "adult.work-extra-hours"
  | "adult.work-credit"
  | "adult.work-colleague-struggling"
  | "adult.work-offer-elsewhere"
  | "adult.work-good-week"
  | "adult.housing-cost-change"
  | "adult.housing-repair-standoff"
  | "adult.debt-call"
  | "adult.unexpected-expense"
  | "adult.small-windfall"
  | "adult.friend-favour"
  | "adult.help-with-strings"
  | "adult.friend-in-difficulty"
  | "adult.friend-good-news"
  | "adult.local-dispute"
  | "adult.community-meeting"
  | "adult.community-building"
  | "adult.volunteer-ask"
  | "adult.local-issue-position"
  | "adult.petition-ask"
  | "adult.candidacy-approach"
  | "adult.incident-aftermath"
  | "adult.incident-neighbour-help"
  | "adult.promise-comes-due"
  | "adult.old-favour-returns"
  | "adult.ordinary-good-day"
  | "adult.weekend-invitation";

export type LifeSituationKey =
  FormativeLifeSituationKey | AdultLifeSituationKey;

export interface LifeSituationOption {
  readonly key: string;
  /** The words on the button. */
  readonly label: string;
  /** What choosing it means, before it is chosen. */
  readonly description: string;
  /**
   * What the person remembers afterwards, written as something that happened
   * rather than as the instruction that produced it. The canonical record is
   * never the button text.
   */
  readonly memory: string;
  /**
   * What somebody else in the scene would have seen, or null when the choice
   * was made inwardly and there was nothing to see.
   *
   * Knowledge is subjective. Being present is not the same as being told: a
   * companion who watched a child decide something quietly does not thereby
   * know what the child decided, and must never be handed that child's own
   * remembered sentence as their own belief.
   */
  readonly witnessed?: string | null;
  /**
   * Whether the person acted or held back.
   *
   * The formative bank expresses this through a list of option keys held
   * beside it, which works while every situation is authored in one file and
   * stops working the moment a second bank exists. Saying it on the option is
   * the same claim, made where it can be read.
   */
  readonly stance?: "engaged" | "withdrawn";
  /** What it did to the relationship, when somebody else was in the scene. */
  readonly relationalChange?: RelationshipChange;
  /** How the exchange itself is filed. */
  readonly interactionKind?: RelationshipInteractionKind;
}

export interface AvailableLifeSituation {
  readonly key: LifeSituationKey;
  readonly band: LifeSituationBand;
  /** The scene, before any choice exists. */
  readonly prose: string;
  readonly options: readonly LifeSituationOption[];
  /** True when the situation only makes sense with someone else in it. */
  readonly needsCompanion: boolean;
}

/**
 * Which calibration path the player took at setup.
 *
 * `skipped` is a real answer and not an absence of one: a player who declined
 * the questionnaire has told the game to work from what they do rather than
 * from what they said, and the adaptive layer is expected to cope.
 */
export type SetupQuestionnairePath = "skipped" | "short" | "deep";

export interface SetupAnswerRecord {
  readonly ordinal: number;
  readonly questionKey: string;
  /** Null when the player skipped the item they were shown. */
  readonly choiceId: string | null;
}

/**
 * The non-diegetic corner of a world.
 *
 * Declared here beside the canonical record types so its shape is as legible
 * as theirs, and kept out of `HistoryStore` for the same reason: it is not
 * history. `setup-priors.ts` owns every read and write of it.
 */
export interface SetupPriorStore {
  readonly version: number;
  readonly path: SetupQuestionnairePath;
  readonly bankVersion: string;
  readonly answers: readonly SetupAnswerRecord[];
}

export interface World {
  readonly schemaVersion: 15;
  readonly generatorVersion: WorldGeneratorVersion;
  readonly id: EntityId;
  readonly seed: string;
  readonly startedAt: IsoDate;
  readonly currentDate: IsoDate;
  readonly currentMoment: SimulationMoment;
  readonly actionSequence: number;
  readonly jurisdictions: Readonly<Record<string, Jurisdiction>>;
  readonly jurisdictionOrder: readonly EntityId[];
  readonly people: Readonly<Record<string, Person>>;
  readonly personOrder: readonly EntityId[];
  readonly policyCatalog: PolicyCatalog;
  readonly mindCatalog: MindCatalog;
  readonly metricCatalog: WorldMetricCatalog;
  readonly causalMechanismCatalog: CausalMechanismCatalog;
  readonly incidentCatalog: IncidentCatalog;
  readonly vitalityCatalog: VitalityCatalog;
  readonly control: ControlState;
  readonly history: HistoryStore;
  /**
   * What the player answered at setup, kept beside the world rather than in
   * it.
   *
   * Optional, and optional is load-bearing: every world written before the
   * questionnaire existed is still exactly readable, because absent and
   * "answered nothing" are the same state and both mean no priors. Nothing in
   * `history` may derive from this, and no canonical query reads it — see
   * `setup-priors.ts` for why that containment is the requirement rather than
   * a convention.
   */
  readonly setupPriors?: SetupPriorStore;
}
