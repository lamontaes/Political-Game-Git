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
import { renderLine, type Fact } from "./bank-line";

export type { Fact };
import { admittedParts, directorSlots } from "./bank-parts";
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
  /** The line the same speaker said just before, in the same box: a piece that would repeat it is left out while another fits. */
  before?: string;
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
}

/** A worded turn: its text, the piece it came from and what the piece carries. */
export interface WordedMove {
  text: string;
  pieceKey: string;
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

/** Whether a use serves this purpose and situation key (a fallback "*" serves only a scene with no purpose of its own). */
export function usesSpot(u: PartUse, use: SceneSpot): boolean {
  if (u.purpose && u.purpose !== use.purpose && u.purpose !== use.family)
    return false;
  return !(u.key && u.key !== use.key);
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
  if (u.after && u.after !== use.after && u.after !== use.afterPiece)
    return -one;
  if (u.outcome && u.outcome !== use.outcome) return -one;
  if (u.requiresFacts?.some((name) => !facts[name])) return -one;
  if (u.excludesFacts?.some((name) => facts[name])) return -one;
  return (
    // A piece written for a variant beats the family's, whatever facts either needs.
    (use.family && u.purpose === use.purpose ? sixteen : zero) +
    (u.purpose && u.purpose !== "*" ? four : zero) +
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
  const steps = Array.isArray(use.step) ? use.step : [use.step];
  const fits = parts.filter(keep).flatMap((part) => {
    // A piece may carry one use for each purpose it serves: take the best fit.
    let specific = -one;
    for (const u of part.uses)
      specific = Math.max(specific, useFit(u, use, steps, facts));
    return specific < zero ? [] : [{ part, specific }];
  });
  const answered = use.afterPiece;
  const following = answered
    ? fits.filter((row) => follows(row.part.key, answered, verdicts))
    : fits;
  const rows = following.length ? following : fits;
  const best = Math.max(zero, ...rows.map((row) => row.specific));
  return rows.filter((row) => row.specific === best).map((row) => row.part);
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
  const every = fitting(
    use,
    facts,
    (part) =>
      !!taggedBy(part) === onlyTagged &&
      !(options.freshOnly && options.shown?.has(part.key)) &&
      !(strictSetup && (options.usage!.get(part.key) ?? zero) > zero),
    options.includeHeld ? PARTS : SHIPPED,
    options.replyFollows,
  );
  if (!every.length && strictSetup)
    return { unused: `${use.purpose}/${steps[zero]}/${use.move}` };
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
          options.includeHeld ? PARTS : SHIPPED,
          options.replyFollows,
        ).filter((part) => !input.said.has(part.key))
      : [];
  // A piece already said on this branch is not said again while another fits.
  const fresh = kinOf.length
    ? kinOf
    : every.filter((part) => !input.said.has(part.key));
  let parts = fresh.length ? fresh : every;
  if (!parts.length) return null;
  const named = [...input.said].some((key) => VOCATIVE_KEYS.has(key));
  if (named) {
    const plain = parts.filter((part) => !VOCATIVE_KEYS.has(part.key));
    if (plain.length) parts = plain;
  }
  // No clause twice in one box (the words lead's play walk, Nov 11): a line
  // that opens the way the speaker's last line opened, or says the same words
  // into the same insert, is left out while another fits.
  if (options.before) {
    const fresh = parts.filter(
      (part) => !echoesBefore(part.text, facts, options.before!),
    );
    if (fresh.length) parts = fresh;
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
    text: line.text,
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

/** A line's words, lower case, without punctuation. */
function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Whether a piece would repeat the line before it in the same box: its words
 * up to its first insert open the line before, or the word leading into its
 * first insert and the insert's words are already in that line.
 */
export function echoesBefore(
  text: string,
  facts: Readonly<Record<string, Fact>>,
  before: string,
): boolean {
  const at = text.indexOf("{");
  if (at < zero) return false;
  const lead = wordsOf(text.slice(zero, at));
  const prior = wordsOf(before).join(" ");
  if (lead.length > one && prior.startsWith(lead.join(" "))) return true;
  const slot = /\{([\w-]+)\}/.exec(text)?.[one];
  const value = slot ? facts[slot]?.text : undefined;
  if (!value || !lead.length) return false;
  return ` ${prior} `.includes(
    ` ${[lead.at(-one), ...wordsOf(value)].join(" ")} `,
  );
}

/** Whether any piece can word a move from these facts (a close the asker could say). */
export function sceneMoveFits(
  use: SceneMove,
  facts: Readonly<Record<string, Fact>>,
  options: Pick<SceneWordingOptions, "includeHeld" | "replyFollows"> = {},
): boolean {
  return (
    fitting(
      use,
      facts,
      undefined,
      options.includeHeld ? PARTS : SHIPPED,
      options.replyFollows,
    ).length > zero
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
              u.purpose === filter.purpose ||
              (filter.family !== undefined && u.purpose === filter.family)) &&
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
    if (
      u.subject !== "scene" ||
      (u.purpose !== purpose && (!family || u.purpose !== family)) ||
      !u.after
    )
      continue;
    if (u.after === answered.pieceKey) tier = two;
    else if (u.after === answered.move) tier = Math.max(tier, one);
  }
  return tier;
}
