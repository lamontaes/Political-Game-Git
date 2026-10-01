import type { WorkPayCoverageDeterminationRecord } from "./pay-coverage-types";
import type { LawAmountUnit, LawConsequenceRow } from "./law-consequence-types";
import type {
  LawEffectStamp,
  LawEffectStampedRecord,
} from "./law-effect-stamp";
import type { CrisisRecord } from "./crisis/types";
import type {
  CampaignLifeActivityRecord,
  CampaignLifeOutcomeRecord,
  CampaignOpponentRecord,
  CampaignOpponentStepRecord,
  CampaignRoutineRecord,
  CampaignWeeklyPlanRecord,
} from "./campaign-life-types";
import type { WorldContentPacks } from "./runtime-content-packs";
import type { JudiciaryState } from "./judiciary/types";

import type { AppearanceMaterial } from "./appearance-material";
import type { MediaOutletKey, PressRecord } from "./press/records";
import type {
  NationalElection,
  NationalElectionRecord,
} from "./national-election-types";
import type {
  ConstitutionalMeasureRecord,
  ConstitutionalActionRecord,
  ConstitutionalRuleVersionRecord,
} from "./constitutional-types";
import type { RuleChangeProvisionRecord } from "./enacted-rule-changes";
import type { PlaceOutcomeStore } from "./outcome-web/place-outcome-store";
import type { PublicFundingMandate } from "./public-fiscal";
import type { MacroEconomyStore } from "./macro-economy/types";
import type { PressureStore } from "./pressure/contract";
import type { TownFinanceStore } from "./living-world/town-finance-types";
import type { PublicBudgetStore } from "./public-budgets/store";
import type { PartyRecord, WorldConditionRecord } from "./world-setup/types";
import type {
  TaxProposalRecord,
  TaxPolicyRecord,
  TaxBaseRecord,
  TaxAssessmentRecord,
  TaxCollectionRecord,
  StatutoryTaxLiabilityRecord,
  StatutoryTaxPaymentRecord,
} from "./tax-types";
import type {
  JobApplicationRecord,
  JobApplicationStepRecord,
  JobOpeningRecord,
} from "./job-market-types";
declare const entityIdBrand: unique symbol;
declare const isoDateBrand: unique symbol;
declare const currencyCodeBrand: unique symbol;

export type EntityId = string & { readonly [entityIdBrand]: true };
export type IsoDate = string & { readonly [isoDateBrand]: true };
export type CurrencyCode = string & { readonly [currencyCodeBrand]: true };

/**
 * Identity for a public account or program owner. Most existing records are
 * scoped to a geographic jurisdiction. A local government's geography alone
 * is not unique, so new local records also carry that government's canonical
 * key. This identity records ownership; it grants no taxing or spending power.
 */
export type PublicGovernmentIdentity =
  | { readonly kind: "jurisdiction"; readonly jurisdictionId: EntityId }
  | {
      readonly kind: "local-government";
      readonly jurisdictionId: EntityId;
      readonly governmentKey: string;
    };

export interface SimulationMoment {
  readonly date: IsoDate;
  readonly minuteOfDay: number;
  /** IANA timezone identity retained for geographic and later travel context. */
  readonly timeZone: string;
  /** Explicit offset makes the represented instant deterministic and replayable. */
  readonly utcOffsetMinutes: number;
}

export type EntityKind =
  | "judicial-philosophy"
  | "judicial-professional-qualification"
  | "judicial-retention-contest"
  | "judicial-retention-result"
  | "world-condition"
  | "party-record"
  | "constitutional-measure"
  | "constitutional-action"
  | "crisis-record"
  | "constitutional-rule-version"
  | "rule-change-provision"
  | "tax-proposal"
  | "tax-policy"
  | "tax-base"
  | "tax-assessment"
  | "tax-collection"
  | "statutory-tax-liability"
  | "statutory-tax-payment"
  | "loan-terms"
  | "debt-charge"
  | "debt-standing"
  | "law-exposure"
  | "official-view"
  | "job-opening"
  | "job-application"
  | "job-application-step"
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
  | "district-residence"
  | "dwelling"
  | "dwelling-occupancy"
  | "dwelling-occupancy-state"
  | "evidence-artifact"
  | "evidence-discovery"
  | "event"
  | "education-enrollment"
  | "education-enrollment-state"
  | "effect-activation"
  | "campaign"
  | "campaign-state"
  | "campaign-action"
  | "campaign-action-result"
  | "campaign-compliance-document"
  | "campaign-life-activity"
  | "campaign-life-outcome"
  | "campaign-weekly-plan"
  | "campaign-routine"
  | "campaign-opponent"
  | "campaign-opponent-step"
  | "national-election"
  | "national-election-record"
  | "election-contest"
  | "election-contest-result"
  | "executive-disposition"
  | "legislative-action"
  | "legislative-amendment"
  | "legislative-commitment"
  | "legislative-committee-action"
  | "legislative-draft-lineage"
  | "legislative-enactment"
  | "legislative-measure"
  | "legislative-negotiation"
  | "legislative-provision"
  | "chamber-rule-change"
  | "session-adjournment"
  | "item-veto"
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
  | "office-briefing-inspection"
  | "favor"
  | "office-vote-instruction"
  | "office-workflow-preference"
  | "office-staff-position"
  | "office-staff-incumbency"
  | "person"
  | "person-death"
  | "person-functional-capacity"
  | "personnel-record"
  | "public-program-record"
  | "enacted-duty-record"
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
  | "publication"
  | "press-record"
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

/**
 * A level of government an issue can be decided at.
 *
 * Deliberately the vocabulary a player would use, and deliberately not a
 * claim about any particular jurisdiction: that a question is ordinarily
 * municipal says nothing about whether *this* city was given the power. The
 * jurisdiction's own capability record decides that, and this list only says
 * which levels are worth asking.
 */
export const POLICY_GOVERNMENT_LEVELS = [
  "federal",
  "state",
  "territory",
  "county",
  "municipality",
  "school-district",
] as const;

export type PolicyGovernmentLevel = (typeof POLICY_GOVERNMENT_LEVELS)[number];

export interface PolicyIssueDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly domainId: EntityId;
  readonly name: string;
  readonly description: string;
  /**
   * The levels this question is ordinarily decided at, where a source says so.
   *
   * Absent means nobody has established it, which is not the same as every
   * level: an unknown fact is not permission, so a consumer filtering by level
   * must treat its absence as "do not know" and say so, never as "anywhere".
   *
   * Optional, and omitted rather than written empty, so a world holding issues
   * nobody routed serializes exactly as it did before this field existed and
   * a save written then stays readable.
   */
  readonly levels?: readonly PolicyGovernmentLevel[];
}

export interface PropositionParameter {
  readonly key: string;
  readonly value: string;
  /** Closed modeled choices; omission leaves categorical terms unsupported. */
  readonly allowedValues?: readonly string[];
}

/**
 * Which way a proposition cuts against a principle.
 *
 * Deliberately two values and not a scale. A pack author can say honestly
 * that agreeing with a question sits with a principle or against it; a pack
 * author inventing how *much* would be inventing a number nobody measured.
 * A principle a proposition does not engage is left out rather than written
 * as a zero, because "this does not bear on it" and "it bears on it not at
 * all" are different claims and only the first one is knowable here.
 */
export type PrincipleBearing = "consistent-with" | "against";

/**
 * One principle a proposition engages, and which way.
 *
 * The bearing describes AGREEING with the question. A character who
 * disagrees engages the same principle the other way round, which is why
 * there is no separate row for the opposing side.
 */
export interface PropositionPrincipleBearing {
  /** Authored question relevance, 0–1; omitted means 1 for older packs/saves. */
  readonly weight?: number;
  readonly principleId: EntityId;
  readonly bearing: PrincipleBearing;
}

export interface PolicyPropositionDefinition {
  readonly consequences?: readonly LawConsequenceRow[];
  readonly id: EntityId;
  readonly stableKey: string;
  readonly issueId: EntityId;
  readonly name: string;
  readonly question: string;
  readonly parameters: readonly PropositionParameter[];
  readonly tags: readonly string[];
  /**
   * The principles this question engages, where its pack declares them.
   *
   * Absent means the pack has not said, which a consumer must not read as
   * "engages none": an unknown fact is not permission, so anything deriving
   * a view from principles has to treat the absence as "cannot say" and
   * decline, never as a settled zero.
   *
   * Optional, and omitted rather than written empty, so a world holding
   * propositions nobody related to a principle serializes exactly as it did
   * before this field existed and a save written then stays readable. Same
   * rule, and the same reason, as `PolicyIssueDefinition.levels`.
   */
  readonly principles?: readonly PropositionPrincipleBearing[];
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
  readonly material?: AppearanceMaterial;
  readonly seed: string;
  readonly recipeVersion: string;
  /** P29: confirmed complete outfit, atomically saved with its identity. Absent retains legacy wardrobe behavior. */
  readonly outfit?: {
    readonly version: "complete-outfit-v1";
    readonly families: Readonly<
      Partial<Record<"top" | "bottom" | "footwear", string>>
    >;
  };
  /** Explicit player choice within the pinned catalog; absent preserves seeded identity. */
  readonly selection?: {
    readonly bodyFamily: string;
    readonly headFamily: string;
    /** Null explicitly selects no optional hairstyle. */
    readonly hairFamily: string | null;
  };
  /**
   * Character catalog generation this person's appearance is pinned to.
   * Presentation resolves the modular recipe against exactly this frozen
   * generation so later library growth cannot change an established person.
   * Absent on people created before pinning existed; presentation treats
   * absence as the first generation. This is an appearance pin, not biography.
   */
  readonly catalogGeneration?: number;
  /**
   * The people engine (Sept. 27, 2026): what the player chose in the creator.
   * Every field left unset comes from the person's seed, so a person nobody
   * chose for still looks the same every time. See
   * src/presentation/appearance-engine/recipe.ts.
   */
  readonly engine?: EngineAppearanceChoice;
}

export interface EngineAppearanceChoice {
  readonly version: "people-engine-v1";
  readonly presentation?: "feminine" | "masculine";
  readonly build?: "lean" | "average" | "fuller";
  /** Skin shade 1 (lightest) to 7 (darkest). */
  readonly shade?: number;
  readonly face?: string;
  readonly hair?: string;
  /** One of the engine's hair colors (appearance-engine/pack.ts HAIR_COLORS). */
  readonly hairColor?: string;
  /** The outfit (a people-engine outfit id) worn when the occasion does not decide. */
  readonly outfit?: string;
  /** Fabric color per garment part (top, bottom, suit, shirt, tie, coat...). */
  readonly colors?: Readonly<Record<string, string>>;
  /** A facial hair style (appearance-engine/pack.ts), or "none". */
  readonly facialHair?: string;
  /** A glasses frame id, or "none". */
  readonly glasses?: string;
  /** Whether the glasses are worn all day or only to read. */
  readonly glassesWear?: "always" | "reading";
  /**
   * The jewelry and watch worn, as accessory ids (appearance-engine/pack.ts
   * ACCESSORY_KINDS): "earrings-pearl", "watch-steel". A list that is present
   * is a choice, so an empty one means wearing none; absent, the person's seed
   * decides.
   */
  readonly accessories?: readonly string[];
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

export interface HistoricalEvent extends LawEffectStampedRecord {
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

/** How an enacted law reached a person (spec 5, "Exposure"). */
export type LawExposureChannel =
  | "paycheck"
  | "tax-payment"
  | "benefit"
  | "job-rule"
  | "business-rule"
  | "public-service"
  | "rent";

/**
 * A dated record that an enacted law actually reached one person: the law, how
 * it reached them, and the money involved next to their pay. Written only by
 * `recordLawExposure` from the record that shows the effect happened; a law
 * that has not reached anyone has no exposure.
 */
export interface LawExposureRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly personId: EntityId;
  /** The enacted measure. */
  readonly measureId: EntityId;
  /** The section that did it, where the effect names one. */
  readonly sectionKey: string | null;
  readonly channel: LawExposureChannel;
  /**
   * Their own money or service, a family member's, or something a person
   * they know told them it did to them ("friend").
   */
  readonly relation: "own" | "family" | "friend";
  /** For a family or friend exposure, whose paycheck, bill or service it was. */
  readonly viaPersonId: EntityId | null;
  /** Whether the law cost them or paid them; "none" for a non-money effect. */
  readonly direction: "cost" | "gain" | "none";
  /** Null for a non-money effect or an amount not recorded. */
  readonly amount: MoneyAmount | null;
  readonly cadence: "one-time" | "monthly" | null;
  /**
   * Their pay over the four weeks before, scaled to a month. Null when the
   * game does not track this person's money: unknown, never zero. A friend
   * exposure carries the teller's pay, since it measures how hard the law
   * landed on them.
   */
  readonly monthlyPay: MoneyAmount | null;
  /** The record showing the effect happened (a tax collection, a paycheck). */
  readonly sourceRecordId: EntityId;
}

/** Why a person's view of an official moved (spec 5, "Reasons for a view"). */
export interface OfficialViewReason {
  readonly kind: "personal" | "family" | "friend" | "party";
  /** Signed points this reason moved the view: credit up, blame down. */
  readonly points: number;
}

/**
 * One reflection on one official: what the official did about a law that
 * reached this person, how far it moved the person's view of them, and why.
 * A person's standing view of an official is the sum of these rows; nothing
 * fades on its own (no passive decay).
 */
export interface OfficialViewRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly personId: EntityId;
  readonly officialId: EntityId;
  readonly measureId: EntityId;
  readonly act: "voted-for" | "voted-against" | "signed";
  readonly exposureId: EntityId;
  /** Signed total of `reasons`. */
  readonly points: number;
  readonly reasons: readonly OfficialViewReason[];
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
  /** Held support on [0, 1]; stance supplies its direction. */
  readonly strength: number;
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
  /**
   * Set on the profile that closes the organization: from `effectiveAt` it
   * has closed, and its history stays. Absent on every open organization and
   * on every profile saved before closings were recorded.
   */
  readonly closed?: OrganizationClosing;
}

/** Why an organization closed, as the game records it. */
export interface OrganizationClosing {
  /** An open taxonomy key such as "business:owner-retired". */
  readonly reason: string;
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
  | "expected"
  | "active"
  | "temporarily-inactive"
  | "completed"
  | "withdrawn"
  | "transferred"
  | "ended";

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
  /**
   * What was promised, to whom, and what would answer it.
   *
   * Absent on a commitment nobody was promised (a standing Tuesday choir, a
   * generated background's volunteering). Present when somebody said, to
   * somebody, that they would do a thing: then the record carries who it was
   * owed to, the act, the words, and who heard them, matching the legislative
   * commitment record, so kept or broken can be read from later events.
   */
  readonly undertaking?: UndertakingTerms;
}

/**
 * How firmly something was said.
 *
 * Words, not a probability, and the same four words the legislative record
 * uses, so one type serves both.
 */
export type UndertakingFirmness = LegislativeCommitmentFirmness;

/**
 * The act an undertaking promises, in terms the world can later check.
 *
 * Each kind names what canonical record would answer it. An act the world
 * cannot check (`help` with no activity to attend) stays outstanding until
 * its end, then lapses; it is never marked kept or broken on a guess.
 */
export type UndertakingAct =
  | {
      /** Be present at a scheduled activity: a posted meeting, a hearing. */
      readonly kind: "attend";
      /** The activity's stable key, which exists before or after the promise. */
      readonly activityStableKey: string;
      readonly description: string;
    }
  | {
      /** Give time or labor that no single record answers. */
      readonly kind: "help";
      readonly description: string;
    }
  | {
      /** Vote a stated way on one legislative question. */
      readonly kind: "vote";
      readonly question: LegislativeQuestionIdentity;
      readonly direction: "yea" | "nay";
      readonly description: string;
    }
  | {
      /** Return an earlier favor. Answered by a later favor in return for it. */
      readonly kind: "repay";
      readonly favorId: EntityId;
      readonly description: string;
    };

export interface UndertakingTerms {
  /** Who it was promised to. Usually one person; a crowd for a public vow. */
  readonly owedToPersonIds: readonly EntityId[];
  readonly act: UndertakingAct;
  readonly firmness: UndertakingFirmness;
  /** A private word and a public pledge are different undertakings. */
  readonly audience: ClaimAudience;
  /** The people who actually heard it said. */
  readonly heardByPersonIds: readonly EntityId[];
  /** What was said, in plain words, for the record and any later reckoning. */
  readonly statement: string;
  /** The claim carrying the words, when the holder's words were recorded. */
  readonly claimId: EntityId | null;
  /** How much it mattered to the person it was promised to. */
  readonly mattered: FavorWeight;
  /** The last day it can be answered, when it names one. */
  readonly dueBy: IsoDate | null;
}

/* -------------------------------------------------------------------------- */
/* Favors                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What kind of help a favor was. Open, namespaced like a life-commitment kind:
 * `public:appointment`, `political:endorsement`, `personal:help`.
 */
export type FavorNamespace = "public" | "political" | "private" | "personal";
export type FavorKind = `${FavorNamespace}:${string}`;

/**
 * Why the giver helped. The giver's own reason, which the receiver may never
 * learn; it is never shown to the receiver as a fact.
 */
export type FavorMotive =
  "kindness" | "shared-belief" | "trade" | "corruption" | "unknown";

/** How much a favor mattered to the one who received it, in words. */
export type FavorWeight = "slight" | "moderate" | "great" | "life-changing";

/** What a favor was about, when it was about a canonical thing. */
export type FavorSubject =
  | {
      readonly kind: "office";
      readonly officeId: EntityId;
      readonly tenureId: EntityId | null;
    }
  | { readonly kind: "measure"; readonly measureId: EntityId }
  | { readonly kind: "organization"; readonly organizationId: EntityId }
  | { readonly kind: "none" };

/**
 * One person helped another.
 *
 * Stores what happened, never a balance. How much the receiver still feels
 * they owe and how much the giver now expects are read from this record, the
 * time since, both people's temperaments and what has passed between them
 * since (`favorStandingBetween`).
 */
export interface FavorRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly giverPersonId: EntityId;
  readonly receiverPersonId: EntityId;
  readonly kind: FavorKind;
  /** What was done, in plain words. */
  readonly description: string;
  readonly givenAt: IsoDate;
  /** The canonical event that did it. */
  readonly eventId: EntityId;
  readonly subject: FavorSubject;
  readonly motive: FavorMotive;
  readonly weight: FavorWeight;
  readonly audience: ClaimAudience;
  /** People who saw it done, beyond the two of them. */
  readonly witnessPersonIds: readonly EntityId[];
  /** The earlier favor this one returns, when it returns one. */
  readonly inReturnForFavorId: EntityId | null;
  /** The undertaking it was given against, when there was one. */
  readonly undertakingId: EntityId | null;
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
/**
 * `condition`: occurs whenever its prerequisites hold and no blocker does,
 * with no draw and no actor. It is the mode for conditions that last, where
 * the design sets how bad counts as bad but never the chance of an outcome.
 */
export type IncidentOccurrenceMode =
  "probabilistic" | "actor-initiated" | "condition";
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

/**
 * One parameter value, as a saved bill records it.
 *
 * Written as a discriminated record rather than as a loose JSON blob so the
 * serialized world stays inspectable and a value cannot arrive as a string that
 * something later parses back into a number. The shapes mirror the compiler's
 * parameter kinds exactly.
 */
export type LegislativeDraftParameterRecord =
  | {
      readonly parameterKey: string;
      readonly kind: "money";
      readonly minorUnits: number;
      readonly currency: CurrencyCode;
    }
  | {
      readonly parameterKey: string;
      readonly kind: "enumerated";
      readonly value: string;
    }
  | {
      readonly parameterKey: string;
      readonly kind: "duration-years";
      readonly years: number | null;
    }
  | {
      readonly parameterKey: string;
      readonly kind: "integer";
      readonly value: number;
    };

/**
 * Which library configuration produced a measure's filed text.
 *
 * This is the one canonical shape the composable-bill work adds, and it exists
 * because nothing already in the store can express it. A measure records what a
 * bill is called and what it is about; provisions record its operative text and
 * every later version of that text. Neither records that the text was compiled
 * from a named program family, at a named version of that family, from a
 * named set of parameter values — and without that, reopening a saved bill
 * cannot say which family it belongs to, which amendment its politics are
 * about, or whether a later edit to the content bank has moved underneath it.
 *
 * Pinning `familyVersion` here is the whole point of the record: the filed text
 * is authoritative and lives in provisions, so widening a bound or rewording a
 * clause in the bank changes what a *new* bill would say and cannot reroll a
 * bill a player already filed. The lineage is written once, when the bill is
 * filed, and is never rewritten — an amended bill's text moves through the
 * accepted provision writers, and its lineage still records where it started.
 */
export interface LegislativeDraftLineageRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly familyKey: string;
  readonly familyVersion: string;
  readonly variantKey: string;
  readonly compiledAt: IsoDate;
  readonly recordedAt: IsoDate;
  readonly parameters: readonly LegislativeDraftParameterRecord[];
  /**
   * The authority this bill was written against, where its instrument takes
   * one.
   *
   * Optional, so every lineage written before instruments existed reads back
   * unchanged. `authorityKey` identifies either a content-bank standing
   * authority or an explicitly versioned game-profile authority; in the latter
   * case the measure's jurisdiction and rule-pack id bind it to one exact
   * government. `authorityMeasureId` is present when the bill was written
   * against another measure on the same docket.
   */
  readonly authorityKey?: string;
  readonly authorityMeasureId?: EntityId;
  /**
   * Which part of a multi-subject measure this lineage belongs to.
   *
   * Absent on every bill written from a single family, which is every bill
   * filed before measures could carry more than one — so an old save reads
   * back unchanged and still means "this measure, one configuration". Present
   * once per component on a measure compiled from a bundle, where the key is
   * the component's own name and is also the namespace its provision keys
   * carry, so a lineage and the provisions it produced can be matched up
   * without a second index.
   */
  readonly componentKey?: string;
  /**
   * The subject this component was declared to belong to.
   *
   * Recorded, not computed. It is the label the drafter declared at filing, so
   * a measure can still say what it was held to be about under the profile in
   * force when it was filed. It is not a judicial classification and nothing
   * re-derives it later.
   */
  readonly componentSubject?: string;
  /** Component keys this one was filed as taking effect after. */
  readonly componentDependsOn?: readonly string[];
  /**
   * What this component did to existing law, where it did anything to it.
   *
   * Absent means an insertion, which is what a component creating a new
   * program does and what every component filed before amendments were
   * modeled did — so an old save reads back unchanged. Present on a component
   * that amended or repealed, with the provisions it acted on and the exact
   * revision of each it was written against, so the measure can still say what
   * text its author actually had in front of them.
   */
  readonly componentOperation?: {
    readonly kind: "replace" | "repeal";
    readonly targets: readonly {
      readonly provisionKey: string;
      readonly expectedRevisionId: EntityId;
    }[];
  };
  /** References this component declared, as filed. */
  readonly componentCrossReferences?: readonly {
    readonly fromProvisionKey: string;
    readonly toProvisionKey: string;
    readonly toComponentKey?: string;
    readonly toAuthorityKey?: string;
  }[];
  /**
   * What the jurisdiction's saved profile allowed this measure to carry.
   *
   * Written identically on each of a bundle's component lineages, because the
   * rule is a fact about the measure rather than about any one part of it, and
   * a rule that changed later must not restate what was already filed.
   */
  readonly bundleSubjectRule?: "unrestricted" | "single-subject";
  /** Said plainly in the save: this configuration is authored fiction. */
  readonly provenanceNote: string;
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

/**
 * Shared ordinary-routine contract on the existing clock.
 *
 * Education consumes this hook; it is not a second scheduler. Ordinary personal
 * work windows may auto-resolve as requested time crosses them. Campaigning and
 * other player-required commitments stay blocking.
 */
export interface RoutineWindow {
  readonly relationshipId: EntityId;
  readonly kind: "work" | "study" | "campaign";
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly autoResolvable: boolean;
}

export interface RoutineTimeHook {
  readonly isAutoResolvableActivity: (
    world: World,
    activityId: EntityId,
  ) => boolean;
  readonly projectWindows: (
    world: World,
    target: SimulationMoment,
  ) => readonly RoutineWindow[];
  readonly ensureScheduled: (world: World, slot: RoutineWindow) => World;
  readonly afterActivityCompleted: (
    world: World,
    activityId: EntityId,
  ) => World;
}

export interface FutureTransitionHandlerRegistry {
  get(transitionKey: FutureTransitionKey): FutureTransitionHandler | undefined;
  readonly routine?: RoutineTimeHook;
  /**
   * Whether an advance should also stop at a tentative hold, or its journey,
   * that the advance itself put on the controlled person's calendar. A
   * confirmed commitment written on the way is always a stop; a tentative one
   * is not unless this says so, because a long skip that stopped at every
   * posted invitation only to let it lapse would repeat itself once per hold.
   */
  readonly stopAtNewTentativeHold?: (
    activity: ScheduledActivityRecord,
  ) => boolean;
}

export interface MoneyAmount {
  readonly minorUnits: number;
  readonly currency: CurrencyCode;
}

export type ResourceEndpoint =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId }
  | { readonly kind: "organization"; readonly organizationId: EntityId };

/**
 * Who a balance belongs to.
 *
 * An organization owns money in its own right rather than through whoever runs
 * it. A campaign treasury is the case that forced the distinction: the money is
 * the committee's, is reported as the committee's, and does not become the
 * candidate's personal balance because the candidate signs for it. Modeling it
 * as a person's would have been a false statement about ownership, and a
 * separate campaign wallet would have been a second money system.
 */
export type ResourcePositionOwner =
  | { readonly kind: "person"; readonly personId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId }
  | { readonly kind: "organization"; readonly organizationId: EntityId };

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
  | {
      readonly kind: "public-funding";
      readonly mandate: PublicFundingMandate;
      readonly operationKey: string;
    }
  | {
      readonly kind: "public-program";
      /** The earlier commitment that authorizes this installment. */
      readonly commitmentId: EntityId;
      readonly installmentIndex: number;
    }
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

export interface ResourceFlowTermsRecord extends LawEffectStampedRecord {
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

export interface ResourceTransferOutcome extends LawEffectStampedRecord {
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

/** What a household loan is for (spec 11). */
export type HouseholdLoanKind =
  "mortgage" | "auto" | "student" | "credit-card" | "personal" | "payday";

export type LenderKind =
  "bank" | "credit-union" | "federal-government" | "payday-lender" | "other";

/**
 * How a loan is paid down: a level payment over a term, or a revolving
 * account whose minimum is a share of the balance plus the month's interest.
 */
export type LoanRepayment =
  | { readonly kind: "installment"; readonly termMonths: number }
  | {
      readonly kind: "revolving";
      readonly principalShareBasisPoints: number;
      readonly minimumPaymentFloor: MoneyAmount;
    };

/**
 * The terms a debt is owed under from `effectiveAt`. A later record
 * supersedes an earlier one (a new rate under a cap law, a changed plan);
 * nothing is edited in place. Every value is an input: this record carries
 * the rate the loan was written at, never a rate the record invents.
 */
export interface LoanTermsRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly resourceObligationId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly kind: HouseholdLoanKind;
  readonly lenderKind: LenderKind;
  readonly annualRateBasisPoints: number;
  /** "capped" when a rate cap in force held the rate below the market. */
  readonly rateBasis: "written" | "capped";
  /** The measure whose cap applied, when `rateBasis` is "capped". */
  readonly rateCapMeasureId: EntityId | null;
  readonly repayment: LoanRepayment;
  /** Null: this loan's contract states no late fee. */
  readonly lateFee: MoneyAmount | null;
  /** Consecutive missed payments after which the loan is in default. */
  readonly missedPaymentsToDefault: number;
  /** Consecutive missed payments after which it goes to collections. */
  readonly missedPaymentsToCollections: number;
  readonly provenance: LifeRecordProvenance;
  readonly supersedesTermsId: EntityId | null;
}

/** Interest or a fee added to a debt's balance for one month. */
export interface DebtChargeRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly resourceObligationId: EntityId;
  readonly chargedAt: IsoDate;
  readonly kind: "interest" | "late-fee";
  readonly amount: MoneyAmount;
  readonly loanTermsId: EntityId;
}

export type DebtStanding =
  "current" | "late" | "default" | "collections" | "paid-off";

/** A debt's standing from `effectiveAt`, after that month's payment. */
export interface DebtStandingRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly resourceObligationId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly standing: DebtStanding;
  readonly consecutiveMissedPayments: number;
  readonly supersedesStandingId: EntityId | null;
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

export type DecisionOutcomeKind =
  "selected" | "no-available-option" | "undecided";

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

export interface DistrictSeatBinding {
  readonly vintage: "census-gazetteer-2025";
  readonly compilerVersion: string;
  readonly chamber: "congressional" | "state-lower" | "state-upper";
  readonly geoid: string;
  readonly recordId: string;
  readonly stateUsps: string;
}

/**
 * `split-home-assignment`: the home place crosses several districts of the
 * chamber and the published join cannot say which one this home is in, so the
 * game placed the home in one of those districts — by seed at the opening, or
 * where the player later said it is. It is only ever one of the districts that
 * actually cross the recorded home place. GAME PROFILE placeholder: see
 * `assignSplitHomeDistricts`.
 */
export type DistrictResidenceProvenanceMethod =
  | "authored"
  | "simulated-event"
  | "canonical-home-join"
  | "split-home-assignment";

export interface DistrictResidenceProvenance {
  readonly method: DistrictResidenceProvenanceMethod;
  readonly sourceEventId: EntityId | null;
  readonly note: string;
}

/**
 * Player-chosen seat identity. This is not home-membership evidence and is
 * not a proved district-residence interval.
 */
export interface DistrictSeatIntent {
  readonly personId: EntityId;
  readonly binding: DistrictSeatBinding;
  readonly selectedOn: IsoDate;
}

/**
 * Evidence-backed interval of residence in one numbered district identity.
 *
 * Absent from old saves. Missing history is UNKNOWN, never backfilled from
 * birthplace, state residence, Gazetteer interior points, or a picker choice.
 * A verified whole-place Census join may establish an interval on a new life;
 * it does not rewrite older saves.
 */
export interface DistrictResidenceInterval {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly binding: DistrictSeatBinding;
  readonly startedOn: IsoDate;
  readonly endedOn: IsoDate | null;
  readonly provenance: DistrictResidenceProvenance;
}

export interface ElectiveOfficeRef {
  /** Stable semantic identifier for the office, e.g. "mayor", "council:district-1", "school-board:seat-a". */
  readonly officeKey: string;
  /** Human-readable title of the elective office, e.g. "Mayor", "City Council Member, District 1". */
  readonly title: string;
  /** Optional seat, district, or ward designation. */
  readonly seatKey: string | null;
  /**
   * Explicit Gazetteer district identity for this seat, when one has been
   * bound. Missing on older contests. Never inferred from a centroid.
   */
  readonly districtBinding?: DistrictSeatBinding | null;
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

/**
 * Campaign records.
 *
 * A campaign is a thing that happened to a person, not a screen they were on.
 * It owns the candidacy, the committee, the committee's money and the work the
 * candidate and their volunteers did; everything else it needs already exists.
 * The contest is the accepted election-contest substrate's, the money is the
 * resource system's, the hours are the scheduled-activity system's, and support
 * is a world metric. Nothing here is a second copy of any of them.
 *
 * The one distinction the rest of this family is built around: canonical
 * support lives in `metricStates` and is never shown, and what the campaign
 * believes about it lives in `metricObservations` and is wrong on purpose.
 */
export type CampaignStatus = "active" | "won" | "lost";

/**
 * The metric segment that carries one candidate's canonical support. Segmented
 * per candidate because support is not a property of the contest: it is a
 * separate quantity for each person in it, and summing them is meaningless
 * outside the contest that defines them.
 */
export interface CampaignCandidateSupportScope {
  readonly candidatePersonId: EntityId;
  readonly segmentKey: MetricSegmentKey;
}

export interface CampaignRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly contestId: EntityId;
  readonly candidatePersonId: EntityId;
  readonly jurisdictionId: EntityId;
  /** The sourced office this filing was authorized against. */
  readonly officeKey: string;
  /** The candidacy pack that authorized it, so the claim can be traced back. */
  readonly candidacyPackId: string;
  /** Feature-local campaign-compliance pack, or null where none is accepted. */
  readonly compliancePackId: string | null;
  readonly organizationId: EntityId;
  /** Where money comes from: an aggregate supporter pool, not a donor list. */
  readonly donorPoolOrganizationId: EntityId;
  /** Where an advertising buy goes: an aggregate vendor, not a media model. */
  readonly advertisingVendorOrganizationId: EntityId;
  readonly treasuryPositionId: EntityId;
  readonly treasuryCurrency: CurrencyCode;
  readonly candidateWorkRelationshipId: EntityId;
  readonly staffWorkRelationshipIds: readonly EntityId[];
  readonly supportMetricId: EntityId;
  readonly candidateSupportScopes: readonly CampaignCandidateSupportScope[];
  readonly filingEventId: EntityId;
  readonly filedAt: IsoDate;
}

export interface CampaignStateRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly campaignId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly status: CampaignStatus;
  readonly electionResultId: EntityId | null;
  readonly reason: string | null;
  readonly supersedesStateId: EntityId | null;
}

/**
 * What a campaign can spend an afternoon on.
 *
 * Three, because three is what makes the choice a choice: an hour on the phones
 * turns time into money, an hour on the doors turns time into support directly,
 * and an advertising buy turns the money back into support without the
 * candidate being in the room. A campaign with no money cannot advertise, and a
 * campaign that only advertises never raises the money to.
 */
export type CampaignActionKind = "fundraising" | "outreach" | "advertising";

/**
 * The explicit plan a candidate approved before a campaign action.
 *
 * Optional on the action record so pre-strategy saves and their completed
 * purchases remain valid. A null proposer means the candidate planned alone;
 * a person id must name campaign staff at commitment time.
 */
export interface CampaignActionStrategyRecord {
  readonly proposerPersonId: EntityId | null;
  readonly proposedActionKind: CampaignActionKind;
  readonly geographyKey: string;
  readonly geographyLabel: string;
  readonly geographyKind: "jurisdiction" | "district";
  readonly approvedSpendCeiling: MoneyAmount;
}

export interface CampaignActionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly campaignId: EntityId;
  readonly kind: CampaignActionKind;
  readonly scheduledActivityId: EntityId;
  /** Committed when the action is scheduled. Null where it costs only time. */
  readonly plannedSpend: MoneyAmount | null;
  /** Present only for actions approved through the strategy interaction. */
  readonly strategy?: CampaignActionStrategyRecord | null;
  readonly createdAt: IsoDate;
}

export interface CampaignActionResultRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly campaignActionId: EntityId;
  readonly completedAt: IsoDate;
  readonly outcomeEventId: EntityId;
  readonly resourceFlowId: EntityId | null;
  readonly resourceOutcomeId: EntityId | null;
  readonly raisedAmount: MoneyAmount | null;
  readonly spentAmount: MoneyAmount | null;
  /** Canonical support after the action, for every candidate in the contest. */
  readonly supportStateIds: readonly EntityId[];
  /** The fallible reading of it the campaign actually gets. */
  readonly observationId: EntityId;
  readonly feedbackEventId: EntityId;
  readonly feedbackKnowledgeId: EntityId;
}

/**
 * A compliance document is evidence of a filing, never an agency approval.
 * Drafts stay committee-private; filed copies may be projected as public
 * records because the governing pack says they become public on receipt.
 */
export interface CampaignComplianceDocumentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly campaignId: EntityId;
  readonly committeeOrganizationId: EntityId;
  readonly rulePackId: string;
  readonly kind:
    | "statement-of-spending-intent"
    | "statement-of-organization"
    | "periodic-report"
    | "amendment";
  readonly schedule:
    | "initial"
    | "60-day-preelection"
    | "30-day-preelection"
    | "15-day-preelection"
    | "30-day-postelection"
    | "correction";
  readonly periodStart: IsoDate | null;
  readonly periodEnd: IsoDate | null;
  readonly dueOn: IsoDate;
  readonly status: "draft" | "filed";
  readonly visibility: "committee-private" | "public-record";
  readonly transport: "KEFMS" | null;
  readonly filedAt: IsoDate | null;
  readonly amendsDocumentId: EntityId | null;
  readonly correctionReason: string | null;
}

// ---------------------------------------------------------------------------
// Public information — explicit publication of already-recorded world truth
// ---------------------------------------------------------------------------

export type PublicationKind =
  "legislative-development" | "recorded-vote" | "civic-event" | "press-story";

/**
 * One edition of a public-information item.
 *
 * The root edition and every correction are separate append-only records.
 * `sourceEventId` keeps the publication distinct from what happened;
 * `publishedAt` keeps both distinct from when this record entered history.
 */
export interface PublicationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly kind: PublicationKind;
  readonly sourceEventId: EntityId;
  /** Canonical domain records that substantiate the source event, when any. */
  readonly sourceRecordIds: readonly EntityId[];
  readonly jurisdictionId: EntityId | null;
  /** Civic Ledger, or a PRESS46 media outlet (`media:<outletId>`). */
  readonly outletKey: "civic-ledger" | MediaOutletKey;
  readonly outletName: string;
  readonly headline: string;
  readonly body: string;
  readonly publishedAt: IsoDate;
  readonly recordedAt: IsoDate;
  /** Null on the first edition; otherwise the immediately preceding edition. */
  readonly correctsPublicationId: EntityId | null;
  /** Null on the first edition; required on a correction. */
  readonly correctionNote: string | null;
}

// ---------------------------------------------------------------------------
// Public programs — appropriation, commitment, installment and capacity outturn
// ---------------------------------------------------------------------------

/** Where a program figure came from. A fixture or game profile says so. */
export interface PublicProgramBasis {
  readonly kind: "sourced" | "game-profile" | "authored-fixture";
  readonly note: string;
}

export type PublicProgramPurpose = "operating" | "maintenance" | "grant";

export interface PublicProgramInstallmentPlan {
  readonly dueAt: IsoDate;
  readonly amount: MoneyAmount;
  readonly purpose: PublicProgramPurpose;
}

interface PublicProgramRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  /** `namespace:name`, e.g. `transit:bus-service`. */
  readonly programKey: string;
  readonly jurisdictionId: EntityId;
  /** Missing in legacy saves; those records remain jurisdiction-scoped. */
  readonly publicGovernmentIdentity?: PublicGovernmentIdentity;
  readonly recordedAt: IsoDate;
  /** The ordinary event written with this record. */
  readonly eventId: EntityId;
}

/** What the service has to work with, as declared; never a forecast. */
export interface PublicProgramCapacityRecord extends PublicProgramRecordBase {
  readonly kind: "capacity";
  readonly serviceLabel: string;
  readonly unitLabel: string;
  readonly unitsTotal: number;
  readonly unitsOperational: number;
  readonly monthlyOperatingNeed: MoneyAmount;
  /** Share of scheduled trips reliably completed, in thousandths, if observed. */
  readonly completedPermille: number | null;
  /** Declared cost to return one unit to service; null when nobody knows. */
  readonly restorationCostPerUnit: MoneyAmount | null;
  readonly basis: PublicProgramBasis;
}

/** Spending authority on an existing public account. Not cash. */
export interface PublicProgramAppropriationRecord extends PublicProgramRecordBase {
  readonly kind: "appropriation";
  readonly accountOrganizationId: EntityId;
  readonly amount: MoneyAmount;
  readonly availableFrom: IsoDate;
  readonly availableThrough: IsoDate;
  /** The enacted measure that adopted it, when one did. */
  readonly sourceMeasureId?: EntityId | null;
  readonly basis: PublicProgramBasis;
}

/** One office's decision to commit part of an appropriation, including $0. */
export interface PublicProgramCommitmentRecord extends PublicProgramRecordBase {
  readonly kind: "commitment";
  readonly appropriationId: EntityId;
  readonly alternativeKey: string;
  readonly alternativeTitle: string;
  readonly decidedByPersonId: EntityId;
  /** The standing that let this person decide, in words. */
  readonly authority: string;
  readonly recipientOrganizationId: EntityId | null;
  readonly installments: readonly PublicProgramInstallmentPlan[];
  /** Days from payment to delivered maintenance, when the purpose has one. */
  readonly deliveryLeadDays: number | null;
}

/** What happened when an installment fell due. Written once. */
export interface PublicProgramInstallmentRecord extends PublicProgramRecordBase {
  readonly kind: "installment";
  readonly commitmentId: EntityId;
  readonly installmentIndex: number;
  readonly status: "posted" | "failed";
  readonly resourceFlowId: EntityId | null;
  readonly reason: string | null;
}

/** The service's capacity after delivered work. Reads implementation only. */
export interface PublicProgramCapacityOutturnRecord extends PublicProgramRecordBase {
  readonly kind: "capacity-outturn";
  readonly commitmentId: EntityId;
  readonly installmentId: EntityId;
  readonly unitsOperational: number;
  /** Units returned to service; null when no restoration cost was declared. */
  readonly restoredUnits: number | null;
  /** Snapshots on newly written outturns; absent on older saves. */
  readonly serviceLabel?: string;
  readonly unitLabel?: string;
  readonly placeLabel?: string;
}

/**
 * Who an enacted duty or who-qualifies section reaches. Coverage is read from
 * the Act's own words: a class of body the world records, a class the world
 * records without the fact the Act's test turns on, or a body that must first
 * do something the world does not record yet. None of these is a guess at who
 * is covered. coveredLabel is always the enacted section's rendered text.
 */
export type EnactedDutyCoverage =
  | {
      readonly kind: "classes";
      readonly classifications: readonly OrganizationClassification[];
      readonly coveredLabel: string;
    }
  | {
      /** A class the world records, and a test in the Act no record holds. */
      readonly kind: "unrecorded-test";
      readonly classifications: readonly OrganizationClassification[];
      readonly coveredLabel: string;
      /** What the test turns on, e.g. "its number of customers". */
      readonly testLabel: string;
      readonly researchQuestionId: string;
    }
  | {
      readonly kind: "conditional";
      readonly coveredLabel: string;
      /** What a body must first do, which no world record carries yet. */
      readonly conditionLabel: string;
      readonly researchQuestionId: string;
    }
  | {
      readonly kind: "unknown";
      readonly coveredLabel: string;
      readonly researchQuestionId: string;
    };

interface EnactedDutyRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly eventId: EntityId;
}

/** A rule an enacted law places on a class of body, from one of its sections. */
export interface EnactedDutyRuleRecord extends EnactedDutyRecordBase {
  readonly kind: "duty";
  readonly measureId: EntityId;
  readonly provisionId: EntityId;
  readonly provisionKey: string;
  readonly jurisdictionId: EntityId;
  readonly heading: string;
  readonly coverage: EnactedDutyCoverage;
  /** The day the law takes effect. */
  readonly operativeAt: IsoDate;
  /** The Act's own compliance date; the operative day when it names none. */
  readonly complyBy: IsoDate;
  /** Who the Act names to receive filings or enforce it; null when it names no one. */
  readonly enforcerLabel: string | null;
  /** The penalty the Act states; null when it states none. */
  readonly penaltyLabel: string | null;
}

/** What one body within a duty's reach did by its compliance date. */
export interface EnactedDutyFindingRecord extends EnactedDutyRecordBase {
  readonly kind: "finding";
  readonly dutyId: EntityId;
  readonly organizationId: EntityId;
  /**
   * "complied" is a provisional game rule (basis "game-profile"); the two
   * unknowns say which fact the world does not hold.
   */
  readonly outcome: "complied" | "compliance-unknown" | "coverage-unknown";
  readonly basis: "game-profile" | "unknown";
  readonly researchQuestionId: string;
  readonly reason: string;
}

/** Who the law says qualifies for, or is subject to, what it does. */
export type EnactedEligibilitySubject =
  "bodies" | "households" | "people" | "places" | "structures";

/**
 * A who-qualifies section of an enacted law: the class it names and the test
 * it sets. Who meets it is read from the world when asked, never stored as a
 * count that would go stale.
 */
export interface EnactedEligibilityRecord extends EnactedDutyRecordBase {
  readonly kind: "eligibility";
  readonly measureId: EntityId;
  readonly provisionId: EntityId;
  readonly provisionKey: string;
  readonly jurisdictionId: EntityId;
  readonly heading: string;
  readonly subject: EnactedEligibilitySubject;
  readonly coverage: EnactedDutyCoverage;
  readonly operativeAt: IsoDate;
}

export type EnactedDutyRecord =
  EnactedDutyRuleRecord | EnactedDutyFindingRecord | EnactedEligibilityRecord;

export type PublicProgramRecord =
  | PublicProgramCapacityRecord
  | PublicProgramAppropriationRecord
  | PublicProgramCommitmentRecord
  | PublicProgramInstallmentRecord
  | PublicProgramCapacityOutturnRecord;

// ---------------------------------------------------------------------------
// Public personnel — sourced procedure steps over LIFE work relationships
// ---------------------------------------------------------------------------

/** A power a transcribed procedure assigns; never inferred from a title. */
export type PersonnelPower = "appointing-authority" | "commissioner-settlement";

export type PersonnelAuthorityBasis =
  | { readonly kind: "statute"; readonly procedureKey: string }
  | { readonly kind: "authored-charter"; readonly note: string };

export type PersonnelCivilClass =
  "classified" | "unclassified" | "exempt" | "partially-exempt" | "unknown";

export type PersonnelJustCauseGround =
  | "consistent-failure-to-perform"
  | "substandard-performance"
  | "insubordination"
  | "serious-policy-violation";

interface PersonnelRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  /** Ordinary event that anchors knowledge, Work and due items. */
  readonly eventId: EntityId;
  readonly jurisdictionKey: string;
}

export interface PersonnelAuthorityDesignationRecord extends PersonnelRecordBase {
  readonly kind: "authority-designation";
  readonly organizationId: EntityId;
  readonly roleKind: OrganizationParticipationRoleKind;
  readonly power: PersonnelPower;
  readonly scope: "employing-organization" | "jurisdiction";
  readonly basis: PersonnelAuthorityBasis;
}

/** An authorized position. Civil class and labor coverage stay separate. */
export interface PersonnelPositionRecord extends PersonnelRecordBase {
  readonly kind: "position";
  readonly organizationId: EntityId;
  readonly title: string;
  readonly classKey: string;
  readonly civilClass: PersonnelCivilClass;
  readonly bargainingCoverage: "covered" | "excluded" | "unknown";
  readonly agreementCoverage: "covered" | "not-covered" | "unknown";
  readonly basis: { readonly kind: "authored-charter"; readonly note: string };
}

export interface PersonnelIncumbencyRecord extends PersonnelRecordBase {
  readonly kind: "incumbency";
  readonly positionId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly personId: EntityId;
  readonly tenure: "probationary" | "permanent" | "unknown";
  readonly basis:
    | { readonly kind: "authored-scenario"; readonly note: string }
    | {
        readonly kind: "reinstatement";
        readonly offerId: EntityId;
        readonly responseId: EntityId;
      };
}

export interface PersonnelInformalResolutionRecord extends PersonnelRecordBase {
  readonly kind: "informal-resolution";
  readonly incumbencyId: EntityId;
  readonly actorPersonId: EntityId;
  readonly designationId: EntityId;
  readonly scheduledActivityId: EntityId;
  readonly note: string;
}

export interface PersonnelDisciplinaryActionRecord extends PersonnelRecordBase {
  readonly kind: "disciplinary-action";
  readonly incumbencyId: EntityId;
  readonly actorPersonId: EntityId;
  readonly designationId: EntityId;
  readonly informalResolutionId: EntityId;
  readonly action: "reprimand" | "discharge";
  readonly ground: PersonnelJustCauseGround;
  readonly reasons: string;
  readonly effectiveOn: IsoDate;
  readonly noticeEvidenceId: EntityId;
  readonly appealDeadline: IsoDate | null;
  readonly commissionerFilingDeadline: IsoDate | null;
  readonly endedWorkStatusId: EntityId | null;
  readonly workItemId: EntityId | null;
}

export interface PersonnelCommissionerFilingRecord extends PersonnelRecordBase {
  readonly kind: "commissioner-filing";
  readonly actionId: EntityId;
  readonly actorPersonId: EntityId;
  /** The designation the filer held; any current appointing authority may file. */
  readonly designationId: EntityId;
  readonly timely: boolean;
}

export interface PersonnelAppealRecord extends PersonnelRecordBase {
  readonly kind: "appeal";
  readonly actionId: EntityId;
  readonly personId: EntityId;
  readonly forum: "mn-bureau-of-mediation-services";
  readonly statement: string;
  /** The discharged employee's durable decision trace. */
  readonly decisionTraceId: EntityId;
}

export interface PersonnelSettlementDecisionRecord extends PersonnelRecordBase {
  readonly kind: "settlement-decision";
  readonly appealId: EntityId;
  readonly actorPersonId: EntityId;
  readonly designationId: EntityId;
  readonly decision: "settlement-directed" | "settlement-not-directed";
  readonly reasons: string;
  /** The office holder's durable decision trace. */
  readonly decisionTraceId: EntityId;
}

export interface PersonnelReinstatementOfferRecord extends PersonnelRecordBase {
  readonly kind: "reinstatement-offer";
  readonly positionId: EntityId;
  readonly personId: EntityId;
  readonly actorPersonId: EntityId;
  readonly designationId: EntityId;
  readonly formerIncumbencyId: EntityId;
  readonly probation: "required" | "not-required";
}

export interface PersonnelOfferResponseRecord extends PersonnelRecordBase {
  readonly kind: "offer-response";
  readonly offerId: EntityId;
  readonly personId: EntityId;
  /** Given on receipt of the offer. */
  readonly response: "accepted" | "declined";
  /** The person's own durable decision trace. */
  readonly decisionTraceId: EntityId;
  readonly workRelationshipId: EntityId | null;
}

export type PersonnelRecord =
  | PersonnelAuthorityDesignationRecord
  | PersonnelPositionRecord
  | PersonnelIncumbencyRecord
  | PersonnelInformalResolutionRecord
  | PersonnelDisciplinaryActionRecord
  | PersonnelCommissionerFilingRecord
  | PersonnelAppealRecord
  | PersonnelSettlementDecisionRecord
  | PersonnelReinstatementOfferRecord
  | PersonnelOfferResponseRecord;

/** A saved legal permission for an actual subject; absence conveys no permission. */
export interface LawPermissionRecord extends LawEffectStampedRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly subject: {
    readonly kind: "person" | "organization";
    readonly id: EntityId;
  };
  readonly permissionKey: string;
  readonly status: "permitted" | "prohibited";
  readonly effectiveAt: IsoDate;
  readonly sourceRecordIds: readonly EntityId[];
  readonly lawEffectStamps: readonly [LawEffectStamp];
}

/** Append-only attribution of a sentence already written by the court. */
export interface LegalOutcomeConsequenceRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly sentenceEventId: EntityId;
  readonly subjectPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly appliedAt: IsoDate;
  readonly effectKind: "minimum-custody-months";
  readonly minimumMonths: number;
  readonly sourceRecordIds: readonly EntityId[];
  readonly lawEffectStamps: readonly [LawEffectStamp];
}

export interface HistoryStore {
  readonly workPayCoverageDeterminations?: readonly WorkPayCoverageDeterminationRecord[];
  readonly legalOutcomeConsequences?: readonly LegalOutcomeConsequenceRecord[];
  readonly constitutionalMeasures?: readonly ConstitutionalMeasureRecord[];
  readonly constitutionalActions?: readonly ConstitutionalActionRecord[];
  readonly constitutionalRuleVersions?: readonly ConstitutionalRuleVersionRecord[];
  /** Rule changes filed on ordinary bills; see `enacted-rule-changes.ts`. */
  readonly ruleChangeProvisions?: readonly RuleChangeProvisionRecord[];
  /** Optional, preserving pre-tax snapshots without fabricating money/history. */
  readonly taxProposals?: readonly TaxProposalRecord[];
  readonly taxPolicies?: readonly TaxPolicyRecord[];
  readonly taxBases?: readonly TaxBaseRecord[];
  readonly taxAssessments?: readonly TaxAssessmentRecord[];
  readonly taxCollections?: readonly TaxCollectionRecord[];
  /** Taxes that exist in law, assessed per occurrence; see `statutory-tax.ts`. */
  readonly statutoryTaxLiabilities?: readonly StatutoryTaxLiabilityRecord[];
  readonly statutoryTaxPayments?: readonly StatutoryTaxPaymentRecord[];
  readonly loanTerms?: readonly LoanTermsRecord[];
  readonly debtCharges?: readonly DebtChargeRecord[];
  readonly debtStandings?: readonly DebtStandingRecord[];
  /** Optional: when an enacted law reached a person; see `law-exposure.ts`. */
  readonly lawExposures?: readonly LawExposureRecord[];
  /** Optional: credit or blame for officials; see `living-world/official-views.ts`. */
  readonly officialViews?: readonly OfficialViewRecord[];
  /** Optional: job openings and applications; see `job-market.ts`. */
  readonly jobOpenings?: readonly JobOpeningRecord[];
  readonly jobApplications?: readonly JobApplicationRecord[];
  readonly jobApplicationSteps?: readonly JobApplicationStepRecord[];
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
  /** Optional so pre-DISTRICTS13 snapshots remain structurally readable. */
  readonly districtResidenceIntervals?: readonly DistrictResidenceInterval[];
  /**
   * Current desired seat identity per person. Optional on old saves. Not
   * membership, not sequenced history, and never a substitute for intervals.
   */
  readonly districtSeatIntents?: readonly DistrictSeatIntent[];
  readonly nationalElections?: readonly NationalElection[];
  readonly nationalElectionRecords?: readonly NationalElectionRecord[];
  readonly electionContests?: readonly ElectionContestRecord[];
  readonly electionContestResults?: readonly ElectionContestResultRecord[];
  readonly campaigns?: readonly CampaignRecord[];
  readonly campaignStates?: readonly CampaignStateRecord[];
  readonly campaignActions?: readonly CampaignActionRecord[];
  readonly campaignActionResults?: readonly CampaignActionResultRecord[];
  readonly campaignComplianceDocuments?: readonly CampaignComplianceDocumentRecord[];
  /** CRUNCH46 CAMPAIGN; optional so pre-CRUNCH46 snapshots stay readable. */
  readonly campaignLifeActivities?: readonly CampaignLifeActivityRecord[];
  readonly campaignLifeOutcomes?: readonly CampaignLifeOutcomeRecord[];
  readonly campaignWeeklyPlans?: readonly CampaignWeeklyPlanRecord[];
  /** D-11; optional so earlier saves read as having no campaign routine. */
  readonly campaignRoutines?: readonly CampaignRoutineRecord[];
  readonly campaignOpponents?: readonly CampaignOpponentRecord[];
  readonly campaignOpponentSteps?: readonly CampaignOpponentStepRecord[];
  /** Optional so pre-NEWS-HELP2 snapshots remain structurally readable. */
  readonly publications?: readonly PublicationRecord[];
  /** PRESS46: optional so earlier saves read as an empty press history. */
  readonly pressRecords?: readonly PressRecord[];
  /** CRISIS severe-event records; absent in Worlds written before them. */
  readonly crisisRecords?: readonly CrisisRecord[];
  readonly legislativeMeasures?: readonly LegislativeMeasureRecord[];
  readonly legislativeActions?: readonly LegislativeActionRecord[];
  readonly committeeReferrals?: readonly CommitteeReferralRecord[];
  readonly committeeActions?: readonly CommitteeActionRecord[];
  readonly legislativeAmendments?: readonly LegislativeAmendmentRecord[];
  readonly legislativeProvisions?: readonly LegislativeProvisionRecord[];
  /**
   * Changes a chamber made to its own procedure in play: a rules package, a
   * vote to drop the germaneness rule, a new habit of closed rules. Each is
   * a record, so the rule a chamber works under always traces to the real
   * 2026 rule or to the change that replaced it. Optional; absent in saves
   * written before chambers could change their rules.
   */
  readonly chamberRuleChanges?: readonly ChamberRuleChangeRecord[];
  /**
   * A legislature's regular session ending on the day its leaders chose,
   * before its legal limit. A session with no record ran to its limit.
   * Optional; absent in saves written before leaders could adjourn.
   */
  readonly sessionAdjournments?: readonly SessionAdjournmentRecord[];
  readonly itemVetoes?: readonly ItemVetoRecord[];
  readonly legislativeDraftLineages?: readonly LegislativeDraftLineageRecord[];
  /**
   * Player office workflow preferences. Optional on old saves. Bound to a
   * person and an office work relationship, never a browser store.
   */
  readonly officeWorkflowPreferences?: readonly OfficeWorkflowPreferenceRecord[];
  readonly officeStaffPositions?: readonly OfficeStaffPositionRecord[];
  readonly officeStaffIncumbencies?: readonly OfficeStaffIncumbencyRecord[];
  /**
   * Standing vote instructions for one measure version. Optional on old
   * saves. Not a recorded floor vote.
   */
  readonly officeVoteInstructions?: readonly OfficeVoteInstructionRecord[];
  /**
   * Inspection of a staff briefing item. Optional on old saves. Opening a
   * recommendation is not adoption.
   */
  readonly officeBriefingInspections?: readonly OfficeBriefingInspectionRecord[];
  readonly legislativeCommitments?: readonly LegislativeCommitmentRecord[];
  /** Help between people. Optional; a world with none has no favors yet. */
  readonly favors?: readonly FavorRecord[];
  readonly legislativeNegotiations?: readonly LegislativeNegotiationRecord[];
  readonly legislativeVotes?: readonly LegislativeVoteRecord[];
  readonly executiveDispositions?: readonly ExecutiveDispositionRecord[];
  readonly legislativeEnactments?: readonly LegislativeEnactmentRecord[];
  /** Optional so pre-CIVIL-AUTHORITY13 snapshots remain structurally readable. */
  readonly personnelRecords?: readonly PersonnelRecord[];
  /**
   * WORLD: a save's generated starting conditions and opening version.
   * Optional so older snapshots, which never had them, stay readable.
   */
  readonly worldConditions?: readonly WorldConditionRecord[];
  /** WORLD: political organization identity, decisions and evolution. */
  readonly partyRecords?: readonly PartyRecord[];
  /** Optional so pre-GOVERNING-6 snapshots remain structurally readable. */
  readonly publicProgramRecords?: readonly PublicProgramRecord[];
  /** Duties and who-qualifies rules an enacted law sets, and what each covered body did. */
  readonly enactedDutyRecords?: readonly EnactedDutyRecord[];
  /** Optional so older saves do not acquire inferred permission decisions. */
  readonly lawPermissionRecords?: readonly LawPermissionRecord[];
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

/** How a measure came to exist, for provenance rather than gameplay flavor. */
export type LegislativeMeasureOrigin =
  "member-introduction" | "committee-introduction" | "executive-request";

/**
 * Subject class that institutional rules actually branch on. This is not a
 * topic taxonomy: it exists because real rules impose different thresholds on
 * money bills than on general policy.
 */
export type LegislativeSubjectClass =
  "general-policy" | "appropriation" | "revenue";

/**
 * The numbering session a measure was filed in (decision OCD-LEG-NUM-001).
 * Numbers restart each session, so the session is part of a bill's name.
 */
export interface LegislativeMeasureNumberingSession {
  /** Stable key of the run of numbers: "2027", "2027-2028", "congress-120". */
  readonly key: string;
  /** "2027 Regular Session", "120th Congress". */
  readonly label: string;
  /** "HB 1 (2027 Regular Session)", "H.R. 1, 120th Congress". */
  readonly fullDesignation: string;
}

export interface LegislativeMeasureRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly jurisdictionId: EntityId;
  /** Rule pack governing this measure for its whole life. */
  readonly rulePackId: string;
  /** Institutional designation, e.g. "HB 214" or "LB 88". */
  readonly designation: string;
  /**
   * The session the designation was numbered in. Absent on measures saved
   * before sessions were recorded and on authored designations; those keep
   * the designation exactly as saved.
   */
  readonly numberingSession?: LegislativeMeasureNumberingSession;
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
  /**
   * The policy questions this measure is about.
   *
   * Separate from `policyAlternativeIds` rather than reached through one,
   * because an alternative carries a quantitative operation — set a level, cap
   * it, raise it by a share — and most of what a legislature does is not a
   * number. Who may do what, who must be told, what counts as an offense and
   * who is eligible are all bills about a question that change no quantity, and
   * routing them through a quantitative alternative so the link exists would
   * pass every test while lying about the domain.
   *
   * So this says only "this bill is about this question" and claims nothing
   * about what it would do to anything. Saying what a bill DOES, in terms other
   * than a quantity, is a larger piece of work that belongs with the content
   * pack effect vocabulary rather than here.
   *
   * Optional so snapshots written before it existed remain structurally
   * readable; a measure without it is a measure nobody linked, which is every
   * measure in every save written so far.
   */
  readonly propositionIds?: readonly EntityId[];
  /**
   * Which way the measure answers each question it is about: "yes" when
   * enacting it does what the question proposes, "no" when it does the
   * reverse. A question in `propositionIds` with no row here is a bill that
   * does not say, and a vote on it is not a vote for or against anything
   * (`issue-record.ts`). Optional for the same reason as `propositionIds`.
   */
  readonly propositionAnswers?: readonly {
    readonly propositionId: EntityId;
    readonly answer: "yes" | "no";
  }[];
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
  | "became-law-without-signature"
  | "override-chamber-recorded"
  | "override-succeeded"
  | "override-failed"
  | "override-period-expired"
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
  /**
   * The sections the amendment would put into the bill, as offered, so the
   * record of its vote says what was on the table even when the chamber
   * rejected it and the text never entered the bill. Omitted for an amendment
   * offered by description only, which is how every amendment before this
   * field was recorded.
   */
  readonly proposedSections?: readonly LegislativeProposedSection[];
  /**
   * Why a computer-run member offered it, where one did: to pass the bill,
   * to sink it, to put the other side on the record, or to ride a bill that
   * has to pass. Omitted for the player's amendments and older records.
   */
  readonly authorMotive?: LegislativeAmendmentMotive;
}

export type LegislativeAmendmentMotive = "pass" | "sink" | "record" | "ride";

/**
 * Which way one part of a bill answers a policy question: enacting the part
 * does what the question proposes ("yes"), or the reverse ("no").
 */
export interface PropositionAnswerRef {
  readonly propositionId: EntityId;
  readonly answer: "yes" | "no";
}

/** One section an amendment would add to a bill, or rewrite in it. */
export interface LegislativeProposedSection {
  readonly provisionKey: string;
  readonly heading: string;
  /** The current section it would replace; null when it adds a new one. */
  readonly supersedesProvisionId: EntityId | null;
  /** The policy question the section answers, when it answers one. */
  readonly answers?: PropositionAnswerRef;
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
  /**
   * The member's own reason, as the key of the consideration that decided
   * it, where the member decided for themselves. Omitted for an authored
   * count, which has no reason to give, so older votes read as they did.
   */
  readonly reason?: string;
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
   * When the act takes effect. New enactments record a concrete date; older
   * saves may carry null and retain their original game-interval reading.
   */
  readonly effectiveAt: IsoDate | null;
  /** New records distinguish source dates from game defaults. */
  readonly effectiveDateBasis?: "source-default" | "game-default";
  /** A new game's fallback stays fixed when future profiles change. */
  readonly effectiveDateGameProfile?: {
    readonly version: string;
    readonly days: number;
  };
  /**
   * The legislature's final passing vote: the last chamber passage or
   * concurrence before enactment. A state that dates its acts from passage
   * (Illinois) counts from it. Absent on records written before it was kept.
   */
  readonly finalPassageAt?: IsoDate | null;
  readonly outcomeEventId: EntityId;
}

/**
 * How this office handles votes. A preference is a scheduling policy, not a
 * staffer's legal proxy vote and not a recorded floor disposition.
 */
export type OfficeVotingWorkflowMode =
  "review-batch" | "prior-instructions-with-exceptions" | "handle-individually";

/**
 * How this office handles constituent casework. Adjustable and bound to the
 * office relationship, not a global agent default.
 */
export type OfficeCaseworkWorkflowMode =
  | "player-handles-all"
  | "staff-routine-player-exceptions"
  | "staff-handles-and-briefs";

/**
 * An authorized staff position of an elected office.
 *
 * WHICH positions an office has is an authored gameplay profile — no acquired
 * source establishes a staffing table for an elected office — and every record
 * names the profile it came from. The civil-service CLASS is separate: it is
 * taken from the civil personnel domain's compiled boundary where one exists
 * for the state, and recorded `unknown` with the reason where none does.
 *
 * These are deliberately NOT the civil personnel domain's own position
 * records. That family charters positions of authored state agencies; an
 * elected office generated for one of fifty states is neither authored nor an
 * agency, and widening its rule to admit one would have weakened a contract
 * that is doing its job.
 */
export interface OfficeStaffPositionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly officeKey: string;
  readonly organizationId: EntityId;
  readonly classKey: string;
  readonly title: string;
  /** What the office gets from filling it, in the player's terms. */
  readonly duty: string;
  readonly civilClass: PersonnelCivilClass;
  /** Where the class came from, or why it is unknown. Never empty. */
  readonly civilClassBasis: string;
  /** The authored profile that says this office has this position. */
  readonly profile: string;
}

/** Which employment fills an authorized position, while that work lasts. */
export interface OfficeStaffIncumbencyRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly positionId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly personId: EntityId;
  readonly startedAt: IsoDate;
  readonly note: string;
}

export interface OfficeWorkflowPreferenceRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly officeRelationshipId: EntityId;
  /**
   * Null for an office that casts no votes, such as a governor's: its
   * casework is still the officeholder's to arrange.
   */
  readonly votingMode: OfficeVotingWorkflowMode | null;
  readonly caseworkMode: OfficeCaseworkWorkflowMode;
  readonly recordedAt: IsoDate;
  readonly supersedesPreferenceId: EntityId | null;
}

export type OfficeVoteInstructionDisposition =
  "yea" | "nay" | "present-not-voting";

export interface OfficeVoteInstructionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly chamberKey: string;
  readonly measureId: EntityId;
  /** Canonical fingerprint of the measure text and procedural frontier. */
  readonly measureTextVersion: string;
  readonly disposition: OfficeVoteInstructionDisposition;
  readonly recordedAt: IsoDate;
}

export type OfficeBriefingItemKind = "amendment" | "filed-section";

export interface OfficeBriefingInspectionRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly measureId: EntityId;
  readonly itemKind: OfficeBriefingItemKind;
  readonly itemId: EntityId;
  readonly inspectedAt: IsoDate;
}

// ---------------------------------------------------------------------------
// Legislative politics — provisions, commitments, and negotiated exchange
// ---------------------------------------------------------------------------

/**
 * How narrowly a provision is written.
 *
 * A provision that reaches everyone inside its scope and a provision written
 * for one named project are different political facts, and that difference is
 * usually the whole subject of a bargain. This is deliberately not a `pork`
 * flag: particularization records who benefits and on what stated ground, and
 * says nothing at all about whether the provision is defensible or corrupt.
 */
export type LegislativeParticularizationKind =
  | "named-project"
  | "named-locality"
  | "eligibility-carve-out"
  | "facility-authorization"
  | "program-area";

export type LegislativeProvisionBeneficiary =
  | {
      readonly kind: "general-application";
      /** Plain-language statement of who the provision reaches. */
      readonly appliesToLabel: string;
    }
  | {
      readonly kind: "particularized";
      readonly particularization: LegislativeParticularizationKind;
      /** What the narrower language names, e.g. a transit authority. */
      readonly beneficiaryLabel: string;
      /** The place it is written for, when the provision names one. */
      readonly placeLabel: string | null;
      /**
       * The stated public ground for writing it narrowly. Recorded because a
       * particularized provision is an ordinary legislative act that has to be
       * argued for in the open, not an admission of anything.
       */
      readonly statedGround: string;
    };

/**
 * One operative section of a measure.
 *
 * Provisions are append-only. A revision records a new provision that names the
 * version it replaces, so the bill's text has a history for the same reason its
 * procedural position does, and nothing is quietly rewritten in place.
 */
export type LegislativeProvisionEffectIntent =
  /** This section is the exact levy clause of a linked TaxProposalRecord. */
  | { readonly kind: "tax-policy" }
  /** This section explicitly grants a public program its stated amount. */
  | { readonly kind: "public-program-appropriation" };

export interface LegislativeProvisionRecord {
  /** This version's explicit categories; omission clears a revised rule. */
  readonly lawCategories?: readonly {
    readonly questionKey: string;
    readonly key: string;
    readonly values: readonly string[];
  }[];
  /** This version's explicit numeric rules; omission clears a revised rule. */
  readonly lawTerms?: readonly {
    readonly questionKey: string;
    readonly key: string;
    readonly value: number;
    readonly unit: LawAmountUnit;
  }[];
  /** Explicit annual amount; omission preserves older whole-program records. */
  readonly fiscalPeriod?: "annual";
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  /**
   * The section's durable identity, stable across revisions. Two records with
   * the same provision key are two versions of the same section of the bill.
   */
  readonly provisionKey: string;
  /** Section number as the measure prints it. */
  readonly sectionNumber: number;
  readonly heading: string;
  /** The operative language, as it would read in the bill. */
  readonly text: string;
  readonly beneficiary: LegislativeProvisionBeneficiary;
  /** Existing typed scope: the jurisdiction, and a segment when narrower. */
  readonly applicationScope: MetricScope;
  /** Stated fiscal exposure in plain language; null when it spends nothing. */
  readonly fiscalExposureLabel: string | null;
  /** The same exposure as a checkable amount, so a ceiling can be tested. */
  readonly fiscalExposureMinorUnits: number | null;
  /**
   * Explicit executable intent from a typed clause template. Missing on old
   * saves and on provisions with no registered consumer. A new revision must
   * supply its own intent; omission clears an earlier revision's intent.
   */
  readonly operativeEffect?: LegislativeProvisionEffectIntent;
  readonly recordedAt: IsoDate;
  /** The earlier version this replaces; null for a section as filed. */
  readonly supersedesProvisionId: EntityId | null;
  /**
   * The adopted amendment that put this version into the bill. Null only for
   * the text a measure was filed with: a provision cannot otherwise change
   * except through the ordinary amendment path.
   */
  readonly originAmendmentId: EntityId | null;
  readonly eventId: EntityId;
  /**
   * The policy question this section answers, and which way. This is what
   * lets a section added by amendment enter the voting record: a vote for a
   * bill carrying a work requirement is a vote for the work requirement,
   * whatever the bill was filed to do. Omitted when the section answers no
   * catalog question, which is true of every section recorded before it.
   */
  readonly answers?: PropositionAnswerRef;
}

/** A procedural rule a chamber can change for itself in play. */
export type ChamberProcedureRuleKey = "germaneness" | "amendment-access";

/**
 * One change a chamber made to its own procedure. `value` is the rule's new
 * setting: for germaneness "required", "not-required" or
 * "appropriations-only"; for amendment access "open", "structured" or
 * "closed".
 */
export interface ChamberRuleChangeRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly rulePackId: string;
  readonly chamberKey: string;
  readonly rule: ChamberProcedureRuleKey;
  readonly value: string;
  readonly adoptedAt: IsoDate;
  /** The recorded vote that adopted it, where one did. */
  readonly adoptedByVoteId: EntityId | null;
  /** Why, in plain words, as the chamber's record would give it. */
  readonly rationale: string;
  readonly eventId: EntityId;
}

/**
 * A legislature adjourning its regular session sine die on the day its
 * leaders decided to, within the session's legal limit. The session's end,
 * and every date counted from it, is this day.
 */
export interface SessionAdjournmentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly rulePackId: string;
  readonly jurisdictionId: EntityId;
  /** The calendar year of the regular session. */
  readonly sessionYear: number;
  readonly adjournedOn: IsoDate;
  /** The appropriation the session passed before the leaders adjourned. */
  readonly budgetMeasureId: EntityId;
  /** Bills still before the chambers that the leaders did not wait for. */
  readonly leftPendingMeasureIds: readonly EntityId[];
  /** Why, in plain words, as the legislature's record would give it. */
  readonly rationale: string;
  readonly eventId: EntityId;
}

/**
 * An executive's veto of one section of a bill it otherwise signed, where the
 * constitution gives an item veto (Build 25 step 5). The section stays on the
 * record of every vote taken before the signing and is not part of the law.
 */
export interface ItemVetoRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly provisionId: EntityId;
  readonly executiveDispositionId: EntityId;
  /** The signing's own sequence: the section is out of the law from it on. */
  readonly dispositionSequence: number;
  readonly actorPersonId: EntityId | null;
  readonly rationale: string;
  readonly eventId: EntityId;
}

/** What a legislator said they would do. */
export type LegislativeCommitmentStance =
  | "support"
  | "oppose"
  | "support-if"
  | "oppose-unless"
  | "cosponsor-if-amended"
  | "offer-amendment"
  | "withdraw-objection"
  | "seek-delay"
  | "keep-options-open"
  | "reciprocal-support";

/**
 * How firmly it was said, in the register people actually use.
 *
 * Deliberately not a probability. The player is told what was said and how
 * hedged it sounded, never how likely a hidden model thinks it is to hold.
 */
export type LegislativeCommitmentFirmness =
  "explicit" | "qualified" | "provisional" | "noncommittal";

export type LegislativeCommitmentConditionKind =
  LegislativeCommitmentCondition["kind"];

/**
 * What has to become true for a conditional commitment to be answerable.
 *
 * Each shape carries what the condition is actually about, so the game can say
 * whether it has been met by looking at canonical state rather than by
 * re-reading the sentence a legislator spoke.
 *
 * Every condition here is one the canonical world can actually prove. There
 * was a `provision-removed` condition, and it could not be: provisions are
 * append-only and nothing in the accepted model strikes one, so for a section
 * the bill carries the condition could never become met. A condition the world
 * cannot decide is worse than a missing one — it offers a promise that reads
 * as checkable and silently never is — so it is gone rather than faked. If
 * striking a section is ever wanted, it is an amendment path with its own
 * canonical transition, and the condition comes back with it.
 */
export type LegislativeCommitmentCondition = {
  readonly key: string;
  /** The condition in the words it was stated, for the player to read. */
  readonly description: string;
} & (
  | {
      readonly kind: "provision-adopted";
      readonly provisionKey: string;
    }
  | {
      readonly kind: "scope-narrowed";
      readonly provisionKey: string;
    }
  | {
      readonly kind: "fiscal-ceiling";
      readonly provisionKey: string;
      readonly ceilingMinorUnits: number;
    }
  | {
      readonly kind: "analysis-delivered";
      /** The staff or fiscal analysis the holder said they were waiting on. */
      readonly analysisEventStableKey: string;
    }
  | {
      readonly kind: "reciprocal-support";
      /** The other measure the holder expects help on in return. */
      readonly reciprocalMeasureStableKey: string;
    }
  | {
      readonly kind: "procedural";
      /** The step the commitment is only good before. */
      readonly requiredBeforeAction: LegislativeActionKind;
    }
);

/**
 * Exactly which legislative question something is about.
 *
 * A measure is asked more than one question, and they are different questions:
 * passing a bill, agreeing to the other chamber's changes, overriding a veto
 * and adopting one amendment to one section are four things a member can
 * answer four different ways. Anything that matches promises to each other, or
 * a promise to the vote that tested it, has to compare all of it — a promise
 * about passage that gets checked against the override is not being checked.
 *
 * `purpose` and `measureId` are what a question always has. `provisionKey` and
 * `amendmentStableKey` name the object of the question when it has one, which
 * an amendment does and a passage vote does not. `forumKey` and
 * `floorStageKey` say which chamber and which stage, and are null when the
 * promise did not distinguish them: "I'll be with you on final passage" names
 * a stage the speaker did not, and is answered by the passage vote that comes.
 */
export interface LegislativeQuestionIdentity {
  readonly measureId: EntityId;
  /** The stage the question is put at. */
  readonly purpose: LegislativeVotePurpose;
  /** The chamber or committee, when the promise named one. */
  readonly forumKey: string | null;
  /** The floor stage, when the promise named one. */
  readonly floorStageKey: string | null;
  /** The amendment the question is on, when the question is an amendment. */
  readonly amendmentStableKey: string | null;
  /** The section the question turns on, when it turns on one. */
  readonly provisionKey: string | null;
}

export interface LegislativeCommitmentSubject {
  /** Which question, exactly. */
  readonly question: LegislativeQuestionIdentity;
  /** That same question in plain language, for the player to read. */
  readonly questionLabel: string;
}

/**
 * A stated political commitment.
 *
 * This records what somebody said, not what will happen. Whether the commitment
 * was kept is derived from later canonical events; it is never written back
 * over the words. A promise is a claim about the future, and the epistemic
 * boundary between a claim and the truth holds here exactly as it does
 * everywhere else.
 */
export interface LegislativeCommitmentRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly holderPersonId: EntityId;
  readonly subject: LegislativeCommitmentSubject;
  readonly stance: LegislativeCommitmentStance;
  readonly firmness: LegislativeCommitmentFirmness;
  readonly conditions: readonly LegislativeCommitmentCondition[];
  /** Reuses claim audience: a private word and a public pledge differ. */
  readonly audience: ClaimAudience;
  readonly statedAt: IsoDate;
  readonly eventId: EntityId;
  /** The claim carrying the words, when the commitment was spoken aloud. */
  readonly claimId: EntityId | null;
  /** The people who actually heard it. */
  readonly heardByPersonIds: readonly EntityId[];
  /** The words as spoken, for the record and for any later confrontation. */
  readonly statement: string;
}

/**
 * What kind of exchange an approach was.
 *
 * These are held apart on purpose. Asking for a road in your district, trading
 * votes with a colleague, and taking money for yourself are three different
 * things, and a game that flattens them onto one corruption axis cannot
 * describe a legislature. Nothing here ranks them; the distinction exists so
 * the record can say which one happened.
 */
export type LegislativeExchangeCharacter =
  | "policy-bargaining"
  | "targeted-benefit-request"
  | "reciprocal-support"
  | "coalition-coordination"
  | "constituent-advocacy"
  | "public-interest-appeal"
  | "personal-inducement";

export type LegislativeNegotiationDisposition =
  "proposed" | "accepted" | "refused" | "deferred" | "countered" | "withdrawn";

/** One recorded approach over a measure, and what came of it. */
export interface LegislativeNegotiationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly measureId: EntityId;
  readonly provisionKey: string | null;
  readonly initiatorPersonId: EntityId;
  readonly counterpartyPersonId: EntityId;
  readonly character: LegislativeExchangeCharacter;
  /** What was asked for, in plain language. */
  readonly request: string;
  readonly disposition: LegislativeNegotiationDisposition;
  readonly audience: ClaimAudience;
  readonly occurredAt: IsoDate;
  readonly eventId: EntityId;
  /** The trace behind an actor's disposition, when one was evaluated. */
  readonly decisionTraceId: EntityId | null;
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
  | "adult.household-repair"
  | "adult.household-money-shortfall"
  | "adult.eviction-case"
  | "adult.family-request"
  | "adult.care-request"
  | "adult.partner-plan"
  | "adult.work-rule-pressure"
  | "adult.work-credit"
  | "adult.work-colleague-struggling"
  | "adult.work-good-week"
  | "adult.housing-cost-change"
  | "adult.housing-repair-standoff"
  | "adult.debt-call"
  | "adult.unexpected-expense"
  | "adult.small-windfall"
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
  /** Saved courts and seated judges; absent in lives created before courts opened. */
  readonly judiciary?: JudiciaryState;
  /** Immutable validated definitions accepted for this life; absent in legacy saves. */
  readonly contentPacks?: WorldContentPacks;
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
  /**
   * CHANGE macro history (CRUNCH46 08). Optional and additive: a world
   * written before it existed has no macro history and is never retrofitted.
   */
  readonly macroEconomy?: MacroEconomyStore;
  /** Place outcomes by month (outcome-web/place-outcome-store.ts). */
  readonly placeOutcomes?: PlaceOutcomeStore;
  /**
   * Every government's budget by month (public-budgets/store.ts). Optional
   * and additive: a world written before it existed keeps no budgets.
   */
  readonly publicBudgets?: PublicBudgetStore;
  /**
   * The pressure layer (2026-09-22). Optional and additive: a world written
   * before it existed has no readings and is never retrofitted.
   */
  readonly pressure?: PressureStore;
  /**
   * The seated town's businesses' and banks' books (Build 19). Optional and
   * additive: opened at a town's first quarterly review after it existed.
   */
  readonly townFinances?: TownFinanceStore;
}
