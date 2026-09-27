/** Saved court, seat and judge contracts. Source evidence and game defaults stay distinct. */

import type { EntityId, IsoDate } from "../types";

export type JudicialCourtLevel =
  | "federal-supreme"
  | "federal-appellate"
  | "federal-district"
  | "local-highest"
  | "local-intermediate"
  | "local-general-trial"
  | "local-chancery";

/** Unknown is an explicit state, never a zero or an unrestricted rule. */
export type JudicialRuleField<T> =
  | {
      readonly state: "known";
      readonly value: T;
      readonly basis: "sourced" | "game-profile" | "enacted-rule";
      readonly referenceId: string;
    }
  | { readonly state: "unknown"; readonly reason: string };

export type JudicialSeatSelectionPath =
  | "initial-world"
  | "appointment"
  | "confirmation"
  | "legislative-election"
  | "popular-election"
  | "retention"
  | "reappointment"
  | "judicial-assignment";

export interface JudicialCourtRules {
  /** The authorized size may change by later law; nine is only the initial SCOTUS value. */
  readonly authorizedSeats: JudicialRuleField<number>;
  readonly termYears: JudicialRuleField<number | null>;
  readonly mandatoryRetirementAge: JudicialRuleField<number | null>;
  readonly caseJurisdiction: JudicialRuleField<readonly string[]>;
  readonly selectionRecordId: string | null;
  readonly amendmentRoute: JudicialRuleField<
    "statute" | "constitution" | "other"
  >;
}

export interface JudicialCourt {
  readonly courtId: string;
  readonly jurisdictionId: EntityId | null;
  readonly name: string;
  readonly level: JudicialCourtLevel;
  readonly parentCourtId: string | null;
  /** Federal-courts courtId or 92L recordId when the source has the court. */
  readonly sourceRecordId: string | null;
  /** "game-profile" only when the source universe does not specify the court. */
  readonly identityBasis: "sourced" | "game-profile" | "enacted-rule";
  readonly createdAt: IsoDate;
  readonly rules: JudicialCourtRules;
}

export interface JudicialCourtRuleVersion {
  readonly recordId: string;
  readonly courtId: string;
  readonly effectiveAt: IsoDate;
  readonly provisionId: EntityId | null;
  readonly rules: JudicialCourtRules;
}

/** Stable ordinal identity survives a holder change and a size reduction. */
export interface JudicialSeat {
  readonly seatId: string;
  readonly courtId: string;
  readonly ordinal: number;
  readonly createdAt: IsoDate;
  readonly retiredAt: IsoDate | null;
  /** Links the existing Chief Justice federal tenure without duplicating its authority. */
  readonly linkedOfficeId: "us-chief-justice" | null;
}

export interface JudicialSelectionProvenance {
  readonly path: JudicialSeatSelectionPath;
  readonly selectionRecordId: string | null;
  readonly decisionRecordId: EntityId | null;
  readonly selectingPersonId: EntityId | null;
  readonly contestId: EntityId | null;
  readonly note: string | null;
}

/** Append-oriented tenure history. One open tenure at most per active seat. */
export interface JudicialSeatTenure {
  readonly tenureId: string;
  readonly seatId: string;
  readonly personId: EntityId;
  readonly startedAt: IsoDate;
  readonly endedAt: IsoDate | null;
  readonly endReason:
    | "death"
    | "retirement"
    | "resignation"
    | "removal"
    | "term-expired"
    | "election-loss"
    | "seat-retired"
    | null;
  readonly selection: JudicialSelectionProvenance;
  readonly termEndsAt: IsoDate | null;
  readonly retentionDueAt: IsoDate | null;
}

/** One attempt to fill or renew a seat; status follows its dated stages. */
export interface JudicialSelectionRecord {
  readonly recordId: string;
  readonly seatId: string;
  readonly openedAt: IsoDate;
  readonly kind: "vacancy" | "new-seat" | "renewal";
  readonly pathId: string | null;
  readonly courtRuleRecordId: string;
  readonly candidatePersonIds: readonly EntityId[];
  readonly ballot: JudicialSelectionBallot | null;
}

/** A retention ballot has yes/no choices; one candidate cannot auto-win. */
export type JudicialSelectionBallot =
  | {
      readonly kind: "candidate-election";
      readonly electionContestId: EntityId | null;
      readonly candidatePersonIds: readonly EntityId[];
    }
  | {
      readonly kind: "retention-yes-no";
      readonly electionContestId: EntityId | null;
      readonly incumbentPersonId: EntityId;
      readonly threshold: JudicialRuleField<string>;
      readonly choices: readonly ["yes", "no"];
    };

/** Canonical yes/no contest, separate from candidate-vs-candidate elections. */
export interface JudicialRetentionContestRecord {
  readonly recordId: EntityId;
  readonly selectionRecordId: string;
  readonly seatId: string;
  readonly incumbentPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly scheduledAt: IsoDate;
  readonly electionDate: IsoDate;
  readonly threshold: JudicialRuleField<string>;
  readonly sourceRecordId: string | null;
  readonly decisionRecordId: EntityId | null;
}

export interface JudicialRetentionResultRecord {
  readonly recordId: EntityId;
  readonly contestId: EntityId;
  readonly decidedAt: IsoDate;
  readonly yesVotes: number;
  readonly noVotes: number;
  readonly outcome: "retained" | "rejected";
  readonly outcomeEventId: EntityId;
  readonly decisionRecordId: EntityId | null;
}

export interface JudicialSelectionStageRecord {
  readonly recordId: string;
  readonly selectionRecordId: string;
  readonly order: number;
  /** An atomic mechanism token from the locked 92L projection. */
  readonly mechanism: string;
  readonly occurredAt: IsoDate;
  readonly actorPersonId: EntityId | null;
  readonly candidatePersonId: EntityId | null;
  readonly outcome: "completed" | "rejected" | "lapsed";
  readonly decisionRecordId: EntityId | null;
  readonly electionContestId: EntityId | null;
  readonly outcomeEventId: EntityId | null;
}

/** Five ordered strengths; negative and positive ends are defined per axis. */
export type JudicialPhilosophyStrength = -2 | -1 | 0 | 1 | 2;
export type JudicialPhilosophyAxis =
  | "reading" /* text/original meaning (-) to purpose/evolving meaning (+) */
  | "deference" /* institutional deference (-) to willing to strike (+) */
  | "federalism" /* federal power (-) to state/local power (+) */
  | "rights" /* government power (-) to individual rights (+) */
  | "precedent"; /* respect (-) to willing to overrule (+) */
export type JudicialRightsSubject =
  | "speech"
  | "religion"
  | "guns"
  | "criminal-procedure"
  | "property"
  | "economic-regulation"
  | "equal-treatment";

export interface JudicialPhilosophyRecord {
  readonly recordId: string;
  readonly personId: EntityId;
  readonly formedAt: IsoDate;
  readonly dimensions: Readonly<
    Record<JudicialPhilosophyAxis, JudicialPhilosophyStrength | null>
  >;
  readonly rightsBySubject: Readonly<
    Record<JudicialRightsSubject, JudicialPhilosophyStrength | null>
  >;
  /** Life and career facts only. A party label is not philosophy evidence. */
  readonly lifeEvidenceIds: readonly EntityId[];
  readonly reason: string;
}

export interface JudiciaryState {
  readonly courts: Readonly<Record<string, JudicialCourt>>;
  readonly seats: Readonly<Record<string, JudicialSeat>>;
  readonly courtRuleVersions: readonly JudicialCourtRuleVersion[];
  readonly seatTenures: readonly JudicialSeatTenure[];
  readonly selections: readonly JudicialSelectionRecord[];
  readonly selectionStages: readonly JudicialSelectionStageRecord[];
  readonly retentionContests: readonly JudicialRetentionContestRecord[];
  readonly retentionResults: readonly JudicialRetentionResultRecord[];
  readonly philosophies: readonly JudicialPhilosophyRecord[];
}

export function judicialSeatId(courtId: string, ordinal: number): string {
  if (!Number.isSafeInteger(ordinal) || ordinal < 1)
    throw new Error("Judicial seat ordinal must be a positive integer.");
  return `${courtId}:seat:${ordinal}`;
}
