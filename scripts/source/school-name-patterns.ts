import { readFileSync } from "node:fs";
import { join } from "node:path";

import GIVEN_NAMES from "../../src/simulation/given-names-by-decade.json" with { type: "json" };
import { NAMES_STARTER_V1 } from "../../src/simulation/names-data";
import { SCHOOL_NAMES_V1 } from "../../src/simulation/school-names";

/**
 * How American schools are named, measured from the education directory the
 * game already ships (`public/education`, the 2025-26 CCD school file).
 *
 * The directory's NAMES are never handed to a generated school: it describes
 * one recent year and cannot say a school existed when a grown character was
 * a child. What it can say is how names are SHAPED, and that is all this keeps:
 *
 *   - for each school level and each count of schools a town has at that level
 *     (one, two or three, four or more), how many are named for the town, for
 *     a compass point, for one of the national figures in our own corpus, for
 *     a person by full name, for a family name alone, or anything else;
 *   - for each national figure in our corpus, how many schools in each Census
 *     region carry that figure's name;
 *   - for every town with more than one school at some level, how many it has
 *     at each level. A town not listed has at most one.
 *
 * The classifier is a heuristic and is written down here so it can be read:
 * "person" means the name opens with a given name from our SSA tables and has
 * at least two words before the school word, "family name" means one word that
 * is in our surname corpus. Both undercount (a local honoree whose given name
 * is not in the tables lands in "other"), so the person shares are floors.
 */

export type SchoolLevel = "elementary" | "middle" | "high";
export type SizeBucket = "1" | "2-3" | "4+";
export type NamePattern =
  "place" | "direction" | "figure" | "person" | "family" | "other";

const REGIONS: Readonly<Record<string, string>> = Object.fromEntries(
  (
    [
      ["Northeast", "CT ME MA NH RI VT NJ NY PA"],
      ["Midwest", "IL IN MI OH WI IA KS MN MO NE ND SD"],
      ["South", "DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX"],
      ["West", "AZ CO ID MT NV NM UT WY AK CA HI OR WA"],
    ] as const
  ).flatMap(([region, states]) =>
    states.split(" ").map((state) => [state, region]),
  ),
);

const DIRECTIONS = new Set([
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "CENTRAL",
  "NORTHEAST",
  "NORTHWEST",
  "SOUTHEAST",
  "SOUTHWEST",
]);

const SCHOOL_WORDS =
  /\b(HIGH|MIDDLE|ELEMENTARY|ELEM\.?|EL|ES|MS|HS|H S|JUNIOR|SENIOR|JR|SR|SCHOOL|SCHOOLS|ACADEMY|INTERMEDIATE|PRIMARY|SECONDARY|CHARTER|K-8|PREPARATORY|PREP|CENTER|CAMPUS)\b.*$/;

type CompactRecord = readonly [
  string,
  string,
  string,
  string,
  string,
  ...unknown[],
];

function levelOf(capabilities: readonly (readonly [string, string])[]) {
  const offered = new Map(capabilities);
  const grade = (key: string) => offered.get(`G_${key}_OFFERED`) === "Yes";
  if (grade("12") || grade("11")) return "high";
  if (grade("8") && !grade("3")) return "middle";
  if (grade("3")) return "elementary";
  return null;
}

export function measureSchoolNamePatterns(root = ".") {
  const manifest = JSON.parse(
    readFileSync(join(root, "public/education/manifest.json"), "utf8"),
  ) as { chunks: { kind: string; path: string }[] };
  const chunk = manifest.chunks.find((entry) => entry.kind === "school")!;
  const catalog = JSON.parse(
    readFileSync(join(root, "public/education", chunk.path), "utf8"),
  ) as { records: CompactRecord[] };

  const givenNames = new Set<string>();
  for (const decade of Object.values(
    GIVEN_NAMES.decades as unknown as Record<
      string,
      Record<string, [string, number][]>
    >,
  )) {
    for (const rows of Object.values(decade)) {
      for (const [name] of rows) givenNames.add(name.toUpperCase());
    }
  }
  for (const figure of SCHOOL_NAMES_V1.figures) {
    givenNames.add(figure.split(" ")[0]!.toUpperCase());
  }
  const familyNames = new Set(
    NAMES_STARTER_V1.familyNames.map((name) => name.toUpperCase()),
  );
  const figures = SCHOOL_NAMES_V1.figures.map((figure) => [
    figure,
    figure.toUpperCase(),
  ]);

  const rows: {
    name: string;
    town: string;
    state: string;
    level: SchoolLevel;
  }[] = [];
  for (const record of catalog.records) {
    const [, , name, city, state] = record;
    const level = levelOf(record[12] as readonly (readonly [string, string])[]);
    if (level === null || REGIONS[state] === undefined) continue;
    rows.push({ name, town: city.toUpperCase(), state, level });
  }

  const perTown = new Map<string, Record<SchoolLevel, number>>();
  for (const row of rows) {
    const key = `${row.state}:${row.town}`;
    const counts = perTown.get(key) ?? { elementary: 0, middle: 0, high: 0 };
    counts[row.level] += 1;
    perTown.set(key, counts);
  }

  const pattern = (name: string, town: string): NamePattern => {
    const upper = name.toUpperCase();
    if (upper.includes(town)) return "place";
    const words = upper.split(/\s+/);
    if (DIRECTIONS.has(words[0]!)) return "direction";
    if (
      figures.some(
        ([, figure]) =>
          upper.startsWith(`${figure} `) ||
          ` ${upper} `.includes(` ${figure} `),
      )
    ) {
      return "figure";
    }
    const stem = upper.replace(SCHOOL_WORDS, "").trim().split(/\s+/);
    if (stem.length >= 2 && givenNames.has(stem[0]!)) return "person";
    if (stem.length === 1 && familyNames.has(stem[0]!)) return "family";
    return "other";
  };

  const bucket = (count: number): SizeBucket =>
    count <= 1 ? "1" : count <= 3 ? "2-3" : "4+";
  const patterns: Record<string, Record<NamePattern, number>> = {};
  const figureRegions: Record<string, Record<string, number>> = {};
  for (const [figure] of figures) figureRegions[figure!] = {};
  for (const row of rows) {
    const size = bucket(perTown.get(`${row.state}:${row.town}`)![row.level]);
    const key = `${row.level}:${size}`;
    patterns[key] ??= {
      place: 0,
      direction: 0,
      figure: 0,
      person: 0,
      family: 0,
      other: 0,
    };
    patterns[key][pattern(row.name, row.town)] += 1;
    const upper = row.name.toUpperCase();
    for (const [figure, figureUpper] of figures) {
      if (
        upper.startsWith(`${figureUpper} `) ||
        ` ${upper} `.includes(` ${figureUpper} `)
      ) {
        const region = REGIONS[row.state]!;
        figureRegions[figure!]![region] =
          (figureRegions[figure!]![region] ?? 0) + 1;
      }
    }
  }

  const towns: Record<string, [number, number, number]> = {};
  for (const key of [...perTown.keys()].sort()) {
    const counts = perTown.get(key)!;
    if (counts.elementary > 1 || counts.middle > 1 || counts.high > 1) {
      towns[key] = [counts.elementary, counts.middle, counts.high];
    }
  }

  return {
    source: `public/education/${chunk.path}`,
    note: "Counts of name shapes, figure use by region, and schools per town. No school's name is kept.",
    regions: REGIONS,
    patterns: Object.fromEntries(
      Object.entries(patterns).sort(([a], [b]) => a.localeCompare(b)),
    ),
    figureRegions,
    towns,
  };
}

if (process.argv[1]?.endsWith("school-name-patterns.ts")) {
  const out = "src/simulation/school-name-patterns.json";
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, `${JSON.stringify(measureSchoolNamePatterns())}\n`);
  console.log(`Wrote ${out}; run prettier --write on it before committing.`);
}
