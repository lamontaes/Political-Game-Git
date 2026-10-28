/**
 * Every world names its schools itself (owner, Oct 27: realistic, not real;
 * no real school's name ships). A campus keeps the directory's place, grades
 * and size as structure, and takes a name in the shapes American public
 * schools use (the town, a compass point and the town, a public figure, a
 * family name, or local landscape), weighted as the national directory counts
 * them per stage (src/core2/data/names/school-name-features.json). The caller
 * draws one name from a stage's candidates with the world's seed; this file
 * holds no draw of its own. Seeded generation of what exists, never an actor's
 * outcome.
 */
import SHAPES from "./data/names/school-name-features.json" with { type: "json" };
import { DEFAULT_CORPUS_VERSION, getNameCorpus } from "./gov-rules/names-data";

type Shape = "place" | "direction" | "figure" | "family" | "feature";
const DATA = SHAPES as unknown as {
  readonly shapes: Readonly<Record<string, Readonly<Record<Shape, number>>>>;
  readonly directions: readonly string[];
  readonly figures: readonly string[];
  readonly features: readonly string[];
  readonly redraws: { readonly value: number };
};

/** Stands for the town's name in a candidate, filled in when drawn. */
const TOWN = "\u0000town";

/**
 * A stage's candidate names, before the stage's suffix: each shape's names
 * repeated so that the shape is drawn as often as the directory counts it,
 * shared evenly over its names. Built once per stage.
 */
const candidates = new Map<string, readonly string[]>();
function namesFor(stageId: string): readonly string[] {
  const known = candidates.get(stageId);
  if (known) return known;
  const counts = DATA.shapes[stageId] ?? DATA.shapes.elementary!;
  const lists: Record<Shape, readonly string[]> = {
    place: [TOWN],
    direction: DATA.directions.map((d) => `${d} ${TOWN}`),
    figure: DATA.figures,
    family: getNameCorpus(DEFAULT_CORPUS_VERSION).familyNames,
    feature: DATA.features,
  };
  const names: string[] = [];
  for (const shape of Object.keys(lists) as Shape[]) {
    const list = lists[shape];
    const each = Math.max(1, Math.round(counts[shape] / list.length));
    for (const name of list) for (let i = 0; i < each; i += 1) names.push(name);
  }
  candidates.set(stageId, names);
  return names;
}

/** A drawn candidate as said: the town filled in, the stage's suffix added; null where it needs a town there is none of. */
function said(raw: string, suffix: string, town: string | null): string | null {
  if (!raw.includes(TOWN)) return `${raw} ${suffix}`;
  const stem = town?.trim();
  if (!stem) return null;
  // Nobody says "North Sangamon County High School": a county keeps its plain name.
  if (raw !== TOWN && stem.endsWith("County")) return `${stem} ${suffix}`;
  return `${raw.replace(TOWN, stem)} ${suffix}`;
}

/**
 * This world's name for one campus. `draw` picks one of a list with the
 * campus's own seeded stream (the caller's), so everyone in the world who
 * went there says the same name and another world says another. `town` is
 * the name of the place the school serves. A name that matches one of `real`
 * (the upper-case names of the real schools near the person, as people say
 * them) is drawn again.
 */
export function generatedSchoolName(
  draw: (names: readonly string[]) => string,
  stage: { readonly id: string; readonly nameSuffix: string },
  town: string | null,
  real: ReadonlySet<string> = new Set(),
): string {
  const names = namesFor(stage.id);
  let kept: string | null = null;
  for (let tries = 0; tries <= DATA.redraws.value; tries += 1) {
    const name = said(draw(names), stage.nameSuffix, town);
    if (!name) continue;
    kept = name;
    if (!real.has(name.toUpperCase())) return name;
  }
  return kept ?? `${DATA.features[0]} ${stage.nameSuffix}`;
}
