/**
 * The English engine's half of a scene with a purpose. The
 * director says what is happening: the purpose, the situation key, who speaks,
 * the move each turn makes, the line it answers and the facts on record. This
 * module says how: it holds the scene-talk bank
 * (`data/english/parts/scene-talk.json`), picks the piece that fits the move
 * and the facts, and words it in the speaker's voice. The director never
 * reads the bank.
 *
 * A piece fits a move by its step, move, role, purpose, situation key, the
 * move or piece it answers, the outcome it closes on, the facts it needs and
 * the facts that rule it out. The closest fit wins: a piece written for this
 * purpose beats a shared one, one written to answer this exact line beats one
 * written for its move, and one that names a fact the record holds says more
 * than one that does not. Nothing is rolled: among equal fits the renderer's
 * stable pick by the speaker's voice chooses.
 */
import { P } from "../core2/parameters";
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import tagsFile from "../../data/english/scene-talk-tags.json" with { type: "json" };
import moveSetsFile from "../../data/english/scene-move-sets.json" with { type: "json" };
import { conversationPacket, renderLine, type Fact } from "./bank-line";
import {
  composeJoinedLine,
  LINE_PARTS,
  type LinePart,
} from "./english-composition";
import { stableHash } from "../core2/kernel/ids";

export type { Fact };
import { admittedParts, directorSlots } from "./bank-parts";
import { sentenceStarts } from "./said-as";
import {
  follows,
  REPLY_FOLLOWS,
  type ReplyFollowsTable,
} from "./reply-follows";

const zero = P.zero;
const one = P.one;
const two = P.two;
const four = two + two;
const eight = four + four;
const sixteen = eight + eight;

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

export type SceneTalkRole = "asker" | "asked" | "narrator";

export interface PartUse {
  subject: string;
  step: SceneTalkStep;
  move: string;
  role: SceneTalkRole;
  purpose?: string;
  /**
   * A shared move set (data/english/scene-move-sets.json) in place of one
   * purpose: the piece serves every purpose the set lists.
   */
  set?: string;
  key?: string;
  after?: string;
  outcome?: "resolved" | "refused" | "open";
  requiresFacts?: string[];
  /** Facts that rule the piece out ("elder": nobody tells an 80-year-old to wait a cycle). */
  excludesFacts?: string[];
}

export interface BankPart {
  key: string;
  text: string;
  bearing?: string;
  uses: PartUse[];
  /**
   * A piece of a sentence the engine joins (the `words-engine` skill, "How a
   * joined piece says so"): `of` names the sentence, `part` which part of it
   * this is, and `required` whether every such sentence has that part.
   */
  piece?: {
    of: string;
    part: LinePart;
    required?: boolean;
    /** An opener that itself says the speaker's side: the core's yes or no is not said again. */
    stand?: boolean;
  };
}

const PARTS = (sceneTalkBank as unknown as { parts: BankPart[] }).parts;
/** What play may say: a part the owner's grades hold back is not. */
const SHIPPED = admittedParts(PARTS);
const SHIPPED_KEYS = new Set(SHIPPED.map((part) => part.key));
/**
 * A piece that calls the other person by their first name ("Thank you,
 * {first}."). A voice that has done it on a branch does not do it on every
 * line after (owner, batch 3: the name tag on every line): while another
 * piece fits, the next line leaves the name off, and a piece that tags the
 * name after a comma ("Thank you, {first}.") is said without it.
 */
const VOCATIVE = /\{first\}/;
const TAIL_NAME = /, \{\{first\}\}(?=[.?!,;])/g;
const VOCATIVE_KEYS = new Set(
  PARTS.filter((part) => VOCATIVE.test(part.text)).map((part) => part.key),
);
/** Whether play may say this piece: the owner's grades do not hold it. */
export function shipped(partKey: string): boolean {
  return SHIPPED_KEYS.has(partKey);
}
const PART_BY_KEY = new Map(PARTS.map((part) => [part.key, part]));
const TAGS = (tagsFile as unknown as { tags: Record<string, string> }).tags;

/** A turn the director asks to have worded. */
export interface SceneMove {
  step: SceneTalkStep | readonly SceneTalkStep[];
  move: string;
  role: SceneTalkRole;
  purpose: string;
  /**
   * The purpose this one is a variant of (src/director/arc-variant.ts): a
   * piece written for the family serves the variant where the variant has
   * none of its own, and a piece written for the variant beats the family's.
   */
  family?: string;
  key: string;
  /** The move being answered. */
  after?: string;
  /** The piece key of the line being answered; a piece may name it in `after`. */
  afterPiece?: string;
  outcome?: "resolved" | "refused" | "open";
}

/** How a review page or a play session limits the wording. */
export interface SceneWordingOptions {
  /** How often each piece was already used on this page (variety across scenes). */
  usage?: ReadonlyMap<string, number>;
  /** Only a setup piece no other scene on the page used. */
  strict?: boolean;
  /** Pieces seen on earlier pages, preferred unseen. */
  shown?: ReadonlySet<string>;
  /** Seen pieces are never said (a review page shows only new wording). */
  freshOnly?: boolean;
  /**
   * Grading only: word from every part, the ones the owner's grades hold
   * back too, as the bench's grading view and the tests do. Play never sets
   * it, so a scene whose only words are held stays out of play.
   */
  includeHeld?: boolean;
  /** The "no" verdicts the picker reads instead of the file's (the tests pass a fixture). */
  replyFollows?: ReplyFollowsTable;
  /** The pieces the picker reads instead of the bank's (the tests pass a fixture). */
  parts?: readonly BankPart[];
}

/** A worded turn: its text, the piece it came from and what the piece carries. */
export interface WordedMove {
  text: string;
  pieceKey: string;
  /** Every piece a joined sentence was made of, in order; absent for a whole piece. */
  pieceKeys?: readonly string[];
  /** The step the piece was written for (a "continue" may fall back to "follow"). */
  step: SceneTalkStep;
  bearing?: string;
  /** The tag shown on an extra option drawn from the player's own life ("Out of work"). */
  tag?: string;
  /** The line asks a question, so the director knows it wants an answer. */
  asks: boolean;
  /** The line invites the other to speak ("Go ahead."), so it cannot end a scene. */
  invites: boolean;
  slotRecordIds: readonly string[];
}

/** A line that hands the floor to the other person. */
const INVITES = /^(go|go ahead|go on|say it|speak)[.!]?$/i;

/** The steps whose pieces vary with how often the page has used them. */
const VARIED: readonly SceneTalkStep[] = ["narrate", "open", "state", "close"];

/**
 * A reply that draws on the player's own life (a fact named `asked_...`: out
 * of work, short on money, a partner, a blunt streak) is offered as one extra,
 * tagged option beside the usual replies, never in place of them.
 */
const taggedBy = (part: BankPart) =>
  part.uses
    .flatMap((u) => u.requiresFacts ?? [])
    .find((name) => name.startsWith("asked_"));

/** Where a scene is said: the part of a move that decides which pieces serve it at all. */
export type SceneSpot = Pick<SceneMove, "purpose" | "family" | "key">;

/** The purposes each shared move set serves (data/english/scene-move-sets.json). */
const MOVE_SETS = new Map(
  Object.entries(
    (
      moveSetsFile as unknown as {
        sets: Record<string, { purposes: string[] }>;
      }
    ).sets,
  ).map(([name, row]) => [name, new Set(row.purposes)]),
);

/** Whether a use's purpose, or the shared move set it names, is this purpose (or its family). */
export function usesPurpose(
  u: Pick<PartUse, "purpose" | "set">,
  purpose: string,
  family?: string,
): boolean {
  if (u.set) {
    const serves = MOVE_SETS.get(u.set);
    return (
      !!serves && (serves.has(purpose) || (!!family && serves.has(family)))
    );
  }
  return u.purpose === purpose || (!!family && u.purpose === family);
}

/** Whether a use serves this purpose and situation key (a fallback "*" serves only a scene with no purpose of its own). */
export function usesSpot(u: PartUse, use: SceneSpot): boolean {
  if ((u.purpose || u.set) && !usesPurpose(u, use.purpose, use.family))
    return false;
  return !(u.key && u.key !== use.key);
}

/**
 * A use may answer a step's move ("follow-ask": whatever the asker asked as a
 * follow-up, never the opening statement): it fits when the line answered is
 * a piece written for that step and move.
 */
const STEP_MOVE = /^(?:open|state|reply|follow|continue|close)-[a-z-]+$/;
function answersStep(after: string, answered: string | undefined): boolean {
  return (
    STEP_MOVE.test(after) &&
    !!answered &&
    answered.startsWith(`scene-talk.${after}.`)
  );
}

/**
 * How closely one use of a piece fits a move, or -1 where it does not fit at
 * all. The one test `fitting` and the reply pairs (`reply-pairs.ts`) both
 * make, so the pairs the judges see are the pairs the picker can offer.
 */
export function useFit(
  u: PartUse,
  use: SceneMove,
  steps: readonly string[],
  facts: Readonly<Record<string, Fact>>,
): number {
  if (u.subject !== "scene") return -one;
  if (!steps.includes(u.step) || u.move !== use.move) return -one;
  if (u.role !== use.role) return -one;
  if (!usesSpot(u, use)) return -one;
  if (
    u.after &&
    u.after !== use.after &&
    u.after !== use.afterPiece &&
    !answersStep(u.after, use.afterPiece)
  )
    return -one;
  if (u.outcome && u.outcome !== use.outcome) return -one;
  if (u.requiresFacts?.some((name) => !facts[name])) return -one;
  if (u.excludesFacts?.some((name) => facts[name])) return -one;
  return (
    // A piece written for a variant beats the family's, whatever facts either needs.
    (use.family && u.purpose === use.purpose ? sixteen : zero) +
    (u.purpose && u.purpose !== "*" ? four : zero) +
    // A shared move set names the purposes it serves, so a piece of it fits
    // as closely as one written for the purpose's own situation key.
    (u.set ? four + two : zero) +
    (u.key ? two : zero) +
    (u.after ? (u.after === use.afterPiece ? four + four : one) : zero) +
    // A piece that needs a fact the record holds says more than one that does not.
    (u.requiresFacts?.length ?? zero)
  );
}

/**
 * The pieces that fit a move, most specific first; what `keep` rules out is
 * out before the closest is chosen. A piece the reply verdicts say does not
 * follow the line it answers (`afterPiece`) is out too, unless that would
 * leave nothing for the move: a spot is never silent.
 */
export function fitting(
  use: SceneMove,
  facts: Readonly<Record<string, Fact>>,
  keep: (part: BankPart) => boolean = () => true,
  parts: readonly BankPart[] = SHIPPED,
  verdicts: ReplyFollowsTable = REPLY_FOLLOWS,
): BankPart[] {
  return scoredFits(
    use,
    facts,
    (part) => wholeLine(part) && keep(part),
    parts,
    verdicts,
    true,
  ).parts;
}

/**
 * A shared move set's piece (a liked line carried as a set's opener) is
 * still a whole line for the purposes that name it directly: "People say a
 * lot of things." opens the on-record set's deflection and is still said
 * whole to a colleague's confrontation over a vote. Any other piece is never
 * said whole.
 */
const carriedWhole = (part: BankPart) =>
  !!part.piece && part.uses.some((u) => u.set) && part.uses.some((u) => !u.set);
const wholeLine = (part: BankPart) => !part.piece || carriedWhole(part);

/** The closest-fitting pieces and how closely they fit (-1 when none do). */
function scoredFits(
  use: SceneMove,
  facts: Readonly<Record<string, Fact>>,
  keep: (part: BankPart) => boolean,
  parts: readonly BankPart[],
  verdicts: ReplyFollowsTable,
  whole = false,
): { parts: BankPart[]; specific: number } {
  const steps = Array.isArray(use.step) ? use.step : [use.step];
  const fits = parts.filter(keep).flatMap((part) => {
    // A piece may carry one use for each purpose it serves: take the best fit.
    // Said whole, a carried piece answers only to its own purposes' uses.
    let specific = -one;
    for (const u of part.uses)
      if (!(whole && part.piece && u.set))
        specific = Math.max(specific, useFit(u, use, steps, facts));
    return specific < zero ? [] : [{ part, specific }];
  });
  const answered = use.afterPiece;
  const following = answered
    ? fits.filter((row) => follows(row.part.key, answered, verdicts))
    : fits;
  const rows = following.length ? following : fits;
  if (!rows.length) return { parts: [], specific: -one };
  const best = Math.max(...rows.map((row) => row.specific));
  return {
    parts: rows.filter((row) => row.specific === best).map((row) => row.part),
    specific: best,
  };
}

/** A sentence the engine can join for a move: its pieces by part, and how closely its core fits. */
export interface JoinedSentence {
  of: string;
  specific: number;
  parts: Partial<Record<LinePart, BankPart[]>>;
  required: ReadonlySet<LinePart>;
}

/**
 * The sentences joined from pieces that fit a move, most specific first. A
 * sentence fits when every part it requires has a piece that fits; within a
 * part the closest-fitting pieces serve, and the sentence fits as closely as
 * its core.
 */
export function joinedFitting(
  use: SceneMove,
  facts: Readonly<Record<string, Fact>>,
  keep: (part: BankPart) => boolean = () => true,
  parts: readonly BankPart[] = SHIPPED,
  verdicts: ReplyFollowsTable = REPLY_FOLLOWS,
): JoinedSentence[] {
  const bySentence = new Map<string, BankPart[]>();
  for (const part of parts)
    if (part.piece && keep(part))
      bySentence.set(part.piece.of, [
        ...(bySentence.get(part.piece.of) ?? []),
        part,
      ]);
  const out: JoinedSentence[] = [];
  for (const [of, pieces] of bySentence) {
    const required = new Set<LinePart>(
      pieces.filter((p) => p.piece!.required).map((p) => p.piece!.part),
    );
    required.add("core");
    const sentence: JoinedSentence = {
      of,
      specific: -one,
      parts: {},
      required,
    };
    let fits = true;
    for (const name of LINE_PARTS) {
      const fit = scoredFits(
        use,
        facts,
        (p) => p.piece!.part === name,
        pieces,
        verdicts,
      );
      if (!fit.parts.length) {
        if (required.has(name)) fits = false;
        continue;
      }
      sentence.parts[name] = fit.parts;
      if (name === "core") sentence.specific = fit.specific;
    }
    if (fits) out.push(sentence);
  }
  const best = Math.max(-one, ...out.map((row) => row.specific));
  return out.filter((row) => row.specific === best);
}

/**
 * Word one turn of a scene: the piece that fits the move and the facts, not
 * already said on this branch while another fits, in the speaker's voice.
 * Null where nothing fits; `{ unused }` where a strict page has no piece left
 * that no other scene used (a gap the page reports).
 */
export function wordSceneMove(input: {
  move: SceneMove;
  facts: Readonly<Record<string, Fact>>;
  seed: string;
  speakerId: string;
  traits: Readonly<Record<string, number>>;
  momentKey: string;
  /** Pieces already said on this branch. */
  said: ReadonlySet<string>;
  /** Only the extra option drawn from the player's own life. */
  tagged?: boolean;
  options?: SceneWordingOptions;
}): WordedMove | { unused: string } | null {
  const { move: use, facts } = input;
  const options = input.options ?? {};
  const onlyTagged = input.tagged ?? false;
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
  // Tagged pieces are only ever the extra option.
  const keepPart = (part: BankPart) =>
    !!taggedBy(part) === onlyTagged &&
    !(options.freshOnly && options.shown?.has(part.key)) &&
    !(strictSetup && (options.usage!.get(part.key) ?? zero) > zero);
  const pool = options.parts ?? (options.includeHeld ? PARTS : SHIPPED);
  const verdicts = options.replyFollows ?? REPLY_FOLLOWS;
  const whole = scoredFits(
    use,
    facts,
    (part) => wholeLine(part) && keepPart(part),
    pool,
    verdicts,
    true,
  );
  const every = whole.parts;
  // Sentences joined from pieces fit as closely as their core; one that fits
  // more closely than every whole piece is said instead, and at an equal fit
  // the two kinds share the pick.
  const joined = joinedFitting(use, facts, keepPart, pool, verdicts).filter(
    (row) => !every.length || row.specific >= whole.specific,
  );
  if (!every.length && !joined.length && strictSetup)
    return { unused: `${use.purpose}/${steps[zero]}/${use.move}` };
  const named = [...input.said].some((key) => VOCATIVE_KEYS.has(key));
  if (joined.length) {
    const unsaid = joined.flatMap((row) =>
      unsaidSentence(row, input.said, named, options),
    );
    // Every sentence said on this branch already: one is said again rather
    // than leave the spot silent.
    const sentences = unsaid.length
      ? unsaid
      : joined.flatMap((row) => unsaidSentence(row, new Set(), named, options));
    const wholeShare =
      every.length && joined[zero]!.specific === whole.specific
        ? every.length
        : zero;
    const order = sentences.length
      ? Number(
          BigInt(
            `0x${stableHash(`${input.seed}:${input.momentKey}:${use.purpose}:${use.move}:joined`)}`,
          ) % BigInt(sentences.length + wholeShare),
        )
      : wholeShare;
    // The sentence the stable pick lands on first, then the rest, so a
    // sentence whose facts cannot all be worded gives way to the next.
    for (let at = zero; at < sentences.length; at++) {
      const pick = (order + at) % (sentences.length + wholeShare);
      if (pick >= sentences.length) break;
      const worded = joinedMove(input, steps, sentences[pick]!, named);
      if (worded) return worded;
    }
    if (!wholeShare) return null;
  }
  // A variant's own pieces come first; once they have all been said on this
  // branch, the family's pieces serve again (the variant writes what makes it
  // differ, and the family's lines carry the rest of the exchange).
  const kinOf =
    use.family && !every.some((part) => !input.said.has(part.key))
      ? fitting(
          { ...use, purpose: use.family, family: undefined },
          facts,
          (part) =>
            !!taggedBy(part) === onlyTagged &&
            !(options.freshOnly && options.shown?.has(part.key)) &&
            !(strictSetup && (options.usage!.get(part.key) ?? zero) > zero),
          pool,
          options.replyFollows,
        ).filter((part) => !input.said.has(part.key))
      : [];
  // A piece already said on this branch is not said again while another fits.
  const fresh = kinOf.length
    ? kinOf
    : every.filter((part) => !input.said.has(part.key));
  let parts = fresh.length ? fresh : every;
  if (!parts.length) return null;
  if (named) {
    const plain = parts.filter((part) => !VOCATIVE_KEYS.has(part.key));
    if (plain.length) parts = plain;
  }
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
    seed: input.seed,
    surface: "dialogue",
    holderId: input.speakerId,
    bankKey: `scene-talk:${steps[zero]}:${use.move}`,
    version: "scene-talk-v1",
    variants: parts.map((part) => ({
      key: part.key,
      text: named
        ? directorSlots(part.text).replace(TAIL_NAME, "")
        : directorSlots(part.text),
      ...(part.bearing ? { bearing: part.bearing } : {}),
      pieceKey: part.key,
    })),
    facts: Object.fromEntries(
      Object.entries(facts).filter(([, fact]) => fact.text !== ""),
    ),
    momentKey: input.momentKey,
    fallbackSourceId: input.speakerId,
    voice: { traits: input.traits, register: "scene-talk" },
  });
  if (!line) return null;
  const part = parts.find((row) => row.key === line.variantKey);
  const tag = onlyTagged && part ? taggedBy(part) : undefined;
  return {
    // A slot that opens a sentence after another is capitalized as one.
    text: sentenceStarts(line.text),
    pieceKey: part?.key ?? line.variantKey ?? "",
    step: (part?.uses.find((u) => (steps as string[]).includes(u.step))?.step ??
      steps[zero]) as SceneTalkStep,
    ...(part?.bearing ? { bearing: part.bearing } : {}),
    ...(tag ? { tag: TAGS[tag] ?? tag } : {}),
    asks: /\?$/.test(line.text.trim()),
    invites: INVITES.test(line.text.trim()),
    slotRecordIds: [...line.sourceRecordIds],
  };
}

/**
 * A joined sentence as it may be said on this branch: within each part, the
 * pieces not already said while another remains, not naming the other person
 * again once a line has, and not seen on an earlier page. A sentence whose
 * every core was said is not said again; nothing, when a required part has
 * nothing left.
 */
function unsaidSentence(
  row: JoinedSentence,
  said: ReadonlySet<string>,
  named: boolean,
  options: SceneWordingOptions,
): JoinedSentence[] {
  const parts: Partial<Record<LinePart, BankPart[]>> = {};
  for (const name of LINE_PARTS) {
    let pieces = row.parts[name];
    if (!pieces?.length) continue;
    const fresh = pieces.filter((part) => !said.has(part.key));
    if (name === "core" && !fresh.length) return [];
    if (fresh.length) pieces = fresh;
    if (named) {
      const plain = pieces.filter((part) => !VOCATIVE_KEYS.has(part.key));
      if (plain.length) pieces = plain;
    }
    const unseen = pieces.filter((part) => !options.shown?.has(part.key));
    if (unseen.length || options.freshOnly) pieces = unseen;
    if (!pieces.length) {
      if (row.required.has(name)) return [];
      continue;
    }
    parts[name] = pieces;
  }
  return [{ ...row, parts }];
}

/**
 * A turn says its stand once (lead's rule, Nov 12): a bare yes or no ("Yes.",
 * "Still no.", "Even then.") answers a question only as the turn's first
 * words. After an opener that itself says the speaker's side (`piece.stand`),
 * which has given the answer already ("I'd tell them I listened, and I still disagree."), the
 * core's answer word is not said again, and the core goes on from its next
 * word. An opener that is no answer ("Plainly?") keeps the core's yes or no.
 */
const ANSWER_WORD =
  /([.!?]\s+)(?:Yes|No|Still no|Still yes|Even then|Every time|It's still (?:yes|no))\.\s+(\S)/g;
export function standSaidOnce(text: string): string {
  return text.replace(
    ANSWER_WORD,
    (_all, stop: string, next: string) => `${stop}${next.toUpperCase()}`,
  );
}

/** Word one joined sentence in the speaker's voice, or null when its facts cannot carry it. */
function joinedMove(
  input: Parameters<typeof wordSceneMove>[0],
  steps: readonly SceneTalkStep[],
  sentence: JoinedSentence,
  named: boolean,
): WordedMove | null {
  const facts = Object.fromEntries(
    Object.entries(input.facts).filter(([, fact]) => fact.text !== ""),
  );
  const packet = conversationPacket({
    worldSeed: input.seed,
    surface: "dialogue",
    holderId: input.speakerId,
    bankVersion: "scene-talk-v1",
    stage: "default",
    facts,
    momentKey: `${input.momentKey}/${sentence.of}`,
    fallbackSourceId: input.speakerId,
    voice: { traits: input.traits, register: "scene-talk" },
  });
  const line = composeJoinedLine(packet, {
    key: `scene-talk.${sentence.of}`,
    version: "scene-talk-v1",
    move: input.move.move,
    pieces: LINE_PARTS.flatMap((name) =>
      (sentence.parts[name] ?? []).map((part) => ({
        key: part.key,
        text: named
          ? directorSlots(part.text).replace(TAIL_NAME, "")
          : directorSlots(part.text),
        part: name,
        ...(sentence.required.has(name) ? { required: true } : {}),
        ...(part.bearing ? { bearing: part.bearing } : {}),
      })),
    ),
  });
  if (!line) return null;
  const coreKey =
    line.parts.find((part) => part.part === "core")?.variantKey ?? "";
  const core = sentence.parts.core?.find((part) => part.key === coreKey);
  // A slot that opens a joined sentence ("... It goes to {agency}.") is
  // capitalized as the sentence's first word.
  // An opener that says the speaker's side has given the answer already.
  const openerKey = line.parts.find(
    (part) => part.part === "opener",
  )?.variantKey;
  const opener = sentence.parts.opener?.find((part) => part.key === openerKey);
  const stood = opener?.piece?.stand === true;
  const text = sentenceStarts(
    stood ? standSaidOnce(line.text.trim()) : line.text.trim(),
  );
  return {
    text,
    pieceKey: coreKey,
    pieceKeys: line.parts.map((part) => part.variantKey),
    step: (core?.uses.find((u) => (steps as string[]).includes(u.step))?.step ??
      steps[zero]) as SceneTalkStep,
    ...(core?.bearing ? { bearing: core.bearing } : {}),
    asks: /\?$/.test(text),
    invites: INVITES.test(text),
    slotRecordIds: [...line.sourceRecordIds],
  };
}

/** Whether any piece can word a move from these facts (a close the asker could say). */
export function sceneMoveFits(
  use: SceneMove,
  facts: Readonly<Record<string, Fact>>,
  options: Pick<SceneWordingOptions, "includeHeld" | "replyFollows"> = {},
): boolean {
  const parts = options.includeHeld ? PARTS : SHIPPED;
  return (
    fitting(use, facts, undefined, parts, options.replyFollows).length > zero ||
    joinedFitting(use, facts, undefined, parts, options.replyFollows).length >
      zero
  );
}

/**
 * The moves the bank has pieces for at a step, in bank order: the open moves
 * a purpose's asker can make, or the closes written to answer a reply move.
 */
export function sceneMovesWritten(filter: {
  step: SceneTalkStep;
  role?: SceneTalkRole;
  purpose?: string;
  /** The family of a variant purpose: its pieces serve the variant too. */
  family?: string;
  after?: string;
}): string[] {
  return [
    ...new Set(
      PARTS.flatMap((part) => part.uses)
        .filter(
          (u) =>
            u.step === filter.step &&
            (filter.role === undefined || u.role === filter.role) &&
            (filter.purpose === undefined ||
              usesPurpose(u, filter.purpose, filter.family)) &&
            (filter.after === undefined || u.after === filter.after),
        )
        .map((u) => u.move),
    ),
  ];
}

/**
 * How closely a piece was written to answer a line: 2 for that exact piece,
 * 1 for its move, 0 for neither, within one purpose.
 */
export function pieceAnswers(
  pieceKey: string,
  purpose: string,
  answered: { pieceKey: string; move: string },
  family?: string,
): number {
  let tier = zero;
  for (const u of PART_BY_KEY.get(pieceKey)?.uses ?? []) {
    if (u.subject !== "scene" || !usesPurpose(u, purpose, family) || !u.after)
      continue;
    if (u.after === answered.pieceKey) tier = two;
    else if (u.after === answered.move) tier = Math.max(tier, one);
  }
  return tier;
}
