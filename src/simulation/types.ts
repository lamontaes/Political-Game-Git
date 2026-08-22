declare const entityIdBrand: unique symbol;
declare const isoDateBrand: unique symbol;

export type EntityId = string & { readonly [entityIdBrand]: true };
export type IsoDate = string & { readonly [isoDateBrand]: true };

export type EntityKind =
  | "claim"
  | "event"
  | "fact"
  | "jurisdiction"
  | "knowledge"
  | "memory"
  | "person"
  | "relationship"
  | "snapshot"
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

export type FamilyRelationshipKind =
  | "parent"
  | "child"
  | "sibling"
  | "spouse"
  | "partner"
  | "guardian"
  | "ward"
  | "other";

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
}

export type OccupationStatus = "ended" | "ongoing";

export interface OccupationFact extends PersonFactBase {
  readonly kind: "occupation";
  readonly employer: string;
  readonly title: string;
  readonly endedAt: IsoDate | null;
  readonly status: OccupationStatus;
}

export type PersonFact =
  | BirthDateFact
  | BirthplaceFact
  | ResidenceFact
  | FamilyRelationshipFact
  | EducationFact
  | OccupationFact;

export interface PersonDetails {
  readonly generatorVersion: "person-materialization-v2";
  readonly expertise: readonly string[];
  readonly personalityTendencies: readonly string[];
  readonly currentGoals: readonly string[];
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

export type EventParticipantRole =
  "actor" | "participant" | "subject" | "affected" | "witness";

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
  readonly type: string;
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

export type RelationshipInteractionKind =
  | "introduction"
  | "shared-work"
  | "shared-experience"
  | "support"
  | "favor"
  | "conflict"
  | "betrayal"
  | "commitment"
  | "other";

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

export interface HistoryStore {
  readonly nextSequence: number;
  readonly events: readonly HistoricalEvent[];
  readonly memories: readonly MemoryRecord[];
  readonly knowledge: readonly EventKnowledgeRecord[];
  readonly claims: readonly ClaimRecord[];
  readonly relationshipInteractions: readonly RelationshipInteraction[];
}

export interface World {
  readonly schemaVersion: 2;
  readonly generatorVersion: "demo-world-v2";
  readonly id: EntityId;
  readonly seed: string;
  readonly startedAt: IsoDate;
  readonly currentDate: IsoDate;
  readonly actionSequence: number;
  readonly jurisdictions: Readonly<Record<string, Jurisdiction>>;
  readonly jurisdictionOrder: readonly EntityId[];
  readonly people: Readonly<Record<string, Person>>;
  readonly personOrder: readonly EntityId[];
  readonly history: HistoryStore;
}
