/**
 * Every world names its schools itself (owner, Oct 27: realistic, not real;
 * no real school's name ships). A campus keeps the directory's place, grades
 * and size as structure, and takes a name in the shapes American public
 * schools use (the town, a compass point and the town, a public figure, a
 * family name, or local landscape), weighted as the national directory counts
 * them per stage (src/core2/data/names/school-name-features.json). A family
 * name is one of the world's own families. The caller draws one name from a
 * stage's candidates with the world's seed; this file holds no draw of its own. Seeded generation of what exists, never an actor's
 * outcome.
 */
import SHAPES from "./data/names/school-name-features.json" with { type: "json" };

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
 * shared evenly over its names. A shape with no names (a world with no
 * families yet) is left out.
 */
function namesFor(
  stageId: string,
  families: readonly string[],
): readonly string[] {
  const counts = DATA.shapes[stageId] ?? DATA.shapes.elementary!;
  const lists: Record<Shape, readonly string[]> = {
    place: [TOWN],
    direction: DATA.directions.map((d) => `${d} ${TOWN}`),
    figure: DATA.figures,
    family: families,
    feature: DATA.features,
  };
  const names: string[] = [];
  for (const shape of Object.keys(lists) as Shape[]) {
    const list = lists[shape];
    if (!list.length) continue;
    const each = Math.max(1, Math.round(counts[shape] / list.length));
    for (const name of list) for (let i = 0; i < each; i += 1) names.push(name);
  }
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
 * The namer for one world's schools: `families` are the world's own family
 * names. Each call names one campus: `draw` picks one of a list with the
 * campus's own seeded stream (the caller's), so everyone in the world who
 * went there says the same name and another world says another. `town` is
 * the name of the place the school is in. A name that matches one of `real`
 * (the upper-case names of the real schools there, as people say them) is
 * drawn again.
 */
export function schoolNamer(families: readonly string[]) {
  const candidates = new Map<string, readonly string[]>();
  return (
    draw: (names: readonly string[]) => string,
    stage: { readonly id: string; readonly nameSuffix: string },
    town: string | null,
    real: ReadonlySet<string> = new Set(),
  ): string => {
    let names = candidates.get(stage.id);
    if (!names)
      candidates.set(stage.id, (names = namesFor(stage.id, families)));
    let kept: string | null = null;
    for (let tries = 0; tries <= DATA.redraws.value; tries += 1) {
      const name = said(draw(names), stage.nameSuffix, town);
      if (!name) continue;
      kept = name;
      if (!real.has(name.toUpperCase())) return name;
    }
    return kept ?? `${DATA.features[0]} ${stage.nameSuffix}`;
  };
}
