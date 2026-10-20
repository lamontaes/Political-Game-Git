/**
 * The exchange engine for scenes with a purpose (owner, Oct 15, evening,
 * "what a scene is"; Oct 15, night: scenes are trees). A setup, a person with
 * a purpose, stakes, and an exchange that plays to resolved or refused, with
 * a branch for each thing the player might say. It words nothing itself: the
 * narrator paragraph, the asker's open and statement, the player's replies,
 * the asker's answers and the close are all pieces of
 * `data/english/parts/scene-talk.json`, picked by step, move, purpose, key and
 * the move or piece they answer, and rendered with `renderLine` in the
 * speaker's voice.
 *
 * The arc comes from `data/purpose-arcs.json`: the purpose's statement and
 * reply moves; auto-replies the player's character says unprompted; the
 * asker's answer to each reply move, chosen by the highest sum of trait pulls
 * (a tie by the stable hash); the next replies; a continuation once the
 * purpose resolves; the close by outcome. Nothing is rolled. The branch the
 * page follows first is the one the player's traits lean toward most (the
 * trait engine's act-kind lean); every other reply leads to its own branch,
 * up to the tree's bounds (`scene-talk-rules.json`).
 */
import { traitLean } from "../core2/choice";
import { P } from "../core2/parameters";
import { stableHash } from "../core2/kernel/ids";
import type { CoreState, PersonId } from "../core2/types";
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import arcsFile from "./data/purpose-arcs.json" with { type: "json" };
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { renderLine, type Fact } from "./render";
import type { Director } from "./ledger";

const zero = P.zero;
const one = P.one;
const two = P.two;
const three = two + one;
const four = two + two;

export type SceneTalkStep =
  | "narrate"
  | "open"
  | "state"
  | "auto"
  | "reply"
  | "follow"
  | "continue"
  | "beat"
  | "close";

interface PartUse {
  subject: string;
  step: SceneTalkStep;
  move: string;
  role: "asker" | "asked" | "narrator";
  purpose?: string;
  key?: string;
  after?: string;
  outcome?: "resolved" | "refused" | "open";
  requiresFacts?: string[];
  /** Facts that rule the piece out ("elder": nobody tells an 80-year-old to wait a cycle). */
  excludesFacts?: string[];
}

interface BankPart {
  key: string;
  text: string;
  bearing?: string;
  uses: PartUse[];
}

const PARTS = (sceneTalkBank as unknown as { parts: BankPart[] }).parts;

interface Pull {
  move: string;
  pulls: Record<string, number>;
}

interface Ending {
  id: string;
  label: string;
  keeps: string;
  /**
   * The game screen this ending hands the player to (owner, Oct 19: some
   * scenes should lead to a screen, like drafting a bill): a key of
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
  follow?: Record<string, string | Pull[]>;
  /** This purpose's own next replies (answer move to reply moves). */
  again?: Record<string, string[]>;
  /** After the asker's line of this move ("state" for the statement), the player's character says a line of `move` unprompted. */
  auto?: { after: string; move: string }[];
  /** Named endings (the first that matches the end of a path wins). */
  endings?: Ending[];
  /** Reply moves that may be offered again after an asker move: { askerMove: [replyMoves] }. */
  repeatable?: Record<string, string[]>;
  /** When an exchange resolves the purpose may go on instead of closing: played once. */
  continue?: { on: string; asker: string; replies: string[] }[];
}

interface Arcs {
  parameters: {
    rounds: { value: number };
    baseWeight: { value: number };
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
  follow: Record<string, string | Pull[]>;
  again: Record<string, string[]>;
  close: Record<"resolved" | "refused" | "open", string[]>;
}

const ARCS = arcsFile as unknown as Arcs;
const RULES = rulesFile as unknown as {
  moveActs: Record<string, string[]>;
  terminalFollow: string[];
  tree: { maxReplies: { value: number }; maxNodes: { value: number } };
  bluntGreeting: { value: number };
  tags: Record<string, string>;
};
/**
 * A reply that draws on the player's own life (a fact named `asked_...`: out
 * of work, short on money, a partner, a blunt streak) is offered as one extra,
 * tagged option beside the usual replies, never in place of them (owner,
 * Oct 19: "not every reply needs to be from a memory"; the Baldur's Gate 3
 * model of tagged options).
 */
const taggedBy = (part: BankPart) =>
  part.uses
    .flatMap((u) => u.requiresFacts ?? [])
    .find((name) => name.startsWith("asked_"));

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
   * it is said whenever one fits, so every page reads new (owner, Oct 19:
   * "every batch needs to be different").
   */
  shown?: ReadonlySet<string>;
  /** With `shown`, a seen piece is never said: a review page is all new. */
  freshOnly?: boolean;
}

export type SceneTalkResult =
  { kind: "composed"; talk: SceneTalk } | { kind: "skipped"; reason: string };

const outcomeOf = (move: string): Outcome =>
  (["resolved", "refused", "open"] as const).find((name) =>
    (ARCS.outcomes[name] as string[]).includes(move),
  ) ?? "open";

interface FitUse {
  step: SceneTalkStep | readonly SceneTalkStep[];
  move: string;
  role: PartUse["role"];
  purpose: string;
  key: string;
  after?: string;
  /** The piece key of the line being answered; a part may name it in `after`. */
  afterPiece?: string;
  outcome?: Outcome;
}

/** The pieces that fit a step, a move, a purpose and key, most specific first. */
function fitting(
  use: FitUse,
  facts: Readonly<Record<string, Fact>>,
  keep: (part: BankPart) => boolean = () => true,
): BankPart[] {
  const steps = Array.isArray(use.step) ? use.step : [use.step];
  // What the caller rules out (a seen piece on a review page, a tagged option)
  // is ruled out before the closest fit is chosen, so a ruled-out close fit
  // never hides a looser one that would do.
  const fits = PARTS.filter(keep).flatMap((part) => {
    // A piece may carry one use for each purpose it serves: take the best fit.
    let specific = -one;
    for (const u of part.uses) {
      if (u.subject !== "scene") continue;
      if (!(steps as readonly string[]).includes(u.step) || u.move !== use.move)
        continue;
      if (u.role !== use.role) continue;
      // A fallback piece ("*") serves only a scene with no purpose of its own.
      if (u.purpose && u.purpose !== use.purpose) continue;
      if (u.key && u.key !== use.key) continue;
      if (u.after && u.after !== use.after && u.after !== use.afterPiece)
        continue;
      if (u.outcome && u.outcome !== use.outcome) continue;
      if (u.requiresFacts?.some((name) => !facts[name])) continue;
      if (u.excludesFacts?.some((name) => facts[name])) continue;
      const score =
        (u.purpose && u.purpose !== "*" ? four : zero) +
        (u.key ? two : zero) +
        (u.after ? (u.after === use.afterPiece ? four + four : one) : zero) +
        // A piece that needs a fact the record holds says more than one that does not.
        (u.requiresFacts?.length ?? zero);
      specific = Math.max(specific, score);
    }
    return specific < zero ? [] : [{ part, specific }];
  });
  const best = Math.max(zero, ...fits.map((row) => row.specific));
  return fits.filter((row) => row.specific === best).map((row) => row.part);
}

/** How closely a line's piece was written to answer this reply: 2 for that exact piece, 1 for its move, 0 for neither. */
function linkedTo(line: SceneTalkLine, reply: SceneTalkLine): number {
  const part = PARTS.find((row) => row.key === line.parts[zero]);
  let tier = zero;
  for (const u of part?.uses ?? []) {
    if (u.subject !== "scene" || u.purpose !== line.purpose || !u.after)
      continue;
    if (u.after === reply.parts[zero]) tier = two;
    else if (u.after === reply.move) tier = Math.max(tier, one);
  }
  return tier;
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

/** Sum of an asker's trait pulls on one candidate answer move, plus the base weight. */
function pullOf(
  candidate: Pull,
  traits: Readonly<Record<string, number>>,
): number {
  let sum = ARCS.parameters.baseWeight.value;
  for (const [trait, pull] of Object.entries(candidate.pulls))
    sum += pull * (traits[trait] ?? zero);
  return sum;
}

/** The candidate answer moves for a reply move; a string value means "same as that move". */
function candidatesFor(arc: PurposeArc, move: string): Pull[] {
  const own = arc.follow;
  const table = (name: string) => own?.[name] ?? ARCS.follow[name];
  let at: string | Pull[] | undefined = table(move);
  for (let hops = zero; typeof at === "string" && hops < four; hops += one)
    at = table(at);
  return Array.isArray(at) ? at : [];
}

/** The steps whose pieces vary with how often the page has used them. */
const VARIED: readonly SceneTalkStep[] = ["narrate", "open", "state", "close"];

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
    const steps = Array.isArray(use.step) ? use.step : [use.step];
    // A strict page never repeats a setup piece another scene said: a used
    // piece is out before the closest fit is chosen, so a cast whose record
    // holds a fact falls back to a general line rather than to nothing.
    const strictSetup =
      !!options.usage &&
      !!options.strict &&
      steps.some(
        (step) => step === "narrate" || step === "open" || step === "state",
      );
    // Tagged pieces are only ever the extra option (see taggedBy).
    const every = fitting(
      use,
      facts,
      (part) =>
        !!taggedBy(part) === onlyTagged &&
        !(options.freshOnly && options.shown?.has(part.key)) &&
        !(strictSetup && (options.usage!.get(part.key) ?? zero) > zero),
    );
    if (!every.length && strictSetup) {
      unusedGap = `${purpose}/${steps[zero]}/${use.move}`;
      return null;
    }
    // A piece already said on this branch is not said again while another fits.
    const fresh = every.filter((part) => !said.has(part.key));
    let parts = fresh.length ? fresh : every;
    if (!parts.length) return null;
    const unseen = parts.filter((part) => !options.shown?.has(part.key));
    if (unseen.length || options.freshOnly) parts = unseen;
    if (!parts.length) return null;
    if (
      options.usage &&
      !strictSetup &&
      steps.some((step) => VARIED.includes(step))
    ) {
      // Variety across the page: the least used fitting piece.
      const used = (part: BankPart) => options.usage!.get(part.key) ?? zero;
      const least = Math.min(...parts.map(used));
      parts = parts.filter((part) => used(part) === least);
    }
    const line = renderLine({
      seed: core.seed,
      surface: "dialogue",
      holderId: speakerId,
      bankKey: `scene-talk:${steps[zero]}:${use.move}`,
      version: "scene-talk-v1",
      variants: parts.map((part) => ({
        key: part.key,
        // The bank writes a slot as {name}; the renderer reads {{name}}.
        text: part.text.replace(/\{(\w+)\}/g, "{{$1}}"),
        ...(part.bearing ? { bearing: part.bearing } : {}),
        pieceKey: part.key,
      })),
      facts: Object.fromEntries(
        Object.entries(facts).filter(([, fact]) => fact.text !== ""),
      ),
      momentKey: `${scene}:${moment}`,
      fallbackSourceId: speakerId,
      voice: { traits, register: "scene-talk" },
    });
    if (!line) return null;
    const part = parts.find((row) => row.key === line.variantKey);
    const step = steps[zero]!;
    // A reaction is told, not said ("Ryan Wagner grumbles something and
    // heads for the door"; owner, Oct 19): the narrator speaks it.
    const role = use.move === "react" ? "narrator" : use.role;
    return {
      n: zero,
      step: (part
        ? (part.uses.find((u) => (steps as string[]).includes(u.step))?.step ??
          step)
        : step) as SceneTalkStep,
      role,
      ...(role === "narrator" ? {} : { speakerId }),
      speaker: role === "narrator" ? "Narrator" : nameOf(speakerId),
      text: line.text,
      move: use.move,
      register: "scene-talk",
      ...(part?.bearing ? { bearing: part.bearing } : {}),
      key,
      purpose,
      round: zero,
      ...(use.after ? { after: use.after } : {}),
      ...(use.outcome ? { outcome: use.outcome } : {}),
      parts: [part?.key ?? line.variantKey ?? ""],
      slotRecordIds: [...line.sourceRecordIds],
      ...(onlyTagged && part && taggedBy(part)
        ? { tag: RULES.tags[taggedBy(part)!] ?? taggedBy(part)! }
        : {}),
    };
  };
  let unusedGap = "";
  const none: ReadonlySet<string> = new Set();
  const addParts = (said: ReadonlySet<string>, line: SceneTalkLine) =>
    new Set([...said, ...line.parts]);

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
    PARTS.flatMap((part) => part.uses)
      .filter(
        (u) =>
          u.step === "open" &&
          u.role === "asker" &&
          u.purpose === purpose &&
          u.move !== "greet",
      )
      .map((u) => u.move)
      .at(zero) ?? "greet";
  // Not everyone says hello first: an asker who keeps to themself goes
  // straight to why they came (owner, Oct 19: every scene started the same).
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
      const answers = (
        moves.length ? moves : [{ move: "answer", pulls: {} }]
      ).flatMap((candidate) => {
        const line = render(
          {
            step: "follow",
            move: candidate.move,
            role: "asker",
            ...base,
            after: openAuto.move,
            ...(reacted.parts[zero] ? { afterPiece: reacted.parts[zero] } : {}),
          },
          cast.askerId,
          askerTraits,
          `auto-answer:open:${candidate.move}`,
          said,
        );
        return line ? [{ candidate, line }] : [];
      });
      const [best] = [...answers].sort(
        (a, b) =>
          pullOf(b.candidate, askerTraits) - pullOf(a.candidate, askerTraits) ||
          stableHash(`${scene}:open:${a.candidate.move}`).localeCompare(
            stableHash(`${scene}:open:${b.candidate.move}`),
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
    const answers = (
      answerMoves.length ? answerMoves : [{ move: "answer", pulls: {} }]
    ).flatMap((candidate) => {
      const answer = render(
        {
          step: "follow",
          move: candidate.move,
          role: "asker",
          ...base,
          after: hit.move,
          ...(auto.parts[zero] ? { afterPiece: auto.parts[zero] } : {}),
        },
        cast.askerId,
        traitsOfAsker,
        `auto-answer:${label}:${candidate.move}`,
        current.said,
      );
      return answer ? [{ candidate, answer }] : [];
    });
    const [best] = [...answers].sort(
      (a, b) =>
        pullOf(b.candidate, traitsOfAsker) -
          pullOf(a.candidate, traitsOfAsker) ||
        stableHash(`${scene}:${label}:auto:${a.candidate.move}`).localeCompare(
          stableHash(`${scene}:${label}:auto:${b.candidate.move}`),
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
  // The narrator speaks between lines, not only at the top (owner, Oct 19:
  // "the crowd grows louder"): a beat of the room after the statement and
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

  const lean = (line: SceneTalkLine) =>
    traitLean(core, { traits: askedTraits }, RULES.moveActs[line.move] ?? []);

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
      .filter(
        (move) =>
          fitting(
            { step: "close", move, role: "asker", ...base, outcome },
            facts,
          ).length,
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
    return line && line.text !== lastAsker?.text ? line : undefined;
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
    const moves = [
      ...new Set(
        PARTS.flatMap((part) => part.uses)
          .filter((u) => u.step === "close" && u.after === reply.move)
          .map((u) => u.move),
      ),
    ].sort();
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
  const caughtCandidates = (move: string): Pull[] =>
    (ARCS.lie?.afterCaught[move] ?? [])
      .filter((answer) => answer !== "close")
      .map((answer) => ({ move: answer, pulls: {} }));

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
    // this path is never offered again (owner, Oct 16: no rehashed menus).
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
    const asked = /\?$/.test(lastAsker?.text ?? "");
    // Owner rules (Oct 16): a confront or a threat is answered in kind (the menu
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
      node.end = { outcome, ...closed(closeFor(outcome, path, lastAsker)) };
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
      // The asker's answer, by the highest trait pull. On the last round the
      // asker does not leave a question hanging.
      const last = round >= maxRounds;
      // Once a caught lie is past, the talk goes back to the purpose's own answers.
      const caughtPulls = path.caught ? caughtCandidates(reply.move) : [];
      const pulls = caughtPulls.length
        ? caughtPulls
        : candidatesFor(arc, reply.move);
      const worded = pulls.flatMap((candidate) => {
        const line = render(
          {
            step: "follow",
            move: candidate.move,
            role: "asker",
            ...base,
            after: reply.move,
            ...(reply.parts[zero] ? { afterPiece: reply.parts[zero] } : {}),
          },
          cast.askerId,
          askerTraits,
          `${childPath.id}:follow:${candidate.move}`,
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
        (row) =>
          RULES.terminalFollow.includes(row.candidate.move) ||
          !row.line.text.trim().endsWith("?"),
      );
      const pool = last && settled.length ? settled : answers;
      const [best] = [...pool].sort(
        (a, b) =>
          pullOf(b.candidate, askerTraits) - pullOf(a.candidate, askerTraits) ||
          stableHash(
            `${scene}:${childPath.id}:follow:${a.candidate.move}`,
          ).localeCompare(
            stableHash(`${scene}:${childPath.id}:follow:${b.candidate.move}`),
          ),
      );
      // On the last round a question would hang: the asker closes instead.
      const answer =
        last && best && /\?$/.test(best.line.text) ? undefined : best?.line;
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
        next.end = {
          outcome: settledOutcome,
          ...closed(closeFor(settledOutcome, answered, lastAnswer)),
        };
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

  // Number every line once, in the order the tree is read; collect the
  // trait-led path, the rounds and the endings.
  let count = zero;
  const take = (line: SceneTalkLine) => {
    count += one;
    line.n = count;
  };
  take(narrate);
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
  const endingCounts: Record<string, number> = {};
  const resolveEndings = (
    node: TreeNode,
    context: {
      replies: string[];
      askerMove: string;
      caught: boolean;
      believed: boolean;
    },
  ) => {
    let askerMove = context.askerMove;
    // A narrator's beat is not the asker's move: the ending reads past it.
    for (const line of node.lines)
      if (line.role !== "narrator") askerMove = line.move;
    for (const reply of node.replies)
      if (reply.next)
        resolveEndings(reply.next, {
          ...context,
          askerMove,
          replies: [...context.replies, reply.line.move],
        });
    for (const branch of node.branches ?? [])
      resolveEndings(branch.node, {
        ...context,
        askerMove,
        caught: branch.knows,
        believed: !branch.knows,
      });
    if (node.end) {
      // An end never leaves the asker's question hanging or invites speech.
      const lastAsk =
        node.end.close ?? node.lines.filter((l) => l.role === "asker").at(-one);
      const text = lastAsk?.text.trim() ?? "";
      if (
        /\?$/.test(text) ||
        /^(go|go ahead|go on|say it|speak)[.!]?$/i.test(text)
      )
        gap("end", "dangling", `"${text}"`);
    }
    if (!node.end || !arc.endings) return;
    const last = context.replies.at(-one);
    const found = arc.endings.find((row) => {
      const when = row.when;
      return (
        (!when.reply || (last !== undefined && when.reply.includes(last))) &&
        (!when.asker || when.asker.includes(askerMove)) &&
        (!when.anyReply ||
          context.replies.some((move) => when.anyReply!.includes(move))) &&
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
    replies: [],
    askerMove: arc.state,
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
    narrate,
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
      narration: [narrate],
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
}

/** A close, if there is one, as the field of an ending. */
function closed(close: SceneTalkLine | undefined): { close?: SceneTalkLine } {
  return close ? { close } : {};
}
