/**
 * The English engine's half of a scene with a purpose (CTO, Oct 19: the
 * director and the English engine are two layers under one contract). The
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
import { heldByGrades } from "./english-grades";

const zero = P.zero;
const one = P.one;
const two = P.two;
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

export type SceneTalkRole = "asker" | "asked" | "narrator";

interface PartUse {
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

interface BankPart {
  key: string;
  text: string;
  bearing?: string;
  shippable?: boolean;
  uses: PartUse[];
}

const PARTS = (sceneTalkBank as unknown as { parts: BankPart[] }).parts;
/** What play may say: a part held until the owner grades it, or one he failed, is not. */
const SHIPPED = PARTS.filter(
  (part) => part.shippable === true && !heldByGrades(part.key),
);
const PART_BY_KEY = new Map(PARTS.map((part) => [part.key, part]));
const TAGS = (tagsFile as unknown as { tags: Record<string, string> }).tags;

/** A turn the director asks to have worded. */
export interface SceneMove {
  step: SceneTalkStep | readonly SceneTalkStep[];
  move: string;
  role: SceneTalkRole;
  purpose: string;
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
   * Grading only: word from the parts held until the owner grades them, as
   * the review page and the tests do. Play never sets it, so a scene whose
   * only words are held stays out of play.
   */
  includeHeld?: boolean;
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
 * tagged option beside the usual replies, never in place of them (owner,
 * Oct 19: the Baldur's Gate 3 model of tagged options).
 */
const taggedBy = (part: BankPart) =>
  part.uses
    .flatMap((u) => u.requiresFacts ?? [])
    .find((name) => name.startsWith("asked_"));

/** The pieces that fit a move, most specific first; what `keep` rules out is out before the closest is chosen. */
function fitting(
  use: SceneMove,
  facts: Readonly<Record<string, Fact>>,
  keep: (part: BankPart) => boolean = () => true,
  parts: readonly BankPart[] = SHIPPED,
): BankPart[] {
  const steps = Array.isArray(use.step) ? use.step : [use.step];
  const fits = parts.filter(keep).flatMap((part) => {
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
  );
  if (!every.length && strictSetup)
    return { unused: `${use.purpose}/${steps[zero]}/${use.move}` };
  // A piece already said on this branch is not said again while another fits.
  const fresh = every.filter((part) => !input.said.has(part.key));
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
    seed: input.seed,
    surface: "dialogue",
    holderId: input.speakerId,
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

/** Whether any piece can word a move from these facts (a close the asker could say). */
export function sceneMoveFits(
  use: SceneMove,
  facts: Readonly<Record<string, Fact>>,
  options: Pick<SceneWordingOptions, "includeHeld"> = {},
): boolean {
  return (
    fitting(use, facts, undefined, options.includeHeld ? PARTS : SHIPPED)
      .length > zero
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
  after?: string;
}): string[] {
  return [
    ...new Set(
      PARTS.flatMap((part) => part.uses)
        .filter(
          (u) =>
            u.step === filter.step &&
            (filter.role === undefined || u.role === filter.role) &&
            (filter.purpose === undefined || u.purpose === filter.purpose) &&
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
): number {
  let tier = zero;
  for (const u of PART_BY_KEY.get(pieceKey)?.uses ?? []) {
    if (u.subject !== "scene" || u.purpose !== purpose || !u.after) continue;
    if (u.after === answered.pieceKey) tier = two;
    else if (u.after === answered.move) tier = Math.max(tier, one);
  }
  return tier;
}
