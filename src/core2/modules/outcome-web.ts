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
import { addDays, makeIsoDate } from "../kernel/dates";
import regions from "../data/regional/regions.json" with { type: "json" };
import {
  baseOf,
  CALIBRATED_AT,
  derivedOf,
  engineMeasure,
  engineOwned,
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
import { schoolMeasure } from "../school-measures";
import { propertyTaxRateInForce } from "../housing-property-tax";
import { schoolsLineAboveBase } from "../school-budget-line";
import { lawInForce, LAWS_MODULE_ID } from "./laws";
import {
  budgetLineAddedPct,
  GOV_MEASURES,
  govMeasure,
  govMeasureRecord,
  snapMaximumChangePct,
} from "../gov-measures";
import { monthEvent } from "../outcome-news";
import { closedNewspapers } from "./press";
import severityData from "../data/disasters/severity.json" with { type: "json" };

/** The disasters engine's news event for a disaster, which carries its severity (src/core2/modules/disasters.ts). */
const DISASTER_KIND = "hazard.disaster";

/**
 * The outcome web's `disaster.severe` for the town, read from the disasters
 * engine's news events: the severity of the most severe disaster that began
 * here since the world opened, within the years a severe disaster is read to
 * last (Boustan, Kahn, Rhode and Yanguas 2020 pool disasters by decade),
 * citing that disaster's news event. Zero while none has; null for a place
 * the disasters engine keeps no records of.
 */
function severeDisasterReading(
  api: CoreAPI,
  placeId: string,
): { value: number; recordId: string | null } | null {
  const core = api.state;
  if (core.people.get(core.playerId ?? "")?.placeId !== placeId) return null;
  // stopgapId: SG-WEB-disaster-severity-damage-proxy
  api.stopgap("SG-WEB-disaster-severity-damage-proxy");
  const since = addDays(
    makeIsoDate(core.date),
    -Math.round(
      severityData.effectYears.value * api.parameter("daysPerMeanYear"),
    ),
  );
  let value = 0,
    recordId: string | null = null;
  for (const id of core.logByKind.get(DISASTER_KIND) ?? []) {
    const event = core.durableLog.get(id);
    const severity = Number(event?.facts?.severity);
    if (!event || event.placeId !== placeId || !(event.date > since)) continue;
    if (severity > value) [value, recordId] = [severity, event.id];
  }
  return { value, recordId };
}

/** The outcomes whose level the school engine measures (spending is recorded but stays the web's ledger, which no link reads from it). */
const SCHOOL_MEASURED = new Set([
  "school.math-proficient-pct",
  "school.reading-proficient-pct",
  "school.graduation-pct",
]);

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
  // The press module's own outlets: how many of the place's local newspapers
  // have closed (press.local-newspaper), counted from the finance ledger's
  // closing dates; null where the press keeps no outlet for the place.
  "newspapers-closed": (api, placeId) => {
    // stopgapId: SG-WEB-voting-newspaper-closure (a paper closes only by its
    // owner's choice, and no paper's books show the losses that choice weighs)
    api.stopgap("SG-WEB-voting-newspaper-closure");
    const closed = closedNewspapers(api, placeId);
    return closed ? { value: closed.count, recordId: closed.recordId } : null;
  },
  // A budget line above its Census base (gov-measures keeps the readings).
  "parks-added-pct": (api) => lineAddedPct(api, "budget.parks-added-pct"),
  "highways-added-pct": (api) => lineAddedPct(api, "budget.highways-added-pct"),
  // The SNAP maximum and the budget lines the health, assistance and schools
  // laws set, as the town's treasuries and law rows record them.
  "snap-maximum-change": (api) => snapMaximumChangePct(api),
  ...Object.fromEntries(
    ["healthAndHospitals", "welfareAndMedicaid", "higherEducation"].map(
      (line) => [
        `budget-line-added:${line}`,
        (api: CoreAPI) => budgetLineAddedPct(api, line),
      ],
    ),
  ),
  // The severity of the town's most severe disaster in the last decade, from the disasters engine's news events.
  "disaster-severity": (api, placeId) => severeDisasterReading(api, placeId),
  "schools-line-above-base": (api, placeId) => {
    const line = schoolsLineAboveBase(api, placeId);
    return line ? { value: line.pct, recordId: line.recordId } : null;
  },
  // The corporate rate in force is the town's state law; other places keep
  // their own. A state with no corporate income tax reads zero.
  "state-corporate-rate": (api, placeId) => {
    if (!readsTownLaw(api, placeId)) return null;
    const state = lawInForce(api, "corporate-income-tax").levels.find(
      (level) => level.level === "state" && !level.setAside,
    );
    return { value: state?.row?.value ?? 0, recordId: state?.row?.id ?? null };
  },
};

/**
 * The level a law-read cause is measured from: the law in force the day
 * before the web opened (the starting law), in the measure's own unit.
 */
const BASELINE_READERS: Readonly<
  Record<
    string,
    (api: CoreAPI, placeId: string, openedAt: string) => number | undefined
  >
> = {
  "state-corporate-rate": (api, placeId, openedAt) => {
    if (!readsTownLaw(api, placeId)) return undefined;
    const day = addDays(makeIsoDate(openedAt), -1);
    const state = lawInForce(api, "corporate-income-tax", day).levels.find(
      (level) => level.level === "state" && !level.setAside,
    );
    return state?.row?.value ?? 0;
  },
  "property-tax-rate": (api, placeId, openedAt) => {
    if (!readsTownLaw(api, placeId)) return undefined;
    return (
      lawInForce(api, "property-tax", addDays(makeIsoDate(openedAt), -1))
        .value ?? undefined
    );
  },
};

/** The laws module's chain is the town's: other places keep their own laws. */
function readsTownLaw(api: CoreAPI, placeId: string): boolean {
  return (
    api.state.placeMetadata?.housingTown === placeId &&
    (api.state as CoreState).modules.has(LAWS_MODULE_ID)
  );
}

function lineAddedPct(
  api: CoreAPI,
  measure: string,
): { value: number; recordId: string | null } | null {
  const value = govMeasure(api, measure);
  return value === null
    ? null
    : { value, recordId: govMeasureRecord(api, measure) };
}

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
  .filter(
    (measure) =>
      (GOV_MEASURES as readonly string[]).includes(measure) &&
      // One that is also an engine measure is read as one (ENGINE_READERS).
      !engineMeasure(measure),
  )
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
  /** Each engine cause as first read at the opening (the baselines row). */
  readonly first: Readonly<Record<string, number>>;
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
  if (isLaw(measure)) {
    // The starting law rows take effect on the calibration date, so a date
    // before it reads the law as it stood then, not as absent: a place that
    // repeals a law it began with feels the repeal a lag later.
    const date = dateMonthsBefore(r.api.state.date, r.index - index);
    return lawValue(
      r.api,
      measure.slice(LAW_PREFIX.length),
      date < CALIBRATED_AT ? CALIBRATED_AT : date,
    );
  }
  const derived = derivedOf(measure);
  const kept = derived?.measure ?? measure;
  if (index >= r.index && !keptOutcome(kept)) return r.values[measure] ?? null;
  const row =
    index >= r.openingIndex
      ? rowAt(r, Math.min(index, r.index - 1))
      : undefined;
  if (keptOutcome(kept)) {
    const base = baseOf(kept, r.stateKey, r.api.state.seed).value;
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
  // An engine record before the web opened reads as it was first read at the
  // opening. The opening month's row is rewritten when a law or a budget
  // change takes effect that month, and reading that row back would carry the
  // change into every earlier month a phased link averages.
  if (index < r.openingIndex && r.first[measure] !== undefined)
    return r.first[measure];
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
  const reader = engineMeasure(measure)?.baselineReader;
  const opened = webState(r.api)?.openedAt;
  const lawLevel =
    reader && opened
      ? BASELINE_READERS[reader]?.(r.api, r.placeId, opened)
      : undefined;
  if (lawLevel !== undefined) return lawLevel;
  return (
    fixedBaseline(measure, r.stateKey, r.api.state.seed) ??
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
  const baselines = store(api).table("baselines");
  const opening = baselines.get(placeId) as unknown as
    { id: string; date: string; values: Record<string, number> } | undefined;
  const bases: Record<string, number> = { ...opening?.values };
  const r: Reading = {
    api,
    placeId,
    stateKey: state.stateKey,
    index: monthIndex(month),
    openingIndex: monthIndex(state.openingMonth),
    values: {},
    first: bases,
  };
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
    const base = baseOf(outcome, state.stateKey, api.state.seed).value;
    // An engine's own record of the outcome stands as read (poverty).
    if (engineOwned(outcome) && r.values[outcome] !== undefined) {
      bases[outcome] = base;
      continue;
    }
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
    // An outcome the school engine measures stands on its records: the share
    // its students reached last school year, citing that record.
    const measured = SCHOOL_MEASURED.has(outcome)
      ? schoolMeasure(api, placeId, outcome)
      : null;
    if (measured) {
      r.values[outcome] = measured.value;
      engineSources[outcome] = measured.recordId;
    }
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
  // No field counts the SNAP benefit's recipients into SNAP receipt, and no engine keeps food insecurity; both stay ledger numbers.
  api.stopgap("SG-WEB-snap-receipt-ledger");
  api.stopgap("SG-WEB-food-insecurity-ledger");
  // Causes of poverty that reach no incomes yet (poverty itself is the engine's).
  api.stopgap("SG-WEB-poverty-licensing-no-engine");
  api.stopgap("SG-WEB-poverty-graduation-no-engine");
  api.stopgap("SG-WEB-housing-links-unsized");
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
  // A world without the web (a small test world) has no conditions to read.
  if (!(api.state as CoreState).modules.has(OUTCOME_WEB_MODULE_ID))
    return undefined;
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

/**
 * A researched link's row, for the engine that carries it (the row's
 * `carriedBy` names that engine): the engine applies the row's size to its
 * own records and the web does not run the link.
 */
export function carriedLink(key: string): WebLink {
  const link = WEB_LINKS.find((row) => row.key === key);
  if (!link?.carriedBy || link.size === null)
    throw new Error(`${key} is not a carried link with a researched size`);
  return link;
}
