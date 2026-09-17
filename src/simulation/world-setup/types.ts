import type { EntityId, IsoDate } from "../types";
import type { CensusRegion } from "./census-regions";

/**
 * Which opening generator built a save. Absent on a replay descriptor means
 * the legacy opening, so a link written before this field still rebuilds the
 * world it described. Saved Worlds are never regenerated either way.
 */
export const LEGACY_WORLD_OPENING_VERSION = "world-opening-legacy" as const;
export const CRUNCH46_WORLD_OPENING_VERSION =
  "world-opening-crunch46-v1" as const;
export type WorldOpeningVersion =
  typeof LEGACY_WORLD_OPENING_VERSION | typeof CRUNCH46_WORLD_OPENING_VERSION;

export type StartingRegime = "near-reference" | "modest" | "major";

/** Three groups stay distinct: what was observed, what was authored, what this world is. */
export type ConditionProvenanceClass =
  "reference-observation" | "authored-calibration" | "simulated-condition";

interface ConditionRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly effectiveDate: IsoDate;
  readonly policyVersion: string;
  readonly provenanceClass: "simulated-condition";
}

export interface WorldOpeningRecord extends ConditionRecordBase {
  readonly kind: "world-opening";
  readonly openingVersion: WorldOpeningVersion;
  readonly regime: StartingRegime;
}

/** How this contest's starting affiliation was obtained. */
export type SeatBaselineKind =
  /** Both major parties on the certified ballot: a certified two-party share. */
  | "certified-two-party"
  /**
   * The office's own source has no two-major-party margin, so its recorded
   * affiliation is preserved exactly. Never another office's evidence and
   * never an invented neutral share (CRUNCH47 C1).
   */
  | "reference-affiliation-preserved"
  /** A non-major affiliation keeps its own identity and is not recoded. */
  | "retained-non-major"
  /** The compiled source has no row for this contest at all. */
  | "unrecorded";

export interface GeneratedSeatCondition {
  readonly seatKey: string;
  readonly baselineKind: SeatBaselineKind;
  /** Null when no share applies (retained non-major). Never a guessed zero. */
  readonly baselineShare: number | null;
  readonly seatResidualPp: number | null;
  readonly generatedShare: number | null;
  /** A party key from the calibration, or "independent" and similar labels. */
  readonly affiliation: string;
  /** Caucus key; null only when the affiliation is itself a caucus party. */
  readonly caucus: string | null;
  readonly referenceWinner: string | null;
  /** Why no margin-based variation applied; null when one did. */
  readonly uncertaintyReason: string | null;
}

export interface GeneratedPresidency {
  readonly baselineKind: "certified-state-presidential";
  readonly electoralVotes: Readonly<Record<string, number>>;
  readonly winner: string;
  readonly decidedBy: "electoral-majority" | "electoral-plurality-no-majority";
  readonly referenceWinner: string | null;
  readonly stateWinners: Readonly<Record<string, string>>;
  readonly unitRuleNote: string;
}

export interface PoliticalStartingConditionsRecord extends ConditionRecordBase {
  readonly kind: "political-starting-conditions";
  readonly contractVersion: "crunch46-political-start/v1";
  readonly regime: StartingRegime;
  readonly calibrationSchema: string;
  readonly calibrationSha256: string;
  readonly nationalSwingPp: number;
  readonly regionSwingPp: Readonly<Record<CensusRegion, number>>;
  readonly stateSwingPp: Readonly<Record<string, number>>;
  readonly seats: readonly GeneratedSeatCondition[];
  readonly presidency: GeneratedPresidency;
}

export interface MacroStartingConditionsRecord extends ConditionRecordBase {
  readonly kind: "macro-starting-conditions";
  readonly contractVersion: "crunch46-macro-start/v1";
  readonly regime: StartingRegime;
  readonly volatilityScale: number;
  readonly latents: {
    readonly cycle: number;
    readonly cost: number;
    readonly housing: number;
    readonly credit: number;
  };
  readonly initial: {
    /** Continuously compounded modeled annual rate; not a published figure. */
    readonly realGrowthAnnualPct: number;
    readonly unemploymentPct: number;
    /** Modeled initial condition, not a historical monthly observation. */
    readonly inflation12mPct: number;
    /** 1 is balanced supply and demand; above 1 is more supply than demand. */
    readonly housingSupplyDemandRatio: number;
    /** 0..1 ordinal-like tightness; the policy rate itself is not varied here. */
    readonly creditTightness: number;
  };
}

export type WorldConditionRecord =
  | WorldOpeningRecord
  | PoliticalStartingConditionsRecord
  | MacroStartingConditionsRecord;

// ---------------------------------------------------------------------------
// Political organizations
// ---------------------------------------------------------------------------

export type PartyUnitLevel = "national" | "state" | "local";

export type PartyInitiativeKind =
  | "founding"
  | "split"
  | "merger"
  | "rename"
  | "platform-change"
  | "dissolution";

export type PartyEvolutionChange =
  | "founded"
  | "split-off"
  | "merged"
  | "renamed"
  | "platform-changed"
  | "dissolved";

interface PartyRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
}

/**
 * A persistent political organization this game treats as a party unit.
 * Identity only: affiliation, caucus, membership, platform, registered
 * committee and ballot status are separate records.
 */
export interface PartyUnitRecord extends PartyRecordBase {
  readonly kind: "party-unit";
  readonly organizationId: EntityId;
  readonly partyKey: string;
  readonly level: PartyUnitLevel;
  readonly parentOrganizationId: EntityId | null;
  readonly jurisdictionId: EntityId | null;
  readonly establishedAt: IsoDate;
  readonly origin: "setting" | "founded" | "split" | "merger";
}

export interface PartyPlatformPosition {
  readonly questionKey: string;
  readonly optionKey: string;
}

/** An adopted platform or strategy line; superseded, never edited. */
export interface PartyPlatformRecord extends PartyRecordBase {
  readonly kind: "party-platform";
  readonly organizationId: EntityId;
  readonly effectiveDate: IsoDate;
  readonly positions: readonly PartyPlatformPosition[];
  readonly decisionId: EntityId | null;
  readonly supersedesPlatformId: EntityId | null;
}

/** A governing body's actual decision on one question, with who took part. */
export interface PartyBodyDecisionRecord extends PartyRecordBase {
  readonly kind: "party-body-decision";
  readonly organizationId: EntityId;
  readonly questionKey: string;
  readonly adoptedOptionKey: string;
  readonly decidedAt: IsoDate;
  readonly participantPersonIds: readonly EntityId[];
  readonly dissentingPersonIds: readonly EntityId[];
  readonly publicEventId: EntityId | null;
}

export interface PartyInitiativeRecord extends PartyRecordBase {
  readonly kind: "party-initiative";
  readonly initiativeKind: PartyInitiativeKind;
  readonly proposerPersonId: EntityId;
  readonly subjectOrganizationIds: readonly EntityId[];
  /** The disputed question behind a founding or split, when there is one. */
  readonly questionKey: string | null;
  readonly disputedDecisionIds: readonly EntityId[];
  readonly proposedName: string | null;
  readonly proposedPositions: readonly PartyPlatformPosition[];
  readonly level: PartyUnitLevel;
  readonly jurisdictionId: EntityId | null;
  /** Event-specific reason keys, never a hidden score. */
  readonly reasonKeys: readonly string[];
}

export type PartyInitiativeResponseKind =
  "consent" | "decline" | "elect-to-leave" | "remain" | "accept" | "reject";

export type PartyActorAuthority =
  | "proposer"
  | "co-organizer"
  | "faction-member"
  | "authorized-leader"
  | "governing-body-member";

export interface PartyInitiativeResponseRecord extends PartyRecordBase {
  readonly kind: "party-initiative-response";
  readonly initiativeId: EntityId;
  readonly personId: EntityId;
  readonly actingForOrganizationId: EntityId | null;
  readonly authority: PartyActorAuthority;
  readonly response: PartyInitiativeResponseKind;
  readonly respondedAt: IsoDate;
  readonly decisionTraceId: EntityId | null;
}

export interface PartyObligationDisposition {
  readonly participationsEnded: readonly EntityId[];
  readonly dueItemsCancelled: readonly EntityId[];
  /** Nothing else is represented for party units yet, and this says so. */
  readonly otherResources: "none-represented";
  readonly successorOrganizationId: EntityId | null;
}

/** The dated change itself. Old votes, rolls and results are never rewritten. */
export interface PartyEvolutionRecord extends PartyRecordBase {
  readonly kind: "party-evolution";
  readonly change: PartyEvolutionChange;
  readonly initiativeId: EntityId;
  readonly effectiveDate: IsoDate;
  readonly fromOrganizationIds: readonly EntityId[];
  readonly toOrganizationIds: readonly EntityId[];
  readonly movedPersonIds: readonly EntityId[];
  readonly name: string | null;
  readonly obligations: PartyObligationDisposition | null;
  readonly publicEventId: EntityId;
}

export type PartyRecord =
  | PartyUnitRecord
  | PartyPlatformRecord
  | PartyBodyDecisionRecord
  | PartyInitiativeRecord
  | PartyInitiativeResponseRecord
  | PartyEvolutionRecord;
