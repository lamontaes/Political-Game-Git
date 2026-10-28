/**
 * Every world names its schools itself (owner, Oct 27: realistic, not real;
 * no real school's name ships). A campus keeps the directory's place, grades
 * and size as structure, and takes a generated name drawn once per world and
 * campus from the shapes American public schools use (the town, a compass
 * point and the town, a public figure, a family name, or local landscape),
 * weighted as the national directory counts them per stage
 * (src/core2/data/names/school-name-features.json). Seeded generation of what
 * exists, never an actor's outcome.
 */
import SHAPES from "./data/names/school-name-features.json" with { type: "json" };
import { DEFAULT_CORPUS_VERSION, getNameCorpus } from "./gov-rules/names-data";
import { SeededRng } from "./kernel/rng";

type Shape = "place" | "direction" | "figure" | "family" | "feature";
const DATA = SHAPES as unknown as {
  readonly shapes: Readonly<Record<string, Readonly<Record<Shape, number>>>>;
  readonly directions: readonly string[];
  readonly figures: readonly string[];
  readonly features: readonly string[];
  readonly redraws: { readonly value: number };
};
const SHAPE_ORDER: readonly Shape[] = [
  "place",
  "direction",
  "figure",
  "family",
  "feature",
];

/** The shape a school's name takes, by the stage's counted mix. */
function shapeFor(rng: SeededRng, stageId: string): Shape {
  const weights = DATA.shapes[stageId] ?? DATA.shapes.elementary!;
  const total = SHAPE_ORDER.reduce((sum, shape) => sum + weights[shape], 0);
  let point = rng.next() * total;
  for (const shape of SHAPE_ORDER) {
    point -= weights[shape];
    if (point < 0) return shape;
  }
  return SHAPE_ORDER[SHAPE_ORDER.length - 1]!;
}

/**
 * This world's name for one campus: the same for everyone in the world who
 * went there (the key is the campus), different in another world, and never
 * one of `real` (the upper-case names of the real schools near the person,
 * as people say them). `town` is the name of the place the school serves; a
 * county keeps its plain name, since nobody says "North Sangamon County High
 * School".
 */
export function generatedSchoolName(
  seed: string,
  campusKey: string,
  stage: { readonly id: string; readonly nameSuffix: string },
  town: string | null,
  real: ReadonlySet<string> = new Set(),
): string {
  const rng = new SeededRng(seed).fork(`school-name:${campusKey}`);
  let name = drawName(rng, stage, town);
  for (
    let draw = 0;
    draw < DATA.redraws.value && real.has(name.toUpperCase());
    draw += 1
  )
    name = drawName(rng, stage, town);
  return name;
}

function drawName(
  rng: SeededRng,
  stage: { readonly id: string; readonly nameSuffix: string },
  town: string | null,
): string {
  const shape = shapeFor(rng, stage.id);
  const stem = town?.trim() ?? "";
  const suffix = stage.nameSuffix;
  if (!stem && (shape === "place" || shape === "direction"))
    return `${rng.pick(DATA.features)} ${suffix}`;
  switch (shape) {
    case "place":
      return `${stem} ${suffix}`;
    case "direction":
      return stem.endsWith("County")
        ? `${stem} ${suffix}`
        : `${rng.pick(DATA.directions)} ${stem} ${suffix}`;
    case "figure":
      return `${rng.pick(DATA.figures)} ${suffix}`;
    case "family":
      return `${rng.pick(getNameCorpus(DEFAULT_CORPUS_VERSION).familyNames)} ${suffix}`;
    case "feature":
      return `${rng.pick(DATA.features)} ${suffix}`;
  }
}
