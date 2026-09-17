import type { EntityId, EventVisibility, IsoDate } from "../types";
import type { MortalityCalibrationCategory } from "./mortality-table";

/**
 * CRISIS canonical records.
 *
 * One append-only, typed family on the shared history sequence. Every record
 * says when it takes effect, when it was recorded, who may know it, and which
 * earlier canonical records caused it. Ordinary death and capacity still go
 * through the existing vitality writers; these records carry what vitality
 * does not: the hazard model's bookkeeping, health episodes and disclosure,
 * and the office-continuity notice GOVERNING consumes.
 */

export const CRISIS_RECORD_SCHEMA = "crisis-record-v1" as const;
export const CRISIS_MORTALITY_MODEL = "crisis-mortality-hazard-v1" as const;
export const CRISIS_PROVISIONAL_POLICY = "crunch46-provisional-v1" as const;

interface CrisisRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly schemaVersion: typeof CRISIS_RECORD_SCHEMA;
  /** The day the fact is true from. Never after `recordedAt`. */
  readonly effectiveAt: IsoDate;
  readonly recordedAt: IsoDate;
  /** Records, events or due items that caused this one; all earlier. */
  readonly causalParentIds: readonly EntityId[];
  /** Who may know it, independent of whether anybody has learned it. */
  readonly visibility: EventVisibility;
  /** The ordinary event committed with this record, when there is one. */
  readonly eventId: EntityId | null;
}

/** One monthly pass of the mortality model. */
export interface MortalityWindowRecord extends CrisisRecordBase {
  readonly kind: "mortality-window";
  readonly model: typeof CRISIS_MORTALITY_MODEL;
  readonly tableId: string;
  readonly windowEnd: IsoDate;
  /** People first exposed in this window, in canonical order. */
  readonly newlyTrackedPersonIds: readonly EntityId[];
  readonly dueItemId: EntityId;
}

/** An explicitly represented actuarial calibration category. */
export interface MortalityCalibrationRecord extends CrisisRecordBase {
  readonly kind: "mortality-calibration";
  readonly personId: EntityId;
  readonly category: MortalityCalibrationCategory;
  readonly basis: string;
}

export type HealthSeverity = "acute" | "serious" | "chronic";

export type HealthState =
  | "acute"
  | "serious"
  | "chronic"
  | "prognosis-limited"
  | "temporarily-incapacitated"
  | "recovering"
  | "recovered"
  | "deceased";

export type FunctionalLimitation = "none" | "limited" | "incapacitated";

export type HealthEpisodeOrigin =
  | { readonly kind: "injury"; readonly sourceRecordId: EntityId }
  | { readonly kind: "condition-pack"; readonly packKey: string }
  | { readonly kind: "authored"; readonly note: string };

export interface HealthCourseStep {
  readonly afterDays: number;
  readonly state: Exclude<HealthState, "deceased">;
  readonly functionalLimitation: FunctionalLimitation;
}

/**
 * A represented health episode. Without a researched condition pack it is a
 * labeled simulation episode: it names no disease and carries no prognosis.
 */
export interface HealthEpisodeRecord extends CrisisRecordBase {
  readonly kind: "health-episode";
  readonly personId: EntityId;
  readonly label: "simulation-episode" | "condition";
  readonly conditionKey: string | null;
  readonly severity: HealthSeverity;
  readonly origin: HealthEpisodeOrigin;
  /** Millionths applied to all-cause hazard while the episode is active. */
  readonly hazardMultiplierMicros: number;
  readonly hazardBasis: string;
  /** Authored review steps after onset; empty for a continuing condition. */
  readonly course: readonly HealthCourseStep[];
}

export interface HealthStateRecord extends CrisisRecordBase {
  readonly kind: "health-state";
  readonly episodeId: EntityId;
  readonly personId: EntityId;
  readonly state: HealthState;
  readonly functionalLimitation: FunctionalLimitation;
  /** The vitality capacity change written with this state, if any. */
  readonly capacityRecordId: EntityId | null;
}

export type HealthAccess =
  "private" | "specific-people" | "official" | "public";

export interface HealthDisclosureRecord extends CrisisRecordBase {
  readonly kind: "health-disclosure";
  readonly episodeId: EntityId;
  readonly personId: EntityId;
  readonly access: HealthAccess;
  readonly recipientIds: readonly EntityId[];
  /** Null when the information moved without the subject deciding. */
  readonly decidedByPersonId: EntityId | null;
}

export interface OfficeRef {
  readonly officeKey: string;
  readonly title: string;
  /** Organization or seat identity the World already holds. */
  readonly organizationId: EntityId | null;
  /** The term evidence the office projection used (event or work id). */
  readonly termEvidenceId: EntityId | null;
}

export type OfficialContinuityChange =
  "death" | "incapacity-began" | "incapacity-ended";

/**
 * A current officeholder's death or capacity change, with the offices frozen
 * as held immediately before it. GOVERNING consumes it once; CRISIS never
 * ends a term or names a successor.
 */
export interface OfficialContinuityRecord extends CrisisRecordBase {
  readonly kind: "official-continuity";
  readonly personId: EntityId;
  readonly change: OfficialContinuityChange;
  readonly offices: readonly OfficeRef[];
  /** The death or capacity record this notice reports. */
  readonly sourceRecordId: EntityId;
}

export type HazardFamily = "flood" | "severe-storm";
export type HazardMagnitude = "minor" | "moderate" | "major" | "catastrophic";

/**
 * A declared physical hazard. The first wave does not predict local annual
 * hazards: an episode is declared with its geography, explicit magnitude and
 * the basis for declaring it.
 */
export interface HazardEpisodeRecord extends CrisisRecordBase {
  readonly kind: "hazard-episode";
  readonly family: HazardFamily;
  readonly magnitude: HazardMagnitude;
  readonly stateUsps: string;
  readonly jurisdictionIds: readonly EntityId[];
  readonly endsAt: IsoDate;
  readonly basis: string;
  readonly sourceReference: string | null;
}

export type DisasterTargetKind = "household" | "dwelling" | "organization";
export type DisasterDamageLevel =
  "damaged" | "destroyed" | "service-interrupted";

/** Damage to one represented record. Never a count of unrepresented things. */
export interface DisasterDamageRecord extends CrisisRecordBase {
  readonly kind: "disaster-damage";
  readonly episodeId: EntityId;
  readonly targetKind: DisasterTargetKind;
  readonly targetId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly level: DisasterDamageLevel;
  /** Authored repair effort; for an interruption, the days of lost service. */
  readonly repairUnits: number;
}

export interface DisasterAssessmentRecord extends CrisisRecordBase {
  readonly kind: "disaster-assessment";
  readonly episodeId: EntityId;
  readonly exposed: Readonly<Record<DisasterTargetKind, number>>;
  readonly damaged: Readonly<Record<DisasterTargetKind, number>>;
  readonly destroyed: Readonly<Record<DisasterTargetKind, number>>;
  readonly injuredPersonIds: readonly EntityId[];
  readonly deceasedPersonIds: readonly EntityId[];
  readonly totalRepairUnits: number;
}

export type DisasterResponseStage =
  | "local-response"
  | "state-request"
  | "no-state-request"
  | "federal-declared"
  | "federal-denied"
  | "federal-not-requested"
  | "follow-up";

export interface DisasterResponseRecord extends CrisisRecordBase {
  readonly kind: "disaster-response";
  readonly episodeId: EntityId;
  readonly stage: DisasterResponseStage;
  readonly actorPersonId: EntityId | null;
  readonly officeKey: string | null;
  readonly decidedBy: "player" | "npc-rule" | "institution" | "lapse";
  readonly reason: string;
  readonly programs: readonly string[];
}

export interface RepairProgressRecord extends CrisisRecordBase {
  readonly kind: "repair-progress";
  readonly episodeId: EntityId;
  readonly damageId: EntityId;
  readonly unitsApplied: number;
  readonly remainingUnits: number;
  readonly funding: "local" | "federal-assisted";
}

export type CrisisOptionKey = "diplomatic" | "economic" | "force-posture";
export type IntelligenceConfidence = "low" | "moderate" | "high";
export type TensionLevel = "low" | "elevated" | "high" | "severe";

/**
 * An international crisis between the United States and an abstract,
 * authored counterparty. The World represents no foreign governments yet, so
 * actors are labeled fictional placeholders and never name a real state.
 */
export interface InternationalCrisisRecord extends CrisisRecordBase {
  readonly kind: "international-crisis";
  readonly counterpartyLabel: string;
  readonly allyLabels: readonly string[];
  readonly subject: string;
  readonly tension: TensionLevel;
  readonly basis: string;
}

export interface IntelligenceAssessmentRecord extends CrisisRecordBase {
  readonly kind: "intelligence-assessment";
  readonly crisisId: EntityId;
  readonly confidence: IntelligenceConfidence;
  /** What the assessment judges likely, which may be wrong. */
  readonly assessedIntent: "probing" | "coercive" | "preparing-force";
  readonly cycle: number;
}

export interface CrisisOptionsRecord extends CrisisRecordBase {
  readonly kind: "crisis-options";
  readonly crisisId: EntityId;
  readonly cycle: number;
  readonly options: readonly {
    readonly key: CrisisOptionKey;
    readonly forceCapable: boolean;
    readonly advisers: string;
    readonly risk: "lower" | "moderate" | "higher";
    readonly legal: string;
  }[];
  readonly recommended: CrisisOptionKey;
}

export interface CrisisDecisionRecord extends CrisisRecordBase {
  readonly kind: "crisis-decision";
  readonly crisisId: EntityId;
  readonly cycle: number;
  readonly option: CrisisOptionKey;
  readonly deciderPersonId: EntityId | null;
  readonly decidedBy: "player" | "npc-rule" | "institution";
}

export interface CounterpartyResponseRecord extends CrisisRecordBase {
  readonly kind: "counterparty-response";
  readonly crisisId: EntityId;
  readonly cycle: number;
  readonly counterparty: "de-escalated" | "held" | "escalated";
  readonly allies: "supported" | "stood-aside";
  readonly tensionAfter: TensionLevel;
  readonly ended: boolean;
}

export type WarPowersStage =
  | "forces-introduced"
  | "report-submitted"
  | "authorization-absent"
  | "withdrawal-extension-certified"
  | "forces-withdrawn";

/** 50 U.S.C. §§1543–1544 clock, only for a represented introduction of forces. */
export interface WarPowersRecord extends CrisisRecordBase {
  readonly kind: "war-powers";
  readonly crisisId: EntityId;
  readonly stage: WarPowersStage;
  readonly reportDueAt: IsoDate;
  readonly terminationAt: IsoDate | null;
  readonly note: string;
}

export interface ViolenceAttemptRecord extends CrisisRecordBase {
  readonly kind: "violence-attempt";
  readonly targetPersonId: EntityId;
  /** Earlier canonical evidence of threat or intent; required. */
  readonly threatEvidenceIds: readonly EntityId[];
  readonly outcome: "unharmed" | "injured" | "killed";
  readonly basis: string;
}

export type CrisisRecord =
  | InternationalCrisisRecord
  | IntelligenceAssessmentRecord
  | CrisisOptionsRecord
  | CrisisDecisionRecord
  | CounterpartyResponseRecord
  | WarPowersRecord
  | ViolenceAttemptRecord
  | HazardEpisodeRecord
  | DisasterDamageRecord
  | DisasterAssessmentRecord
  | DisasterResponseRecord
  | RepairProgressRecord
  | MortalityWindowRecord
  | MortalityCalibrationRecord
  | HealthEpisodeRecord
  | HealthStateRecord
  | HealthDisclosureRecord
  | OfficialContinuityRecord;

export type CrisisRecordKind = CrisisRecord["kind"];

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type CrisisRecordInput = DistributiveOmit<
  CrisisRecord,
  "id" | "sequence" | "schemaVersion" | "recordedAt"
>;
