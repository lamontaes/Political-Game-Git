/**
 * The exchange engine for scenes with a purpose. A setup, a person with
 * a purpose, stakes, and an exchange that plays to resolved or refused, with
 * a branch for each thing the player might say. It words nothing itself and
 * never reads a bank: it says
 * which move each turn makes, who makes it, the line it answers and the facts
 * on record, and the English engine (`src/english/scene-talk-words.ts`) picks
 * the piece and words it in the speaker's voice.
 *
 * The arc comes from `data/purpose-arcs.json`: the purpose's statement and
 * reply moves; auto-replies the player's character says unprompted; the
 * asker's answer to each reply move, the one the asker's traits lean toward
 * most (a tie by the stable hash); the next replies; a continuation once the
 * purpose resolves; the close by outcome. Nothing is rolled. The branch the
 * page follows first is the one the player's traits lean toward most. Both
 * read one lean: each move's act kinds in the shared decision table
 * (`scene-talk.move`), scored by the trait engine as every other decision is,
 * so a person answers in talk the way they decide elsewhere. Every other reply
 * leads to its own branch, up to the tree's bounds (`scene-talk-rules.json`).
 *
 * Where the player does the asking (a colleague's vote, a resident's at the
 * door), the same tree is built the other way round: the player says the
 * asker's lines as the choices and the one asked answers from where they
 * stand (the arc's `asks`). One numbering and one ending decider serve both.
 */
import { traitLean } from "../core2/choice";
import { decisionKinds } from "../core2/trait-decision-table";
import { P } from "../core2/parameters";
import { stableHash } from "../core2/kernel/ids";
import type { CoreState, PersonId } from "../core2/types";
import arcsFile from "./data/purpose-arcs.json" with { type: "json" };
import { variantArc, variantFamilies } from "./arc-variant";
import type { ReplyFollowsTable } from "../english/reply-follows";
import situationFile from "./data/situation-types.json" with { type: "json" };
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import {
  factsSetBy,
  pieceAnswers,
  sceneMoveFits,
  sceneMovesWritten,
  wordSceneMove,
  type Fact,
  type Placed,
  type SceneMove,
  type SceneTalkStep,
} from "../english/scene-talk-words";

export type { SceneTalkStep };
import type { Director } from "./ledger";
import { composedLine, type Said } from "./talk-words";
import { decisionLean } from "../core2/trait-decisions";
import { movePairFactor, type CalibrationTable } from "../english/calibration";
import { asksQuestion } from "../english/conversation-words";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";

const zero = P.zero;
const one = P.one;
const two = P.two;
const three = two + one;
const four = two + two;

interface Ending {
  id: string;
  label: string;
  keeps: string;
  /**
   * How firm a kept promise is ("firm" for a vote traded or a yes given,
   * "vague" for "I'll look at it"): written on the scene's reply record, where
   * the promise record reads it.
   */
  firmness?: string;
  /** What this ending does to the resident's case at office hours: the cases engine's decision. */
  settles?: "help" | "decline";
  when: {
    reply?: string[];
    asker?: string[];
    anyReply?: string[];
    caught?: boolean;
    believed?: boolean;
    outcome?: string[];
  };
}

interface PurposeArc {
  /** Facts of which at most one holds in one talk (the visitor is for the bill or against it). */
  apart?: string[][];
  state: string;
  /**
   * A statement said as several moves in order, one breath (the clerk tells
   * the race: who is running, the term and dates, the work, the deadline):
   * each move is worded from its own pieces and the lines join. The statement
   * keeps the move `state` for what answers it. A move the records cannot word
   * is left out; with none worded, the scene is skipped.
   */
  stateMoves?: string[];
  replies: string[];
  /** This purpose's own answers (reply move to candidates), before the shared ones. */
  follow?: Record<string, string | string[]>;
  /** This purpose's own next replies (answer move to reply moves). */
  again?: Record<string, string[]>;
  /** After the asker's line of this move ("state" for the statement), the player's character says a line of `move` unprompted. */
  auto?: { after: string; move: string }[];
  /** Named endings (the first that matches the end of a path wins). */
  endings?: Ending[];
  /** Reply moves after which the answer ends the exchange: no goodbye follows it (everyday talk). */
  closes?: string[];
  /**
   * Replies that do the thing asked in their own words (sign, veto), by the
   * act, as their pieces: said, the talk ends with one closing line from the
   * asker, and the engine that keeps the act reads the reply's piece.
   */
  acts?: Record<string, string[] | string>;
  /** Facts an act makes no longer true (a deadline once the bill is decided): the closing line after an act is worded without them. */
  actEnds?: string[];
  /** Reply moves that may be offered again after an asker move: { askerMove: [replyMoves] }. */
  repeatable?: Record<string, string[]>;
  /** When an exchange resolves the purpose may go on instead of closing: played once. */
  continue?: { on: string; asker: string; replies: string[] }[];
  /** Where the player does the asking: how the one asked answers, and how the player asks again. */
  asks?: {
    /** The answer of one already for it, of one a favor would carry, of one against. */
    yes: string;
    carried: string;
    no: string;
    /** The answers to a second ask that carries them, best first. */
    relent: string[];
    /** The player's line after a yes. */
    thanks: string;
    /** The one asked's last word after the player thanks them for a yes, where the purpose has one. */
    thanked?: string;
    /**
     * The player's second ask after a "not yet" or a no, and what it weighs;
     * `secondAsk` marks one offered only when the player asks again after a
     * not yet (Words lead, Nov 15: deferring to them keeps the ask open).
     */
    again: { move: string; carries: AskCarries; secondAsk?: boolean }[];
    /**
     * The answer of one whose price is taken up (`carries: "price"`), and of
     * one asked only to stay out of the room who agrees (`carries:
     * "absence"`). Each is offered only where the record holds the act that
     * pays it (brief O; owner, Nov 14: only what the game can do).
     */
    paid?: string;
    absent?: string;
    /**
     * A middle exchange about the one asked's own matter (Words lead, Nov 14,
     * rulings 62 and 63: a scene has a middle, and one button is not a
     * choice): offered beside the thanks or the second ask, the player asks
     * after them (`ask`), they say what the player did not know (`tell`),
     * and the player chooses among the `then` replies, which end differently.
     */
    middle?: {
      ask: string;
      tell: string;
      then: { move: string; carries: AskCarries }[];
    };
    /**
     * One the player has never met, who would say yes, asks the player one
     * thing first (Words lead, Nov 14, brief J batch 2: a stranger's yes in
     * one line is thin): their question (`tell`), the player's answers
     * (`then`), and each answer's yes or no. `hedged` weighs the answer
     * with the player's stance left unsaid (`AskStanding.hedged`).
     */
    first?: {
      tell: string;
      then: { move: string; carries: "lean" | "hedged" }[];
    };
    /**
     * A second turn after a second ask and its answer (Words lead, Nov 14:
     * a scene is a tree, two turns past the ask on at least two branches),
     * keyed by the second ask's move: the player's replies to that answer,
     * offered only when two or more can be worded.
     */
    after?: Record<
      string,
      { move: string; carries: "favor" | "lean" | "none" }[]
    >;
  };
}

interface Arcs {
  parameters: {
    rounds: { value: number };
  };
  purposes: Record<string, PurposeArc>;
  /** One generic arc per situation key, for a type with no purpose. */
  keys?: Record<string, PurposeArc>;
  lie?: {
    caught: { move: string; requiresFacts: string[]; replies: string[] };
    believed: string[];
    afterCaught: Record<string, string[]>;
  };
  outcomes: Record<"resolved" | "refused" | "open", string[]> &
    Record<string, unknown>;
  follow: Record<string, string | string[]>;
  again: Record<string, string[]>;
  close: Record<"resolved" | "refused" | "open", string[]>;
}

const ARCS = arcsFile as unknown as Arcs;
const RULES = rulesFile as unknown as {
  terminalFollow: string[];
  tree: { maxReplies: { value: number }; maxNodes: { value: number } };
  bluntGreeting: { value: number };
};
export type Outcome = "resolved" | "refused" | "open";

/**
 * The families of a home conversation the engine answers by the arcs file's own
 * rows (`home` in purpose-arcs.json): what an answer to a reply on a day's own
 * subject leaves out of what its telling just said.
 */
const HOME = (
  arcsFile as unknown as {
    home: {
      dayBack: {
        omitsTold: { kinds: readonly string[]; figures: readonly string[] };
      };
      replyMoves: {
        default: string;
        answerable: readonly string[];
        notes: readonly string[];
      } & Readonly<Record<string, unknown>>;
      standsTold: readonly string[];
      giveBack: {
        kinds: readonly string[];
        answers: Readonly<Record<string, unknown>>;
        plain: Readonly<Record<string, unknown>>;
        covers: Readonly<Record<string, unknown>>;
      };
      news: {
        backSubject: string;
        standSubject: string;
        sides: readonly string[];
        tellsStand: readonly string[];
      };
      ownView: {
        why: string;
        takes: readonly string[];
        backSubject: string;
        takeSubject: string;
        takeCarries: readonly string[];
      };
    };
  }
).home;

/** One line of a composed scene, with the features the grading bench records. */
export interface SceneTalkLine {
  /** Its number in the scene, unique within it, from 1. */
  n: number;
  step: SceneTalkStep;
  role: "narrator" | "asker" | "asked";
  speakerId?: PersonId;
  speaker: string;
  text: string;
  move: string;
  register: "scene-talk";
  bearing?: string;
  /** The situation's key (vote-wanted, favor-asked, ...). */
  key: string;
  purpose: string;
  /** The purpose this one is a variant of, when it is one (arc-variant.ts). */
  family?: string;
  /** How deep in the exchange it is (0 for the setup and the open). */
  round: number;
  /** On the branch the page follows first, the reply the player's traits lean toward. */
  chosen?: boolean;
  /** A line the player's character says without a choice. */
  auto?: boolean;
  /** The previous asker or asked move it answers. */
  after?: string;
  outcome?: Outcome;
  /** The bank part that said it. */
  parts: string[];
  slotRecordIds: string[];
  /** For a reply drawn from the player's own life, what it draws on ("Out of work"). */
  tag?: string;
  /** The English engine says the line asks a question, so it wants an answer. */
  asks: boolean;
  /** The English engine says the line hands the floor over ("Go ahead."). */
  invites: boolean;
  /** Why the English engine placed this wording here (dev mode's "why this reply"). */
  placed?: Placed;
}

export interface SceneTalkRound {
  round: number;
  replies: SceneTalkLine[];
  chosen: SceneTalkLine;
  /** The asker's answer to the chosen reply. */
  answer?: SceneTalkLine;
}

/** What follows a reply: the asker's lines, then either more replies or an end. */
export interface TreeNode {
  /** The asker's answer and any auto-replies with their answers, in order. */
  lines: SceneTalkLine[];
  replies: TreeReply[];
  /**
   * After a lie, both outcomes as separate nodes: "if {name} knows" (the staging
   * holds the fact `knows-truth` with its source) and "if not".
   */
  branches?: { label: string; knows: boolean; node: TreeNode }[];
  end?: {
    outcome: Outcome;
    close?: SceneTalkLine;
    /** The named ending this path reaches, and the record the world would keep. */
    ending?: {
      id: string;
      label: string;
      keeps: string;
      firmness?: string;
      settles?: "help" | "decline";
    };
  };
}

/**
 * The node a reply leads to as play reaches it. After a lie the tree holds
 * both outcomes as branches; the one the staged records give is the one
 * played: "if {name} knows" when the staging holds what catches the lie
 * (that branch exists only then), otherwise "if not" (scene-talk.ts
 * lieBranches, the same choice the trait-led path takes).
 */
export function playedNode(node: TreeNode): TreeNode {
  const branches = node.branches;
  if (!branches?.length) return node;
  const branch = branches.find((row) => row.knows) ?? branches[zero]!;
  return {
    ...branch.node,
    lines: [...node.lines, ...branch.node.lines],
  };
}

export interface TreeReply {
  line: SceneTalkLine;
  /** Null where the tree is cut at its node bound. */
  next: TreeNode | null;
}

export interface SceneTalk {
  typeKey: string;
  purpose: string;
  /** The purpose this one is a variant of, when it is one (arc-variant.ts). */
  family?: string;
  askerId: PersonId;
  askedId: PersonId;
  narration: SceneTalkLine[];
  open?: SceneTalkLine;
  /** The player's character answering the open before the statement. */
  intro: SceneTalkLine[];
  state: SceneTalkLine;
  /** The whole scene: from the statement (and its auto-replies), every reply's branch. */
  tree: TreeNode;
  /** The branch the player's traits lean toward, round by round. */
  rounds: SceneTalkRound[];
  close?: SceneTalkLine;
  outcome: Outcome;
  /** The trait-led path in the order shown (the flat view the bench grades). */
  lines: SceneTalkLine[];
  /** How many nodes the tree holds. */
  nodes: number;
  /** The endings the tree reaches. */
  endings: Outcome[];
  /** Player turns on the longest path. */
  depth: number;
  /** Pieces the bank lacks for a node: purpose, step, move and what it answers. */
  gaps: string[];
  /** How many end nodes reach each named ending. */
  endingCounts: Record<string, number>;
}

/** The parts of a catalog situation type a scene with a purpose reads. */
export interface PurposeType {
  key: string;
  purpose?: string;
  /**
   * Set when `purpose` is one of a family's variants (arc-variant.ts): the
   * family's own purpose, whose bank pieces serve the variant where it has none.
   */
  family?: string;
  asker?: string;
  asked?: string;
  stakes?: readonly string[];
  tag?: { key: string; endpoint?: string };
  /**
   * The player does the asking: the purpose's asker lines are the player's,
   * and the one asked answers from where they stand (`SceneTalkVoice.standing`).
   */
  playerAsks?: boolean;
}

/** Where the one the player asks stands before they answer. */
export interface AskStanding {
  /** Their position today: above zero for it. */
  lean: number;
  /** What a yes given as a favor to the player adds at the roll. */
  favor: number;
  /** They ask the player one thing before they answer (`asks.first`). */
  asksFirst?: boolean;
  /** They would say no but no reason of theirs has a line: they stall first, then say the answer is given. */
  noReason?: boolean;
  /** Their position were the player to leave their own stance unsaid. */
  hedged?: number;
  /**
   * Where they would stand once their price is paid (legislature `askPrice`:
   * the player's vote on their own bill, or half a section), when the record
   * holds a price; absent, no price is offered.
   */
  price?: number;
  /** Whether a favor carries them at least to staying out of the room (legislature `absenceCarries`). */
  absence?: boolean;
}

/** What a second ask of the one asked weighs. */
/**
 * What a second ask weighs. `price-refused` is the player turning down a
 * price the one asked named: offered only where a price is on the record,
 * and it never carries them.
 */
export type AskCarries =
  "favor" | "lean" | "none" | "price" | "price-refused" | "absence";

export interface SceneTalkCast {
  /**
   * The record that caused the scene. Two scenes of one kind between the same
   * two people are told apart by it: their lines are picked on it, so a second
   * cause never repeats the first's words.
   */
  causeId?: string;
  askerId: PersonId;
  /** The player's seat: whose replies are offered. */
  askedId: PersonId;
  others?: readonly PersonId[];
}

export interface SceneTalkVoice {
  /** Trait levels laid over the asker (a grading profile) and over the asked. */
  askerTraits?: Readonly<Record<string, number>>;
  askedTraits?: Readonly<Record<string, number>>;
  /** Where the player asks: where the one asked stands, which their answers read. */
  standing?: AskStanding;
}

/** What a caller may ask of a composed scene. */
export interface SceneTalkOptions {
  /**
   * How often each setup, open, statement and close piece has been used on
   * the page so far: the least used fitting piece is said, so the structure
   * does not repeat.
   */
  usage?: ReadonlyMap<string, number>;
  /**
   * With `usage`, a setup, open or statement piece another scene already used
   * is never said again: if no unused piece fits, the scene is skipped and the
   * missing piece is the reason (batch 15: no two scenes share a line).
   */
  strict?: boolean;
  /**
   * Pieces the reader has already seen (earlier review pages): a piece not in
   * it is said whenever one fits, so every page reads new.
   */
  shown?: ReadonlySet<string>;
  /** With `shown`, a seen piece is never said: a review page is all new. */
  freshOnly?: boolean;
  /**
   * Grading only: compose from the parts held until the owner grades them,
   * as the review page and the tests do. Play never sets it, so a scene whose
   * only words are held stays out of play.
   */
  includeHeld?: boolean;
  /** The "no" verdicts of the reply rule to read instead of the file's (tests). */
  replyFollows?: ReplyFollowsTable;
  /**
   * The screen has already told the setting (the filing counter narrates the
   * clerk and the office as the player walks in): the scene says no
   * narration of its own and is not skipped for want of one.
   */
  setupTold?: boolean;
}

export type SceneTalkResult =
  { kind: "composed"; talk: SceneTalk } | { kind: "skipped"; reason: string };

const outcomeOf = (move: string): Outcome =>
  (["resolved", "refused", "open"] as const).find((name) =>
    (ARCS.outcomes[name] as string[]).includes(move),
  ) ?? "open";

type FitUse = SceneMove;

/** How closely a line's piece was written to answer this reply: 2 for that exact piece, 1 for its move, 0 for neither. */
function linkedTo(line: SceneTalkLine, reply: SceneTalkLine): number {
  return pieceAnswers(
    line.parts[zero] ?? "",
    line.purpose,
    {
      pieceKey: reply.parts[zero] ?? "",
      move: reply.move,
    },
    line.family,
  );
}

/** The lines most closely written for this reply, or all of them when none is. */
function closest<T>(
  rows: T[],
  lineOf: (row: T) => SceneTalkLine,
  reply: SceneTalkLine,
): T[] {
  const best = Math.max(
    zero,
    ...rows.map((row) => linkedTo(lineOf(row), reply)),
  );
  return best
    ? rows.filter((row) => linkedTo(lineOf(row), reply) === best)
    : rows;
}

/**
 * How far a speaker's traits lean toward saying a move: its act kinds in the
 * shared decision table (`scene-talk.move`), scored by the trait engine.
 */
function leanOf(
  core: Pick<CoreState, "data">,
  move: string,
  traits: Readonly<Record<string, number>>,
): number {
  return traitLean(core, { traits }, decisionKinds("scene-talk.move", move));
}

/** The candidate answer moves for a reply move; a string value means "same as that move". */
function candidatesFor(arc: PurposeArc, move: string): string[] {
  const own = arc.follow;
  const table = (name: string) => own?.[name] ?? ARCS.follow[name];
  let at: string | string[] | undefined = table(move);
  for (let hops = zero; typeof at === "string" && hops < four; hops += one)
    at = table(at);
  return Array.isArray(at) ? at : [];
}

/**
 * The rows in the order a speaker's traits lean toward saying their moves,
 * the most first; a tie goes to the stable hash of the row's key. Nothing is
 * rolled. Every pick in the exchange (the asker's answer, an auto-reply, the
 * reply the page follows first) is this one ordering.
 */
function byLean<T>(
  core: Pick<CoreState, "data">,
  rows: readonly T[],
  moveOf: (row: T) => string,
  traits: Readonly<Record<string, number>>,
  keyOf: (row: T) => string,
): T[] {
  return [...rows].sort(
    (a, b) =>
      leanOf(core, moveOf(b), traits) - leanOf(core, moveOf(a), traits) ||
      stableHash(keyOf(a)).localeCompare(stableHash(keyOf(b))),
  );
}

/**
 * The follow step: the other person's answer to a line. Each candidate move
 * is worded by the caller's hook (the scene bank's `wordSceneMove` for a
 * scene, the mined bank's composed line for a home talk), and the one the
 * speaker's traits lean toward most is the answer, a tie to the stable hash
 * of its key. Nothing is rolled. Null where no candidate can be worded.
 */
export function followStep<L>(
  core: Pick<CoreState, "data">,
  traits: Readonly<Record<string, number>>,
  candidates: readonly string[],
  word: (candidate: string) => L | null,
  keyOf: (candidate: string) => string,
): { candidate: string; line: L } | null {
  const worded = candidates.flatMap((candidate) => {
    const line = word(candidate);
    return line ? [{ candidate, line }] : [];
  });
  const [best] = byLean(
    core,
    worded,
    (row) => row.candidate,
    traits,
    (row) => keyOf(row.candidate),
  );
  return best ?? null;
}

/**
 * A home talk's answer, through the same follow step a scene's answer goes
 * through: the one candidate the family names (its subject), worded by the
 * composed-line hook from the mined bank at the stage the family chose.
 */
function homeLine(
  core: Readonly<CoreState>,
  input: {
    subject: string;
    stage: string;
    speakerId: PersonId;
    facts: Readonly<Record<string, Fact>>;
    momentKey: string;
    saidParts: readonly string[];
  },
): Said | null {
  const step = followStep(
    core,
    core.people.get(input.speakerId)?.traits ?? {},
    [input.subject],
    () =>
      composedLine(
        core,
        input.speakerId,
        input.subject,
        input.facts,
        input.stage,
        input.momentKey,
        input.saidParts,
      ),
    (candidate) => `${input.momentKey}:${candidate}`,
  );
  return step?.line ?? null;
}

/**
 * A line a home talk says, composed from the mined bank and worded through the
 * follow step: every home talk line is the engine's, by the same step a
 * scene's answer is. The caller says who speaks, under which subject and at
 * which stage, from what facts.
 */
export function composedHomeLine(
  core: Readonly<CoreState>,
  speakerId: PersonId,
  subject: string,
  facts: Readonly<Record<string, Fact>>,
  stage: string,
  momentKey: string,
  saidParts: readonly string[] = [],
): Said | null {
  return homeLine(core, {
    subject,
    stage,
    speakerId,
    facts,
    momentKey,
    saidParts,
  });
}

/**
 * How a person takes in what the player answered in an everyday talk, by this
 * engine's own rule (owner, Oct 29: one engine for every line, and calibration
 * reaches all of it): the `talk` purpose's answer moves for the move the
 * answer made, each worded from the scene bank fitted to it (`after` names
 * the move, `afterPiece` the talk's subject and choice), the one the
 * speaker's traits lean to most, a tie by the stable hash. Null where no
 * answer move has words. `closes` when the answer ends the talk.
 */
export function answerInTalk(
  core: Readonly<CoreState>,
  input: {
    /** The move the player's answer made (conversation-rules.json `replyMoves`). */
    replyMove: string;
    /** The talk's subject kind and the choice: "quiet:talk". */
    answered: string;
    /** The subject kind, for pieces written for one subject. */
    key: string;
    speakerId: PersonId;
    momentKey: string;
    /** Pieces the listener already heard today (the telling's "said today"): not said again. */
    heard?: ReadonlySet<string>;
  },
): { move: string; text: string; pieceKey: string; closes: boolean } | null {
  const arc = ARCS.purposes.talk;
  if (!arc) return null;
  const traits = core.people.get(input.speakerId)?.traits ?? {};
  const best = followStep(
    core,
    traits,
    candidatesFor(arc, input.replyMove),
    (candidate) => {
      const line = wordSceneMove({
        move: {
          step: "follow",
          move: candidate,
          role: "asker",
          purpose: "talk",
          key: input.key,
          after: input.replyMove,
          afterPiece: input.answered,
        },
        facts: {},
        seed: core.seed,
        speakerId: input.speakerId,
        traits,
        momentKey: `${input.momentKey}:${candidate}`,
        said: new Set(input.heard ?? []),
      });
      return line && !("unused" in line) ? line : null;
    },
    (candidate) => `${input.momentKey}:${candidate}`,
  );
  if (!best) return null;
  return {
    move: best.candidate,
    text: best.line.text,
    pieceKey: best.line.pieceKey,
    closes: !!arc.closes?.includes(input.replyMove),
  };
}

/** Whether the answer back to a reply on this kind of day subject leaves out the figures its telling just said. */
export function answerLeavesOutTold(kind: string): boolean {
  return HOME.dayBack.omitsTold.kinds.includes(kind);
}

/**
 * The facts an answer back is composed from: each figure the telling just said
 * (`told`, the facts its wording used) is left out of them and marked
 * `told-<fact>`, so the answer says what comes next, never the same figure
 * again ("I owed about $1,000." "...about $1,000 still doesn't seem real."),
 * and can still lean on it ("I go in soon.") without saying it.
 */
export function factsWithoutTold(
  kind: string,
  told: ReadonlySet<string>,
  facts: Readonly<Record<string, Fact>>,
): Record<string, Fact> {
  const omits = answerLeavesOutTold(kind);
  return Object.fromEntries(
    Object.entries(facts).map(([key, fact]) =>
      omits && told.has(key) && HOME.dayBack.omitsTold.figures.includes(key)
        ? [`told-${key}`, fact]
        : [key, fact],
    ),
  );
}

/**
 * The other person's answer to the player's reply on a day's own subject: the
 * words composed under `<kind>-back` by the reply's move, from the facts the
 * telling left them (`factsWithoutTold`; `shape` adds what the talk alone
 * knows, such as whether the speaker already named the player). Null where no
 * wording fits.
 */
export function answerBack(
  core: Readonly<CoreState>,
  input: {
    kind: string;
    replyMove: string;
    speakerId: PersonId;
    momentKey: string;
    /** The facts the day subject was told from. */
    facts: Readonly<Record<string, Fact>>;
    /** The facts the telling just said, which the answer leaves out. */
    told: ReadonlySet<string>;
    /** The talk's own additions to the facts, applied after the figures are left out. */
    shape: (facts: Record<string, Fact>) => Record<string, Fact>;
    /** The parts this speaker already said in the talk. */
    saidParts: readonly string[];
  },
): Said | null {
  return homeLine(core, {
    subject: `${input.kind}-back`,
    stage: input.replyMove,
    speakerId: input.speakerId,
    facts: input.shape(factsWithoutTold(input.kind, input.told, input.facts)),
    momentKey: input.momentKey,
    saidParts: input.saidParts,
  });
}

/** The replies to where someone stands that the talk answers: asking why, and agreeing or disagreeing. */
export function ownViewReplies(): readonly string[] {
  return [HOME.ownView.why, ...HOME.ownView.takes];
}

/** Whether a reply to where someone stands says where the player stands (agree or disagree). */
export function ownViewTakes(replyMove: string): boolean {
  return HOME.ownView.takes.includes(replyMove);
}

/** Whether a reply to where someone stands asks them why. */
export function ownViewWhy(replyMove: string): boolean {
  return replyMove === HOME.ownView.why;
}

/**
 * The other person's answer to the player's reply on where they stand: asked
 * why, they answer from the reason on record (their work, or money in their
 * town), composed under `backSubject`; agreed or disagreed with, they answer
 * from the same reason under `takeSubject` by the reply's move, carrying the
 * facts the talk already holds (`takeCarries`: a story that already says how
 * it came out leaves no reply that waits to see). Null for any other reply
 * and where no wording fits.
 */
export function answerOwnView(
  core: Readonly<CoreState>,
  input: {
    replyMove: string;
    speakerId: PersonId;
    momentKey: string;
    facts: Readonly<Record<string, Fact>>;
    /** The facts the talk holds that a take carries on (the story's own). */
    held: Readonly<Record<string, Fact>> | undefined;
    /** The talk's own additions to the facts (whether the speaker already named the player). */
    shape: (facts: Record<string, Fact>) => Record<string, Fact>;
    saidParts: readonly string[];
  },
): { subject: string; line: Said } | null {
  const { why, takes, backSubject, takeSubject, takeCarries } = HOME.ownView;
  const asked = input.replyMove === why;
  if (!asked && !takes.includes(input.replyMove)) return null;
  const subject = asked ? backSubject : takeSubject;
  const carried = asked
    ? {}
    : Object.fromEntries(
        takeCarries.flatMap((name) =>
          input.held?.[name] ? [[name, input.held[name]]] : [],
        ),
      );
  const line = homeLine(core, {
    subject,
    stage: asked ? "default" : input.replyMove,
    speakerId: input.speakerId,
    facts: { ...input.shape({ ...input.facts }), ...carried },
    momentKey: input.momentKey,
    saidParts: input.saidParts,
  });
  return line ? { subject, line } : null;
}

/** The subject the other person's answer to a reply on news is composed under. */
export function newsBackSubject(): string {
  return HOME.news.backSubject;
}

/** Whether a reply on news takes a side on the story's question (for or against). */
export function newsTakesSide(replyMove: string): boolean {
  return HOME.news.sides.includes(replyMove);
}

/** Whether a reply to a printed story the neighbor asked about is followed by where the neighbor stands. */
export function newsAnswerTellsStand(replyMove: string): boolean {
  return HOME.news.tellsStand.includes(replyMove);
}

/**
 * The marks an answer on news is composed from: what the reply said (a "who's
 * behind it?" asked as a why is answered as a who), whether the teller already
 * said the story's question (the answer then says "it" and gives what else the
 * story holds), and a stand either way for the answers that fit both.
 */
export function newsSaidFacts(input: {
  replyMove: string;
  askedWho: boolean;
  questionTold: boolean;
  recordId: string;
}): Record<string, Fact> {
  const mark = (): Fact => ({ text: "yes", sourceRecordIds: [input.recordId] });
  return {
    [`said-${input.askedWho ? "who" : input.replyMove}`]: mark(),
    [input.questionTold ? "about-said" : "about-unsaid"]: mark(),
    ...(newsTakesSide(input.replyMove) ? { "said-side": mark() } : {}),
  };
}

/**
 * A line the other person says on news, composed from the facts the talk
 * gives under the arcs file's own subject for it: `back` (their answer to the
 * player's reply, or what the story was about) or `stand` (where they stand,
 * said when the player had not seen it). Null where no wording fits.
 */
export function newsLine(
  core: Readonly<CoreState>,
  input: {
    which: "back" | "stand";
    speakerId: PersonId;
    facts: Readonly<Record<string, Fact>>;
    momentKey: string;
    saidParts: readonly string[];
  },
): Said | null {
  return homeLine(core, {
    subject:
      input.which === "back" ? HOME.news.backSubject : HOME.news.standSubject,
    stage: "default",
    speakerId: input.speakerId,
    facts: input.facts,
    momentKey: input.momentKey,
    saidParts: input.saidParts,
  });
}

/** The row of a give-back table for an asked kind (the table's own `about` note is not a kind). */
function giveRow<T>(
  table: Readonly<Record<string, unknown>>,
  kind: string,
): T | undefined {
  return kind === "about" ? undefined : (table[kind] as T | undefined);
}

/** Whether the asker of this small question gives their own answer back after the player's. */
export function asksGiveBack(kind: string): boolean {
  return HOME.giveBack.kinds.includes(kind);
}

/** The stage of the asker's give-back for one of the player's moves, where the give-back answers that move as well as a plain answer. */
export function giveBackStage(kind: string, move: string): string | undefined {
  return giveRow<Record<string, string>>(HOME.giveBack.answers, kind)?.[move];
}

/** The moves that are the plain answer to this question, where it has no move named plain. */
export function plainAnswersOf(kind: string): readonly string[] {
  const row = giveRow<string[]>(HOME.giveBack.plain, kind);
  return Array.isArray(row) ? row : [];
}

/** Whether the asker's give-back already told a subject of this raised kind. */
export function giveBackCovers(kind: string, raisedKind: string): boolean {
  const row = giveRow<string[]>(HOME.giveBack.covers, kind);
  return Array.isArray(row) && row.includes(raisedKind);
}

/**
 * The asker's own answer, given back after the player's: composed under
 * `<kind>-give` at the stage the give-back chose, from the facts their own
 * record gave. Null where no wording fits.
 */
export function giveBackLine(
  core: Readonly<CoreState>,
  input: {
    kind: string;
    stage: string;
    speakerId: PersonId;
    facts: Readonly<Record<string, Fact>>;
    momentKey: string;
    saidParts: readonly string[];
  },
): Said | null {
  return homeLine(core, {
    subject: `${input.kind}-give`,
    stage: input.stage,
    speakerId: input.speakerId,
    facts: input.facts,
    momentKey: input.momentKey,
    saidParts: input.saidParts,
  });
}

/**
 * The move the player's answer to a line of this kind makes: "note" for one
 * that only takes the line in ("Oh, okay."), which the talk does not answer;
 * otherwise the move the arcs file's `home.replyMoves` names for the kind and
 * the choice, or a plain answer.
 */
export function replyMoveOf(kind: string, choice: string): string {
  const moves = HOME.replyMoves;
  if (
    moves.notes.some((note) => choice === note || choice.startsWith(`${note}:`))
  )
    return "note";
  const own = moves[kind.replace(/-new$/, "")] as
    Readonly<Record<string, string>> | undefined;
  return own?.[choice] ?? moves.default;
}

/** Whether a talk answers a reply that makes this move, so a reply that ends on a question may be offered. */
export function replyMoveAnswerable(move: string): boolean {
  return HOME.replyMoves.answerable.includes(move);
}

/**
 * How far the player's replies reach: above zero for someone who carries a
 * talk on, below it for someone who keeps it short. The trait engine decides
 * it (`conversation.reply-reach`); the calibration table reaches each reply's
 * wording through its voice, so the same traits are not counted twice. The
 * interview sitting orders its answers by it too.
 */
export function replyReach(
  core: Readonly<CoreState>,
  playerId: PersonId,
): number {
  const player = core.people.get(playerId);
  return player
    ? decisionLean(
        core,
        player,
        "conversation.reply-reach",
        "carry-on",
        "keep-short",
      )
    : zero;
}

/**
 * Whether a reply answers the line before it: after a question put to the
 * player, and after news told with the teller's stand, the replies are the
 * ones the rules name for the line's move (`answersTo`), never a bare "Wow."
 * or "Really?" (owner, Nov 12: "the just non-replies"). Where the rules name
 * none for the move, any reply may answer.
 */
export function replyAnswersAsk(input: {
  putQuestion: boolean;
  askedMove: string | undefined;
  fitting: readonly string[] | undefined;
  choiceKey: string;
}): boolean {
  const stand = HOME.standsTold.includes(input.askedMove ?? "");
  return !(
    (input.putQuestion || stand) &&
    input.fitting &&
    !input.fitting.includes(input.choiceKey)
  );
}

/**
 * Whether a worded reply is offered. A reply that ends on a question is
 * offered only where the other person can answer it (`answerable`: it raises
 * a subject they have, asks them to tell more, or makes a move the talk
 * answers), and no reply to a question put to the player opens with a
 * question of its own (owner, Oct 29).
 */
export function replyOffered(input: {
  asksLast: boolean;
  answerable: boolean;
  putQuestion: boolean;
  opensAsking: boolean;
}): boolean {
  return !(
    (input.asksLast && !input.answerable) ||
    (input.putQuestion && input.opensAsking)
  );
}

/**
 * Whether a reply has something to say. A question whose answer the talk
 * already said, by either of them, is not offered ("McKenzie's Kitchen for me,
 * 18 years now." then "How long have you worked there?"); nor is a question
 * the other person has no answer to on record (a pressed question is always
 * answered); turning the question back asks it and says nothing more; and a
 * move that turns the question back says nothing without its subject.
 */
export function replyHasMatter(input: {
  /** What the reply raises: nothing, the question just asked (turned back), or another subject. */
  raised: "none" | "turned-back" | "other";
  /** The raised subject's answer is already in an earlier line of the talk. */
  alreadyAnswered: boolean;
  /** The other person has an answer to the raised subject on record. */
  otherHasAnswer: boolean;
  /** The reply's own wording asks a question. */
  asks: boolean;
  /** The reply's move is one that turns the question back. */
  raisesAsMove: boolean;
}): boolean {
  if (input.raised !== "none" && input.alreadyAnswered) return false;
  if (input.raised === "other" && !input.otherHasAnswer) return false;
  if (input.raised === "turned-back" && !input.asks) return false;
  if (input.raised === "none" && input.raisesAsMove && input.asks) return false;
  return true;
}

/**
 * The subject a reply carries the talk on to, if its move may: a reply's
 * second move follows from its first (owner, batch 6): turning the same
 * question back ("I'm from here. And you?"), or asking about their work after
 * naming yours, never an unrelated subject tacked on. The question just asked
 * may be turned back; any other subject must be one the talk has not used.
 */
export function replyTarget<S extends { id: string; kind: string }>(input: {
  raises: string;
  follows: readonly string[];
  last: S;
  unused: readonly S[];
  taken: ReadonlySet<string>;
}): S | undefined {
  if (!input.follows.includes(input.raises)) return undefined;
  if (input.raises === input.last.kind) return input.last;
  return input.unused.find(
    (row) => row.kind === input.raises && !input.taken.has(row.id),
  );
}

/**
 * Whether the bank's reply for a move may be offered at all: what the player
 * already told is not offered again, and asking for more ("What happened?") is
 * offered only when the other person has it on record and in words (a question
 * nobody can answer is not offered).
 */
export function replyAvailable(input: {
  choiceKey: string;
  /** The reply tells the player's own subject, which the talk already has. */
  alreadyTold: boolean;
  /** What the other person tells when this reply asks for more. */
  tellKind: string | undefined;
  tellable: (kind: string) => boolean;
}): boolean {
  if (input.choiceKey === "own" && input.alreadyTold) return false;
  return !(input.tellKind && !input.tellable(input.tellKind));
}

/**
 * The replies to try for a line, in order: each move said with the subject it
 * carries the talk on to (the first pass only), then said plainly. The caller
 * words each; a subject it takes is not offered again, so the target is read
 * as each reply is reached.
 */
export function* replyCandidates<G extends { raises?: string }, S>(
  groups: Iterable<readonly [string, G]>,
  again: string,
  available: (choiceKey: string) => boolean,
  target: (raises: string) => S | undefined,
): Generator<{ choiceKey: string; group: G; subject: S | undefined }> {
  for (const [choiceKey, group] of groups) {
    if (!available(choiceKey)) continue;
    const subject = group.raises ? target(group.raises) : undefined;
    if (subject && !again) yield { choiceKey, group, subject };
    yield { choiceKey, group, subject: undefined };
  }
}

/**
 * Whether the scales show: only when the last line is the other person's
 * question about the player's own record, and they do not already hold the
 * true value (`knowsTruth`, read only when the rest holds). Otherwise nothing
 * about the player's record is in play and the scales are dimmed.
 */
export function scalesShow(input: {
  ownRecordAsked: boolean;
  askedByOther: boolean;
  knowsTruth: () => boolean;
}): boolean {
  return input.ownRecordAsked && input.askedByOther && !input.knowsTruth();
}

/**
 * The scales' set: every true reply made false, each keeping its own move
 * (what it raises or turns back) and swapping the answer for one of the false
 * answers, taken in turn so the set holds them all. A false reply that would
 * read the same as another already in the set is left out; with no true reply
 * the set is one plain false answer.
 */
export function scalesSet<C, B>(
  replies: readonly C[],
  falseAnswers: readonly B[],
  textOf: (answer: B, reply: C | undefined) => string,
): { reply: C | undefined; answer: B }[] {
  const out: { reply: C | undefined; answer: B }[] = [];
  const seen = new Set<string>();
  const sources: readonly (C | undefined)[] = replies.length
    ? replies
    : [undefined];
  sources.forEach((reply, index) => {
    for (let step = zero; step < falseAnswers.length; step += one) {
      const answer = falseAnswers[(index + step) % falseAnswers.length]!;
      const text = textOf(answer, reply);
      if (seen.has(text)) continue;
      seen.add(text);
      out.push({ reply, answer });
      break;
    }
  });
  return out;
}

/**
 * The subject a raised line is composed under, when the engine composes it:
 * the address's point under its own kind; a printed story, told by its reader
 * (what it is about and their stand), under `news-ask` unless it is first
 * asked about ("Did you read about it?") by the outlet's medium; and any
 * subject with a `<kind>-say` sentence in the bank (where they stand).
 * Otherwise the line is worded plain from the bank (`null`).
 */
export function raiseComposedSubject(input: {
  kind: string;
  pointKind: string;
  hasStory: boolean;
  asksFirst: boolean;
  hasSayBank: (subject: string) => boolean;
}): string | null {
  if (input.kind === input.pointKind) return input.pointKind;
  if (input.kind === "news" && input.hasStory && !input.asksFirst)
    return "news-ask";
  return input.hasSayBank(`${input.kind}-say`) ? `${input.kind}-say` : null;
}

/**
 * What a raised line is composed from, marked for what the talk has already
 * done: a question the talk already named is said again as "it" (a frame that
 * puts the name after "is" or "than" plays only as its first naming), and
 * where they raised the talk's subject themselves a line that invites the
 * player to ask them is not said (Words lead).
 */
export function raiseFacts(
  facts: Readonly<Record<string, Fact>>,
  input: { named: boolean; theyOpened: boolean; speakerId: PersonId },
): Record<string, Fact> {
  return {
    ...facts,
    ...(input.named && facts.about
      ? {
          "about-named": {
            text: "yes",
            sourceRecordIds: facts.about.sourceRecordIds,
          },
        }
      : {}),
    ...(input.theyOpened
      ? { "they-opened": { text: "yes", sourceRecordIds: [input.speakerId] } }
      : {}),
  };
}

/**
 * Whether the other person says goodbye when a talk ends. Not if they just
 * said one. Nobody says goodbye right after their own question was answered
 * ("Do you remember the school?" "Yes." "Okay, bye." is not a talk): the
 * answer is where it stops, or the asker has gone on to something else.
 * People who live together close a talk as housemates do, on the last line
 * that says something, and so does a talk about hard news of their own life
 * (a job lost, a death): never "Come back soon." to someone who just lost
 * their home. A call is the exception to all three: it is closed by the
 * person called, with the phone's own goodbye, or it hangs.
 */
export function goodbyeSaid(input: {
  byPhone: boolean;
  lastWasGoodbye: boolean;
  /** Their last line asked a question, and the player's answer came after it. */
  theirQuestionAnswered: boolean;
  housemates: boolean;
  hardNews: boolean;
}): boolean {
  if (input.lastWasGoodbye) return false;
  if (!input.byPhone && input.theirQuestionAnswered) return false;
  if (input.housemates && !input.byPhone) return false;
  return !(input.hardNews && !input.byPhone);
}

/**
 * Whether the other person greets the player when a talk opens. People who
 * live together don't greet each other at home; a call is the exception, and
 * opens as a call even to someone in the player's own house: the person
 * answering says hello first (Words lead, Nov 14).
 */
export function greetsFirst(input: {
  housemates: boolean;
  byPhone: boolean;
}): boolean {
  return !input.housemates || input.byPhone;
}

/**
 * Whether a talk that opened has said nothing: hello and goodbye with nothing
 * between is not a talk (owner, Oct 24: "that should be going to the hi, have
 * a good day. That makes no sense."), and neither is a hard-news opener with
 * nothing after it. With nothing on record to say, nothing is said.
 */
export function talkSaidNothing(kinds: readonly string[]): boolean {
  return kinds.every((kind) => kind === "greet" || kind === "family-open");
}

/**
 * What the speaker calls the player in an answer, left out when an earlier
 * line of the same talk already said it (rule 105: a name once per talk), so
 * the answer picks a wording without it. `you` is what the speaker calls them.
 */
export function youUnlessSaid(input: {
  lines: readonly { speakerId: string; text: string }[];
  speakerId: string;
  you: Fact;
}): { you?: Fact } {
  const said = input.lines.some(
    (line) =>
      line.speakerId === input.speakerId &&
      new RegExp(`\\b${input.you.text}\\b`, "i").test(line.text),
  );
  return said ? {} : { you: input.you };
}

/**
 * The one rule for a name in a talk (rule 105): facts a line is composed
 * from, with the speaker's name for the player left out where the speaker
 * already said it earlier in this talk. Every composer that places the name
 * asks here, so no bank keeps its own count.
 */
export function nameOnceFacts(
  facts: Readonly<Record<string, Fact>>,
  input: {
    lines: readonly { speakerId: string; text: string }[];
    speakerId: string;
    you: Fact;
  },
): Record<string, Fact> {
  if (!facts.you || youUnlessSaid(input).you) return { ...facts };
  const rest = { ...facts };
  delete rest.you;
  return rest;
}

/**
 * Whether the talk already said what a question asks for: every fact the
 * question's subject holds is in an earlier line, by either speaker, with its
 * words said and its record cited. One reading of what was said, never a list
 * of question kinds.
 */
export function factsAlreadySaid(
  lines: readonly { text: string; sourceRecordIds: readonly string[] }[],
  asked: Readonly<Record<string, Fact>>,
): boolean {
  const facts = Object.values(asked);
  return (
    facts.length > zero &&
    facts.every((fact) =>
      lines.some(
        (line) =>
          line.text.includes(fact.text) &&
          fact.sourceRecordIds.some((id) => line.sourceRecordIds.includes(id)),
      ),
    )
  );
}

/** The facts the talk has not said yet: each one whose words and record an earlier line (either speaker) does not carry. */
export function factsNotYetSaid(
  lines: readonly { text: string; sourceRecordIds: readonly string[] }[],
  facts: Readonly<Record<string, Fact>>,
): Record<string, Fact> {
  return Object.fromEntries(
    Object.entries(facts).filter(
      ([, fact]) => !factsAlreadySaid(lines, { fact }),
    ),
  );
}

/**
 * The reply step: the replies a talk offers for the line before them. Each
 * candidate move, up to the limit, is worded by the caller's hook; a line
 * already offered or said on the path is not offered again, and a move the
 * bank cannot word is reported as a gap. Then one extra option drawn from the
 * player's own life (the hook's tagged wording) is added where a piece fits,
 * never in place of the usual replies.
 */
export function replyStep<L extends { parts: string[]; round: number }>(input: {
  moves: readonly string[];
  limit: number;
  word: (move: string, tagged: boolean) => L | null;
  seen: ReadonlySet<string>;
  round: number;
  onGap: (move: string) => void;
}): L[] {
  const offered = input.moves.slice(zero, input.limit).flatMap((move) => {
    const reply = input.word(move, false);
    if (!reply) {
      input.onGap(move);
      return [];
    }
    if (input.seen.has(reply.parts[zero] ?? "")) return [];
    reply.round = input.round;
    return [reply];
  });
  for (const move of input.moves) {
    if (offered.length >= input.limit + one) break;
    const extra = input.word(move, true);
    if (!extra || input.seen.has(extra.parts[zero] ?? "")) continue;
    extra.round = input.round;
    offered.push(extra);
    break;
  }
  return offered;
}

/**
 * What a reply is made of: a head with an optional tail. A home talk fills the
 * tail (the question the reply turns back, or the subject it raises); a scene
 * passes none, since its arcs have none. The head is the answer itself, or,
 * where the answer is a bare question turned back ("And you?") that is said
 * after the plain answer, the plain answer, with the question as the tail. A
 * reply that raises another subject says its line after the answer, unless
 * the answer already asks. Null where a subject to raise cannot be worded.
 */
export function shapeReply<L extends { asks: boolean }>(input: {
  answer: L;
  /** The answer is a bare question turned back, said after the plain answer. */
  afterPlain?: boolean;
  /** The plain answer that goes before it, if the bank has one that asks nothing. */
  plain?: L | null;
  /** The reply raises another subject: its line, or null when it cannot be worded. */
  raised?: { line: L | null };
}): { head: L; tail: L | null } | null {
  let head = input.answer;
  let tail: L | null = null;
  if (input.afterPlain && input.plain && !input.plain.asks) {
    head = input.plain;
    tail = input.answer;
  }
  if (input.raised) {
    if (!input.raised.line) return null;
    if (!input.answer.asks) tail = input.raised.line;
  }
  return { head, tail };
}

/** One reply a home talk may offer, as the menu reads it. */
export interface MenuRow {
  key: string;
  move: string;
  text: string;
  raises?: string;
  tail?: unknown;
  wording?: { facts: readonly string[] };
}

/**
 * The replies a home talk offers for the line before them, from every reply
 * the bank words: ranked by the player's traits (someone who carries talk on
 * sees the replies that raise or ask first, someone who keeps it short sees
 * plain answers and acknowledgments first), then the owner's grade of each
 * move after the other person's line; four of them, each a different move, a
 * second wording of a move offered never one of them (owner, Oct 27: "four
 * replies are four different answers"). Then, in order: one screen names a
 * record once (a reply that carries the talk on stays before one that only
 * answers); where someone stands is answered by agreeing, disagreeing or
 * asking why; and a reply that only takes the line in is not offered.
 */
export function shapeMenu<T extends MenuRow>(
  core: Readonly<CoreState>,
  playerId: PersonId,
  pool: readonly T[],
  input: {
    kind: string;
    previous?: string;
    table: CalibrationTable;
    namesOnceKinds: readonly string[] | undefined;
    facts: Readonly<Record<string, Fact>>;
  },
): T[] {
  const pair = (row: T) =>
    movePairFactor(
      input.previous,
      replyMoveOf(input.kind, row.move),
      input.table,
    );
  const reach = replyReach(core, playerId);
  const carries = (row: T) => !!row.raises || !!row.tail || asksQuestion(row);
  const brief = (row: T) => row.move.startsWith("ack:");
  const place = (row: T) =>
    reach >= zero
      ? carries(row)
        ? zero
        : brief(row)
          ? two
          : one
      : carries(row)
        ? two
        : brief(row)
          ? one
          : zero;
  const ranked = pool
    .map((row, at) => ({ row, at }))
    .sort(
      (a, b) =>
        pair(b.row) - pair(a.row) || place(a.row) - place(b.row) || a.at - b.at,
    )
    .map(({ row }) => row);
  const count = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;
  const moves = new Set<string>();
  let menu = ranked
    .filter((row) => {
      const move = row.move.startsWith("ack:") ? "ack" : row.move;
      if (moves.has(move)) return false;
      moves.add(move);
      return true;
    })
    .slice(zero, count);
  if (input.namesOnceKinds?.includes(input.kind)) {
    const named = new Set<string>();
    const kept = new Set<T>();
    for (const row of [
      ...menu.filter((choice) => choice.raises),
      ...menu.filter((choice) => !choice.raises),
    ]) {
      const said = (row.wording?.facts ?? [])
        .map((key) => input.facts[key]?.text)
        .filter((text): text is string => !!text);
      if (said.some((text) => named.has(text))) continue;
      for (const text of said) named.add(text);
      kept.add(row);
    }
    menu = menu.filter((row) => kept.has(row));
  }
  if (input.kind === "own-view")
    menu = menu.filter((row) => ownViewReplies().includes(row.move));
  return menu.filter((row) => replyMoveOf(input.kind, row.move) !== "note");
}

/** Where the exchange stands as a branch grows. */
interface Path {
  said: ReadonlySet<string>;
  round: number;
  askerMove: string;
  askerPiece?: string;
  led: boolean;
  id: string;
  continued: boolean;
  /** After a caught lie: the asker's answers come from the lie block. */
  caught?: boolean;
  /** Reply moves offered at earlier nodes on this path: not offered again. */
  offered: ReadonlySet<string>;
  /** Reply lines offered at earlier nodes on this path: never offered again. */
  offeredPieces: ReadonlySet<string>;
}

/**
 * The lines of a statement said as several moves, joined into one line of the
 * statement's move: their words in order, their parts and records together.
 */
function joinedStatement(
  lines: readonly (SceneTalkLine | null)[],
  move: string,
): SceneTalkLine | null {
  const said = lines.filter((line): line is SceneTalkLine => line !== null);
  const [first] = said;
  if (!first) return null;
  return {
    ...first,
    move,
    text: said.map((line) => line.text).join(" "),
    parts: said.flatMap((line) => line.parts),
    slotRecordIds: [...new Set(said.flatMap((line) => line.slotRecordIds))],
    asks: said.at(-one)!.asks,
    invites: said.at(-one)!.invites,
  };
}

/**
 * Composes one scene with a purpose. Returns `skipped` with the reason when a
 * required piece cannot be worded from the records given (never invented).
 */
export function composeSceneTalk(
  core: Readonly<CoreState>,
  director: Director | undefined,
  cast: SceneTalkCast,
  type: PurposeType,
  facts: Readonly<Record<string, Fact>>,
  voice: SceneTalkVoice = {},
  options: SceneTalkOptions = {},
): SceneTalkResult {
  void director;
  const key = type.tag?.key ?? type.key;
  // A type with no purpose plays its situation key's generic arc, with the
  // pieces tagged for that key and any purpose ("*"): the fallback, so any
  // situation the director fires has a coherent exchange.
  const purpose = type.purpose ?? "*";
  const fallback = !type.purpose;
  const arc = type.purpose
    ? (ARCS.purposes[type.purpose] ??
      (variantArc(type.purpose) as PurposeArc | undefined))
    : ARCS.keys?.[key];
  if (!arc)
    return {
      kind: "skipped",
      reason: `${type.key} has no ${fallback ? `generic arc for the key ${key}` : "purpose arc"}`,
    };
  const gapLabel = type.purpose ?? type.key;
  const asker = core.people.get(cast.askerId);
  const asked = core.people.get(cast.askedId);
  if (!asker || !asked)
    return {
      kind: "skipped",
      reason: "the asker or the asked is not a person",
    };
  const nameOf = (id: PersonId) => {
    const row = core.people.get(id);
    return row ? `${row.givenName} ${row.familyName}` : id;
  };
  const askerTraits = { ...asker.traits, ...(voice.askerTraits ?? {}) };
  const askedTraits = { ...asked.traits, ...(voice.askedTraits ?? {}) };
  // The scene's own key: its cause tells it from another of the same kind
  // between the same two people.
  const scene = `${type.key}:${cast.askerId}:${cast.askedId}${cast.causeId ? `:${cast.causeId}` : ""}`;
  const family = type.family;
  const base = { purpose, key, ...(family ? { family } : {}) };
  const gaps = new Set<string>();
  const gap = (step: string, move: string, after?: string) =>
    gaps.add(`${gapLabel}/${step}/${move}${after ? ` after ${after}` : ""}`);
  const maxRounds = ARCS.parameters.rounds.value;
  const maxReplies = RULES.tree.maxReplies.value;
  const maxNodes = RULES.tree.maxNodes.value;

  /** The pieces said as closes anywhere in this talk. */
  const closesSaid = new Set<string>();
  /** How many closes of each move this talk has said. */
  const closesByMove = new Map<string, number>();
  // What the talk has told so far: the scene's facts and the facts the lines
  // said on a path set for the rest of it (an answer sets what it told).
  const heardOn = new WeakMap<ReadonlySet<string>, typeof facts>();
  const heard = (said: ReadonlySet<string>): typeof facts => {
    let found = heardOn.get(said);
    if (!found) {
      const set = factsSetBy(said, base);
      found = set.length
        ? {
            ...facts,
            ...Object.fromEntries(
              set.map((name) => [name, { text: "yes", sourceRecordIds: [] }]),
            ),
          }
        : facts;
      heardOn.set(said, found);
    }
    return found;
  };
  const render = (
    use: FitUse,
    speakerId: PersonId,
    traits: Readonly<Record<string, number>>,
    moment: string,
    said: ReadonlySet<string>,
    onlyTagged = false,
    given: typeof facts = facts,
  ): SceneTalkLine | null => {
    const known = given === facts ? heard(said) : given;
    // The English engine picks and words the piece; the director only says
    // which move this is, who says it and what it answers.
    // A talk does not close two branches on the same words while another close
    // fits: the closes already said anywhere in this talk are shown (the
    // English engine leaves a shown piece out while an unseen one fits).
    const closing = use.step === "close";
    const worded = wordSceneMove({
      move: use,
      facts: known,
      seed: core.seed,
      speakerId,
      traits,
      momentKey: `${scene}:${moment}`,
      said,
      tagged: onlyTagged,
      options: closing
        ? {
            ...options,
            shown: new Set([...(options?.shown ?? []), ...closesSaid]),
          }
        : options,
    });
    if (worded && "pieceKey" in worded && closing)
      closesSaid.add(worded.pieceKey);
    if (!worded) return null;
    if ("unused" in worded) {
      unusedGap = worded.unused;
      return null;
    }
    // A reaction is told, not said ("Ryan Wagner grumbles something and
    // heads for the door"): the narrator speaks it.
    const role = use.move === "react" ? "narrator" : use.role;
    return {
      n: zero,
      step: worded.step,
      role,
      ...(role === "narrator" ? {} : { speakerId }),
      speaker: role === "narrator" ? "Narrator" : nameOf(speakerId),
      text: worded.text,
      move: use.move,
      register: "scene-talk",
      ...(worded.bearing ? { bearing: worded.bearing } : {}),
      key,
      purpose,
      ...(family ? { family } : {}),
      round: zero,
      ...(use.after ? { after: use.after } : {}),
      ...(use.outcome ? { outcome: use.outcome } : {}),
      // The piece the line answers by first: a joined sentence's core, then
      // the other pieces it was made of.
      parts: [
        worded.pieceKey,
        ...(worded.pieceKeys ?? []).filter((k) => k !== worded.pieceKey),
      ],
      slotRecordIds: [...worded.slotRecordIds],
      ...(worded.tag ? { tag: worded.tag } : {}),
      asks: worded.asks,
      invites: worded.invites,
      ...(worded.placed ? { placed: worded.placed } : {}),
    };
  };
  let unusedGap = "";
  const none: ReadonlySet<string> = new Set();
  const addParts = (said: ReadonlySet<string>, line: SceneTalkLine) =>
    new Set([...said, ...line.parts]);
  // The player asks where the type says so and the caller says where the one
  // asked stands; without it (a grading page) the purpose plays as asked of
  // the player.
  const asking = !!type.playerAsks && !!voice.standing;

  /**
   * The scene as the page reads it: every line numbered in the order the tree
   * is read, each end named, and the trait-led path, its rounds and outcome.
   */
  const finish = ({
    narrate,
    open,
    intro,
    statement,
    root,
    nodes,
    ledChoices,
    ledBranch,
  }: {
    narrate: SceneTalkLine | null;
    open: SceneTalkLine | null;
    intro: SceneTalkLine[];
    statement: SceneTalkLine;
    root: TreeNode;
    nodes: number;
    ledChoices: ReadonlyMap<TreeNode, TreeReply>;
    ledBranch: ReadonlyMap<TreeNode, NonNullable<TreeNode["branches"]>[number]>;
  }): SceneTalkResult => {
    // Number every line once, in the order the tree is read; collect the
    // trait-led path, the rounds and the endings.
    let count = zero;
    const take = (line: SceneTalkLine) => {
      count += one;
      line.n = count;
    };
    if (narrate) take(narrate);
    if (open) take(open);
    intro.forEach(take);
    take(statement);
    const endings: Outcome[] = [];
    const number = (node: TreeNode) => {
      node.lines.forEach(take);
      node.replies.forEach((reply) => take(reply.line));
      for (const reply of node.replies) if (reply.next) number(reply.next);
      for (const branch of node.branches ?? []) number(branch.node);
      if (node.end) {
        endings.push(node.end.outcome);
        if (node.end.close) take(node.end.close);
      }
    };
    number(root);
    // Name each ending: the first of the purpose's endings that matches the end
    // of the path (its last reply, the asker's last move, any reply on it, whether
    // a lie was caught or believed, the outcome). An end no ending matches is a gap.
    // The endings name the purpose's roles: its replies are the asked role's
    // moves and its asker move the asker role's, so where the player asks, the
    // replies are the answers of the one asked and the asker move the player's.
    const endingCounts: Record<string, number> = {};
    const resolveEndings = (
      node: TreeNode,
      context: {
        choices: string[];
        answers: string[];
        caught: boolean;
        believed: boolean;
      },
    ) => {
      // A narrator's beat is not the asker's move: the ending reads past it.
      const answers = [
        ...context.answers,
        ...node.lines
          .filter((line) => line.role !== "narrator")
          .map((line) => line.move),
      ];
      for (const reply of node.replies)
        if (reply.next)
          resolveEndings(reply.next, {
            ...context,
            answers,
            choices: [...context.choices, reply.line.move],
          });
      for (const branch of node.branches ?? [])
        resolveEndings(branch.node, {
          ...context,
          answers,
          caught: branch.knows,
          believed: !branch.knows,
        });
      if (node.end) {
        // An end never leaves the asker's question hanging or invites speech.
        const lastAsk =
          node.end.close ??
          node.lines.filter((l) => l.role === "asker").at(-one);
        if (lastAsk?.asks || lastAsk?.invites)
          gap("end", "dangling", `"${lastAsk.text.trim()}"`);
      }
      if (!node.end || !arc.endings) return;
      const replies = asking ? answers : context.choices;
      const askerMove =
        (asking ? context.choices : answers).at(-one) ?? arc.state;
      const last = replies.at(-one);
      const found = arc.endings.find((row) => {
        const when = row.when;
        return (
          (!when.reply || (last !== undefined && when.reply.includes(last))) &&
          (!when.asker || when.asker.includes(askerMove)) &&
          (!when.anyReply ||
            replies.some((move) => when.anyReply!.includes(move))) &&
          (when.caught === undefined || when.caught === context.caught) &&
          (when.believed === undefined || when.believed === context.believed) &&
          (!when.outcome || when.outcome.includes(node.end!.outcome))
        );
      });
      if (found) {
        node.end.ending = {
          id: found.id,
          label: found.label,
          keeps: found.keeps,
          ...(found.firmness ? { firmness: found.firmness } : {}),
          ...(found.settles ? { settles: found.settles } : {}),
        };
        endingCounts[found.id] = (endingCounts[found.id] ?? zero) + one;
      } else
        gap(
          "ending",
          "unmatched",
          `${last ?? "no reply"} (asker ${askerMove}, ${node.end.outcome})`,
        );
    };
    resolveEndings(root, {
      choices: [],
      answers: [],
      caught: false,
      believed: false,
    });
    const depthOf = (node: TreeNode): number =>
      Math.max(
        node.replies.length
          ? one +
              Math.max(
                ...node.replies.map((reply) =>
                  reply.next ? depthOf(reply.next) : zero,
                ),
              )
          : zero,
        ...(node.branches ?? []).map((branch) => depthOf(branch.node)),
      );

    const flat: SceneTalkLine[] = [
      ...(narrate ? [narrate] : []),
      ...(open ? [open] : []),
      ...intro,
      statement,
    ];
    const rounds: SceneTalkRound[] = [];
    let outcome: Outcome = "open";
    let ending: SceneTalkLine | undefined;
    let node: TreeNode | null = root;
    flat.push(...root.lines);
    while (node) {
      flat.push(...node.replies.map((row) => row.line));
      const taken = ledChoices.get(node);
      if (!taken) {
        if (node.end) {
          outcome = node.end.outcome;
          ending = node.end.close ?? ending;
          if (node.end.close) flat.push(node.end.close);
        }
        break;
      }
      let nextNode: TreeNode | null = taken.next;
      // After a lie, the branch the staged records give: caught or believed.
      if (nextNode?.branches?.length)
        nextNode = (ledBranch.get(nextNode) ?? nextNode.branches[zero]!).node;
      rounds.push({
        round: taken.line.round,
        replies: node.replies.map((row) => row.line),
        chosen: taken.line,
        ...(nextNode?.lines[zero] ? { answer: nextNode.lines[zero] } : {}),
      });
      outcome = outcomeOf(taken.line.move);
      if (nextNode) {
        flat.push(...nextNode.lines);
        ending =
          nextNode.lines.filter((line) => line.role !== "narrator").at(-one) ??
          ending;
      }
      node = nextNode;
    }

    return {
      kind: "composed",
      talk: {
        typeKey: type.key,
        purpose,
        ...(family ? { family } : {}),
        askerId: cast.askerId,
        askedId: cast.askedId,
        narration: narrate ? [narrate] : [],
        ...(open ? { open } : {}),
        intro,
        state: statement,
        tree: root,
        rounds,
        ...(ending ? { close: ending } : {}),
        outcome,
        lines: flat,
        nodes,
        endings,
        depth: depthOf(root),
        gaps: [...gaps].sort(),
        endingCounts,
      },
    };
  };

  // The player does the asking (owner, Oct 14: convince one member to
  // switch): the player says the purpose's asker lines and the one asked
  // answers in its asked lines, the player's lines the choices. The one asked
  // answers from where they stand, never by a roll: asked plainly, yes only
  // if they already lean for it, not yet if a favor would carry them, no
  // otherwise; asked again, the favor carries them where it would at the
  // roll and pressing holds them where they stood (the arc's `asks`).
  if (asking) {
    const ask = arc.asks;
    const standing = voice.standing;
    if (!ask || !standing)
      return {
        kind: "skipped",
        reason: `the player does not ask in ${purpose}`,
      };
    const mine = (
      use: Pick<FitUse, "step" | "move" | "after" | "afterPiece">,
      moment: string,
      said: ReadonlySet<string>,
    ) => {
      const line = render(
        { ...use, role: "asker", ...base },
        cast.askedId,
        askedTraits,
        moment,
        said,
      );
      if (line) line.role = "asked";
      return line;
    };
    // The answer of the one asked: the first of `moves` the bank can word.
    const theirs = (
      moves: readonly string[],
      after: SceneTalkLine,
      moment: string,
      said: ReadonlySet<string>,
    ) => {
      for (const move of moves) {
        const line = render(
          {
            step: "reply",
            move,
            role: "asked",
            ...base,
            after: after.move,
            ...(after.parts[zero] ? { afterPiece: after.parts[zero] } : {}),
          },
          cast.askerId,
          askerTraits,
          `${moment}:${move}`,
          said,
        );
        if (line) {
          line.role = "asker";
          return line;
        }
      }
      gap("reply", moves.join("/"), after.move);
      return null;
    };
    // The setup is told from the player's side: a purpose asked both ways (a
    // vote) has the player's own setup under the type's key, and the
    // purpose's setup plays where the bank has none.
    const setup = (at: string) =>
      render(
        {
          step: "narrate",
          move: "narrate",
          role: "narrator",
          purpose,
          key: at,
        },
        cast.askerId,
        {},
        "narrate",
        none,
      );
    const narrate = setup(type.key) ?? setup(key);
    const set = narrate ? addParts(none, narrate) : none;
    const request = mine({ step: "state", move: arc.state }, "state", set);
    if (!request)
      return {
        kind: "skipped",
        reason: `the ${arc.state} that opens ${type.key} cannot be worded from the records given`,
      };
    request.auto = true;
    const said = addParts(set, request);
    const carried = standing.lean + standing.favor > zero;
    // A stranger who would say yes asks one thing first; the player's answer
    // is a choice, and each answer ends in their yes or no.
    if (standing.asksFirst && ask.first) {
      const asked = theirs([ask.first.tell], request, "first-ask", said);
      const node: TreeNode = { lines: asked ? [asked] : [], replies: [] };
      const heard = asked ? addParts(said, asked) : said;
      for (const then of asked ? ask.first.then : []) {
        // A dodge is offered only when it costs something on the record:
        // where the stance left unsaid weighs the same as the one on the
        // player's record, there is nothing to dodge (Words lead, Nov 14).
        if (
          then.carries === "hedged" &&
          (standing.hedged === undefined || standing.hedged >= standing.lean)
        )
          continue;
        const line = mine(
          {
            step: "follow",
            move: then.move,
            after: asked!.move,
            ...(asked!.parts[zero] ? { afterPiece: asked!.parts[zero] } : {}),
          },
          `first:${then.move}`,
          heard,
        );
        if (!line) {
          gap("follow", then.move, asked!.move);
          continue;
        }
        line.round = two;
        const yes =
          (then.carries === "hedged"
            ? (standing.hedged ?? standing.lean)
            : standing.lean) > zero;
        const last = theirs(
          yes ? [ask.yes] : [ask.no],
          line,
          `first-last:${then.move}`,
          addParts(heard, line),
        );
        const next: TreeNode = { lines: [], replies: [] };
        if (last) {
          last.round = two;
          next.lines.push(last);
        }
        next.end = { outcome: outcomeOf(last?.move ?? ask.yes) };
        node.replies.push({ line, next });
      }
      // Fewer than two answers is no choice: they answer at once instead.
      if (asked && node.replies.length >= two) {
        asked.round = one;
        const [led] = byLean(
          core,
          node.replies,
          (row) => row.line.move,
          askedTraits,
          (row) => `${scene}:first:${row.line.move}`,
        );
        if (led) led.line.chosen = true;
        return finish({
          narrate,
          open: null,
          intro: [],
          statement: request,
          root: node,
          nodes: one + node.replies.length,
          ledChoices: new Map(led ? [[node, led] as const] : []),
          ledBranch: new Map(),
        });
      }
    }
    // An ask that weighs a price, or staying out, is offered only where the
    // record holds the act that pays it; undefined carries leaves no answer.
    const offered = (weighs: AskCarries) =>
      weighs === "price" || weighs === "price-refused"
        ? standing.price !== undefined
        : weighs === "absence"
          ? standing.absence !== undefined && standing.lean <= zero
          : true;
    const carriesOf = (weighs: AskCarries) =>
      weighs === "favor"
        ? carried
        : weighs === "lean"
          ? standing.lean > zero
          : weighs === "price"
            ? (standing.price ?? zero) > zero
            : weighs === "absence"
              ? standing.absence === true
              : weighs === "price-refused"
                ? false
                : undefined;
    const answerOf = (weighs: AskCarries, carries: boolean) =>
      !carries
        ? [ask.no]
        : weighs === "price"
          ? [ask.paid ?? ask.relent[zero]!]
          : weighs === "absence"
            ? [ask.absent ?? ask.relent[zero]!]
            : ask.relent;
    const first = theirs(
      standing.lean > zero
        ? [ask.yes]
        : carried || standing.noReason
          ? [ask.carried]
          : [ask.no],
      request,
      "first",
      said,
    );
    if (!first)
      return {
        kind: "skipped",
        reason: `the answer to ${type.key} cannot be worded from the records given`,
      };
    first.round = one;
    const root: TreeNode = { lines: [first], replies: [] };
    let count = one;
    // A yes is thanked; a not yet or a no is asked again, or let go.
    const yes = first.move === ask.yes;
    // A second no (asked before and turned down, and nothing carries them
    // now) is let go, never pressed a third time (Words lead, Nov 15).
    const secondNo =
      !yes && !carried && standing.lean <= zero && !!facts["asked-before"];
    const afterLed = new Map<TreeNode, TreeReply>();
    // On a second ask a plea is offered only where the record holds a time
    // the player backed them (`read-favor-given`: the player's yes on a bill
    // of theirs), and pressing only where they lean for it already (Words
    // lead, Nov 15): asking again with nothing behind it is not offered.
    const askedAgain = !!facts["asked-before"];
    const backed = (weighs: AskCarries) =>
      !askedAgain ||
      (weighs === "favor"
        ? !!facts["read-favor-given"]
        : weighs === "lean"
          ? standing.lean > zero
          : true);
    for (const again of yes
      ? [{ move: ask.thanks, carries: "none" as const }]
      : secondNo
        ? ask.again.filter((row) => row.carries === "none" && !row.secondAsk)
        : ask.again) {
      if (!offered(again.carries) || !backed(again.carries)) continue;
      if ("secondAsk" in again && again.secondAsk && !askedAgain) continue;
      const line = mine(
        {
          step: "follow",
          move: again.move,
          after: first.move,
          ...(first.parts[zero] ? { afterPiece: first.parts[zero] } : {}),
        },
        `again:${again.move}`,
        addParts(said, first),
      );
      if (!line) {
        gap("follow", again.move, first.move);
        continue;
      }
      line.round = two;
      const next: TreeNode = { lines: [], replies: [] };
      count += one;
      root.replies.push({ line, next });
      const carries = carriesOf(again.carries);
      const last =
        yes && ask.thanked
          ? theirs(
              [ask.thanked],
              line,
              `last:${again.move}`,
              addParts(addParts(said, first), line),
            )
          : carries === undefined
            ? null
            : theirs(
                answerOf(again.carries, carries),
                line,
                `last:${again.move}`,
                addParts(addParts(said, first), line),
              );
      if (last) {
        last.round = two;
        next.lines.push(last);
      }
      next.end = { outcome: outcomeOf(last?.move ?? first.move) };
      // A second turn on this branch: the player answers what they said.
      const turns = last ? ask.after?.[again.move] : undefined;
      if (last && turns) {
        const heard = addParts(addParts(addParts(said, first), line), last);
        const replies: TreeReply[] = [];
        for (const then of turns) {
          const reply = mine(
            {
              step: "follow",
              move: then.move,
              after: last.move,
              ...(last.parts[zero] ? { afterPiece: last.parts[zero] } : {}),
            },
            `after:${again.move}:${then.move}`,
            heard,
          );
          if (!reply) {
            gap("follow", then.move, last.move);
            continue;
          }
          reply.round = three;
          const leaf: TreeNode = { lines: [], replies: [] };
          const holds =
            then.carries === "favor"
              ? carried
              : then.carries === "lean"
                ? standing.lean > zero
                : undefined;
          const answer =
            holds === undefined
              ? null
              : theirs(
                  holds ? ask.relent : [ask.no],
                  reply,
                  `after-last:${again.move}:${then.move}`,
                  addParts(heard, reply),
                );
          if (answer) {
            answer.round = three;
            leaf.lines.push(answer);
          }
          leaf.end = { outcome: outcomeOf(answer?.move ?? last.move) };
          replies.push({ line: reply, next: leaf });
        }
        if (replies.length >= two) {
          delete next.end;
          next.replies = replies;
          count += replies.length;
          const [ledAfter] = byLean(
            core,
            replies,
            (row) => row.line.move,
            askedTraits,
            (row) => `${scene}:after:${row.line.move}`,
          );
          if (ledAfter) {
            ledAfter.line.chosen = true;
            afterLed.set(next, ledAfter);
          }
        }
      }
    }
    // The middle: asking after the one asked, who tells their own matter,
    // and two or more replies to it that end apart.
    const middleLed = new Map<TreeNode, TreeReply>();
    if (ask.middle) {
      const heardFirst = addParts(said, first);
      const opener = mine(
        {
          step: "follow",
          move: ask.middle.ask,
          after: first.move,
          ...(first.parts[zero] ? { afterPiece: first.parts[zero] } : {}),
        },
        `middle:${ask.middle.ask}`,
        heardFirst,
      );
      const told = opener
        ? theirs(
            [ask.middle.tell],
            opener,
            "middle-tell",
            addParts(heardFirst, opener),
          )
        : null;
      if (opener && told) {
        opener.round = two;
        told.round = two;
        const node: TreeNode = { lines: [told], replies: [] };
        const heard = addParts(addParts(heardFirst, opener), told);
        for (const then of ask.middle.then) {
          if (!offered(then.carries)) continue;
          const line = mine(
            {
              step: "follow",
              move: then.move,
              after: told.move,
              ...(told.parts[zero] ? { afterPiece: told.parts[zero] } : {}),
            },
            `middle:${then.move}`,
            heard,
          );
          if (!line) {
            gap("follow", then.move, told.move);
            continue;
          }
          line.round = three;
          const next: TreeNode = { lines: [], replies: [] };
          const carries = carriesOf(then.carries);
          const last =
            carries === undefined
              ? null
              : theirs(
                  answerOf(then.carries, carries),
                  line,
                  `middle-last:${then.move}`,
                  addParts(heard, line),
                );
          if (last) {
            last.round = three;
            next.lines.push(last);
          }
          next.end = { outcome: outcomeOf(last?.move ?? first.move) };
          node.replies.push({ line, next });
        }
        // Fewer than two replies to what they told is no choice: the scene
        // ends on what they said (one with nothing to name says so, ruling
        // 72), and the ending reads the first answer.
        if (node.replies.length < two) {
          node.replies = [];
          node.end = { outcome: outcomeOf(first.move) };
        }
        root.replies.push({ line: opener, next: node });
        count += one + node.replies.length;
        const [ledThen] = byLean(
          core,
          node.replies,
          (row) => row.line.move,
          askedTraits,
          (row) => `${scene}:middle:${row.line.move}`,
        );
        if (ledThen) {
          ledThen.line.chosen = true;
          middleLed.set(node, ledThen);
        }
      } else gap("follow", ask.middle.ask, first.move);
    }
    // One button is not a choice: a scene whose middle can be worded never
    // leaves the player a single reply, save the thanks for a yes and the
    // plain close after a second no.
    if (!yes && !secondNo && root.replies.length < two)
      return {
        kind: "skipped",
        reason: `fewer than two asks after ${first.move} can be worded for ${type.key}`,
      };
    if (!root.replies.length) root.end = { outcome: outcomeOf(first.move) };
    // The page follows the ask the player's traits lean toward most.
    const [led] = byLean(
      core,
      root.replies,
      (row) => row.line.move,
      askedTraits,
      (row) => `${scene}:root:${row.line.move}`,
    );
    if (led) led.line.chosen = true;
    return finish({
      narrate,
      open: null,
      intro: [],
      statement: request,
      root,
      nodes: count,
      ledChoices: new Map([
        ...(led ? [[root, led] as const] : []),
        ...middleLed,
        ...afterLed,
      ]),
      ledBranch: new Map(),
    });
  }

  // The setup: the narrator's paragraph for this purpose and key, with no
  // traits, so it reads the same for every profile.
  const narrate = options.setupTold
    ? null
    : render(
        { step: "narrate", move: "narrate", role: "narrator", ...base },
        cast.askerId,
        {},
        "narrate",
        none,
      );
  if (!narrate && !options.setupTold)
    return {
      kind: "skipped",
      reason: unusedGap
        ? `piece gap: no unused narration for ${purpose}`
        : `no narration for ${purpose} can be worded from the records given`,
    };
  let said = narrate ? addParts(none, narrate) : none;
  // The open's move: a purpose may open on a detail ("react") instead of a greeting.
  const openMove =
    sceneMovesWritten({
      step: "open",
      role: "asker",
      purpose,
      ...(family ? { family } : {}),
    }).find((move) => move !== "greet") ?? "greet";
  // Not everyone says hello first: an asker who keeps to themself goes
  // straight to why they came.
  const blunt =
    openMove === "greet" &&
    (askerTraits["people-mind-v1:sociability"] ?? zero) <=
      -RULES.bluntGreeting.value;
  const open = blunt
    ? null
    : render(
        { step: "open", move: openMove, role: "asker", ...base },
        cast.askerId,
        askerTraits,
        "open",
        said,
      );
  if (!open && unusedGap)
    return {
      kind: "skipped",
      reason: `piece gap: no unused open for ${purpose}`,
    };
  if (open) said = addParts(said, open);
  // Where the asker opens with a compliment or news, the player's character
  // answers first (`auto` with `after: "open"`), before the statement.
  const intro: SceneTalkLine[] = [];
  const openAuto = open
    ? arc.auto?.find((row) => row.after === "open")
    : undefined;
  if (open && openAuto) {
    const reacted = render(
      {
        step: "auto",
        move: openAuto.move,
        role: "asked",
        ...base,
        after: open.move,
        ...(open.parts[zero] ? { afterPiece: open.parts[zero] } : {}),
      },
      cast.askedId,
      askedTraits,
      "auto:open",
      said,
    );
    if (reacted) {
      reacted.auto = true;
      intro.push(reacted);
      said = addParts(said, reacted);
      // The asker answers the player's character, then states the purpose.
      const moves = candidatesFor(arc, openAuto.move);
      const best = followStep(
        core,
        askerTraits,
        moves.length ? moves : ["answer"],
        (candidate) =>
          render(
            {
              step: "follow",
              move: candidate,
              role: "asker",
              ...base,
              after: openAuto.move,
              ...(reacted.parts[zero]
                ? { afterPiece: reacted.parts[zero] }
                : {}),
            },
            cast.askerId,
            askerTraits,
            `auto-answer:open:${candidate}`,
            said,
          ),
        (candidate) => `${scene}:open:${candidate}`,
      );
      if (best) {
        intro.push(best.line);
        said = addParts(said, best.line);
      } else gap("follow", "answer", `${openAuto.move} (after the open)`);
    } else gap("auto", openAuto.move, "open");
  }
  const statement = arc.stateMoves
    ? joinedStatement(
        arc.stateMoves.map((move) => {
          const line = render(
            { step: "state", move, role: "asker", ...base },
            cast.askerId,
            askerTraits,
            "state",
            said,
          );
          if (line) said = addParts(said, line);
          return line;
        }),
        arc.state,
      )
    : render(
        { step: "state", move: arc.state, role: "asker", ...base },
        cast.askerId,
        askerTraits,
        "state",
        said,
      );
  if (!statement)
    return {
      kind: "skipped",
      reason: unusedGap
        ? `piece gap: no unused ${arc.state} statement for ${purpose}`
        : `the ${arc.state} that states ${purpose} cannot be worded from the records given`,
    };
  said = addParts(said, statement);

  // After an asker's line of a move, the player's character may say a line of
  // its own unprompted, and the asker answers it.
  const withAuto = (
    askerLine: SceneTalkLine,
    path: Path,
    label: string,
    traitsOfAsker: Readonly<Record<string, number>>,
  ): { lines: SceneTalkLine[]; path: Path } => {
    const lines: SceneTalkLine[] = [];
    let current = path;
    const last = askerLine;
    const hit = arc.auto?.find(
      (row) =>
        row.after === last.move ||
        (row.after === "state" && last.step === "state"),
    );
    if (!hit) return { lines, path };
    const auto = render(
      {
        step: "auto",
        move: hit.move,
        role: "asked",
        ...base,
        after: last.move,
        ...(last.parts[zero] ? { afterPiece: last.parts[zero] } : {}),
      },
      cast.askedId,
      askedTraits,
      `auto:${label}`,
      current.said,
    );
    if (!auto) return { lines, path };
    auto.auto = true;
    lines.push(auto);
    current = { ...current, said: addParts(current.said, auto) };
    const answerMoves = candidatesFor(arc, hit.move);
    const best = followStep(
      core,
      traitsOfAsker,
      answerMoves.length ? answerMoves : ["answer"],
      (candidate) =>
        render(
          {
            step: "follow",
            move: candidate,
            role: "asker",
            ...base,
            after: hit.move,
            ...(auto.parts[zero] ? { afterPiece: auto.parts[zero] } : {}),
          },
          cast.askerId,
          traitsOfAsker,
          `auto-answer:${label}:${candidate}`,
          current.said,
        ),
      (candidate) => `${scene}:${label}:auto:${candidate}`,
    );
    if (best) {
      lines.push(best.line);
      current = {
        ...current,
        said: addParts(current.said, best.line),
        askerMove: best.line.move,
        askerPiece: best.line.parts[zero] ?? "",
      };
    }
    return { lines, path: current };
  };

  const root: TreeNode = { lines: [], replies: [] };
  let nodes = one;
  const rootStart = withAuto(
    statement,
    {
      said,
      round: zero,
      askerMove: arc.state,
      askerPiece: statement.parts[zero] ?? "",
      led: true,
      id: "root",
      continued: false,
      offered: new Set<string>(),
      offeredPieces: new Set<string>(),
    },
    "root",
    askerTraits,
  );
  root.lines = rootStart.lines;
  // The narrator speaks between lines, not only at the top: a beat of the room after the statement and
  // partway in, where the bank has one for this purpose.
  // A beat plays once on a path at most (Words lead, Nov 14): one the path
  // has already said is left out, never said again.
  const beatAt = (path: Path, label: string): SceneTalkLine | null => {
    const beat = render(
      { step: "beat", move: "beat", role: "narrator", ...base },
      cast.askerId,
      {},
      `${label}:beat`,
      path.said,
    );
    return beat && beat.parts.some((part) => path.said.has(part)) ? null : beat;
  };
  let rootPath = rootStart.path;
  const rootBeat = beatAt(rootPath, "root");
  if (rootBeat) {
    root.lines = [...root.lines, rootBeat];
    rootPath = { ...rootPath, said: addParts(rootPath.said, rootBeat) };
  }

  /** The close for an ending: a thanks or acceptance answer is itself the close. */
  const closeFor = (
    outcome: Outcome,
    path: Path,
    lastAsker: SceneTalkLine | undefined,
    given: typeof facts = facts,
  ): SceneTalkLine | undefined => {
    if (lastAsker && RULES.terminalFollow.includes(lastAsker.move))
      return undefined;
    const known = given === facts ? heard(path.said) : given;
    const moves = ARCS.close[outcome]
      .filter((move) => move !== lastAsker?.move)
      .filter((move) =>
        sceneMoveFits(
          { step: "close", move, role: "asker", ...base, outcome },
          known,
          options,
        ),
      );
    const [move] = [...moves].sort((a, b) =>
      stableHash(`${scene}:${path.id}:close:${a}`).localeCompare(
        stableHash(`${scene}:${path.id}:close:${b}`),
      ),
    );
    if (!move) return undefined;
    const line = render(
      { step: "close", move, role: "asker", ...base, outcome },
      cast.askerId,
      askerTraits,
      `${path.id}:close`,
      path.said,
      false,
      known,
    );
    // The close never says again what was just said.
    return line && line.parts[zero] !== lastAsker?.parts[zero]
      ? line
      : undefined;
  };

  /**
   * Ends a node on its close. A question nothing can close is not left
   * hanging: the asker does not ask it, the scene ends on the answer before
   * it, and the missing close is listed for the bank.
   */
  const endNode = (
    node: TreeNode,
    outcome: Outcome,
    path: Path,
    lastAsker: SceneTalkLine,
  ) => {
    const close = closeFor(outcome, path, lastAsker);
    const hanging = (line: SceneTalkLine | undefined) =>
      !!line &&
      line.role === "asker" &&
      !RULES.terminalFollow.includes(line.move) &&
      line.asks;
    if (!close && hanging(node.lines.at(-one))) {
      gap("close", outcome, `${lastAsker.move} (its question left unasked)`);
      while (hanging(node.lines.at(-one))) node.lines.pop();
    }
    node.end = { outcome, ...closed(close) };
  };

  interface Pending {
    node: TreeNode;
    path: Path;
    moves: readonly string[];
    outcome: Outcome;
    lastAsker: SceneTalkLine;
  }
  const queue: Pending[] = [
    {
      node: root,
      path: rootPath,
      moves: arc.replies,
      outcome: "open",
      lastAsker: statement,
    },
  ];
  // The led path's chosen replies, in order, for the flat view.
  const ledChoices = new Map<TreeNode, TreeReply>();

  /** The asker's close after a `leave`: a close piece that names it in `after`. */
  /** The asker's close written for the player's last move (walking away, a lie told again). */
  const leaveClose = (
    path: Path,
    reply: SceneTalkLine,
  ): SceneTalkLine | undefined => {
    // The written closes for a walk-away are tried in a hash order of the
    // branch, the move this talk has closed on least first, so branches do not all close
    // on the first move alphabetically.
    const moves = sceneMovesWritten({
      step: "close",
      after: reply.move,
    }).sort(
      (a, b) =>
        (closesByMove.get(a) ?? zero) - (closesByMove.get(b) ?? zero) ||
        stableHash(`${scene}:${path.id}:leave:${a}`).localeCompare(
          stableHash(`${scene}:${path.id}:leave:${b}`),
        ),
    );
    for (const move of moves) {
      const line = render(
        {
          step: "close",
          move,
          role: "asker",
          ...base,
          after: reply.move,
          ...(reply.parts[zero] ? { afterPiece: reply.parts[zero] } : {}),
          outcome: "open",
        },
        cast.askerId,
        askerTraits,
        `${path.id}:${reply.move}`,
        path.said,
      );
      if (line) return line;
    }
    return undefined;
  };

  const ledBranch = new Map<
    TreeNode,
    NonNullable<TreeNode["branches"]>[number]
  >();
  const caughtCandidates = (move: string): string[] =>
    (ARCS.lie?.afterCaught[move] ?? []).filter((answer) => answer !== "close");

  /**
   * A lie has two outcomes, shown as separate nodes: believed (the asker holds
   * nothing that contradicts it) and caught (the staging holds the fact
   * `knows-truth`, with its source). No roll: the staged records decide which
   * the page follows.
   */
  const lieBranches = (
    reply: SceneTalkLine,
    next: TreeNode,
    childPath: Path,
    round: number,
  ) => {
    const lie = ARCS.lie!;
    const branches: NonNullable<TreeNode["branches"]> = [];
    const knows = lie.caught.requiresFacts.every((name) => facts[name]);
    const afterLie = {
      ...base,
      after: reply.move,
      ...(reply.parts[zero] ? { afterPiece: reply.parts[zero] } : {}),
    };
    if (knows) {
      const confront = render(
        { step: "follow", move: lie.caught.move, role: "asker", ...afterLie },
        cast.askerId,
        askerTraits,
        `${childPath.id}:caught`,
        childPath.said,
      );
      if (confront) {
        confront.round = round;
        const node: TreeNode = { lines: [confront], replies: [] };
        nodes += one;
        branches.push({
          label: `if ${nameOf(cast.askerId)} knows`,
          knows: true,
          node,
        });
        queue.push({
          node,
          path: {
            ...childPath,
            said: addParts(childPath.said, confront),
            askerMove: confront.move,
            askerPiece: confront.parts[zero] ?? "",
            caught: true,
            id: `${childPath.id}.caught`,
          },
          moves: lie.caught.replies,
          outcome: "open",
          lastAsker: confront,
        });
      } else gap("follow", lie.caught.move, "lie (caught)");
    }
    const believed = lie.believed.flatMap((move) => {
      const line = render(
        { step: "follow", move, role: "asker", ...afterLie },
        cast.askerId,
        askerTraits,
        `${childPath.id}:believed:${move}`,
        childPath.said,
      );
      return line ? [line] : [];
    });
    const [thanks] = [...closest(believed, (line) => line, reply)].sort(
      (a, b) =>
        stableHash(`${scene}:${childPath.id}:${a.move}`).localeCompare(
          stableHash(`${scene}:${childPath.id}:${b.move}`),
        ),
    );
    if (thanks) {
      thanks.round = round;
      const node: TreeNode = {
        lines: [thanks],
        replies: [],
        end: { outcome: "resolved" },
      };
      nodes += one;
      branches.push({ label: "if not", knows: false, node });
    } else gap("follow", lie.believed.join("/"), "lie (believed)");
    next.branches = branches;
    const picked =
      branches.find((row) => row.knows === knows) ?? branches[zero];
    if (picked && childPath.led) ledBranch.set(next, picked);
  };

  // The replies that do the thing asked (arc.acts), and the facts the closing
  // line after one is worded with: the arc's actEnds no longer hold.
  const actPieces = new Set(
    Object.entries(arc.acts ?? {}).flatMap(([key, pieces]) =>
      key === "note" ? [] : [pieces].flat(),
    ),
  );
  const afterAct = (said: ReadonlySet<string>): typeof facts =>
    Object.fromEntries(
      Object.entries(heard(said)).filter(
        ([key]) => !(arc.actEnds ?? []).includes(key),
      ),
    );
  for (let at = zero; at < queue.length; at += one) {
    const { node, path, moves, outcome, lastAsker } = queue[at]!;
    const round = path.round + one;
    // The menu moves the talk on: a move offered at an earlier node on this
    // path is not offered again (a lie and the way out aside, or where the arc
    // lists it as repeatable after this asker move), and a node never offers
    // two replies of one move.
    // A move may come back with a different line; a line offered once on
    // this path is never offered again.
    const fresh = [...new Set(moves)];
    const seen = new Set([...path.said, ...path.offeredPieces]);
    // One reply line for a move, from the bank (or, tagged, the extra option
    // drawn from the player's own life), worded against what the path said.
    const wordReply = (move: string, tagged: boolean) =>
      render(
        {
          step: "reply",
          move,
          role: "asked",
          ...base,
          after: path.askerMove,
          ...(path.askerPiece ? { afterPiece: path.askerPiece } : {}),
        },
        cast.askedId,
        askedTraits,
        `${path.id}:${tagged ? "tagged" : "reply"}:${move}`,
        seen,
        tagged,
        heard(path.said),
      );
    const offered = replyStep({
      moves: fresh,
      limit: maxReplies,
      word: wordReply,
      seen,
      round,
      onGap: (move) => gap("reply", move, path.askerMove),
    });
    // At the opening a thin menu is a gap; deeper in, the asker closes the
    // talk instead of offering two tired options (real exchanges end abruptly).
    if (path.id === "root" && offered.length < three && offered.length >= two)
      gap("menu", path.askerMove, `fewer than three replies at ${path.id}`);
    // A question the asker just asked is always answerable: the menu stays
    // open with what fits rather than the talk ending on it.
    const asked = lastAsker?.asks ?? false;
    // A confrontation or a threat is answered in kind (the menu
    // can mirror it), and a scene that asks, offers or tells a decision lets the
    // player ask back at the root.
    const unmirrored =
      ["confront", "threaten"].includes(path.askerMove) &&
      offered.length > zero &&
      !offered.some((row) => ["confront", "threaten"].includes(row.move));
    // Deep in a fight with nothing left to throw back, the asker has the last
    // word and the talk ends there.
    if (unmirrored && round > three) {
      node.end = { outcome, ...closed(closeFor(outcome, path, lastAsker)) };
      continue;
    }
    if (unmirrored)
      gap(
        "mirror",
        path.askerMove,
        "no confront or threaten reply in the menu",
      );
    if (
      path.id === "root" &&
      ["request", "offer", "tell"].includes(arc.state) &&
      !offered.some((row) => row.move === "ask")
    )
      gap("menu", "ask", `root of a ${arc.state} has no ask reply`);
    const fewest = path.id === "root" || !asked ? two : one;
    if (offered.length < fewest) {
      if (path.id === "root")
        return {
          kind: "skipped",
          reason: `fewer than two replies of ${moves.join("/")} can be worded for ${purpose}`,
        };
      endNode(node, outcome, path, lastAsker);
      continue;
    }
    const ranked = byLean(
      core,
      offered,
      (row) => row.move,
      askedTraits,
      (row) => `${scene}:${path.id}:${row.move}`,
    );
    const ledLine = path.led ? ranked[zero] : undefined;
    if (ledLine) ledLine.chosen = true;
    for (const reply of offered) {
      const treeReply: TreeReply = { line: reply, next: null };
      node.replies.push(treeReply);
      if (reply === ledLine) ledChoices.set(node, treeReply);
      // Past the node bound only the trait-led branch is kept.
      if (nodes >= maxNodes && reply !== ledLine) continue;
      const replyOutcome = outcomeOf(reply.move);
      const next: TreeNode = { lines: [], replies: [] };
      nodes += one;
      treeReply.next = next;
      const childPath: Path = {
        ...path,
        said: addParts(path.said, reply),
        round,
        led: reply === ledLine,
        id: `${path.id}.${reply.move}`,
        offered: new Set([...path.offered, ...offered.map((row) => row.move)]),
        offeredPieces: new Set([
          ...path.offeredPieces,
          ...offered.map((row) => row.parts[zero] ?? ""),
        ]),
      };

      // The way out: the player ends the talk; the asker closes (outcome open).
      if (reply.move === "leave") {
        const farewell =
          leaveClose(childPath, reply) ??
          closeFor("open", childPath, undefined);
        next.end = { outcome: "open", ...closed(farewell) };
        if (!farewell) gap("close", "leave", reply.parts[zero]);
        continue;
      }
      // A reply that does the thing asked in its own words ends the talk: one
      // closing line from the asker, worded without the facts the act ended
      // (Words lead, Nov 14: "a reply that names the act ends the talk and
      // decides").
      if (actPieces.has(reply.parts[zero] ?? "")) {
        const close = closeFor(
          replyOutcome,
          childPath,
          undefined,
          afterAct(childPath.said),
        );
        next.end = { outcome: replyOutcome, ...closed(close) };
        if (!close) gap("close", replyOutcome, `${reply.move} (an act)`);
        continue;
      }
      // A lie plays out as two nodes, believed and caught.
      if (reply.move === "lie" && ARCS.lie && !path.caught) {
        lieBranches(reply, next, childPath, round);
        continue;
      }
      // After a caught lie the asker's answers come from the lie block; a
      // lie told again is where the exchange ends.
      if (path.caught && ARCS.lie?.afterCaught[reply.move]?.includes("close")) {
        next.end = {
          outcome: "open",
          ...closed(
            leaveClose(childPath, reply) ??
              closeFor("open", childPath, undefined),
          ),
        };
        if (!next.end.close) gap("close", "warn", `${reply.move} (caught)`);
        continue;
      }
      // The asker's answer, the one their traits lean toward most. On the last round the
      // asker does not leave a question hanging.
      const last = round >= maxRounds;
      // Once a caught lie is past, the talk goes back to the purpose's own answers.
      const caught = path.caught ? caughtCandidates(reply.move) : [];
      const candidates = caught.length
        ? caught
        : candidatesFor(arc, reply.move);
      const worded = candidates.flatMap((candidate) => {
        const line = render(
          {
            step: "follow",
            move: candidate,
            role: "asker",
            ...base,
            after: reply.move,
            ...(reply.parts[zero] ? { afterPiece: reply.parts[zero] } : {}),
          },
          cast.askerId,
          askerTraits,
          `${childPath.id}:follow:${candidate}`,
          childPath.said,
        );
        return line ? [{ candidate, line }] : [];
      });
      // An answer written for this exact line (or this move) beats a general one.
      // A line the asker already said on this path loses to another move.
      const unsaid = worded.filter(
        (row) => !childPath.said.has(row.line.parts[zero] ?? ""),
      );
      // With nothing left to say that wasn't said, the asker closes the talk.
      if (!unsaid.length && worded.length) {
        next.end = {
          outcome: replyOutcome,
          ...closed(closeFor(replyOutcome, childPath, undefined)),
        };
        continue;
      }
      const answers = closest(unsaid, (row) => row.line, reply);
      const settled = answers.filter(
        (row) => RULES.terminalFollow.includes(row.candidate) || !row.line.asks,
      );
      // The first exchange never wraps the scene up where the asker has a
      // question or a push left (owner, Oct 16: "quick resolution. That's
      // not how normal people talk"); the last round never leaves one hanging.
      const open = answers.filter((row) => !settled.includes(row));
      const pool =
        last && settled.length
          ? settled
          : round === one && open.length
            ? open
            : answers;
      const [best] = byLean(
        core,
        pool,
        (row) => row.candidate,
        askerTraits,
        (row) => `${scene}:${childPath.id}:follow:${row.candidate}`,
      );
      // On the last round a question would hang: the asker closes instead.
      const answer = last && best?.line.asks ? undefined : best?.line;
      if (!answer && best) {
        next.end = {
          outcome: replyOutcome,
          ...closed(closeFor(replyOutcome, childPath, undefined)),
        };
        continue;
      }
      if (!answer) {
        gap("follow", reply.move, reply.parts[zero]);
        next.end = {
          outcome: replyOutcome,
          ...closed(closeFor(replyOutcome, childPath, undefined)),
        };
        continue;
      }
      answer.round = round;
      next.lines.push(answer);
      let answered: Path = {
        ...childPath,
        said: addParts(childPath.said, answer),
        askerMove: answer.move,
        askerPiece: answer.parts[zero] ?? "",
      };
      const more = withAuto(answer, answered, childPath.id, askerTraits);
      next.lines.push(...more.lines);
      answered = more.path;
      // Partway in, the narrator says what is happening around them.
      if (round === two) {
        const beat = beatAt(answered, childPath.id);
        if (beat) {
          beat.round = round;
          next.lines.push(beat);
          answered = { ...answered, said: addParts(answered.said, beat) };
        }
      }
      const lastAnswer = more.lines.at(-one) ?? answer;

      const terminal = RULES.terminalFollow.includes(answer.move);
      const again =
        arc.again?.[answer.move] ??
        ARCS.again[answer.move] ??
        ARCS.again[lastAnswer.move];
      // A resolved purpose may go on once instead of closing.
      const cont =
        !answered.continued &&
        (arc.continue?.find((row) => row.on === reply.move) ??
          (replyOutcome === "resolved"
            ? arc.continue?.find((row) => row.on === "resolved")
            : undefined));
      if (cont) {
        const askerLine = render(
          {
            step: ["continue", "follow", "state"],
            move: cont.asker,
            role: "asker",
            ...base,
            after: reply.move,
            ...(reply.parts[zero] ? { afterPiece: reply.parts[zero] } : {}),
          },
          cast.askerId,
          askerTraits,
          `${answered.id}:continue`,
          answered.said,
        );
        if (askerLine) {
          askerLine.round = round;
          next.lines.push(askerLine);
          queue.push({
            node: next,
            path: {
              ...answered,
              said: addParts(answered.said, askerLine),
              askerMove: askerLine.move,
              askerPiece: askerLine.parts[zero] ?? "",
              continued: true,
              round: round,
            },
            moves: cont.replies,
            outcome: "resolved",
            lastAsker: askerLine,
          });
          continue;
        }
      }
      if (terminal || last || !again) {
        // A bargain or a stall the asker accepts is settled; one they refuse is refused.
        const settledOutcome: Outcome =
          replyOutcome !== "open" || childPath.caught
            ? replyOutcome
            : RULES.terminalFollow.includes(lastAnswer.move) ||
                lastAnswer.move === "promise"
              ? "resolved"
              : lastAnswer.move === "refuse" || lastAnswer.move === "threaten"
                ? "refused"
                : "open";
        endNode(next, settledOutcome, answered, lastAnswer);
        continue;
      }
      queue.push({
        node: next,
        path: answered,
        moves: again,
        outcome: replyOutcome,
        lastAsker: lastAnswer,
      });
    }
  }

  return finish({
    narrate,
    open,
    intro,
    statement,
    root,
    nodes,
    ledChoices,
    ledBranch,
  });
}

/** A close, if there is one, as the field of an ending. */
function closed(close: SceneTalkLine | undefined): { close?: SceneTalkLine } {
  return close ? { close } : {};
}

/**
 * Where the player asks, the last answer of the one asked along a path
 * through the tree: the move the engine that asked for it reads.
 */
export function lastAnswerAlong(
  tree: TreeNode,
  path: readonly number[],
): string | undefined {
  let node: TreeNode | null = tree;
  let last = tree.lines.filter((row) => row.role === "asker").at(-one)?.move;
  for (const index of path) {
    const next: TreeNode | null = node?.replies[index]?.next ?? null;
    node = next ? playedNode(next) : null;
    if (!node) break;
    last =
      node.lines.filter((row) => row.role === "asker").at(-one)?.move ?? last;
  }
  return last;
}

/**
 * Every scene the director can word: each situation type with a purpose (and
 * each variant of its family), and each type with none under its key's
 * generic arc. The English engine's reply pairs
 * (`src/english/reply-pairs.ts`) are listed for these.
 */
export function talkScenes(): {
  purpose: string;
  family?: string;
  key: string;
}[] {
  const families = variantFamilies();
  return (
    situationFile as unknown as {
      types: { key: string; purpose?: string; tag?: { key: string } }[];
    }
  ).types.flatMap((type) => {
    const key = type.tag?.key ?? type.key;
    if (!type.purpose) return ARCS.keys?.[key] ? [{ purpose: "*", key }] : [];
    return [
      { purpose: type.purpose, key },
      ...Object.entries(families)
        .filter(([, family]) => family === type.purpose)
        .map(([variant]) => ({
          purpose: variant,
          family: type.purpose!,
          key,
        })),
    ];
  });
}

/**
 * Which moves the scene's arc lets come right after a line of this step and
 * move, from the same tables the tree builder reads (`candidatesFor`, the
 * arc's `replies`, `again`, `auto`, `continue`, the lie and the player's own
 * ask). It is a union across rounds, so it may allow a move the tree never
 * reaches from a given node; it never leaves out one the tree can.
 */
export function talkFlow(scene: { purpose: string; key: string }): {
  next(step: string, move: string): ReadonlySet<string> | undefined;
} {
  const arc = (
    scene.purpose === "*"
      ? ARCS.keys?.[scene.key]
      : (ARCS.purposes[scene.purpose] ?? variantArc(scene.purpose))
  ) as PurposeArc | undefined;
  if (!arc) return { next: () => undefined };
  const lie = ARCS.lie;
  const asks = arc.asks;
  const askMoves = asks ? [asks.yes, asks.carried, asks.no] : [];
  const againMoves = asks ? asks.again.map((row) => row.move) : [];
  /** The replies the player's character may make after an asker line of this move. */
  const repliesAfter = (move: string): string[] => [
    ...(move === arc.state ? arc.replies : []),
    ...(arc.again?.[move] ?? ARCS.again[move] ?? []),
    ...(arc.repeatable?.[move] ?? []),
    ...(arc.continue ?? [])
      .filter((row) => row.asker === move)
      .flatMap((row) => row.replies),
    ...(lie && move === lie.caught.move ? lie.caught.replies : []),
    ...(asks && move === arc.state ? askMoves : []),
    ...(asks && (move === asks.thanks || againMoves.includes(move))
      ? [
          ...asks.relent,
          asks.no,
          ...(asks.paid ? [asks.paid] : []),
          ...(asks.absent ? [asks.absent] : []),
        ]
      : []),
  ];
  /** The asker's answers to a reply of this move. */
  const answersTo = (move: string): string[] => {
    const moves = candidatesFor(arc, move);
    return [
      ...(moves.length ? moves : ["answer"]),
      ...(lie?.afterCaught[move] ?? []).filter((name) => name !== "close"),
      ...(lie && move === "lie" ? [lie.caught.move, ...lie.believed] : []),
      ...(arc.continue ?? [])
        .filter((row) => row.on === move || row.on === "resolved")
        .map((row) => row.asker),
      ...(asks && askMoves.includes(move) ? [asks.thanks, ...againMoves] : []),
      // The player's second turn after the asked answers an again move: the variants' `after`.
      ...(asks && (move === asks.no || asks.relent.includes(move))
        ? Object.values(asks.after ?? {}).flatMap((rows) =>
            rows.map((row) => row.move),
          )
        : []),
    ];
  };
  /** The player's character's unprompted line after an asker line, and the asker's answer to it. */
  const autoAfter = (step: string, move: string): string[] =>
    (arc.auto ?? [])
      .filter(
        (row) =>
          row.after === move ||
          (row.after === "open" && step === "open") ||
          (row.after === "state" && step === "state"),
      )
      .map((row) => row.move);
  return {
    next(step, move) {
      if (step === "open") return new Set(autoAfter(step, move));
      if (step === "auto") return new Set(answersTo(move));
      if (step === "reply") return new Set(answersTo(move));
      if (step === "state" || step === "follow" || step === "continue")
        return new Set([...repliesAfter(move), ...autoAfter(step, move)]);
      return undefined;
    },
  };
}

const FLOWS = new Map<string, ReturnType<typeof talkFlow>>();

/** `talkFlow` for any scene, read once per purpose and key: the flow the reply pairs ask. */
export const talkReplyFlow = {
  next(
    scene: { purpose: string; key: string },
    step: string,
    move: string,
  ): ReadonlySet<string> | undefined {
    const at = `${scene.purpose}|${scene.key}`;
    let flow = FLOWS.get(at);
    if (!flow) FLOWS.set(at, (flow = talkFlow(scene)));
    return flow.next(step, move);
  },
  apart(scene: { purpose: string; key: string }): readonly string[][] {
    const arc = (
      scene.purpose === "*"
        ? ARCS.keys?.[scene.key]
        : (ARCS.purposes[scene.purpose] ?? variantArc(scene.purpose))
    ) as PurposeArc | undefined;
    return arc?.apart ?? [];
  },
};
