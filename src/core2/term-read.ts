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
import { OUTCOME_WEB_MODULE_ID } from "./outcome-web-model";
import areaData from "./data/term-read/areas.json" with { type: "json" };

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

/**
 * The country's term read: each area's mean slide over the places the web
 * keeps (the player's town and every place the economy records). Other
 * places keep only results (owner, Nov 5), so this is those results, not a
 * count of every place.
 */
export function countryTermRead(api: CoreAPI, sinceDate: string): AreaRead[] {
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID)) return [];
  const places = termReadPlaces(api);
  const byArea = new Map<string, AreaRead[]>();
  for (const placeId of places)
    for (const read of placeTermRead(api, placeId, sinceDate)) {
      const list = byArea.get(read.area) ?? [];
      list.push(read);
      byArea.set(read.area, list);
    }
  return TERM_AREAS.flatMap((area): AreaRead[] => {
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
}

/** The term as a whole: the mean of its areas' slides (0 when nothing is read yet). */
export function overallSlide(reads: readonly AreaRead[]): number {
  return reads.length
    ? reads.reduce((sum, row) => sum + row.slide, 0) / reads.length
    : 0;
}
