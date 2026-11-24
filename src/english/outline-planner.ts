/**
 * The one outline planner (words composer, unit 3 and unit 6; the Story
 * lead's brief of Nov 24, 2026, plan steps 3 and 4). A text of any kind (an
 * address, a Journal page, a news story, the loading story) is told in the
 * same steps: its outline row (`data/english/outlines.json`) names its
 * sections in order; each section offers several shapes, and a shape is an
 * order of moves. The planner picks each section's shape from the speaker's
 * recorded traits and the facts the record holds, so two speakers, or two
 * worlds, do not share one skeleton; no shape is forced on every point
 * (owner, Nov 23: "this is all following the same grammatical pattern").
 *
 * Each move is worded by the English engine (`renderGroundedEnglish`) from
 * the planner's bank (`data/english/parts/outline.json`): a piece plays only
 * where its facts hold, and a piece that leans on the sentence before it
 * ("That is why ...", "It ...") names the moves it may follow in `after`, so
 * it is never said cold (owner, Nov 23: "It. What is it?"). A piece is said
 * once per text, and a piece said in an earlier text of the world (the
 * `said` list) gives way while another can say the move.
 *
 * Pure: reads its input and the two data files, writes nothing. No roll: the
 * pick among pieces is the engine's stable hash, weighted by the speaker's
 * recorded traits.
 */
import outlineData from "../../data/english/outlines.json" with { type: "json" };
import outlineBank from "../../data/english/parts/outline.json" with { type: "json" };
import type { EntityId } from "../core2/kernel/brands";
import { stableHash } from "../core2/kernel/ids";
import { admittedParts, directorSlots } from "./bank-parts";
import {
  renderGroundedEnglish,
  type AuthoredEnglishVariant,
  type EnglishSurface,
  type GroundedEnglishFact,
} from "./grounded-english";

/** One section of an outline row. */
interface SectionRow {
  readonly name: string;
  /** The shapes the section may take, by name in `shapes`. */
  readonly shapes: readonly string[];
  /** A section that cannot be said leaves the text unsaid. */
  readonly required?: boolean;
  /** Facts that must all hold for the section to be said. */
  readonly when?: readonly string[];
  /** The section goes on in the paragraph before it instead of opening one. */
  readonly joins?: boolean;
  /** Where the picture is while the section is said (an address's camera); the caller reads it. */
  readonly camera?: string;
}

/** One kind of text's outline. */
interface OutlineRow {
  readonly surface: EnglishSurface;
  /** How many sentences of the text may say a fact's slot, by fact (the composer's budgets). */
  readonly budgets?: Readonly<Record<string, number>>;
  readonly sections: readonly SectionRow[];
}

/** A shape: its moves in order; a move ending in "?" may be left out. */
interface ShapeRow {
  readonly moves: readonly string[];
  /** Facts that must all hold for the shape to be taken. */
  readonly needs?: readonly string[];
  /** The recorded facets that pull a speaker toward the shape. */
  readonly pull?: readonly string[];
}

const OUTLINES = outlineData as unknown as {
  readonly disasterWords: Readonly<Record<string, string>>;
  readonly kinds: Readonly<Record<string, OutlineRow>>;
  readonly shapes: Readonly<Record<string, ShapeRow>>;
  readonly weights: {
    readonly pieceLean: { readonly value: number };
    readonly pieceBase: { readonly value: number };
  };
};

/** Where a piece is said: the outline kind (`subject`) and the facts it needs there. */
interface TellingUse {
  readonly subject: string;
  readonly role: string;
  readonly requiresFacts?: readonly string[];
  /** Facts that rule the piece out where the record holds them. */
  readonly excludesFacts?: readonly string[];
}

/** A declared disaster's incident type as a speaker says it after "the" (outlines.json `disasterWords`). */
export const DISASTER_WORDS: Readonly<Record<string, string>> =
  OUTLINES.disasterWords;

/** One piece of the planner's bank. */
interface TellingPart {
  readonly key: string;
  readonly text: string;
  readonly move: string;
  readonly uses: readonly TellingUse[];
  /** The moves the piece may follow in its paragraph; "start" is the paragraph's first sentence. Absent: any. */
  readonly after?: readonly string[];
  /** The recorded facets that pull a speaker toward the piece. */
  readonly lean?: readonly string[];
}

/** Every piece of the planner's bank, as written (the address record re-says its pieces from these). */
export const OUTLINE_BANK_PARTS: readonly TellingPart[] = (
  outlineBank as unknown as { parts: TellingPart[] }
).parts;

const PARTS: readonly TellingPart[] = admittedParts(
  (outlineBank as unknown as { parts: TellingPart[] }).parts,
);

export type TellingFacts = Readonly<
  Record<string, GroundedEnglishFact | undefined>
>;

export interface TellingInput {
  /** The outline row's name (`inaugural`, `journal-first-page`, ...). */
  readonly kind: string;
  readonly facts: TellingFacts;
  /** Stable for this text across Save and Continue. */
  readonly momentKey: string;
  readonly worldSeed: string;
  /** The records the text as a whole rests on. */
  readonly sourceRecordIds: readonly EntityId[];
  /**
   * Whose text it is: the speaker of an address, the writer of a Journal.
   * The facts handed in are what this person knows (the caller builds them
   * from that person's own records), so they speak and read them.
   */
  readonly knower?: EntityId;
  /** The speaker's recorded trait levels (-2 to 2), which pull shapes and pieces. */
  readonly traits?: Readonly<Record<string, number>>;
  /** Pieces said in earlier texts of this world, oldest first. */
  readonly said?: readonly string[];
  /** Told each move no piece could say, for a reader's trace. */
  readonly onMiss?: (section: string, shape: string, move: string) => void;
}

/** One sentence as told. */
export interface ToldSentence {
  readonly section: string;
  readonly shape: string;
  readonly move: string;
  readonly text: string;
  readonly piece: string;
  /** The paragraph it is said in, from 0. */
  readonly paragraph: number;
  readonly camera: string | null;
  readonly facts: readonly string[];
  readonly sourceRecordIds: readonly EntityId[];
}

export interface Told {
  readonly sentences: readonly ToldSentence[];
  readonly paragraphs: readonly string[];
}

const BANK_KEY = "outline";
const BANK_VERSION = "outline-v1";

/** Whether a kind of text has an outline row (a talk's subject is told through the planner once it has one). */
export function hasOutline(kind: string): boolean {
  return !!OUTLINES.kinds[kind];
}

/** The outline row of a kind of text. */
export function outlineRow(kind: string): OutlineRow {
  const row = OUTLINES.kinds[kind];
  if (!row) throw new Error(`No outline for ${kind}`);
  return row;
}

/** The pieces of the planner's bank that are said in an outline kind, each with its use there. */
export function partsOf(
  kind: string,
): readonly (TellingPart & { readonly use: TellingUse })[] {
  return PARTS.flatMap((part) => {
    const use = part.uses.find((row) => row.subject === kind);
    return use ? [{ ...part, use }] : [];
  });
}

/** The slots a piece's text says. */
const slotsOf = (text: string) =>
  [...text.matchAll(/\{([\w-]+)\}/g)].map((match) => match[1]!);

/** What a slot says, the key its budget is counted by: two slots that say the same words count together. */
const saidOf = (facts: TellingFacts, slot: string) =>
  (facts[slot]?.text ?? slot).toLowerCase();

/** How many sentences may say a slot's words: the slot's own budget, else the row's default (`*`). */
const budgetOf = (kind: string, slot: string) => {
  const budgets = outlineRow(kind).budgets ?? {};
  return budgets[slot] ?? budgets["*"] ?? Infinity;
};

const holds = (facts: TellingFacts, keys: readonly string[] | undefined) =>
  (keys ?? []).every((key) => !!facts[key]);

const leanOf = (
  traits: Readonly<Record<string, number>> | undefined,
  keys: readonly string[] | undefined,
) => (keys ?? []).reduce((sum, key) => sum + (traits?.[key] ?? 0), 0);

/**
 * The shapes a section may take here. The first is drawn the way a wording
 * is (the engine's stable hash, never a roll), weighted toward the shapes the
 * speaker's traits pull hardest, so one person does not say every point in
 * one skeleton (owner, Nov 23: "the same grammatical pattern"); the rest
 * follow in the order of their pull, to fall back on. A shape the text
 * already used goes last while another fits. Ties go by name.
 */
function shapeOrder(
  section: SectionRow,
  facts: TellingFacts,
  traits: TellingInput["traits"],
  used: ReadonlySet<string>,
  drawKey: string,
): string[] {
  const rows = section.shapes
    .filter((name) => {
      const shape = OUTLINES.shapes[name];
      if (!shape) throw new Error(`No shape ${name}`);
      return holds(facts, shape.needs);
    })
    .map((name) => ({
      name,
      used: used.has(name) ? 1 : 0,
      pull: leanOf(traits, OUTLINES.shapes[name]!.pull),
    }))
    .sort(
      (a, b) =>
        a.used - b.used || b.pull - a.pull || a.name.localeCompare(b.name),
    );
  const fresh = rows.filter((row) => !row.used);
  if (fresh.length > 1) {
    const base = OUTLINES.weights.pieceBase.value;
    const per = OUTLINES.weights.pieceLean.value;
    const weights = fresh.map((row) =>
      Math.max(1, Math.round(base + per * row.pull)),
    );
    let draw = Number(
      BigInt(`0x${stableHash(drawKey)}`) %
        BigInt(weights.reduce((sum, w) => sum + w, 0)),
    );
    const at = weights.findIndex((weight) => (draw -= weight) < 0);
    const [first] = rows.splice(rows.indexOf(fresh[at]!), 1);
    rows.unshift(first!);
  }
  return rows.map((row) => row.name);
}

/**
 * Word one move: the pieces of the move that fit the facts, follow the move
 * before, and were not said in this text; those said in earlier texts give
 * way while another fits. Null when none can say it.
 */
function wordMove(
  input: TellingInput,
  surface: EnglishSurface,
  move: string,
  before: string,
  saidHere: ReadonlySet<string>,
  key: string,
  spent: ReadonlyMap<string, number>,
): {
  part: TellingPart;
  text: string;
  facts: readonly string[];
  ids: readonly EntityId[];
} | null {
  const fitting = partsOf(input.kind).filter(
    (part) =>
      part.move === move &&
      !saidHere.has(part.key) &&
      (!part.after || part.after.includes(before)) &&
      !(part.use.excludesFacts ?? []).some((fact) => !!input.facts[fact]) &&
      slotsOf(part.text).every(
        (slot) =>
          (spent.get(saidOf(input.facts, slot)) ?? 0) <
          budgetOf(input.kind, slot),
      ),
  );
  const earlier = new Set(input.said ?? []);
  const fresh = fitting.filter((part) => !earlier.has(part.key));
  const pool = fresh.some((part) => holds(input.facts, part.use.requiresFacts))
    ? fresh
    : fitting;
  if (!pool.length) return null;
  const base = OUTLINES.weights.pieceBase.value;
  const per = OUTLINES.weights.pieceLean.value;
  const variants: AuthoredEnglishVariant[] = pool.map((part) => ({
    key: part.key,
    kind: "template",
    text: directorSlots(part.text),
    requiresFacts: part.use.requiresFacts ?? [],
    weight: Math.max(
      1,
      Math.round(base + per * leanOf(input.traits, part.lean)),
    ),
    pieceKey: part.key,
  }));
  const result = renderGroundedEnglish(
    {
      surface,
      momentKey: `${input.momentKey}/${key}`,
      worldSeed: input.worldSeed,
      bankVersion: BANK_VERSION,
      stage: move,
      sourceRecordIds: input.sourceRecordIds,
      facts: input.facts,
      ...(input.knower
        ? {
            speaker: { personId: input.knower, traits: {} },
            viewer: { personId: input.knower, traits: {} },
          }
        : {}),
      knowledge: input.knower
        ? Object.entries(input.facts).flatMap(([factKey, row]) =>
            row
              ? [
                  {
                    personId: input.knower!,
                    factKey,
                    sourceRecordIds: row.sourceRecordIds,
                  },
                ]
              : [],
          )
        : [],
    },
    { key: BANK_KEY, version: BANK_VERSION, surface, variants },
  );
  if (result.kind !== "rendered") return null;
  const part = pool.find((row) => row.key === result.variantKey)!;
  return {
    part,
    text: result.text,
    facts: result.usedFactKeys,
    ids: result.sourceRecordIds,
  };
}

/**
 * Tell a text from its outline row. Null when a required section cannot be
 * said. Each section takes the first shape, in the speaker's order, whose
 * required moves can all be worded.
 */
export function tell(input: TellingInput): Told | null {
  const row = outlineRow(input.kind);
  const sentences: ToldSentence[] = [];
  const saidHere = new Set<string>();
  const shapesUsed = new Set<string>();
  // How many sentences have said each slot, against the row's budgets.
  const spent = new Map<string, number>();
  let paragraph = -1;
  for (const section of row.sections) {
    if (!holds(input.facts, section.when)) {
      if (section.required) return null;
      continue;
    }
    const opens = !section.joins || paragraph < 0;
    const last = sentences.at(-1);
    let told: ToldSentence[] | null = null;
    for (const name of shapeOrder(
      section,
      input.facts,
      input.traits,
      shapesUsed,
      `${input.worldSeed}:${input.momentKey}/${section.name}`,
    )) {
      const shape = OUTLINES.shapes[name]!;
      const here: ToldSentence[] = [];
      const taken = new Set(saidHere);
      const spending = new Map(spent);
      let before = opens ? "start" : (last?.move ?? "start");
      let failed = false;
      for (const raw of shape.moves) {
        const optional = raw.endsWith("?");
        const move = optional ? raw.slice(0, -1) : raw;
        const worded = wordMove(
          input,
          row.surface,
          move,
          before,
          taken,
          `${section.name}/${name}/${move}`,
          spending,
        );
        if (!worded) {
          input.onMiss?.(section.name, name, move);
          if (optional) continue;
          failed = true;
          break;
        }
        taken.add(worded.part.key);
        for (const said of new Set(
          slotsOf(worded.part.text).map((slot) => saidOf(input.facts, slot)),
        ))
          spending.set(said, (spending.get(said) ?? 0) + 1);
        here.push({
          section: section.name,
          shape: name,
          move,
          text: worded.text,
          piece: worded.part.key,
          paragraph: opens ? paragraph + 1 : paragraph,
          camera: section.camera ?? null,
          facts: worded.facts,
          sourceRecordIds: worded.ids,
        });
        before = move;
      }
      if (!failed && here.length) {
        told = here;
        for (const [slot, count] of spending) spent.set(slot, count);
        shapesUsed.add(name);
        break;
      }
    }
    if (!told) {
      input.onMiss?.(section.name, "", "");
      if (section.required) return null;
      continue;
    }
    if (opens) paragraph += 1;
    for (const sentence of told) saidHere.add(sentence.piece);
    sentences.push(...told);
  }
  if (!sentences.length) return null;
  const paragraphs: string[] = [];
  for (const sentence of sentences)
    paragraphs[sentence.paragraph] = paragraphs[sentence.paragraph]
      ? `${paragraphs[sentence.paragraph]} ${sentence.text}`
      : sentence.text;
  return { sentences, paragraphs };
}
