import movesData from "../../../data/content/story-moves.json" with { type: "json" };
import typesData from "../../../data/content/situation-types.json" with { type: "json" };
import { evaluateDecision } from "../decisions";
import {
  readRelationshipStanding,
  RELATIONSHIP_DIMENSIONS,
  type RelationshipDimension,
  type StandingBand,
} from "../relationship-standing";
import { traitActTables } from "../traits/act-pulls";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  RelationshipChange,
  RelationshipInteractionKind,
  RelationshipSignificance,
  World,
} from "../types";

/**
 * Situation types: the reusable structure of a scene (story director, part 3
 * of docs/design/story-director.md).
 *
 * A type names roles, how the world's records fill each one, what each role
 * wants, the moves open to it, where and when it happens, and which moments
 * open it. It holds no sentence: the records fill the roles and the English
 * engine voices every line from a fact packet. One type serves every event of
 * its kind.
 *
 * A role a person fills chooses its move through the ordinary decision path.
 * The options are its moves, labeled with act kinds in the shared decision
 * table, so every recorded trait weighs in. The role's wants and the person's
 * standing toward the others add reasons. Nothing is drawn by chance; equal
 * reasons leave the person undecided.
 */

/* -------------------------------------------------------------------------- */
/* The data                                                                    */
/* -------------------------------------------------------------------------- */

export interface StoryMoveAftermath {
  readonly kind: RelationshipInteractionKind;
  readonly change: RelationshipChange;
  readonly significance: RelationshipSignificance;
  /**
   * The moves this aftermath answers; omitted means any. Agreeing to a request
   * commits; agreeing that someone declined does not.
   */
  readonly when?: readonly string[];
}

export interface StoryMove {
  readonly key: string;
  /** The English engine's speech act, or null for a move that says nothing. */
  readonly speechAct: string | null;
  /** The relationship interaction the move writes, unless a type overrides it. */
  readonly aftermath: StoryMoveAftermath | null;
  /** Whether the move opens an undertaking the speaker now owes. */
  readonly undertaking?: boolean;
}

export interface SituationRole {
  readonly key: string;
  /** The record rule that fills the role: one of the data's `fills`. */
  readonly fill: string;
  readonly count: "one" | "some";
  /** False for a role that is part of the scene but not in it: the dead, the away. */
  readonly present?: boolean;
  /** The type's own moves; the always-open moves are added to every present role. */
  readonly moves: readonly string[];
  /** The act kinds the role wants, so the decision can weigh them. */
  readonly wants: readonly string[];
  /**
   * How a person in this role carries themselves: a key from the data's
   * `bearings`, read by the scene's staging and the English engine's mood
   * condition. Every present role has one.
   */
  readonly bearing?: string;
}

export interface SituationCause {
  /** A moment kind key; `*` stands for any one segment of a relationship kind. */
  readonly moment?: string;
  /** A thread turn, for types opened by a change in a thread. */
  readonly threadTurn?: string;
  /** Which fill binds each role, from the opening record. */
  readonly bind: Readonly<Record<string, string>>;
  /** The role that speaks first, when the opening record says who did. */
  readonly opener?: string;
  /** The move the opening record already is: a request to meet is a request. */
  readonly opening?: string;
}

export interface SituationType {
  readonly key: string;
  readonly roles: readonly SituationRole[];
  readonly setting: readonly string[];
  readonly timing: string;
  readonly causes: readonly SituationCause[];
  /** Records the type waits on: not yet a moment kind, or not yet in the world. */
  readonly awaiting?: readonly string[];
  /** Per move, the interaction this type writes in place of the move's default. */
  readonly aftermath?: Readonly<Record<string, StoryMoveAftermath>>;
}

interface TypesTable {
  readonly version: number;
  readonly fills: Readonly<Record<string, string>>;
  readonly settings: Readonly<Record<string, string>>;
  readonly timings: Readonly<Record<string, string>>;
  readonly awaitingRecords: Readonly<Record<string, string>>;
  readonly standingPulls: Readonly<
    Record<RelationshipDimension, readonly string[]>
  >;
  readonly bearings: Readonly<Record<string, string>>;
  readonly scheduling: StoryScheduling;
  readonly types: readonly SituationType[];
}

/** When situations become scenes (part 4): calibration, owner-adjustable. */
export interface StoryScheduling {
  /** About how many scenes a year a life carries, by band of childhood agency or `adult`. */
  readonly paces: Readonly<Record<string, number>>;
  /** How far back a moment's rank among the life's moments reaches. */
  readonly trailingDays: number;
  /** How many days a scene stays open from the date its timing sets, by timing. */
  readonly openDays: Readonly<Record<string, number>>;
}

const TYPES_TABLE = typesData as unknown as TypesTable;
const MOVES_TABLE = movesData as unknown as {
  readonly always: readonly string[];
  readonly answeredBy: Readonly<Record<string, readonly string[]>>;
  readonly moves: readonly StoryMove[];
};

export const SITUATION_TYPES: readonly SituationType[] = TYPES_TABLE.types;
export const STORY_SCHEDULING: StoryScheduling = TYPES_TABLE.scheduling;
export const STORY_MOVES: readonly StoryMove[] = MOVES_TABLE.moves;
/** The moves every present role always has: four replies are always open. */
export const ALWAYS_OPEN_MOVES: readonly string[] = MOVES_TABLE.always;

/** The closed vocabularies the types draw on, for the schema test. */
export function situationVocabulary() {
  return {
    fills: new Set(Object.keys(TYPES_TABLE.fills)),
    settings: new Set(Object.keys(TYPES_TABLE.settings)),
    timings: new Set(Object.keys(TYPES_TABLE.timings)),
    awaiting: new Set(Object.keys(TYPES_TABLE.awaitingRecords)),
    bearings: new Set(Object.keys(TYPES_TABLE.bearings)),
    standingPulls: TYPES_TABLE.standingPulls,
  };
}

const TYPE_BY_KEY = new Map(SITUATION_TYPES.map((type) => [type.key, type]));
const MOVE_BY_KEY = new Map(STORY_MOVES.map((move) => [move.key, move]));

export function situationType(key: string): SituationType {
  const type = TYPE_BY_KEY.get(key);
  if (!type) throw new Error(`Unknown situation type: ${key}`);
  return type;
}

export function storyMove(key: string): StoryMove {
  const move = MOVE_BY_KEY.get(key);
  if (!move) throw new Error(`Unknown story move: ${key}`);
  return move;
}

/** The moves open to a role: the type's own, then the always-open three. */
export function movesForRole(type: SituationType, roleKey: string): string[] {
  const role = type.roles.find((entry) => entry.key === roleKey);
  if (!role) throw new Error(`Unknown role ${roleKey} in ${type.key}`);
  if (role.present === false) return [];
  return [...new Set([...role.moves, ...ALWAYS_OPEN_MOVES])];
}

/**
 * The moves that answer a move: a request is answered by agreeing, declining
 * or offering something else (adjacency pairs, data). A move nobody answers,
 * such as leaving, has none.
 */
export function answeringMoves(moveKey: string): readonly string[] {
  return MOVES_TABLE.answeredBy[moveKey] ?? [];
}

/** The interaction a move writes in this type, or null when it writes none. */
export function moveAftermath(
  type: SituationType,
  moveKey: string,
  /** The move this one answers, or null for none; omitted reads the data as is. */
  answering?: string | null,
): StoryMoveAftermath | null {
  const aftermath = type.aftermath?.[moveKey] ?? storyMove(moveKey).aftermath;
  if (!aftermath?.when || answering === undefined) return aftermath;
  return answering !== null && aftermath.when.includes(answering)
    ? aftermath
    : null;
}

/** The act kinds the shared decision table gives a move. */
export function moveActs(moveKey: string): ReadonlySet<string> {
  return (
    traitActTables().optionActs.get(STORY_MOVE_DECISION)?.get(moveKey) ??
    new Set()
  );
}

/* -------------------------------------------------------------------------- */
/* Choosing a move                                                             */
/* -------------------------------------------------------------------------- */

/** The decision type a role's move is chosen under. */
export const STORY_MOVE_DECISION = "story.move";

/** The standing bands from none to strong; a line weighs by its place along them. */
const BAND_ORDER: readonly StandingBand[] = [
  "none",
  "slight",
  "marked",
  "strong",
];

function bandWeight(band: StandingBand): number {
  return BAND_ORDER.indexOf(band) / (BAND_ORDER.length - 1);
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export interface ChooseMoveInput {
  readonly stableKey: string;
  readonly typeKey: string;
  readonly roleKey: string;
  readonly personId: EntityId;
  /** The people the move is toward, whose standing weighs in. */
  readonly towardPersonIds: readonly EntityId[];
  /**
   * The moves to choose among, when the person is answering a move: the moves
   * that answer it. Without them, the role's own moves and the always-open
   * three.
   */
  readonly candidates?: readonly string[];
}

/**
 * The reasons a role's wants and the person's standing toward the others give
 * the type's own moves. Every reason slides with its evidence: a want weighs
 * by the share of the move's act kinds it names, and a relationship line by
 * its band. The always-open moves (ask, stay silent, leave) are there so a
 * player always has four replies; only a person's traits weigh on them. A
 * person answering a move weighs the same reasons on each answering move.
 */
export function moveConsiderations(
  world: World,
  input: ChooseMoveInput,
): DecisionConsideration[] {
  const type = situationType(input.typeKey);
  const role = type.roles.find((entry) => entry.key === input.roleKey)!;
  const moves =
    input.candidates ??
    role.moves.filter((move) => !ALWAYS_OPEN_MOVES.includes(move));
  const considerations: DecisionConsideration[] = [];
  const wants = new Set(role.wants);
  for (const moveKey of moves) {
    const acts = [...moveActs(moveKey)];
    const shared = acts.filter((act) => wants.has(act));
    if (shared.length === 0) continue;
    considerations.push({
      stableKey: `${input.stableKey}:want:${moveKey}`,
      optionKey: moveKey,
      sourceType: "context:situation-role",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      weightScale: round(shared.length / acts.length),
      explanation: `${type.key} ${role.key} wants ${shared.join(", ")}`,
      sourceRefs: [],
    });
  }
  const pulls = TYPES_TABLE.standingPulls;
  for (const otherId of input.towardPersonIds) {
    if (otherId === input.personId || !world.people[otherId]) continue;
    const readings = readRelationshipStanding(
      world,
      input.personId,
      otherId,
    ).readings;
    for (const dimension of RELATIONSHIP_DIMENSIONS) {
      const reading = readings[dimension];
      const share = bandWeight(reading.band);
      if (share === 0) continue;
      const pulled = new Set(pulls[dimension] ?? []);
      for (const moveKey of moves) {
        if (![...moveActs(moveKey)].some((act) => pulled.has(act))) continue;
        considerations.push({
          stableKey: `${input.stableKey}:standing:${otherId}:${dimension}:${moveKey}`,
          optionKey: moveKey,
          sourceType: "social:relationship",
          direction: reading.adverse ? "opposes" : "supports",
          importance: "moderate",
          confidence: "high",
          weightScale: round(share),
          explanation: `${dimension} ${reading.band}${reading.adverse ? " adverse" : ""}`,
          sourceRefs: reading.basis.map((interactionId) => ({
            kind: "relationship-interaction" as const,
            interactionId,
          })),
        });
      }
    }
  }
  return considerations;
}

/**
 * The move this person makes in this role, through the ordinary decision path.
 * The trace is kept only in memory; the scene runner records what it uses.
 */
export function chooseSituationMove(
  world: World,
  input: ChooseMoveInput,
): DecisionEvaluation {
  const type = situationType(input.typeKey);
  const own = movesForRole(type, input.roleKey);
  if (own.length === 0)
    throw new Error(
      `Role ${input.roleKey} in ${type.key} is not present and makes no move.`,
    );
  const moves = input.candidates ?? own;
  return evaluateDecision(world, {
    stableKey: input.stableKey,
    decisionType: "story.move",
    actorPersonId: input.personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: `situation:${type.key}:${input.roleKey}`,
      entityId: null,
    },
    options: moves.map((moveKey) => ({
      key: moveKey,
      label: moveKey,
      description: storyMove(moveKey).speechAct ?? "no words",
    })),
    constraints: [],
    considerations: moveConsiderations(world, input),
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
}
