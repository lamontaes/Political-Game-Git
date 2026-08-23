declare const entityIdBrand: unique symbol;
declare const isoDateBrand: unique symbol;

export type EntityId = string & { readonly [entityIdBrand]: true };
export type IsoDate = string & { readonly [isoDateBrand]: true };

export type EntityKind =
  | "appraisal"
  | "belief"
  | "care-responsibility"
  | "care-state"
  | "child-authority"
  | "child-authority-state"
  | "claim"
  | "commitment"
  | "decision"
  | "decision-trace"
  | "development-proposal"
  | "event"
  | "education-enrollment"
  | "education-enrollment-state"
  | "fact"
  | "goal"
  | "goal-state"
  | "household"
  | "household-location"
  | "household-membership"
  | "household-membership-state"
  | "jurisdiction"
  | "kinship"
  | "knowledge"
  | "life-commitment"
  | "life-load-resolution"
  | "memory"
  | "organization"
  | "organization-participation"
  | "organization-participation-state"
  | "organization-profile"
  | "person"
  | "personal-value"
  | "personality-tendency"
  | "personality-tendency-definition"
  | "policy-domain"
  | "policy-issue"
  | "principle"
  | "principle-definition"
  | "proposition-exposure"
  | "proposition"
  | "public-position"
  | "perception"
  | "relationship"
  | "snapshot"
  | "subject"
  | "subject-knowledge"
  | "temporary-state"
  | "value-definition"
  | "partnership"
  | "partnership-state"
  | "work-relationship"
  | "work-role"
  | "work-status"
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
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
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
  | "child-authority-state";

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

export interface World {
  readonly schemaVersion: 7;
  readonly generatorVersion: "demo-world-v7";
  readonly id: EntityId;
  readonly seed: string;
  readonly startedAt: IsoDate;
  readonly currentDate: IsoDate;
  readonly actionSequence: number;
  readonly jurisdictions: Readonly<Record<string, Jurisdiction>>;
  readonly jurisdictionOrder: readonly EntityId[];
  readonly people: Readonly<Record<string, Person>>;
  readonly personOrder: readonly EntityId[];
  readonly policyCatalog: PolicyCatalog;
  readonly mindCatalog: MindCatalog;
  readonly control: ControlState;
  readonly history: HistoryStore;
}
