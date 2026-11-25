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
import outlineLoadingBank from "../../data/english/parts/outline-loading.json" with { type: "json" };
import outlineCallBank from "../../data/english/parts/outline-call.json" with { type: "json" };
import outlineLocalBank from "../../data/english/parts/outline-local.json" with { type: "json" };
import outlineThemeBank from "../../data/english/parts/outline-theme.json" with { type: "json" };
import outlineDiaryBank from "../../data/english/parts/outline-diary.json" with { type: "json" };
import outlineTalkBank from "../../data/english/parts/outline-talk.json" with { type: "json" };
import outlineNewsBank from "../../data/english/parts/outline-news.json" with { type: "json" };
import outlineJournalBank from "../../data/english/parts/outline-journal.json" with { type: "json" };
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
  /**
   * A section the speaker may leave out: said where their traits pull toward
   * it (`pull`) more than toward saying less (the row's `terse`), never
   * otherwise (the CTO, Nov 24: every address said all six sections).
   */
  readonly optional?: boolean;
  /** The recorded facets that pull a speaker toward saying the section. */
  readonly pull?: readonly string[];
  /**
   * A section said on another point of the text: its facts are the input's
   * `points[point - 1]` over the text's own, and it is left out where the
   * input holds no such point (the CTO, Nov 24: an address's length comes
   * from a second point drawn from the world, not from stock slots).
   */
  readonly point?: number;
}

/** One order the row's movable sections may be said in, and the facets that pull a speaker toward it. */
interface OrderRow {
  readonly sections: readonly string[];
  readonly pull?: readonly string[];
}

/** One kind of text's outline. */
interface OutlineRow {
  readonly surface: EnglishSurface;
  /** How many sentences of the text may say a fact's slot, by fact (the composer's budgets). */
  readonly budgets?: Readonly<Record<string, number>>;
  readonly sections: readonly SectionRow[];
  /**
   * The orders its movable sections may take (the first is the row's own).
   * The speaker's traits weigh the draw, so two speakers do not share one
   * skeleton (owner, Nov 23: "the same grammatical pattern").
   */
  readonly orders?: readonly OrderRow[];
  /** The facets that pull a speaker toward saying less: an optional move or section gives way to them. */
  readonly terse?: readonly string[];
  /**
   * The fewest sentences the text may have: a text the draws left shorter is
   * told again with every optional part that fits (pre-grade, Nov 24, round
   * 5: addresses of 56 to 103 words; owner: "A four-line rally is not a
   * speech").
   */
  readonly leastSentences?: { readonly value: number };
  /** This kind's own floor on how many pieces a move draws from (the weights' specificFloor otherwise). */
  readonly specificFloor?: { readonly value: number };
  /**
   * The sections that, opening a new paragraph, lead with a `bridge` piece that
   * follows the sentence before (the owner, Nov 24, P20: "you just went from
   * the Constitution to... healthcare"): the jumps into a new subject, not
   * every paragraph (a signpost is rare in real addresses, and a bridge on
   * every paragraph repeated its frame in most texts).
   */
  readonly bridges?: readonly string[];
}

/** A shape: its moves in order; a move ending in "?" may be left out. */
interface ShapeRow {
  readonly moves: readonly string[];
  /** Facts that must all hold for the shape to be taken. */
  readonly needs?: readonly string[];
  /** The recorded facets that pull a speaker toward the shape. */
  readonly pull?: readonly string[];
  /** Said only when no other shape of the section can be (a shorter form of a fuller shape). */
  readonly fallback?: boolean;
}

const OUTLINES = outlineData as unknown as {
  readonly disasterWords: Readonly<Record<string, string>>;
  readonly kinds: Readonly<Record<string, OutlineRow>>;
  readonly shapes: Readonly<Record<string, ShapeRow>>;
  readonly weights: {
    readonly pieceLean: { readonly value: number };
    readonly pieceBase: { readonly value: number };
    readonly specificFloor: { readonly value: number };
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

/** The Journal's first evening's settings (outlines.json `journalEvening`), read by src/director/journal-evening.ts. */
export const JOURNAL_EVENING = (
  outlineData as unknown as {
    journalEvening: {
      watchersNamed: { value: number };
      self: { subject: string; object: string };
      letterDays: { value: number };
    };
  }
).journalEvening;

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
export const OUTLINE_BANK_PARTS: readonly TellingPart[] = [
  outlineBank,
  // Each Story writer's own bank (owner, Nov 24: more Story writers), so
  // their branches never meet in one file; the planner reads them as one.
  outlineLoadingBank,
  outlineCallBank,
  outlineThemeBank,
  outlineLocalBank,
  outlineDiaryBank,
  outlineTalkBank,
  outlineNewsBank,
  outlineJournalBank,
].flatMap((bank) => (bank as unknown as { parts: TellingPart[] }).parts);

const PARTS: readonly TellingPart[] = admittedParts(OUTLINE_BANK_PARTS);

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
  /** The facts of the text's further points, in order: a section with `point: n` is said on `points[n - 1]`. */
  readonly points?: readonly TellingFacts[];
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

/**
 * What a slot says, the key its budget is counted by: two slots that say the
 * same words count together, as a clause or as its own sentence (a belief said
 * as "{belief-sentence}" and again inside a stand as "{belief}"; pre-grade,
 * Nov 25: a governor gave the photo-ID reason twice in one paragraph).
 */
const saidOf = (facts: TellingFacts, slot: string) =>
  (facts[slot]?.text ?? slot).toLowerCase().replace(/[.!?]+$/, "");

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
 * One of several, drawn the way a wording is (the engine's stable hash, never
 * a roll), each weighted by the base plus the speaker's pull toward it.
 */
function drawWeighted(pulls: readonly number[], drawKey: string): number {
  const base = OUTLINES.weights.pieceBase.value;
  const per = OUTLINES.weights.pieceLean.value;
  const weights = pulls.map((pull) =>
    Math.max(1, Math.round(base + per * pull)),
  );
  let draw = Number(
    BigInt(`0x${stableHash(drawKey)}`) %
      BigInt(weights.reduce((sum, w) => sum + w, 0)),
  );
  return weights.findIndex((weight) => (draw -= weight) < 0);
}

/**
 * Whether the speaker says something they may leave out: their pull toward it
 * against their pull toward saying less.
 */
function says(
  pull: number,
  row: OutlineRow,
  traits: TellingInput["traits"],
  drawKey: string,
): boolean {
  return drawWeighted([pull, leanOf(traits, row.terse)], drawKey) === 0;
}

/**
 * The row's sections in the order this speaker says them: the movable ones
 * (the sections an order names) take the drawn order's places in turn.
 */
function sectionsInOrder(
  row: OutlineRow,
  traits: TellingInput["traits"],
  drawKey: string,
): SectionRow[] {
  const orders = row.orders ?? [];
  if (orders.length < 2) return [...row.sections];
  const order =
    orders[
      drawWeighted(
        orders.map((o) => leanOf(traits, o.pull)),
        drawKey,
      )
    ]!;
  const movable = new Set(order.sections);
  const byName = new Map(
    row.sections.map((section) => [section.name, section]),
  );
  let next = 0;
  return row.sections.map((section) =>
    movable.has(section.name) ? byName.get(order.sections[next++]!)! : section,
  );
}

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
      // A fallback shape counts as used: it is drawn only when nothing else fits.
      used: used.has(name) || OUTLINES.shapes[name]!.fallback ? 1 : 0,
      pull: leanOf(traits, OUTLINES.shapes[name]!.pull),
    }))
    .sort(
      (a, b) =>
        a.used - b.used || b.pull - a.pull || a.name.localeCompare(b.name),
    );
  const fresh = rows.filter((row) => !row.used);
  if (fresh.length > 1) {
    const at = drawWeighted(
      fresh.map((row) => row.pull),
      drawKey,
    );
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
/**
 * How many facts of the world a piece checks before it may be said (the
 * facts it names or needs, and the move it must follow): the more it checks,
 * the more specific it is (words rule most-specific-line-wins; the CTO, Nov
 * 24, 7135469055 on #9750: Valve's dynamic dialogue, "the line or turn whose
 * conditions match the most facts wins, and general ones are the fallback").
 */
const specificityOf = (part: {
  readonly text: string;
  readonly after?: readonly string[];
  readonly use: { readonly requiresFacts?: readonly string[] };
}) => {
  // A slot the line fills is what it says, not when it is said: only the
  // facts it checks and does not print are its conditions (W2, Nov 24: lines
  // that print more slots out-ranked every one-fact line).
  const printed = new Set(slotsOf(part.text));
  return (
    (part.use.requiresFacts ?? []).filter((fact) => !printed.has(fact)).length +
    (part.after ? 1 : 0)
  );
};

/**
 * The sayable pieces from the most specific down: the most specific tier
 * wins, and less specific tiers join it only until the pool holds
 * `specificFloor` pieces (TUNABLE), so a fact a few pieces check never
 * makes those few the only words every such world says.
 */
function mostSpecific<P extends Parameters<typeof specificityOf>[0]>(
  sayable: readonly P[],
  floor: number,
): P[] {
  const tiers = [...new Set(sayable.map(specificityOf))].sort((a, b) => b - a);
  const pool: P[] = [];
  for (const tier of tiers) {
    if (pool.length >= floor) break;
    pool.push(...sayable.filter((part) => specificityOf(part) === tier));
  }
  return pool;
}

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
  // Every fitting piece said before: the one said longest ago comes back
  // (the composer's rule since Nov 12, "one greeting in address after
  // address"), so a voice never settles on one wording.
  const sayable = (part: (typeof fitting)[number]) =>
    holds(input.facts, part.use.requiresFacts);
  const oldest = (input.said ?? []).find((key) =>
    fitting.some((part) => part.key === key && sayable(part)),
  );
  const open = fresh.some(sayable)
    ? fresh
    : oldest
      ? fitting.filter((part) => part.key === oldest)
      : fitting;
  const pool = mostSpecific(
    open.filter(sayable),
    outlineRow(input.kind).specificFloor?.value ??
      OUTLINES.weights.specificFloor.value,
  );
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
    // A sentence inside the piece that opens on a slot ("Thank you all.
    // {body-name} and I ...") starts with a capital like the piece itself
    // (pre-grade, Nov 24: "Thank you all. the Washington County Board ...").
    text: result.text.replace(
      // Not after an initial's period ("D.C. statehood").
      /(?<!\b[A-Z])([.!?]["”]?\s+)([a-z])/g,
      (_, gap: string, letter: string) => gap + letter.toUpperCase(),
    ),
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
  const told = tellOnce(input, false);
  const least = outlineRow(input.kind).leastSentences?.value ?? 0;
  return told && told.sentences.length < least ? tellOnce(input, true) : told;
}

/** The text with every optional section and move that fits: what `tell` gives a text the draws left too short. */
export function tellFully(input: TellingInput): Told | null {
  return tellOnce(input, true);
}

/**
 * The facts with the policies they cite (the CTO, Nov 24, 7140057819 on
 * #9750: "Lines tagged with a policy fire when that policy is live in the
 * player's world"): every fact citing a policy question's record
 * (`question:<key>`) adds `policy:question:<key>`, the bill catalog's own id
 * for that policy (src/core2/data/legislature/bill-catalog.json), so a piece
 * can require the policy by name and plays only where the world has put it
 * in the text.
 */
const BUDGET_QUESTION = "question:budget-line:";

export function withPolicyFacts(
  facts: TellingFacts,
): Record<string, GroundedEnglishFact | undefined> {
  const out: Record<string, GroundedEnglishFact | undefined> = { ...facts };
  for (const fact of Object.values(facts))
    for (const id of fact?.sourceRecordIds ?? [])
      if (id.startsWith("question:")) {
        // A budget line is cited as its question (`question:budget-line:police`)
        // and listed in the catalog as `budget:police`.
        const line = id.startsWith(BUDGET_QUESTION)
          ? `budget:${id.slice(BUDGET_QUESTION.length)}`
          : id;
        out[`policy:${line}`] ??= { text: "yes", sourceRecordIds: [id] };
      }
  return out;
}

/** One telling; `full` says every optional section and move that fits. */
function tellOnce(input: TellingInput, full: boolean): Told | null {
  const row = outlineRow(input.kind);
  const sentences: ToldSentence[] = [];
  const saidHere = new Set<string>();
  const shapesUsed = new Set<string>();
  // How many sentences have said each slot, against the row's budgets.
  const spent = new Map<string, number>();
  let paragraph = -1;
  // What the text has said so far, as facts a piece may need: `told-<section>`
  // once a section is said, so a line that names the stand again ("If you
  // think I'm wrong about ...") comes only after the stand.
  const facts: Record<string, GroundedEnglishFact | undefined> =
    withPolicyFacts(input.facts);
  const known: TellingInput = { ...input, facts };
  const draw = `${input.worldSeed}:${input.momentKey}`;
  for (const section of sectionsInOrder(row, input.traits, `${draw}/order`)) {
    // A section on a further point reads that point's facts over the text's.
    const point = section.point ? input.points?.[section.point - 1] : undefined;
    const own = point ? withPolicyFacts(point) : undefined;
    if (section.point && !own) continue;
    const here = own ? { ...facts, ...own } : facts;
    const knownHere: TellingInput = own ? { ...known, facts: here } : known;
    if (!holds(here, section.when)) {
      if (section.required) return null;
      continue;
    }
    if (
      section.optional &&
      !full &&
      !says(
        leanOf(input.traits, section.pull),
        row,
        input.traits,
        `${draw}/${section.name}/says`,
      )
    )
      continue;
    const opens = !section.joins || paragraph < 0;
    const last = sentences.at(-1);
    let told: ToldSentence[] | null = null;
    for (const name of shapeOrder(
      section,
      here,
      input.traits,
      shapesUsed,
      `${draw}/${section.name}`,
    )) {
      const shape = OUTLINES.shapes[name]!;
      const saying: ToldSentence[] = [];
      const taken = new Set(saidHere);
      const spending = new Map(spent);
      let before = opens ? "start" : (last?.move ?? "start");
      let failed = false;
      for (const raw of shape.moves) {
        const optional = raw.endsWith("?");
        const move = optional ? raw.slice(0, -1) : raw;
        const worded = wordMove(
          knownHere,
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
        // A move the shape may leave out is said where the speaker leans
        // toward its words more than toward saying less.
        if (
          optional &&
          !full &&
          !says(
            leanOf(input.traits, worded.part.lean),
            row,
            input.traits,
            `${draw}/${section.name}/${name}/${move}/says`,
          )
        )
          continue;
        taken.add(worded.part.key);
        for (const said of new Set(
          slotsOf(worded.part.text).map((slot) => saidOf(here, slot)),
        ))
          spending.set(said, (spending.get(said) ?? 0) + 1);
        saying.push({
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
      if (!failed && saying.length) {
        told = saying;
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
    // No jump without a bridge (the owner, Nov 24, P20: "you just went from
    // the Constitution to... healthcare"): a section that opens a new
    // paragraph after another leads with a bridge where the row has them and
    // a bridge piece follows the sentence before (its `after` names that
    // sentence's move). With none that fits, the section opens as it would.
    if (opens && last && row.bridges?.includes(section.name)) {
      const spending = new Map(spent);
      const bridge = wordMove(
        knownHere,
        row.surface,
        "bridge",
        last.move,
        new Set(saidHere),
        `${section.name}/bridge`,
        spending,
      );
      if (bridge) {
        for (const said of new Set(
          slotsOf(bridge.part.text).map((slot) => saidOf(here, slot)),
        ))
          spent.set(said, (spent.get(said) ?? 0) + 1);
        told = [
          {
            section: section.name,
            shape: "bridge",
            move: "bridge",
            text: bridge.text,
            piece: bridge.part.key,
            paragraph: paragraph + 1,
            camera: section.camera ?? null,
            facts: bridge.facts,
            sourceRecordIds: bridge.ids,
          },
          ...told,
        ];
      }
    }
    if (opens) paragraph += 1;
    for (const sentence of told) saidHere.add(sentence.piece);
    sentences.push(...told);
    facts[`told-${section.name}`] = {
      text: "yes",
      sourceRecordIds: input.sourceRecordIds,
    };
  }
  if (!sentences.length) return null;
  const paragraphs: string[] = [];
  for (const sentence of sentences)
    paragraphs[sentence.paragraph] = paragraphs[sentence.paragraph]
      ? `${paragraphs[sentence.paragraph]} ${sentence.text}`
      : sentence.text;
  return { sentences, paragraphs };
}
