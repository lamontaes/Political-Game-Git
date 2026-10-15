/**
 * The exchange engine for scenes with a purpose (owner, Oct 15, evening,
 * "what a scene is"): a setup, a person with a purpose, stakes, and an
 * exchange that plays to resolved or refused. It words nothing itself: the
 * narrator paragraph, the asker's open and statement, the player's four
 * replies, the asker's answer and the close are all pieces of
 * `data/english/parts/scene-talk.json`, picked by step, move, purpose, key and
 * the move they answer, and rendered with `renderLine` in the speaker's voice.
 *
 * The arc comes from `data/purpose-arcs.json` (the purpose's statement and
 * reply moves; the asker's answer to each reply move, chosen by the highest
 * sum of trait pulls, a tie by the stable hash; the next four replies; the
 * close by outcome). Nothing is rolled. The reply the page follows is the one
 * the player's traits lean toward most (the trait engine's act-kind lean).
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
const four = two + two;

export type SceneTalkStep =
  "narrate" | "open" | "state" | "reply" | "follow" | "close";

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

interface Arcs {
  parameters: {
    rounds: { value: number };
    baseWeight: { value: number };
  };
  purposes: Record<
    string,
    {
      state: string;
      replies: string[];
      /** This purpose's own answers (reply move to candidates), before the shared ones. */
      follow?: Record<string, string | Pull[]>;
      /** This purpose's own next replies (answer move to reply moves). */
      again?: Record<string, string[]>;
    }
  >;
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
};

export type Outcome = "resolved" | "refused" | "open";

/** One line of a composed scene, with the features the grading bench records. */
export interface SceneTalkLine {
  /** Its number in the scene, from 1. */
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
  /** The reply round it belongs to (0 for the setup and the open). */
  round: number;
  /** The reply the page follows, among the four. */
  chosen?: boolean;
  /** The previous asker or asked move it answers. */
  after?: string;
  outcome?: Outcome;
  /** The bank part that said it. */
  parts: string[];
  slotRecordIds: string[];
}

export interface SceneTalkRound {
  round: number;
  replies: SceneTalkLine[];
  chosen: SceneTalkLine;
  /** The asker's answer to the chosen reply. */
  answer?: SceneTalkLine;
}

export interface SceneTalk {
  typeKey: string;
  purpose: string;
  askerId: PersonId;
  askedId: PersonId;
  narration: SceneTalkLine[];
  open?: SceneTalkLine;
  state: SceneTalkLine;
  rounds: SceneTalkRound[];
  close?: SceneTalkLine;
  outcome: Outcome;
  /** The same scene through a refusing or open reply, when the first path resolved at once. */
  pushBack?: SceneTalk;
  /** Every line in the order shown. */
  lines: SceneTalkLine[];
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

export type SceneTalkResult =
  { kind: "composed"; talk: SceneTalk } | { kind: "skipped"; reason: string };

const outcomeOf = (move: string): Outcome =>
  (["resolved", "refused", "open"] as const).find((name) =>
    (ARCS.outcomes[name] as string[]).includes(move),
  ) ?? "open";

interface FitUse {
  step: SceneTalkStep;
  move: string;
  role: PartUse["role"];
  purpose: string;
  key: string;
  after?: string;
  /** The piece key of the reply being answered; a follow part may name it in `after`. */
  afterPiece?: string;
  outcome?: Outcome;
}

/** The pieces that fit a step, a move, a purpose and key, most specific first. */
function fitting(
  use: FitUse,
  facts: Readonly<Record<string, Fact>>,
): BankPart[] {
  const fits = PARTS.flatMap((part) => {
    // A piece may carry one use for each purpose it serves: take the best fit.
    let specific = -one;
    for (const u of part.uses) {
      if (u.subject !== "scene") continue;
      if (u.step !== use.step || u.move !== use.move) continue;
      if (u.role !== use.role) continue;
      if (u.purpose && u.purpose !== use.purpose) continue;
      if (u.key && u.key !== use.key) continue;
      if (u.after && u.after !== use.after && u.after !== use.afterPiece)
        continue;
      if (u.outcome && u.outcome !== use.outcome) continue;
      if (u.requiresFacts?.some((name) => !facts[name])) continue;
      const score =
        (u.purpose ? four : zero) +
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
function candidatesFor(purpose: string, move: string): Pull[] {
  const own = ARCS.purposes[purpose]?.follow;
  const table = (name: string) => own?.[name] ?? ARCS.follow[name];
  let at: string | Pull[] | undefined = table(move);
  for (let hops = zero; typeof at === "string" && hops < four; hops += one)
    at = table(at);
  return Array.isArray(at) ? at : [];
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
  const main = playScene(core, cast, type, facts, voice, options);
  if (main.kind !== "composed" || !options.pushBack) return main;
  // When the player's own lean resolves the purpose at once, the exchange the
  // owner wants to see is the one where they push back: the same scene through
  // the highest-ranked reply whose outcome is refused or open.
  const first = main.talk.rounds.at(-main.talk.rounds.length)?.chosen;
  if (
    !first ||
    outcomeOf(first.move) !== "resolved" ||
    main.talk.rounds.length > one
  )
    return main;
  const pushed = playScene(core, cast, type, facts, voice, {
    ...options,
    restrictFirst: (line) => outcomeOf(line.move) !== "resolved",
  });
  return pushed.kind === "composed" &&
    pushed.talk.rounds[zero]?.chosen.text !== first.text
    ? { kind: "composed", talk: { ...main.talk, pushBack: pushed.talk } }
    : main;
}

/** What a caller may ask of a composed scene. */
export interface SceneTalkOptions {
  /** Also compose the path through a refusing or open reply when the first path resolves at once. */
  pushBack?: boolean;
  /** Pieces other scenes on the page already said for the setup and the open; avoided while another fits. */
  avoid?: ReadonlySet<string>;
  /** Internal: the first round's chosen reply must satisfy this. */
  restrictFirst?: (line: SceneTalkLine) => boolean;
}

function playScene(
  core: Readonly<CoreState>,
  cast: SceneTalkCast,
  type: PurposeType,
  facts: Readonly<Record<string, Fact>>,
  voice: SceneTalkVoice,
  options: SceneTalkOptions,
): SceneTalkResult {
  const purpose = type.purpose;
  const arc = purpose ? ARCS.purposes[purpose] : undefined;
  if (!purpose || !arc)
    return { kind: "skipped", reason: `${type.key} has no purpose arc` };
  const key = type.tag?.key ?? type.key;
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
  const lines: SceneTalkLine[] = [];
  const said = new Set<string>();

  const render = (
    use: FitUse,
    speakerId: PersonId,
    traits: Readonly<Record<string, number>>,
    moment: string,
  ): SceneTalkLine | null => {
    const every = fitting(use, facts);
    // A piece already said in this scene is not said again while another fits.
    const setup = use.step === "narrate" || use.step === "open";
    const fresh = every.filter(
      (part) => !said.has(part.key) && !(setup && options.avoid?.has(part.key)),
    );
    const parts = fresh.length ? fresh : every;
    if (!parts.length) return null;
    const line = renderLine({
      seed: core.seed,
      surface: "dialogue",
      holderId: speakerId,
      bankKey: `scene-talk:${use.step}:${use.move}`,
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
    const made: SceneTalkLine = {
      n: lines.length + one,
      step: use.step,
      role: use.role,
      ...(use.role === "narrator" ? {} : { speakerId }),
      speaker: use.role === "narrator" ? "Narrator" : nameOf(speakerId),
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
    };
    return made;
  };
  const push = (line: SceneTalkLine, round: number): SceneTalkLine => {
    for (const key of line.parts) said.add(key);
    line.n = lines.length + one;
    line.round = round;
    lines.push(line);
    return line;
  };
  const base = { purpose, key };

  // The setup: the narrator's paragraph for this purpose and key.
  const narrate = render(
    { step: "narrate", move: "narrate", role: "narrator", ...base },
    cast.askerId,
    // The narrator has no traits: the setup reads the same for every profile.
    {},
    "narrate",
  );
  if (!narrate)
    return {
      kind: "skipped",
      reason: `no narration for ${purpose} can be worded from the records given`,
    };
  push(narrate, zero);
  const open = render(
    { step: "open", move: "greet", role: "asker", ...base },
    cast.askerId,
    askerTraits,
    "open",
  );
  if (open) push(open, zero);
  const statement = render(
    { step: "state", move: arc.state, role: "asker", ...base },
    cast.askerId,
    askerTraits,
    "state",
  );
  if (!statement)
    return {
      kind: "skipped",
      reason: `the ${arc.state} that states ${purpose} cannot be worded from the records given`,
    };
  push(statement, zero);

  const rounds: SceneTalkRound[] = [];
  let replyMoves = arc.replies;
  let outcome: Outcome = "open";
  let lastAsker = arc.state;
  const maxRounds = ARCS.parameters.rounds.value;
  for (let round = one; round <= maxRounds; round += one) {
    const offered: SceneTalkLine[] = [];
    const answeredMove = rounds.at(-one)?.answer?.move ?? arc.state;
    for (const move of replyMoves) {
      const reply = render(
        {
          step: "reply",
          move,
          role: "asked",
          ...base,
          after: answeredMove,
          // The reply may name the question it answers by the piece's own key.
          ...(rounds.at(-one)?.answer?.parts[zero]
            ? { afterPiece: rounds.at(-one)!.answer!.parts[zero]! }
            : {}),
        },
        cast.askedId,
        askedTraits,
        `reply:${round}:${move}`,
      );
      if (reply) offered.push(reply);
    }
    if (offered.length < two) {
      if (round === one)
        return {
          kind: "skipped",
          reason: `fewer than two replies of ${replyMoves.join("/")} can be worded for ${purpose}`,
        };
      break;
    }
    // The page follows the reply the player's traits lean toward most.
    const lean = (line: SceneTalkLine) =>
      traitLean(core, { traits: askedTraits }, RULES.moveActs[line.move] ?? []);
    const ranked = [...offered].sort(
      (a, b) =>
        lean(b) - lean(a) ||
        stableHash(`${scene}:${round}:${a.move}`).localeCompare(
          stableHash(`${scene}:${round}:${b.move}`),
        ),
    );
    const allowed =
      round === one && options.restrictFirst
        ? ranked.filter(options.restrictFirst)
        : ranked;
    const [chosen] = (allowed.length ? allowed : ranked) as [SceneTalkLine];
    chosen.chosen = true;
    for (const reply of offered) push(reply, round);
    outcome = outcomeOf(chosen.move);

    // The asker's answer, by the highest trait pull. On the last round the
    // asker does not leave a question hanging: a thanks or an acceptance, or
    // a statement, is preferred to a question nobody can answer.
    const last = round === maxRounds;
    const worded = candidatesFor(purpose, chosen.move).flatMap((candidate) => {
      const line = render(
        {
          step: "follow",
          move: candidate.move,
          role: "asker",
          ...base,
          after: chosen.move,
          ...(chosen.parts[zero] ? { afterPiece: chosen.parts[zero] } : {}),
        },
        cast.askerId,
        askerTraits,
        `follow:${round}:${candidate.move}`,
      );
      return line ? [{ candidate, line }] : [];
    });
    const settled = worded.filter(
      (row) =>
        RULES.terminalFollow.includes(row.candidate.move) ||
        !row.line.text.trim().endsWith("?"),
    );
    const pool = last && settled.length ? settled : worded;
    const best = [...pool]
      .sort(
        (a, b) =>
          pullOf(b.candidate, askerTraits) - pullOf(a.candidate, askerTraits) ||
          stableHash(
            `${scene}:${round}:follow:${a.candidate.move}`,
          ).localeCompare(
            stableHash(`${scene}:${round}:follow:${b.candidate.move}`),
          ),
      )
      .at(zero);
    const answer = best?.line ?? null;
    if (answer) {
      push(answer, round);
      lastAsker = answer.move;
    }
    rounds.push({
      round,
      replies: offered,
      chosen,
      ...(answer ? { answer } : {}),
    });
    // The exchange goes on while the asker pushes or asks; a thanks or an
    // acceptance ends it.
    const terminal = answer ? RULES.terminalFollow.includes(answer.move) : true;
    const next = answer
      ? (arc.again?.[answer.move] ?? ARCS.again[answer.move])
      : undefined;
    if (!next || last || terminal) break;
    replyMoves = next;
  }

  // A thanks or an acceptance is itself the close; any other ending closes
  // with the purpose's close pieces, never a bare goodbye after a question.
  const finalAnswer = rounds.at(-one)?.answer;
  const answeredClose =
    finalAnswer && RULES.terminalFollow.includes(finalAnswer.move)
      ? finalAnswer
      : undefined;
  // The close, by outcome: never a bare goodbye after a question.
  const closeMoves = ARCS.close[outcome].filter((move) => move !== lastAsker);
  const closeCandidates = closeMoves.filter(
    (move) =>
      fitting({ step: "close", move, role: "asker", ...base, outcome }, facts)
        .length,
  );
  const closeMove = [...closeCandidates]
    .sort((a, b) =>
      stableHash(`${scene}:close:${a}`).localeCompare(
        stableHash(`${scene}:close:${b}`),
      ),
    )
    .at(zero);
  const close =
    closeMove && !answeredClose
      ? render(
          { step: "close", move: closeMove, role: "asker", ...base, outcome },
          cast.askerId,
          askerTraits,
          "close",
        )
      : null;
  // The close never says again what was just said.
  const repeats = close?.text === lines.at(-one)?.text;
  if (close && !answeredClose && !repeats) push(close, rounds.length);

  return {
    kind: "composed",
    talk: {
      typeKey: type.key,
      purpose,
      askerId: cast.askerId,
      askedId: cast.askedId,
      narration: lines.filter((line) => line.step === "narrate"),
      ...(open ? { open } : {}),
      state: statement,
      rounds,
      // With no close piece that fits, the asker's last answer is where it ends.
      ...((answeredClose ?? (repeats ? undefined : close))
        ? { close: (answeredClose ?? close)! }
        : {}),
      outcome,
      lines,
    },
  };
}
