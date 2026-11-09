/**
 * The heat map the owner's grades build (owner, Nov 9, 12:45 a.m.: "each part
 * of the sentence and all of the replies and the lies are heat maps for a
 * certain personality or variance that you're testing ... a correct English
 * for a certain tone or situation that can apply between multiple scenes";
 * "let's start getting every line touched by a grade").
 *
 * A grade is a lesson, not a vote on one line. It falls on a span (the whole
 * line, a sentence, an opening word) with a strength from -1 (bad) to 1
 * (good); 0.5 is "I liked half of that". The span's features
 * (`span-features.ts`) each take that strength in every context the line
 * played in:
 *
 *   all          every line in the game;
 *   rule         every line, from the writing rules rather than a grade;
 *   reg:<class>  the register class (public, private, broadcast, narration,
 *                town-hall), from `calibration.json`;
 *   voice:<b>    the bearing the speaker's traits pulled the line toward
 *                (calm, braced, tender ...), the personality axis;
 *   scene:<c>    the situation: the kind of scene (floor, hallway, press,
 *                election ...) or, outside a scene, the bank (news, journal);
 *   rv:<class>:<b>  register and voice together.
 *
 * Every line in every bank is then scored against the cells of its own
 * features in its own contexts, the nearer context counting more. The score
 * moves the line's weight inside its own slot on a sliding curve (never a ban,
 * never past the floor and ceiling), and a line scoring below the rewrite mark
 * is listed for the words work. The writing rules
 * (`data/english/writing-rules.json`) are lessons too: each adds its strength
 * to the features it names in the `rule` context, which every line plays in.
 *
 * Pure; reads data, never the world. `scripts/dialogue-batch/apply-grades.ts`
 * writes `data/english/grade-map.json`, which `calibration.ts` reads.
 */
import { spanFeatures, spansOf } from "./span-features";

/** A bank piece as the map sees it. */
export interface MapPiece {
  readonly bank: string;
  readonly text: string;
  readonly bearing?: string;
  /** The kinds of scene the piece plays in (`calibration.json` sceneClasses), empty outside scenes. */
  readonly scenes: readonly string[];
}

/** A grade on part of a line: offsets into the line's text, strength -1 to 1. */
export interface SpanGrade {
  readonly start: number;
  readonly end: number;
  readonly strength: number;
}

/** One graded line: its piece key and the grades on its parts (a whole-line grade is one span over all of it). */
export interface LineGrade {
  readonly key: string;
  readonly spans: readonly SpanGrade[];
  /** Where the grade came from, for the report. */
  readonly from?: string;
}

/** A writing rule as a lesson: features and the strength each takes everywhere. */
export interface RuleLesson {
  readonly id: string;
  readonly features: Readonly<Record<string, number>>;
}

export interface MapCell {
  /** The strengths added up. */
  readonly sum: number;
  /** How many graded spans fell here. */
  readonly n: number;
}

export interface MapParameters {
  readonly floor: number;
  readonly ceiling: number;
  readonly saturation: number;
  readonly rewriteBelow: number;
  /** Spans a cell needs before its mean counts in full: a cell's lesson is its sum over (n + prior). */
  readonly prior: number;
  /** How much each context counts when a line is scored. */
  readonly contextWeights: Readonly<Record<string, number>>;
}

export interface GradeMap {
  readonly schema: "english-grade-map/1";
  /** feature -> context -> cell, for the cells a grade or rule reached. */
  readonly cells: Readonly<Record<string, Readonly<Record<string, MapCell>>>>;
  /** Each scored piece's weight factor, rounded; pieces at 1 are left out. */
  readonly factors: Readonly<Record<string, number>>;
  /** Pieces scored below the rewrite mark, worst first. */
  readonly rewrite: readonly string[];
  readonly coverage: MapCoverage;
}

export interface MapCoverage {
  readonly pieces: number;
  /** Pieces sharing at least one graded feature in a context nearer than `all`. */
  readonly reached: number;
  /** Pieces sharing a graded feature in their own kind of scene, or in their own register and voice together. */
  readonly near: number;
  /** Pieces whose weight a grade or rule moved. */
  readonly weighted: number;
  readonly byBank: Readonly<
    Record<string, { pieces: number; reached: number }>
  >;
}

/** The contexts a piece plays in, nearest last. */
export function contextsOf(
  piece: MapPiece,
  classes: Readonly<Record<string, string>>,
): string[] {
  const register = classes[piece.bank] ?? "narration";
  const voice = piece.bearing ?? "none";
  const scenes =
    piece.scenes.length > 0 ? piece.scenes : [`bank-${piece.bank}`];
  return [
    "all",
    "rule",
    `reg:${register}`,
    `voice:${voice}`,
    ...scenes.map((scene) => `scene:${scene}`),
    `rv:${register}:${voice}`,
  ];
}

/** The kind of context a context key is: all, reg, voice, scene or rv. */
function contextKind(context: string): string {
  return context.split(":")[0]!;
}

/** The features of a piece's whole line. */
export function pieceFeatures(piece: MapPiece): string[] {
  return spanFeatures(piece.text, true);
}

/** The features a span grade covers: a whole-line span takes the line's features, a part its own (with the opening, when it starts the line). */
export function gradedFeatures(text: string, span: SpanGrade): string[] {
  if (span.start <= 0 && span.end >= text.length)
    return spanFeatures(text, true);
  // A part that starts the line also teaches how a line opens.
  if (span.start <= 0)
    return spanFeatures(text.slice(0, span.end), true).filter(
      (feature) => !feature.startsWith("sentences:"),
    );
  return spanFeatures(text.slice(span.start, span.end), false);
}

/** Every span a line can be graded in: the whole line, then its parts (`spansOf`). */
export { spansOf };

type MutableCells = Record<string, Record<string, { sum: number; n: number }>>;

function add(
  cells: MutableCells,
  feature: string,
  context: string,
  strength: number,
) {
  const row = (cells[feature] ??= {});
  const cell = (row[context] ??= { sum: 0, n: 0 });
  cell.sum += strength;
  cell.n += 1;
}

/**
 * A piece's score: for each of its features, the mean strength of that
 * feature's cell in each of the piece's contexts (shrunk toward 0 while few
 * spans fell there), weighted by how near the context is, averaged over the
 * piece's features.
 */
export function scoreOf(
  features: readonly string[],
  contexts: readonly string[],
  cells: GradeMap["cells"],
  weights: MapParameters["contextWeights"],
  prior: number,
): { score: number; touched: boolean; reached: boolean; near: boolean } {
  if (features.length === 0)
    return { score: 0, touched: false, reached: false, near: false };
  let total = 0;
  let touched = false;
  let reached = false;
  let near = false;
  for (const feature of features) {
    const row = cells[feature];
    if (!row) continue;
    for (const context of contexts) {
      const cell = row[context];
      if (!cell || cell.n === 0) continue;
      touched = true;
      if (context !== "all" && context !== "rule") reached = true;
      if (context.startsWith("scene:") || context.startsWith("rv:"))
        near = true;
      total +=
        ((weights[contextKind(context)] ?? 0) * cell.sum) / (cell.n + prior);
    }
  }
  return { score: total / features.length, touched, reached, near };
}

/** The sliding curve from a score to a weight factor: 1 at 0, toward the ceiling or floor, never past either. */
export function mapFactor(score: number, parameters: MapParameters): number {
  if (score === 0) return 1;
  const slide = Math.tanh(Math.abs(score) / parameters.saturation);
  return score > 0
    ? 1 + (parameters.ceiling - 1) * slide
    : 1 - (1 - parameters.floor) * slide;
}

/** Builds the map from the graded lines and the rules, and scores every piece. */
export function buildGradeMap(
  pieces: ReadonlyMap<string, MapPiece>,
  grades: readonly LineGrade[],
  rules: readonly RuleLesson[],
  classes: Readonly<Record<string, string>>,
  parameters: MapParameters,
): GradeMap {
  const cells: MutableCells = {};
  for (const grade of grades) {
    const piece = pieces.get(grade.key);
    if (!piece) continue;
    const contexts = contextsOf(piece, classes);
    for (const span of grade.spans) {
      if (span.strength === 0) continue;
      for (const feature of gradedFeatures(piece.text, span))
        for (const context of contexts.filter((c) => c !== "rule"))
          add(cells, feature, context, span.strength);
    }
  }
  for (const rule of rules)
    for (const [feature, strength] of Object.entries(rule.features))
      add(cells, feature, "rule", strength);
  const factors: Record<string, number> = {};
  const scored: [string, number][] = [];
  const byBank: Record<
    string,
    { pieces: number; reached: number; near: number }
  > = {};
  let reached = 0;
  let near = 0;
  let weighted = 0;
  for (const [key, piece] of [...pieces].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const result = scoreOf(
      pieceFeatures(piece),
      contextsOf(piece, classes),
      cells,
      parameters.contextWeights,
      parameters.prior,
    );
    const bank = (byBank[piece.bank] ??= { pieces: 0, reached: 0, near: 0 });
    bank.pieces += 1;
    if (result.reached) {
      reached += 1;
      bank.reached += 1;
    }
    if (result.near) {
      near += 1;
      bank.near += 1;
    }
    const factor =
      Math.round(mapFactor(result.score, parameters) * 1000) / 1000;
    if (factor !== 1) {
      factors[key] = factor;
      weighted += 1;
    }
    scored.push([key, result.score]);
  }
  const rewrite = scored
    .filter(([, score]) => score < parameters.rewriteBelow)
    .sort(([a, x], [b, y]) => x - y || a.localeCompare(b))
    .map(([key]) => key);
  const sortedCells = Object.fromEntries(
    Object.entries(cells)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([feature, row]) => [
        feature,
        Object.fromEntries(
          Object.entries(row)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([context, cell]) => [
              context,
              { sum: Math.round(cell.sum * 1000) / 1000, n: cell.n },
            ]),
        ),
      ]),
  );
  return {
    schema: "english-grade-map/1",
    cells: sortedCells,
    factors,
    rewrite,
    coverage: {
      pieces: pieces.size,
      reached,
      near,
      weighted,
      byBank: Object.fromEntries(
        Object.entries(byBank).sort(([a], [b]) => a.localeCompare(b)),
      ),
    },
  };
}

/** A piece's factor from a built map; 1 when the map has none for it. */
export function gradeMapFactor(
  ids: readonly string[],
  map: Pick<GradeMap, "factors"> | undefined,
): number {
  if (!map) return 1;
  for (const id of ids) {
    const factor = map.factors[id];
    if (factor !== undefined) return factor;
  }
  return 1;
}
