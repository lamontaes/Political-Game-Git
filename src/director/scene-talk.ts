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
import { decisionKinds } from "../core2/trait-decisions";
import { P } from "../core2/parameters";
import { stableHash } from "../core2/kernel/ids";
import type { CoreState, PersonId } from "../core2/types";
import arcsFile from "./data/purpose-arcs.json" with { type: "json" };
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import {
  pieceAnswers,
  sceneMoveFits,
  sceneMovesWritten,
  wordSceneMove,
  type Fact,
  type SceneMove,
  type SceneTalkStep,
} from "../english/scene-talk-words";

export type { SceneTalkStep };
import type { Director } from "./ledger";

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
   * The game screen this ending hands the player to: a key of
   * `screens` in scene-talk-rules.json.
   */
  opens?: string;
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
  state: string;
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
    /** The player's second ask after a "not yet" or a no, and what it weighs. */
    again: { move: string; carries: "favor" | "lean" | "none" }[];
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
    /** The named ending, and the game screen it opens, if any ("desk"). */
    ending?: { id: string; label: string; keeps: string; opens?: string };
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
}

export interface SceneTalkCast {
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
  return pieceAnswers(line.parts[zero] ?? "", line.purpose, {
    pieceKey: reply.parts[zero] ?? "",
    move: reply.move,
  });
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
  },
): { move: string; text: string; pieceKey: string; closes: boolean } | null {
  const arc = ARCS.purposes.talk;
  if (!arc) return null;
  const traits = core.people.get(input.speakerId)?.traits ?? {};
  const worded = candidatesFor(arc, input.replyMove).flatMap((candidate) => {
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
      said: new Set(),
    });
    return line && !("unused" in line) ? [{ candidate, line }] : [];
  });
  const [best] = worded.sort(
    (a, b) =>
      leanOf(core, b.candidate, traits) - leanOf(core, a.candidate, traits) ||
      stableHash(`${input.momentKey}:${a.candidate}`).localeCompare(
        stableHash(`${input.momentKey}:${b.candidate}`),
      ),
  );
  if (!best) return null;
  return {
    move: best.candidate,
    text: best.line.text,
    pieceKey: best.line.pieceKey,
    closes: !!arc.closes?.includes(input.replyMove),
  };
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
  const arc = type.purpose ? ARCS.purposes[type.purpose] : ARCS.keys?.[key];
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
  const scene = `${type.key}:${cast.askerId}:${cast.askedId}`;
  const base = { purpose, key };
  const gaps = new Set<string>();
  const gap = (step: string, move: string, after?: string) =>
    gaps.add(`${gapLabel}/${step}/${move}${after ? ` after ${after}` : ""}`);
  const maxRounds = ARCS.parameters.rounds.value;
  const maxReplies = RULES.tree.maxReplies.value;
  const maxNodes = RULES.tree.maxNodes.value;

  const render = (
    use: FitUse,
    speakerId: PersonId,
    traits: Readonly<Record<string, number>>,
    moment: string,
    said: ReadonlySet<string>,
    onlyTagged = false,
  ): SceneTalkLine | null => {
    // The English engine picks and words the piece; the director only says
    // which move this is, who says it and what it answers.
    const worded = wordSceneMove({
      move: use,
      facts,
      seed: core.seed,
      speakerId,
      traits,
      momentKey: `${scene}:${moment}`,
      said,
      tagged: onlyTagged,
      options,
    });
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
      round: zero,
      ...(use.after ? { after: use.after } : {}),
      ...(use.outcome ? { outcome: use.outcome } : {}),
      parts: [worded.pieceKey],
      slotRecordIds: [...worded.slotRecordIds],
      ...(worded.tag ? { tag: worded.tag } : {}),
      asks: worded.asks,
      invites: worded.invites,
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
          ...(found.opens ? { opens: found.opens } : {}),
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
    const first = theirs(
      standing.lean > zero ? [ask.yes] : carried ? [ask.carried] : [ask.no],
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
    for (const again of yes
      ? [{ move: ask.thanks, carries: "none" as const }]
      : ask.again) {
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
      const carries =
        again.carries === "favor"
          ? carried
          : again.carries === "lean"
            ? standing.lean > zero
            : undefined;
      const last =
        carries === undefined
          ? null
          : theirs(
              carries ? ask.relent : [ask.no],
              line,
              `last:${again.move}`,
              addParts(addParts(said, first), line),
            );
      if (last) {
        last.round = two;
        next.lines.push(last);
      }
      next.end = { outcome: outcomeOf(last?.move ?? first.move) };
    }
    if (!yes && root.replies.length < two)
      return {
        kind: "skipped",
        reason: `fewer than two asks after ${first.move} can be worded for ${type.key}`,
      };
    if (!root.replies.length) root.end = { outcome: outcomeOf(first.move) };
    // The page follows the ask the player's traits lean toward most.
    const [led] = [...root.replies].sort(
      (a, b) =>
        leanOf(core, b.line.move, askedTraits) -
          leanOf(core, a.line.move, askedTraits) ||
        stableHash(`${scene}:root:${a.line.move}`).localeCompare(
          stableHash(`${scene}:root:${b.line.move}`),
        ),
    );
    if (led) led.line.chosen = true;
    return finish({
      narrate,
      open: null,
      intro: [],
      statement: request,
      root,
      nodes: count,
      ledChoices: new Map(led ? [[root, led]] : []),
      ledBranch: new Map(),
    });
  }

  // The setup: the narrator's paragraph for this purpose and key, with no
  // traits, so it reads the same for every profile.
  const narrate = render(
    { step: "narrate", move: "narrate", role: "narrator", ...base },
    cast.askerId,
    {},
    "narrate",
    none,
  );
  if (!narrate)
    return {
      kind: "skipped",
      reason: unusedGap
        ? `piece gap: no unused narration for ${purpose}`
        : `no narration for ${purpose} can be worded from the records given`,
    };
  let said = addParts(none, narrate);
  // The open's move: a purpose may open on a detail ("react") instead of a greeting.
  const openMove =
    sceneMovesWritten({ step: "open", role: "asker", purpose }).find(
      (move) => move !== "greet",
    ) ?? "greet";
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
      const answers = (moves.length ? moves : ["answer"]).flatMap(
        (candidate) => {
          const line = render(
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
          );
          return line ? [{ candidate, line }] : [];
        },
      );
      const [best] = [...answers].sort(
        (a, b) =>
          leanOf(core, b.candidate, askerTraits) -
            leanOf(core, a.candidate, askerTraits) ||
          stableHash(`${scene}:open:${a.candidate}`).localeCompare(
            stableHash(`${scene}:open:${b.candidate}`),
          ),
      );
      if (best) {
        intro.push(best.line);
        said = addParts(said, best.line);
      } else gap("follow", "answer", `${openAuto.move} (after the open)`);
    } else gap("auto", openAuto.move, "open");
  }
  const statement = render(
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
    const answers = (answerMoves.length ? answerMoves : ["answer"]).flatMap(
      (candidate) => {
        const answer = render(
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
        );
        return answer ? [{ candidate, answer }] : [];
      },
    );
    const [best] = [...answers].sort(
      (a, b) =>
        leanOf(core, b.candidate, traitsOfAsker) -
          leanOf(core, a.candidate, traitsOfAsker) ||
        stableHash(`${scene}:${label}:auto:${a.candidate}`).localeCompare(
          stableHash(`${scene}:${label}:auto:${b.candidate}`),
        ),
    );
    if (best) {
      lines.push(best.answer);
      current = {
        ...current,
        said: addParts(current.said, best.answer),
        askerMove: best.answer.move,
        askerPiece: best.answer.parts[zero] ?? "",
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
  const beatAt = (path: Path, label: string): SceneTalkLine | null =>
    render(
      { step: "beat", move: "beat", role: "narrator", ...base },
      cast.askerId,
      {},
      `${label}:beat`,
      path.said,
    );
  let rootPath = rootStart.path;
  const rootBeat = beatAt(rootPath, "root");
  if (rootBeat) {
    root.lines = [...root.lines, rootBeat];
    rootPath = { ...rootPath, said: addParts(rootPath.said, rootBeat) };
  }

  const lean = (line: SceneTalkLine) => leanOf(core, line.move, askedTraits);

  /** The close for an ending: a thanks or acceptance answer is itself the close. */
  const closeFor = (
    outcome: Outcome,
    path: Path,
    lastAsker: SceneTalkLine | undefined,
  ): SceneTalkLine | undefined => {
    if (lastAsker && RULES.terminalFollow.includes(lastAsker.move))
      return undefined;
    const moves = ARCS.close[outcome]
      .filter((move) => move !== lastAsker?.move)
      .filter((move) =>
        sceneMoveFits(
          { step: "close", move, role: "asker", ...base, outcome },
          facts,
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
    const moves = sceneMovesWritten({
      step: "close",
      after: reply.move,
    }).sort();
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
    const offered = fresh.slice(zero, maxReplies).flatMap((move) => {
      const reply = render(
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
        `${path.id}:reply:${move}`,
        seen,
      );
      if (!reply) {
        gap("reply", move, path.askerMove);
        return [];
      }
      // A line already offered or said on this path is not offered again.
      if (seen.has(reply.parts[zero] ?? "")) return [];
      reply.round = round;
      return [reply];
    });
    // One extra option from the player's own life, where a piece fits.
    for (const move of fresh) {
      if (offered.length >= maxReplies + one) break;
      const extra = render(
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
        `${path.id}:tagged:${move}`,
        seen,
        true,
      );
      if (!extra || seen.has(extra.parts[zero] ?? "")) continue;
      extra.round = round;
      offered.push(extra);
      break;
    }
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
    const ranked = [...offered].sort(
      (a, b) =>
        lean(b) - lean(a) ||
        stableHash(`${scene}:${path.id}:${a.move}`).localeCompare(
          stableHash(`${scene}:${path.id}:${b.move}`),
        ),
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
      const pool = last && settled.length ? settled : answers;
      const [best] = [...pool].sort(
        (a, b) =>
          leanOf(core, b.candidate, askerTraits) -
            leanOf(core, a.candidate, askerTraits) ||
          stableHash(
            `${scene}:${childPath.id}:follow:${a.candidate}`,
          ).localeCompare(
            stableHash(`${scene}:${childPath.id}:follow:${b.candidate}`),
          ),
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
    node = node?.replies[index]?.next ?? null;
    if (!node) break;
    last =
      node.lines.filter((row) => row.role === "asker").at(-one)?.move ?? last;
  }
  return last;
}
