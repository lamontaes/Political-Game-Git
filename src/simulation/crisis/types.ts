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

export type CrisisRecord =
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
