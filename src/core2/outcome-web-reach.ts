/**
 * How the outcome web reaches the world: the factor an engine multiplies its
 * own person, household or organization rate by, for one subject in one
 * place. births-counted.ts is the pattern: the engine that owns an outcome
 * keeps deciding it from its own records, times the web's factor for it.
 *
 * A link acts through each subject's own circumstances. A link's `varies`
 * rows (data/research/outcome-web/links.json) give, from the cited research,
 * how much harder the cause lands on one band (an income fifth, an age, a
 * household kind, tenure, work, sex, region) than on another. The weights are
 * scaled so the national population's average is the researched size: a
 * place whose people sit mostly in a harder-hit band moves more, and a
 * subject outside the bands a link names gets the average.
 */
import type { CensusRegion } from "./reference/census-regions";
import type { HeadWork, HouseholdKind } from "./counted-groups";
import type { WebMonth } from "./modules/outcome-web";
import {
  OUTCOME_WEB_MODULE_ID,
  scaleOf,
  WEB_LINKS,
  WIRED_INTO,
  type Varies,
  type VariesBand,
} from "./outcome-web-model";
import type { CoreAPI, CoreState } from "./types";

/** What an engine knows about the one it is deciding for; anything left out reads as the average. */
export interface Subject {
  /** The national household-income fifth, 0 to 4 (`incomeBandOf`). */
  readonly incomeFifth?: number;
  readonly age?: number;
  readonly sex?: "female" | "male";
  readonly householdKind?: HouseholdKind;
  readonly tenure?: "rent" | "own";
  readonly work?: HeadWork;
  readonly region?: CensusRegion;
}

const inBand = (band: VariesBand, value: string | number) =>
  band.is !== undefined
    ? band.is === value
    : typeof value === "number" &&
      value >= (band.min ?? -Infinity) &&
      value < (band.max ?? Infinity);

/** A moderator's weights scaled so the national average is one. */
function scaled(varies: Varies): readonly VariesBand[] {
  const mean = varies.bands.reduce((n, b) => n + b.share * b.weight, 0);
  const shares = varies.bands.reduce((n, b) => n + b.share, 0);
  // The bands' own mean, over the shares they cover.
  const norm = mean / shares;
  return varies.bands.map((band) => ({ ...band, weight: band.weight / norm }));
}

const SCALED = new Map<
  string,
  readonly (Varies & { scaledBands: readonly VariesBand[] })[]
>(
  WEB_LINKS.filter((link) => link.varies?.length).map((link) => [
    link.key,
    link.varies!.map((v) => ({ ...v, scaledBands: scaled(v) })),
  ]),
);

/** How hard a link lands on this subject against the national average (1 where it is not known). */
export function subjectWeight(linkKey: string, subject?: Subject): number {
  const rows = SCALED.get(linkKey);
  if (!rows || !subject) return 1;
  let weight = 1;
  for (const row of rows) {
    const value = subject[row.by];
    if (value === undefined) continue;
    const band = row.scaledBands.find((b) => inBand(b, value));
    if (band) weight *= band.weight;
  }
  return weight;
}

/** The scaled national average of a link's weights (one, when the data is right). */
export function nationalMeanWeight(linkKey: string): number {
  const rows = SCALED.get(linkKey);
  if (!rows) return 1;
  return rows.reduce((product, row) => {
    const covered = row.scaledBands.reduce((n, b) => n + b.share, 0);
    return (
      product *
      (row.scaledBands.reduce((n, b) => n + b.share * b.weight, 0) / covered)
    );
  }, 1);
}

/** Each place's latest web month, read once a day however many subjects ask. */
const LATEST = new WeakMap<
  object,
  { date: string; rows: Map<string, WebMonth | null> }
>();

function latestRow(api: CoreAPI, placeId: string): WebMonth | null {
  const core = api.state as CoreState;
  if (!core.modules.has(OUTCOME_WEB_MODULE_ID)) return null;
  let cache = LATEST.get(core);
  if (!cache || cache.date !== core.date) {
    cache = { date: core.date, rows: new Map() };
    LATEST.set(core, cache);
  }
  if (cache.rows.has(placeId)) return cache.rows.get(placeId)!;
  let latest: WebMonth | null = null;
  for (const row of api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[])
    if (!latest || row.month > latest.month) latest = row;
  cache.rows.set(placeId, latest);
  return latest;
}

/** One link's part in a subject's factor: its place effect and how hard it lands on them. */
export interface WebPart {
  readonly link: string;
  readonly effect: number;
  readonly weight: number;
}

export interface WebReach {
  /** The multiplier on the engine's own rate (1 where nothing moves it). */
  readonly factor: number;
  /** For a level outcome, the sum of its links' scaled additions in the measure's own unit (zero otherwise). */
  readonly added: number;
  /** The web month row the factor stands on, or null. */
  readonly recordId: string | null;
  readonly parts: readonly WebPart[];
}

const NONE: WebReach = { factor: 1, added: 0, recordId: null, parts: [] };

/**
 * The web's factor on an outcome for one subject in a place this month: the
 * product of each running link's effect, scaled by how hard it lands on the
 * subject (for a level outcome, its base plus the scaled additions, over its
 * base). Without a subject, the place's average.
 */
export function webReach(
  api: CoreAPI,
  placeId: string,
  measure: string,
  subject?: Subject,
): WebReach {
  const row = latestRow(api, placeId);
  const links = WIRED_INTO.get(measure);
  if (!row || !links) return NONE;
  const level = scaleOf(measure) === "level";
  const base = row.bases[measure];
  let product = 1,
    added = 0;
  const parts: WebPart[] = [];
  for (const link of links) {
    const effect = row.effects[link.key];
    if (effect === undefined || effect === 0) continue;
    const weight = subjectWeight(link.key, subject);
    parts.push({ link: link.key, effect, weight });
    if (level) added += effect * weight;
    else product *= 1 + effect * weight;
  }
  if (!parts.length) return { ...NONE, recordId: row.id };
  const factor = level ? (base ? (base + added) / base : 1) : product;
  return {
    factor: Math.max(0, factor),
    added: level ? added : 0,
    recordId: row.id,
    parts,
  };
}

/** The factor alone, for a rate that needs nothing else. */
export function webFactorFor(
  api: CoreAPI,
  placeId: string,
  measure: string,
  subject?: Subject,
): number {
  return webReach(api, placeId, measure, subject).factor;
}
