/**
 * The outcome web on the new core (M3-04, "the bread and butter"): one area
 * of the world moves another, for every researched link that has both its
 * measures here.
 *
 * On the 3rd of each month (the day after world-metrics writes the town's
 * economic row), and again the day a law takes effect, each place gets one
 * dated record: every cause the links read (engine records, the law in
 * force) and every outcome the web keeps, each its modeled base times its
 * links' factors. A link reads its cause as it stood `lagMonths` ago; an
 * outcome a link moves feeds the links that start from it the next month.
 *
 * Nothing here draws a level or limits a factor. Engines that set a measure
 * themselves read the web's factor for it through `outcomeWebFactor`.
 */
import regions from "../data/regional/regions.json" with { type: "json" };
import {
  baseOf,
  CALIBRATED_AT,
  derivedOf,
  engineMeasure,
  fixedBaseline,
  isLaw,
  KEPT_OUTCOMES,
  keptOutcome,
  LAW_PREFIX,
  linkEffect,
  OUTCOME_WEB_MODULE_ID,
  moderatorScale,
  scaleOf,
  sizeIn,
  WEB_LINKS,
  WEB_SETTINGS,
  WEB_VERSION,
  WIRED_INTO,
  type WebLink,
} from "../outcome-web-model";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreEventInput, CoreModule, CoreState } from "../types";
import { townMetrics, WORLD_METRICS_MODULE_ID } from "./world-metrics";
import { propertyTaxRateInForce } from "../housing-property-tax";
import { GOV_MEASURES, govMeasure, govMeasureRecord } from "../gov-measures";
import { monthEvent } from "../outcome-news";

export { OUTCOME_WEB_MODULE_ID };
const STATE_ID = "outcome-web:state";
const RUN_KIND = "outcome-web";
const SETTINGS = WEB_SETTINGS;
const MONTHS = SETTINGS.schedule.monthsPerYear;

/** One place's month: every cause read and every kept outcome, with each link's effect. */
export interface WebMonth {
  readonly id: string;
  readonly placeId: string;
  readonly month: string;
  readonly date: string;
  readonly values: Readonly<Record<string, number>>;
  readonly bases: Readonly<Record<string, number>>;
  /** Each running link's effect: a proportional change, or for a level outcome, units added. */
  readonly effects: Readonly<Record<string, number>>;
  /** Dated producer rows; null means the opening was read directly from live engine records. */
  readonly engineSources: Readonly<Record<string, string | null>>;
}

interface WebState {
  readonly id: string;
  readonly openedAt: string;
  readonly openingMonth: string;
  readonly stateKey: string;
}

const monthIndex = (month: string) =>
  Number(month.slice(0, "YYYY".length)) * MONTHS +
  Number(month.slice("YYYY-".length, "YYYY-MM".length)) -
  1;
const monthKey = (index: number) =>
  `${Math.floor(index / MONTHS)}-${String((index % MONTHS) + 1).padStart(2, "0")}`;
const LAST_SAFE_DAY = "28";
/** The same day `months` earlier (days past the 28th read as the 28th). */
function dateMonthsBefore(date: string, months: number): string {
  const day = date.slice("YYYY-MM-".length);
  const index = monthIndex(date.slice(0, "YYYY-MM".length)) - months;
  return `${monthKey(index)}-${day > LAST_SAFE_DAY ? LAST_SAFE_DAY : day}`;
}

const store = (api: CoreAPI) => api.moduleState(OUTCOME_WEB_MODULE_ID);
const webState = (api: CoreAPI) =>
  store(api).table("state").get(STATE_ID) as WebState | undefined;
const monthRow = (api: CoreAPI, placeId: string, month: string) =>
  store(api).table("months").get(`web:${placeId}:${month}`) as
    WebMonth | undefined;

/** The town's state, "US-XX", from its place key (a census GEOID starts with the state's code). */
function stateKeyOf(core: Readonly<CoreState>): string {
  const geoid = core.placeMetadata.placeKey ?? "";
  const states = regions.states as Record<string, { usps: string }>;
  const usps =
    states[geoid.slice(0, "SS".length)]?.usps ??
    core.placeMetadata.housingState;
  return usps ? `US-${usps}` : "";
}

/**
 * The places the web keeps: the town (the player's place, or where most
 * households live) and every place the economy records businesses in.
 * Relatives living elsewhere don't make their place one the town models.
 */
function placesOf(api: CoreAPI): string[] {
  const core = api.state as CoreState;
  const counts = new Map<string, number>();
  for (const row of core.households.values())
    counts.set(row.placeId, (counts.get(row.placeId) ?? 0) + 1);
  const town =
    (core.playerId && core.people.get(core.playerId)?.placeId) ??
    [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const places = new Set(town ? [town] : []);
  if (core.modules.has(WORLD_METRICS_MODULE_ID))
    for (const row of api
      .moduleState(WORLD_METRICS_MODULE_ID)
      .table("months")
      .rows() as unknown as readonly {
      placeId: string;
      date: string;
      businessesOpen: number;
    }[])
      if (
        row.businessesOpen > 0 &&
        row.date.slice(0, "YYYY-MM".length) ===
          core.date.slice(0, "YYYY-MM".length)
      )
        places.add(row.placeId);
  return [...places].sort();
}

/**
 * The law on a policy question for the town on a date: 1 when any level's
 * latest row in force says yes, else 0. Rows are OPUS-GOV's laws module's
 * (the real law of every level, from the start date's records); where that
 * module is not open, the law-took-effect events this module recorded.
 * `realOnly` reads only the real starting law: the research's base levels
 * already include the law each place really had, so only a change from it
 * moves an outcome, and no recorded law counts as "not yes".
 */
export function lawValue(
  api: CoreAPI,
  series: string,
  date: string,
  realOnly = false,
): number {
  const laws = SETTINGS.lawsModule;
  const open = (api.state as CoreState).modules.has(laws.moduleId);
  if (realOnly && !open) return 0;
  const rows = (open
    ? api
        .moduleState(laws.moduleId)
        .table(laws.table)
        .query(laws.index, [series])
    : store(api)
        .table("laws")
        .query("bySeries", [series])) as unknown as readonly {
    jurisdiction: string;
    value: unknown;
    effectiveDate: string;
  }[];
  const latest = new Map<string, { value: unknown; effectiveDate: string }>();
  for (const row of rows) {
    if (row.effectiveDate > date) continue;
    const held = latest.get(row.jurisdiction);
    if (!held || row.effectiveDate >= held.effectiveDate)
      latest.set(row.jurisdiction, row);
  }
  return [...latest.values()].some((row) => Number(row.value) === 1) ? 1 : 0;
}

/** Engine records outside the economy's monthly rows, read by name: the engine's own table. */
const ENGINE_READERS: Readonly<
  Record<
    string,
    (
      api: CoreAPI,
      placeId: string,
    ) => { value: number; recordId: string | null } | null
  >
> = {
  "property-tax-rate": (api, placeId) => {
    const rate = propertyTaxRateInForce(api, placeId);
    return rate ? { value: rate.share, recordId: rate.recordId } : null;
  },
};

/** An engine's record for a measure in a place today, or null where it keeps none. */
function readEngine(
  api: CoreAPI,
  placeId: string,
  measure: string,
): { value: number; recordId: string | null } | null {
  const definition = engineMeasure(measure);
  if (!definition) return null;
  if (definition.reader) {
    const read = ENGINE_READERS[definition.reader]?.(api, placeId);
    return read
      ? { value: read.value * definition.unitScale, recordId: read.recordId }
      : null;
  }
  // Engine measures are read from the economy's monthly rows (world-metrics),
  // or from the month rows of the engine that owns them.
  const owner = definition.module ?? WORLD_METRICS_MODULE_ID;
  if (!(api.state as CoreState).modules.has(owner)) return null;
  const recorded = api
    .moduleState(owner)
    .table(definition.table ?? "months")
    .query("byPlace", [placeId]) as unknown as readonly ({
    date: string;
    id: string;
  } & Record<string, unknown>)[];
  const latest = recorded
    .filter((row) => row.date <= api.state.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const row = (latest ??
    townMetrics(api).find((metrics) => metrics.placeId === placeId)) as
    Record<string, unknown> | undefined;
  const value = row?.[definition.field];
  return typeof value === "number"
    ? { value: value * definition.unitScale, recordId: latest?.id ?? null }
    : null;
}

const ENGINE_CAUSES = [
  ...new Set(
    WEB_LINKS.flatMap((link) => [link.from, link.moderator?.measure ?? ""]),
  ),
]
  .filter((measure) => engineMeasure(measure))
  .sort();
const GOV_CAUSES = [
  ...new Set(
    WEB_LINKS.flatMap((link) => [link.from, link.moderator?.measure ?? ""]),
  ),
]
  .filter((measure) => (GOV_MEASURES as readonly string[]).includes(measure))
  .sort();
const LAW_CAUSES = [
  ...new Set(
    WEB_LINKS.flatMap((link) => [link.from, link.moderator?.measure ?? ""]),
  ),
]
  .filter(isLaw)
  .sort();

interface Reading {
  readonly api: CoreAPI;
  readonly placeId: string;
  readonly stateKey: string;
  readonly index: number;
  readonly openingIndex: number;
  readonly values: Record<string, number>;
}

/** The place's record for a month, or the nearest earlier one back to the opening. */
function rowAt(r: Reading, index: number): WebMonth | undefined {
  for (let at = index; at >= r.openingIndex; at -= 1) {
    const row = monthRow(r.api, r.placeId, monthKey(at));
    if (row) return row;
  }
  return undefined;
}

/** A cause's value as it stood in month `index` (today's date shifted back for a law). */
function causeAt(r: Reading, measure: string, index: number): number | null {
  if (isLaw(measure))
    return lawValue(
      r.api,
      measure.slice(LAW_PREFIX.length),
      dateMonthsBefore(r.api.state.date, r.index - index),
    );
  const derived = derivedOf(measure);
  const kept = derived?.measure ?? measure;
  if (index >= r.index && !keptOutcome(kept)) return r.values[measure] ?? null;
  const row =
    index >= r.openingIndex
      ? rowAt(r, Math.min(index, r.index - 1))
      : undefined;
  if (keptOutcome(kept)) {
    const base = baseOf(kept, r.stateKey).value;
    const value = row?.values[kept] ?? base;
    if (!derived) return value;
    if (derived.suffix === ":pct-of-start")
      return (value / base) * SETTINGS.indexStart;
    if (derived.suffix === ":moved-by-causes") return value - base;
    // A level adds its causes rather than multiplying, so it has no percent.
    return scaleOf(kept) === "level"
      ? null
      : (value / base - 1) * SETTINGS.indexStart;
  }
  // An engine record before the web opened reads as it stood at the opening.
  return (
    (row ?? rowAt(r, r.openingIndex))?.values[measure] ??
    r.values[measure] ??
    null
  );
}

/** The level a cause is measured from: the law at calibration, the research's baseline, or the opening. */
function baselineOf(r: Reading, measure: string): number | undefined {
  if (isLaw(measure))
    return lawValue(
      r.api,
      measure.slice(LAW_PREFIX.length),
      CALIBRATED_AT,
      true,
    );
  return (
    fixedBaseline(measure, r.stateKey) ??
    (
      store(r.api).table("baselines").get(r.placeId) as unknown as
        { values: Record<string, number> } | undefined
    )?.values[measure] ??
    rowAt(r, r.openingIndex)?.values[measure] ??
    r.values[measure]
  );
}

/** The cause a link reads: as it stood after the lag, averaged over the link's phase-in months. */
function phasedCause(r: Reading, link: WebLink, index: number): number | null {
  const months = Math.max(1, link.phaseInMonths ?? 1);
  let sum = 0;
  for (let k = 0; k < months; k += 1) {
    const value = causeAt(r, link.from, index - k);
    if (value === null) return k ? sum / k : null;
    sum += value;
  }
  return sum / months;
}

/** One link's effect this month, or null when its cause can't be read. */
function effectOf(r: Reading, link: WebLink): number | null {
  // An outcome feeds the links from it the month after it moves.
  const chained = keptOutcome(derivedOf(link.from)?.measure ?? link.from);
  const index = r.index - Math.max(link.lagMonths, chained ? 1 : 0);
  const value = phasedCause(r, link, index);
  const baseline = baselineOf(r, link.from);
  if (value === null || baseline === undefined) return null;
  // A lagged law effect does not outlast the law: once the law is back where
  // the place began, the effect ends that day, not a lag later.
  if (
    link.lagMonths > 0 &&
    isLaw(link.from) &&
    value !== baseline &&
    causeAt(r, link.from, r.index) === baseline
  )
    return 0;
  let effect = linkEffect(link, sizeIn(link, r.stateKey), value, baseline);
  if (link.moderator) {
    const level = causeAt(r, link.moderator.measure, index);
    if (level === null)
      return link.moderator.mode === "only-when" ? null : effect;
    effect *= moderatorScale(link.moderator, level);
  }
  // No move is a plain zero (a negative size times zero gives -0).
  return effect === 0 ? 0 : effect;
}

/** Compute and record one place's month. */
function recordMonth(api: CoreAPI, placeId: string, state: WebState): WebMonth {
  const date = api.state.date;
  const month = date.slice(0, "YYYY-MM".length);
  const r: Reading = {
    api,
    placeId,
    stateKey: state.stateKey,
    index: monthIndex(month),
    openingIndex: monthIndex(state.openingMonth),
    values: {},
  };
  const baselines = store(api).table("baselines");
  const opening = baselines.get(placeId) as unknown as
    { id: string; date: string; values: Record<string, number> } | undefined;
  const bases: Record<string, number> = { ...opening?.values };
  const engineSources: Record<string, string | null> = {};
  let newBaseline = false;
  for (const measure of ENGINE_CAUSES) {
    const reading = readEngine(api, placeId, measure);
    if (reading === null) continue;
    r.values[measure] = reading.value;
    engineSources[measure] = reading.recordId;
    // A later law event can rewrite the opening month's web row. Keep the
    // first engine reading separately so that it cannot erase the change.
    if (bases[measure] === undefined) {
      bases[measure] = reading.value;
      newBaseline = true;
    }
  }
  // The government's own measures (minimum wage, a budget line): the same
  // reading, from the engines' records, citing the record the value stands on.
  for (const measure of GOV_CAUSES) {
    const value = govMeasure(api, measure);
    if (value === null) continue;
    r.values[measure] = value;
    engineSources[measure] = govMeasureRecord(api, measure);
    if (bases[measure] === undefined) {
      bases[measure] = value;
      newBaseline = true;
    }
  }
  if (newBaseline)
    baselines.put({
      id: placeId,
      date: opening?.date ?? date,
      values: { ...bases },
    });
  for (const measure of LAW_CAUSES)
    r.values[measure] = lawValue(api, measure.slice(LAW_PREFIX.length), date);
  const effects: Record<string, number> = {};
  for (const outcome of KEPT_OUTCOMES) {
    const base = baseOf(outcome, state.stateKey).value;
    const level = scaleOf(outcome) === "level";
    let product = 1,
      added = 0;
    for (const link of WIRED_INTO.get(outcome) ?? []) {
      const effect = effectOf(r, link);
      if (effect === null) continue;
      effects[link.key] = effect;
      if (level) added += effect;
      else product *= 1 + effect;
    }
    bases[outcome] = base;
    r.values[outcome] = level ? base + added : base * product;
  }
  const row: WebMonth = {
    id: `web:${placeId}:${month}`,
    placeId,
    month,
    date,
    values: r.values,
    bases,
    effects,
    engineSources,
  };
  store(api)
    .table("months")
    .put(row as unknown as ModuleRow);
  return row;
}

/** The month's one public record for a place: what moved since the month before (the town hears it through the press and the news). */
function announce(api: CoreAPI, row: WebMonth): void {
  const before = monthRow(
    api,
    row.placeId,
    monthKey(monthIndex(row.month) - 1),
  );
  const made = monthEvent(api, row, before?.values ?? {});
  if (made) api.emit(made.event);
}

function run(api: CoreAPI, announced = false): void {
  const state = webState(api);
  if (!state) return;
  // Kept outcomes hold at their base apart from their causes; see the stopgap.
  api.stopgap("SG-WEB-outcome-drift");
  api.stopgap("SG-WEB-housing-links-unsized");
  api.stopgap("SG-WEB-disaster-severity");
  for (const placeId of placesOf(api)) {
    const row = recordMonth(api, placeId, state);
    if (announced) announce(api, row);
  }
}

function schedule(api: CoreAPI): void {
  const date = api.state.date;
  const day = String(SETTINGS.schedule.dayOfMonth).padStart(2, "0");
  const thisMonth = `${date.slice(0, "YYYY-MM".length)}-${day}`;
  const next =
    thisMonth > date
      ? thisMonth
      : `${monthKey(monthIndex(date.slice(0, "YYYY-MM".length)) + 1)}-${day}`;
  api.moduleCalendar(OUTCOME_WEB_MODULE_ID).schedule({
    key: `outcome-web:${next}`,
    date: next,
    kind: RUN_KIND,
    source: {
      tag: "SOURCED",
      asOf: date,
      citation: `${WEB_VERSION}: data/research/outcome-web/links.json.`,
    },
    sourceRecordIds: [STATE_ID],
  });
}

/** Record a law-took-effect event (the laws module's own rows win where it is open). */
function recordLaw(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  if (!facts.series) return;
  store(api)
    .table("laws")
    .put({
      id: facts.lawId || event.id,
      series: facts.series,
      jurisdiction: facts.jurisdiction ?? event.placeId,
      value: Number(facts.value),
      effectiveDate: event.date,
    });
}

export const OUTCOME_WEB_MODULE: CoreModule = {
  id: OUTCOME_WEB_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      baselines: {},
      months: { indexes: { byPlace: { fields: ["placeId"] } } },
      laws: { indexes: { bySeries: { fields: ["series"] } } },
    },
  },
  eventKinds: [SETTINGS.lawsModule.eventKind],
  onEvent(api, event) {
    recordLaw(api, event);
    // A law moves the record the day it takes effect, not at month's end.
    run(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== RUN_KIND) return;
    run(api, true);
    schedule(api);
  },
  onDay(api) {
    if (webState(api)) return;
    const core = api.state as CoreState;
    store(api)
      .table("state")
      .put({
        id: STATE_ID,
        openedAt: core.date,
        openingMonth: core.date.slice(0, "YYYY-MM".length),
        stateKey: stateKeyOf(core),
      });
    run(api);
    schedule(api);
  },
};

/** A place's record of a measure in the latest month the web ran. */
export function placeOutcome(
  api: CoreAPI,
  placeId: string,
  measure: string,
):
  | {
      value: number;
      base?: number;
      month: string;
      recordId: string;
      engineRecordId: string | null;
    }
  | undefined {
  const rows = store(api)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[];
  const latest = [...rows].sort((a, b) => b.month.localeCompare(a.month))[0];
  const value = latest?.values[measure];
  return latest && value !== undefined
    ? {
        value,
        base: latest.bases[measure],
        month: latest.month,
        recordId: latest.id,
        engineRecordId: latest.engineSources?.[measure] ?? null,
      }
    : undefined;
}

/**
 * The web's factor on a measure in a place: the multiplier its running links
 * put on the measure's base this month (1 where nothing moves it). An engine
 * that sets the measure itself (births, crime, rents) multiplies by this.
 */
export function outcomeWebFactor(
  api: CoreAPI,
  placeId: string,
  measure: string,
): number {
  const record = placeOutcome(api, placeId, measure);
  if (!record || !record.base) return 1;
  return scaleOf(measure) === "level" ? 1 : record.value / record.base;
}
