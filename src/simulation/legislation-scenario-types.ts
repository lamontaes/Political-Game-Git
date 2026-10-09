import type { LegislativeRulePack } from "./legislature-rules";
import type { JurisdictionContext } from "./jurisdiction-context";
import type { EntityId, IsoDate } from "./types";

/**
 * Playable legislative scenarios.
 *
 * Each scenario seats a real-sized chamber and files one measure. Members are
 * seated positions with stable keys; a few are linked to simulated people so
 * conversations and relationships can attach to them later. How a member votes
 * is authored here, deliberately: this slice proves that the *institution*
 * resolves a question correctly, and leaves how a legislator makes up their
 * mind to the character systems that already exist.
 */

export interface SeatedMember {
  /** Actual dated seating event; absent evidence never establishes seniority. */
  readonly tenureStartedAt?: IsoDate | null;
  readonly seatingEventId?: EntityId | null;
  readonly memberKey: string;
  readonly name: string;
  readonly personId: EntityId | null;
  /** Descriptive grouping shown to the player; carries no mechanical weight. */
  readonly caucusLabel: string;
  /**
   * The national party the member holds, where the chamber was seated with
   * it already read (Congress). Absent, a vote reads it from the member's
   * party participation.
   */
  readonly partyKey?: string | null;
}

export interface SeatedBody {
  readonly chamberKey: string;
  readonly chamberName: string;
  readonly members: readonly SeatedMember[];
}

/** Authored member decisions for each question this scenario can put. */
export interface AuthoredVoteCounts {
  readonly yea: number;
  readonly nay?: number;
  readonly presentNotVoting?: number;
  readonly absent?: number;
  readonly excused?: number;
}

/**
 * What carrying out a legislative step actually needs.
 *
 * Deliberately not a world. The procedure, the seated members and their
 * authored decisions are the same whether the bill is sitting in a developer
 * scenario or in a player's own save; keeping the world out of this type is
 * what lets production run the same rule pack against the world the player
 * is actually living in.
 */
export interface LegislativeProcedureContext {
  /** Explicit bill-specific fictional content admission, when supplied. */
  readonly recordedSittingEventId?: EntityId;
  readonly recordedPlayerPersonId?: EntityId;
  readonly recordedPlayerBallot?: "yea" | "nay" | "present-not-voting";
  readonly pack: LegislativeRulePack;
  readonly measureId: EntityId;
  readonly bodies: readonly SeatedBody[];
  readonly committeeMemberCount: number | null;
  readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
  readonly governorAction: "signed" | "vetoed" | null;
  readonly governorRationale: string;
  /**
   * Present where the bodies are the state's seated legislators: each member
   * then decides every question for their own reasons and the vote plan is
   * not consulted. The player is never voted for.
   */
  readonly memberDecisions?: { readonly playerPersonId: EntityId | null };
}

/**
 * The authored content of a scenario, with no world attached.
 *
 * `createLegislativeScenario` builds a whole developer world so a scenario can
 * be played standalone. Production already has a world — the player's — and
 * needs only the procedure and the authored decisions, so it reads this
 * instead of constructing a fixture it would immediately throw away.
 */
export interface LegislativeBlueprint {
  readonly scenarioKey: string;
  readonly label: string;
  readonly measureNotice: string;
  readonly context: JurisdictionContext;
  readonly pack: LegislativeRulePack;
  /**
   * What the authored bank calls this measure — for the content index and for
   * the standalone developer scenario, which files its own bill.
   *
   * Production must not copy it onto a measure. A bill in a player's world is
   * numbered by that world's own jurisdiction numbering
   * (`nextMeasureDesignation`), and the number it got is a fact recorded on the
   * measure. The name says `authored` so that reading it in a production path
   * reads as the mistake it would be.
   */
  readonly authoredDesignation: string | null;
  readonly shortTitle: string;
  readonly summary: string;
  readonly subjectClass: "appropriation" | "general-policy";
  readonly nonpartisan: boolean;
  readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
  readonly governorAction: "signed" | "vetoed" | null;
  readonly governorRationale: string;
  /** Qualified catalog keys for the questions this bill is about. */
  readonly propositionKeys: readonly string[];
}
