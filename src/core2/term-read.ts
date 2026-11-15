/**
 * How an official's term is going, read by policy area (owner, Nov 8: "if
 * you're having a good term except for education, then you might get a
 * strike"). Each area is a few of the outcome web's own measures
 * (`data/term-read/areas.json`); an area's read is how far those measures
 * moved between the web's row at the start of the term and its newest row,
 * a slide between -1 and 1, never a pass or fail. The read cites the two
 * rows, so anything built on it (an address's bad news, a group's walkout)
 * can say why. Nothing here writes a record or decides what anyone does.
 *
 * stopgapId: SG-WORDS-term-read-warmup (the first twelve months of a world
 * are not read, while the town's records settle in).
 */
import type { CoreAPI, CoreState } from "./types";
import { countryStateMonth } from "./modules/macro";
import { OUTCOME_WEB_MODULE_ID } from "./outcome-web-model";
import areaData from "./data/term-read/areas.json" with { type: "json" };
import { placeStateKey } from "./place-map";
import { earnedPerResident, REGIONS, type RegionMonth } from "./regional-model";
import type { MacroMonth } from "./macro-model";
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };

/** The web's month row, as far as the read needs it. */
interface WebRow {
  readonly id: string;
  readonly placeId: string;
  readonly month: string;
  readonly values: Readonly<Record<string, number>>;
}

export interface MeasureRead {
  readonly measure: string;
  readonly from: number;
  readonly to: number;
  /** The slide for this measure alone: better is positive. */
  readonly slide: number;
}

export interface AreaRead {
  readonly area: string;
  /** Between -1 (as bad as the scale) and 1 (as good), the mean of its measures. */
  readonly slide: number;
  readonly measures: readonly MeasureRead[];
  /** The two web rows the read compared, the earlier first. */
  readonly sourceRecordIds: readonly string[];
}

const DATA = areaData as unknown as {
  fullChange: { value: number };
  minimumMonths: { value: number };
  warmupMonths: { value: number };
  areas: Readonly<Record<string, Readonly<Record<string, number>>>>;
  jurisdictionFigures: {
    measures: Readonly<Record<string, { state: string; nation: string }>>;
  };
  answeredBy: Readonly<
    Record<
      string,
      { topics: readonly string[]; lines: readonly string[] } | string
    >
  >;
};

/** Every area the read keeps, in the data's order. */
export const TERM_AREAS: readonly string[] = Object.keys(DATA.areas);

/** Every outcome measure some area reads. */
export const TERM_MEASURES: readonly string[] = [
  ...new Set(Object.values(DATA.areas).flatMap((row) => Object.keys(row))),
];

/** The slide for a measure that moved from `from` to `to` where `direction` is the better way. */
export function measureSlide(
  from: number,
  to: number,
  direction: number,
): number {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  const scale = Math.max(Math.abs(from), Number.EPSILON);
  return Math.tanh((direction * (to - from)) / scale / DATA.fullChange.value);
}

/**
 * The catalog topic each policy question sits under ("Wages and working
 * hours"), read once from the bill catalog's own rows.
 */
const TOPIC_OF_QUESTION: ReadonlyMap<string, string> = new Map(
  (
    catalog as unknown as {
      subjects: {
        topics: { name: string; policies?: { question?: string }[] }[];
      }[];
    }
  ).subjects.flatMap((subject) =>
    subject.topics.flatMap((topic) =>
      (topic.policies ?? []).flatMap((policy) =>
        policy.question ? [[policy.question, topic.name] as const] : [],
      ),
    ),
  ),
);

/**
 * The catalog topics whose questions answer an area of the term read
 * (`answeredBy.<area>.topics` in the area data), or none for a name that is
 * not an area (a measure of the macro year).
 */
export function topicsAnsweringArea(area: string): readonly string[] {
  const row = DATA.answeredBy[area];
  return typeof row === "object" ? row.topics : [];
}

/** The budget lines ("budget-line:<line>") that bear on an area of the term read. */
function linesAnsweringArea(area: string): readonly string[] {
  const row = DATA.answeredBy[area];
  return typeof row === "object" ? row.lines : [];
}

/**
 * Whether a question answers an area of the term read: a budget line that
 * bears on it, or a policy question under one of its catalog topics.
 */
export function questionAnswersArea(question: string, area: string): boolean {
  if (question.startsWith("budget-line:"))
    return linesAnsweringArea(area).includes(question);
  const topic = TOPIC_OF_QUESTION.get(question);
  return !!topic && topicsAnsweringArea(area).includes(topic);
}

/** Every area of the term read a policy question answers, in the area data's order. */
export function areasAnswered(question: string): readonly string[] {
  return TERM_AREAS.filter((area) => questionAnswersArea(question, area));
}

/** The month `months` after `month`, both as "YYYY-MM". */
function monthAfter(month: string, months: number): string {
  const index =
    Number(month.slice(0, "YYYY".length)) * 12 +
    Number(month.slice("YYYY-".length)) -
    1 +
    months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * A place's web rows from a month on, oldest first (empty when the world
 * keeps no web). A world's first months are not a trend: the town's jobs,
 * incomes and schools are still settling from the records it opened with, so
 * a term is read from the end of that warm-up when it began inside it.
 */
function rowsOf(api: CoreAPI, placeId: string, sinceMonth: string): WebRow[] {
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID)) return [];
  const all = (
    api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [placeId]) as unknown as WebRow[]
  )
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));
  if (!all.length) return [];
  const from = [
    sinceMonth,
    monthAfter(all[0]!.month, DATA.warmupMonths.value),
  ].sort()[1]!;
  return all.filter((row) => row.month >= from);
}

/**
 * One place's term read by area, from the month `sinceDate` falls in to the
 * newest row. Empty while the web holds fewer months than the data asks for.
 */
export function placeTermRead(
  api: CoreAPI,
  placeId: string,
  sinceDate: string,
): AreaRead[] {
  const rows = rowsOf(api, placeId, sinceDate.slice(0, "YYYY-MM".length));
  if (rows.length < DATA.minimumMonths.value) return [];
  const first = rows[0]!;
  const last = rows.at(-1)!;
  const reads: AreaRead[] = [];
  for (const [area, measures] of Object.entries(DATA.areas)) {
    const read: MeasureRead[] = [];
    for (const [measure, direction] of Object.entries(measures)) {
      const from = first.values[measure];
      const to = last.values[measure];
      // A measure the engines have not read yet is no reading, never a zero
      // (a town too small to have a graduating class).
      if (!from || !to) continue;
      read.push({
        measure,
        from,
        to,
        slide: measureSlide(from, to, direction),
      });
    }
    if (!read.length) continue;
    reads.push({
      area,
      slide: read.reduce((sum, row) => sum + row.slide, 0) / read.length,
      measures: read,
      sourceRecordIds: [first.id, last.id],
    });
  }
  return reads;
}

/** Every place the web keeps rows for, in order. */
export function termReadPlaces(api: CoreAPI): string[] {
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID)) return [];
  return [
    ...new Set(
      (
        api
          .moduleState(OUTCOME_WEB_MODULE_ID)
          .table("months")
          .rows() as unknown as WebRow[]
      ).map((row) => row.placeId),
    ),
  ].sort();
}

/** The module ids of the regional and macro modules (modules/regional.ts and modules/macro.ts), read here by id so this file imports no module. */
const REGIONAL_ID = "regional";
const MACRO_ID = "macro";

/** One month's figures for a state or the country, by web measure, and the record that holds them. */
interface FigureRow {
  readonly id: string;
  readonly month: string;
  readonly figures: Readonly<Record<string, number>>;
}

const monthIndexOf = (month: string) =>
  Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));

/** The row of a state at `month`, from the country tier's kept months as the web's measures (null while the tier keeps none that month). */
function stateRowAt(
  api: CoreAPI,
  stateFips: string,
  month: string,
): FigureRow | null {
  const row = countryStateMonth(api, stateFips, month);
  if (!row) return null;
  const sums = row as unknown as Record<string, number>;
  const figures: Record<string, number> = {};
  for (const [measure, field] of Object.entries(
    DATA.jurisdictionFigures.measures,
  ))
    if (Number.isFinite(sums[field.state]))
      figures[measure] = sums[field.state]!;
  return { id: row.id, month, figures };
}

/** The country's row at `month`, from the macro module's months (real history before the opening, the economy since). */
function nationRowAt(api: CoreAPI, month: string): FigureRow | null {
  const row = api
    .moduleState(MACRO_ID)
    .table("months")
    .get(`macro-month:${month}`) as unknown as MacroMonth | undefined;
  if (!row) return null;
  // What the jobs pay per resident is the sum over every region the regional
  // module keeps that month; the macro row holds no population.
  const regions = (api.state as CoreState).modules.has(REGIONAL_ID)
    ? (api
        .moduleState(REGIONAL_ID)
        .table("months")
        .query("byMonth", [month]) as unknown as RegionMonth[])
    : [];
  const values: Record<string, number> = {
    ...(row as unknown as Record<string, number>),
    ...(regions.length
      ? { earnedPerResident: earnedPerResident(regions) }
      : {}),
  };
  const figures: Record<string, number> = {};
  for (const [measure, field] of Object.entries(
    DATA.jurisdictionFigures.measures,
  ))
    if (Number.isFinite(values[field.nation]))
      figures[measure] = values[field.nation]!;
  return { id: row.id, month, figures };
}

/**
 * The areas a state's or the country's own monthly records keep figures for,
 * read from the first kept month at or after the term began to the newest
 * (one reader with the town's: `measureSlide`, the same areas and
 * directions). A month the module keeps no row for is skipped to the next
 * kept one (the regional module keeps the last twelve months, each December
 * and the opening). Nothing is read for a measure the records do not keep.
 */
function figuredRead(
  api: CoreAPI,
  jurisdiction: string,
  sinceMonth: string,
): AreaRead[] {
  const state = jurisdiction === "US" ? null : jurisdiction.slice(3);
  const modules = (api.state as CoreState).modules;
  if (!modules.has(MACRO_ID)) return [];
  const stateFips = state
    ? REGIONS.find((row) => row.stateUsps === state)?.stateFips
    : undefined;
  if (state && !stateFips) return [];
  const rowAt = (month: string) =>
    state ? stateRowAt(api, stateFips!, month) : nationRowAt(api, month);
  const today = String(api.state.date).slice(0, "YYYY-MM".length);
  let last: FigureRow | null = null;
  for (
    let month = today, tries = 0;
    !last && tries < 3;
    month = monthAfter(month, -1), tries += 1
  )
    last = rowAt(month);
  if (!last) return [];
  let first: FigureRow | null = null;
  for (
    let month = sinceMonth;
    !first && month < last.month;
    month = monthAfter(month, 1)
  )
    first = rowAt(month);
  if (
    !first ||
    monthIndexOf(last.month) - monthIndexOf(first.month) + 1 <
      DATA.minimumMonths.value
  )
    return [];
  const reads: AreaRead[] = [];
  for (const [area, measures] of Object.entries(DATA.areas)) {
    const read: MeasureRead[] = [];
    for (const [measure, direction] of Object.entries(measures)) {
      const from = first.figures[measure];
      const to = last.figures[measure];
      if (from === undefined || to === undefined) continue;
      read.push({
        measure,
        from,
        to,
        slide: measureSlide(from, to, direction),
      });
    }
    if (!read.length) continue;
    reads.push({
      area,
      slide: read.reduce((sum, row) => sum + row.slide, 0) / read.length,
      measures: read,
      sourceRecordIds: [first.id, last.id],
    });
  }
  return reads;
}

/** A jurisdiction's own figured areas first, then the old read (the mean over the places the web keeps) for each area they do not cover. */
function withFigured(
  figured: readonly AreaRead[],
  rest: readonly AreaRead[],
): AreaRead[] {
  const have = new Set(figured.map((row) => row.area));
  return TERM_AREAS.flatMap((area) => [
    ...figured.filter((row) => row.area === area),
    ...rest.filter((row) => row.area === area && !have.has(area)),
  ]);
}

/**
 * The country's term read: each area's slide from the country's own monthly
 * figures where it keeps them (jobs and prices, from the macro months, real
 * history included), and for the other areas the mean over the places the
 * web keeps (the player's town and every place the economy records). Other
 * places keep only results (owner, Nov 5), so this is those results, not a
 * count of every place.
 */
export function countryTermRead(api: CoreAPI, sinceDate: string): AreaRead[] {
  const figured = figuredRead(api, "US", sinceDate.slice(0, "YYYY-MM".length));
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID))
    return figured;
  const places = termReadPlaces(api);
  const byArea = new Map<string, AreaRead[]>();
  for (const placeId of places)
    for (const read of placeTermRead(api, placeId, sinceDate)) {
      const list = byArea.get(read.area) ?? [];
      list.push(read);
      byArea.set(read.area, list);
    }
  const rest = TERM_AREAS.flatMap((area): AreaRead[] => {
    const list = byArea.get(area);
    if (!list?.length) return [];
    return [
      {
        area,
        slide: list.reduce((sum, row) => sum + row.slide, 0) / list.length,
        measures: list.flatMap((row) => row.measures),
        sourceRecordIds: [
          ...new Set(list.flatMap((row) => row.sourceRecordIds)),
        ],
      },
    ];
  });
  return withFigured(figured, rest);
}

/** The term as a whole: the mean of its areas' slides (0 when nothing is read yet). */
export function overallSlide(reads: readonly AreaRead[]): number {
  return reads.length
    ? reads.reduce((sum, row) => sum + row.slide, 0) / reads.length
    : 0;
}

/**
 * The term read of a jurisdiction an office serves, from a date: the country
 * ("US"), a state ("US-NJ", the mean over the places the web keeps inside it)
 * or one town's own place. One reader for every address and campaign that
 * speaks of how a place's term went.
 */
export function jurisdictionTermRead(
  api: CoreAPI,
  jurisdiction: string,
  sinceDate: string,
): AreaRead[] {
  if (jurisdiction === "US") return countryTermRead(api, sinceDate);
  if (!jurisdiction.startsWith("US-"))
    return placeTermRead(api, jurisdiction, sinceDate);
  const reads = termReadPlaces(api)
    .filter((place) => placeStateKey(place) === jurisdiction)
    .flatMap((place) => placeTermRead(api, place, sinceDate));
  const rest = TERM_AREAS.flatMap((area): AreaRead[] => {
    const rows = reads.filter((row) => row.area === area);
    return rows.length
      ? [
          {
            area,
            slide: rows.reduce((sum, row) => sum + row.slide, 0) / rows.length,
            measures: rows.flatMap((row) => row.measures),
            sourceRecordIds: [
              ...new Set(rows.flatMap((row) => row.sourceRecordIds)),
            ],
          },
        ]
      : [];
  });
  return withFigured(
    figuredRead(api, jurisdiction, sinceDate.slice(0, "YYYY-MM".length)),
    rest,
  );
}
