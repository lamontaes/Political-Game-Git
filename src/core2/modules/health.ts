import healthJson from "../data/health.json" with { type: "json" };
import {
  addDays,
  ageOnDate,
  dateAtAge,
  daysBetween,
  makeIsoDate,
} from "../../simulation/dates";
import {
  CONDITION_PACK,
  conditionHazard,
  conditionLabel,
  conditionPrevalence,
  startingConditionAssignments,
} from "../../simulation/crisis/condition-pack";
import { remainingDaysAfterOnset } from "../../simulation/crisis/death-causes";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
} from "../../simulation/crisis/hazard";
import { SSA_2023_MAX_AGE } from "../../simulation/crisis/mortality-table";
import { survivalThresholdFromDraws } from "../../simulation/crisis/fixed-point";
import { stableHash } from "../../simulation/ids";
import { parameter } from "../parameters";
import { COVERAGE_MODULE_ID, coverageOf } from "./coverage";
import type { EntityId } from "../../simulation/types";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  Source,
} from "../types";

/**
 * P10 producer, not a health engine: the existing Ruling 29/38/39 mortality
 * rule applied to core2 residents. Each resident's opening chronic conditions
 * come from the condition pack's prevalence cells (income-ranked, evenly
 * spaced; no roll), their strain accumulates from the SSA 2023 hazard times
 * those recorded weights from the world's opening day, and a serious illness
 * begins on the day the strain crosses the person's own resilience line. The death
 * follows after the old rule's remaining days. Both are typed events the
 * family hears; words come later from the English engine.
 */
export interface HealthData {
  version: string;
  stopgapId: string;
  calibrationCategory: "equal-mixture" | "male" | "female";
  onsetEventKind: string;
  /** A chronic condition beginning during life. */
  conditionEventKind: string;
  conditionSeverity: Severity;
  deathEventKind: string;
  topicPrefix: string;
  desiredChangePrefix: string;
  unconditionedTopic: string;
  conditionFactKey: string;
  resilienceKey: string;
  resilienceScaleParameter: string;
  resilience: { stopgapId: string };
  resilienceSpread: string;
  onsetSeverity: Severity;
  deathSeverity: Severity;
  source: Source & { asOf?: string };
  gaps: readonly string[];
}

interface Severity {
  lifeChangeUnitsParameter: string;
  maximumUnitsParameter: string;
  stopgapId: string;
}

export const DEFAULT_HEALTH_DATA = healthJson as unknown as HealthData;

export interface HealthCase {
  personId: PersonId;
  conditions: readonly string[];
  /** The held condition with the largest recorded weight, if any. */
  conditionKey?: string;
  severity: number;
  onsetDate: IsoDate;
  deathDate?: IsoDate;
  onsetEventId?: string;
  deathEventId?: string;
}

interface HealthRuntime {
  initialized: boolean;
  cases: Map<PersonId, HealthCase>;
  onsetsByDate: Map<IsoDate, Set<PersonId>>;
  deathsByDate: Map<IsoDate, Set<PersonId>>;
  conditionsByPerson: Map<PersonId, readonly string[]>;
  /** Generation fact per person: their own resilience line (fixed-point integrated hazard). */
  resilienceLines: Map<PersonId, bigint>;
  /** How many people the engine has planned for, to notice arrivals. */
  seenPeople: number;
  /** Conditions that begin during life, by the day they begin: "person|condition". */
  conditionOnsets: Map<IsoDate, Set<string>>;
  /** Each person's course inputs, to recompute when a condition begins. */
  courses: Map<
    PersonId,
    {
      start: ReturnType<typeof makeIsoDate>;
      threshold: ReturnType<typeof thresholdUnits>;
      multipliers: {
        effectiveAt: ReturnType<typeof makeIsoDate>;
        micros: number;
      }[];
    }
  >;
  conditionsBegun: number;
  onsets: number;
  deaths: number;
}

const runtimes = new WeakMap<object, HealthRuntime>();
/** The coverage engine's kind for no coverage. */
const UNINSURED = "uninsured";

function runtime(state: Readonly<CoreState>): HealthRuntime {
  let row = runtimes.get(state);
  if (!row) {
    const zero = parameter("zero", state.data.parameters);
    row = {
      initialized: false,
      cases: new Map(),
      onsetsByDate: new Map(),
      deathsByDate: new Map(),
      conditionsByPerson: new Map(),
      resilienceLines: new Map(),
      seenPeople: zero,
      conditionOnsets: new Map(),
      courses: new Map(),
      conditionsBegun: zero,
      onsets: zero,
      deaths: zero,
    };
    runtimes.set(state, row);
  }
  return row;
}

function index(map: Map<IsoDate, Set<PersonId>>, date: IsoDate, id: PersonId) {
  let set = map.get(date);
  if (!set) map.set(date, (set = new Set()));
  set.add(id);
}

function householdMonthlyPay(api: CoreAPI): Map<string, number | null> {
  const p = (key: string) => api.parameter(key);
  const pay = new Map<string, number | null>();
  for (const job of api.state.jobs.values()) {
    const person = api.state.people.get(job.personId);
    if (!person) continue;
    const monthly =
      (job.wageDailyMinor * p("daysPerMeanYear")) / p("monthsPerYear");
    pay.set(
      person.householdId,
      (pay.get(person.householdId) ?? p("zero")) + monthly,
    );
  }
  for (const household of api.state.households.keys())
    if (!pay.has(household)) pay.set(household, null);
  return pay;
}

function exactAge(api: CoreAPI, birthDate: IsoDate, date: IsoDate): number {
  return (
    daysBetween(makeIsoDate(birthDate), makeIsoDate(date)) /
    api.parameter("daysPerMeanYear")
  );
}

/**
 * Owner ruling, October 9, 2026: each person carries their own resilience
 * line, a generation fact keyed to them. Under the life table's proportional
 * hazards, the integrated hazard a person reaches at death is spread as a unit
 * exponential, so the line is that spread read at the person's stable key.
 * No decision reads it as a chance; strain still builds smoothly from causes.
 */
function resilienceLine(api: CoreAPI, data: HealthData, personId: string) {
  api.stopgap(data.resilience.stopgapId);
  const digits = api.parameter("resilienceHashDigits");
  const radix = api.parameter("seedPlaceHashRadix");
  const hash = stableHash(
    `${api.state.seed}:${data.resilienceKey}:${personId}`,
  );
  return survivalThresholdFromDraws(
    Number.parseInt(hash.slice(api.parameter("zero"), digits), radix),
    Number.parseInt(hash.slice(digits, digits + digits), radix),
  );
}

function initialize(api: CoreAPI, data: HealthData, row: HealthRuntime) {
  const p = (key: string) => api.parameter(key);
  api.stopgap(data.stopgapId);
  const start = makeIsoDate(api.state.startedAt);
  const pay = householdMonthlyPay(api);
  const alive = [...api.state.people.values()].filter((person) => person.alive);
  const assignments = startingConditionAssignments(
    alive.map((person) => ({
      personId: person.id as EntityId,
      placeKey: person.placeId,
      age: exactAge(api, person.birthDate, start),
      category: data.calibrationCategory,
      monthlyHouseholdIncomeMinor: pay.get(person.householdId) ?? null,
    })),
  );
  for (const person of alive)
    planCase(
      api,
      data,
      row,
      person,
      assignments.get(person.id as EntityId) ?? [],
      start,
    );
  row.seenPeople = api.state.people.size;
  row.initialized = true;
}

/**
 * A person's course from a start day: their own resilience line, their
 * recorded conditions' weights, and the day their strain first crosses the
 * line, if it does within the life table.
 */
function planCase(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  person: Readonly<PersonState>,
  conditions: readonly string[],
  start: ReturnType<typeof makeIsoDate>,
): void {
  const p = (key: string) => api.parameter(key);
  const line = resilienceLine(api, data, person.id);
  row.resilienceLines.set(person.id, line);
  const threshold = thresholdUnits(
    (line * BigInt(MULTIPLIER_ONE)) /
      BigInt(Math.round(p(data.resilienceScaleParameter) * MULTIPLIER_ONE)),
  );
  row.conditionsByPerson.set(person.id, conditions);
  const age = exactAge(api, person.birthDate, start);
  let micros = MULTIPLIER_ONE;
  let strongest: { key: string; micros: number } | undefined;
  for (const key of conditions) {
    const hazard = conditionHazard(
      api.state.seed,
      person.id as EntityId,
      key,
      age,
    );
    micros = Math.round((micros * hazard.micros) / MULTIPLIER_ONE);
    if (!strongest || hazard.micros > strongest.micros)
      strongest = { key, micros: hazard.micros };
  }
  row.courses.set(person.id, {
    start,
    threshold,
    multipliers: [{ effectiveAt: start, micros }],
  });
  scheduleConditionOnsets(api, data, row, person, conditions, start, age);
  scheduleCourse(api, data, row, person, start, strongest?.key, micros);
}

/**
 * The day a person's strain first crosses their line, from their course's
 * weights so far, scheduled as the onset of a serious illness.
 */
function scheduleCourse(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  person: Readonly<PersonState>,
  from: ReturnType<typeof makeIsoDate>,
  conditionKey: string | undefined,
  micros: number,
): void {
  const p = (key: string) => api.parameter(key);
  const course = row.courses.get(person.id)!;
  const conditions = row.conditionsByPerson.get(person.id) ?? [];
  const horizon = dateAtAge(makeIsoDate(person.birthDate), SSA_2023_MAX_AGE);
  if (horizon <= from) return;
  const onset = firstThresholdDay(
    {
      birthDate: makeIsoDate(person.birthDate),
      category: data.calibrationCategory,
      exposureStart: course.start,
      multipliers: course.multipliers,
    },
    course.threshold,
    from,
    horizon,
  );
  const start = from;
  const strongest = conditionKey ? { key: conditionKey } : undefined;
  if (!onset) return;
  // A crossing on the start day is heard on the next simulated day.
  const due = onset <= start ? addDays(start, p("one")) : onset;
  row.cases.set(person.id, {
    personId: person.id,
    conditions,
    ...(strongest ? { conditionKey: strongest.key } : {}),
    severity: micros / MULTIPLIER_ONE,
    onsetDate: due,
  });
  index(row.onsetsByDate, due, person.id);
}

/** The chronic conditions whose prevalence rises with age: these can begin during life. */
const LIFELONG = CONDITION_PACK.filter(
  (condition) =>
    !condition.infant &&
    !condition.childhood &&
    condition.prevalence.length > 1 &&
    condition.prevalence.at(-1)!.percent > condition.prevalence[0]!.percent,
);

/**
 * When each chronic condition begins for a person, if it does: their own
 * line for it is a generation fact keyed to them, below the share of people
 * their age who have it if they already do, above it if not; it begins on the
 * birthday the share for their age first reaches their line. So conditions
 * appear as people age at about the rates of people their age, and no one is
 * drawn on any day.
 */
function scheduleConditionOnsets(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  person: Readonly<PersonState>,
  held: readonly string[],
  start: ReturnType<typeof makeIsoDate>,
  age: number,
): void {
  const p = (key: string) => api.parameter(key);
  const digits = api.parameter("resilienceHashDigits");
  const radix = api.parameter("seedPlaceHashRadix");
  for (const condition of LIFELONG) {
    if (held.includes(condition.key)) continue;
    const now = conditionPrevalence(condition, age, data.calibrationCategory);
    const unit =
      Number.parseInt(
        stableHash(
          `${api.state.seed}:${data.resilienceKey}:condition:${condition.key}:${person.id}`,
        ).slice(p("zero"), digits),
        radix,
      ) /
      radix ** digits;
    const line = now + unit * (p("one") - now);
    // The month the share for their age first reaches their line: the year
    // first, then the month within it.
    const reaches = (at: number) =>
      conditionPrevalence(condition, at, data.calibrationCategory) >= line;
    let year = age + p("one");
    while (year <= SSA_2023_MAX_AGE && !reaches(year)) year += p("one");
    if (year > SSA_2023_MAX_AGE) continue;
    const step = p("one") / p("monthsPerYear");
    let at = Math.max(age + step, year - p("one") + step);
    while (at < year && !reaches(at)) at += step;
    const date = addDays(
      makeIsoDate(person.birthDate),
      Math.round(Math.min(at, year) * p("daysPerMeanYear")),
    );
    if (date <= start) continue;
    const key = `${person.id}|${condition.key}`;
    const set = row.conditionOnsets.get(date) ?? new Set<string>();
    set.add(key);
    row.conditionOnsets.set(date, set);
  }
}

/**
 * A condition begins: it joins the person's record, the people close to them
 * hear, and their course is recomputed with its weight from today.
 */
function beginCondition(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  personId: PersonId,
  key: string,
): void {
  const person = api.state.people.get(personId);
  const course = row.courses.get(personId);
  if (!person?.alive || !course) return;
  const held = row.conditionsByPerson.get(personId) ?? [];
  if (held.includes(key)) return;
  api.stopgap(data.stopgapId);
  const today = makeIsoDate(api.state.date);
  const conditions = [...held, key];
  row.conditionsByPerson.set(personId, conditions);
  row.conditionsBegun += api.parameter("one");
  const age = exactAge(api, person.birthDate, today);
  let micros = MULTIPLIER_ONE;
  let strongest: { key: string; micros: number } | undefined;
  for (const held of conditions) {
    const hazard = conditionHazard(
      api.state.seed,
      person.id as EntityId,
      held,
      age,
    );
    micros = Math.round((micros * hazard.micros) / MULTIPLIER_ONE);
    if (!strongest || hazard.micros > strongest.micros)
      strongest = { key: held, micros: hazard.micros };
  }
  const id = `${data.conditionEventKind}:${person.id}:${key}:${api.state.date}`;
  api.emit({
    id,
    date: api.state.date,
    kind: data.conditionEventKind,
    personIds: [person.id],
    witnessIds: hearers(api, person, false),
    placeId: person.placeId,
    topic: `${data.topicPrefix}:${key}`,
    desiredChange: `${data.desiredChangePrefix}:${key}`,
    ...severityImpulse(api, data.conditionSeverity),
    source: { ...data.source, asOf: api.state.date },
    facts: {
      [`event:${id}:${data.conditionFactKey}`]: key,
      condition: conditionLabel(key) ?? key,
      conditionKey: key,
    },
  });
  // A serious illness already under way keeps its course.
  const found = row.cases.get(personId);
  if (found?.onsetEventId) return;
  if (found) row.onsetsByDate.get(found.onsetDate)?.delete(personId);
  row.cases.delete(personId);
  course.multipliers.push({ effectiveAt: today, micros });
  scheduleCourse(api, data, row, person, today, strongest?.key, micros);
}

/**
 * People admitted after the opening (a newborn, someone filled in, a
 * newcomer) get their course from the day they arrive, with the conditions
 * the pack's cells give them; read only when the number of people changes.
 */
function planArrivals(api: CoreAPI, data: HealthData, row: HealthRuntime) {
  if (api.state.people.size === row.seenPeople) return;
  row.seenPeople = api.state.people.size;
  const today = makeIsoDate(api.state.date);
  const arrivals = [...api.state.people.values()].filter(
    (person) => person.alive && !row.resilienceLines.has(person.id),
  );
  if (!arrivals.length) return;
  const pay = householdMonthlyPay(api);
  const assignments = startingConditionAssignments(
    arrivals.map((person) => ({
      personId: person.id as EntityId,
      placeKey: person.placeId,
      age: exactAge(api, person.birthDate, today),
      category: data.calibrationCategory,
      monthlyHouseholdIncomeMinor: pay.get(person.householdId) ?? null,
    })),
  );
  for (const person of arrivals)
    planCase(
      api,
      data,
      row,
      person,
      assignments.get(person.id as EntityId) ?? [],
      today,
    );
}

function hearers(api: CoreAPI, person: Readonly<PersonState>, wide: boolean) {
  const out = new Set<PersonId>();
  const add = (id: PersonId) => {
    if (id !== person.id && api.state.people.get(id)?.alive) out.add(id);
  };
  for (const id of person.familyIds) add(id);
  for (const id of api.state.households.get(person.householdId)?.memberIds ??
    [])
    add(id);
  if (wide) for (const id of person.knownIds) add(id);
  return [...out].sort();
}

function severityImpulse(api: CoreAPI, severity: Severity) {
  api.stopgap(severity.stopgapId);
  const share =
    api.parameter(severity.lifeChangeUnitsParameter) /
    api.parameter(severity.maximumUnitsParameter);
  return {
    stressImpulse: share * api.parameter("lifeEventStressScale"),
    moodImpulse: -share * api.parameter("lifeEventMoodScale"),
  };
}

function caseEvent(
  api: CoreAPI,
  data: HealthData,
  person: Readonly<PersonState>,
  row: HealthCase,
  kind: string,
  severity: Severity,
  wide: boolean,
): CoreEventInput {
  const topicKey = row.conditionKey ?? data.unconditionedTopic;
  const id = `${kind}:${person.id}:${api.state.date}`;
  return {
    id,
    date: api.state.date,
    kind,
    personIds: [person.id],
    witnessIds: hearers(api, person, wide),
    placeId: person.placeId,
    topic: `${data.topicPrefix}:${topicKey}`,
    desiredChange: `${data.desiredChangePrefix}:${topicKey}`,
    ...severityImpulse(api, severity),
    source: { ...data.source, asOf: api.state.date },
    facts: { [`event:${id}:${data.conditionFactKey}`]: topicKey },
  };
}

export function createHealthModule(
  data: HealthData = DEFAULT_HEALTH_DATA,
): CoreModule {
  return {
    id: "core2-health-producer-p10-v1",
    onDay(api) {
      const row = runtime(api.state);
      if (!row.initialized) initialize(api, data, row);
      else planArrivals(api, data, row);
      const date = makeIsoDate(api.state.date);
      for (const due of [...(row.conditionOnsets.get(date) ?? [])].sort()) {
        const [personId, key] = due.split("|") as [PersonId, string];
        beginCondition(api, data, row, personId, key);
      }
      row.conditionOnsets.delete(date);
      for (const id of [...(row.onsetsByDate.get(date) ?? [])].sort()) {
        const person = api.state.people.get(id);
        const found = row.cases.get(id);
        if (!person?.alive || !found) continue;
        api.stopgap(data.stopgapId);
        const event = caseEvent(
          api,
          data,
          person,
          found,
          data.onsetEventKind,
          data.onsetSeverity,
          false,
        );
        // Whether they have health coverage, where the coverage engine runs.
        const coverage = api.state.modules.has(COVERAGE_MODULE_ID)
          ? coverageOf(api, id)
          : undefined;
        const days = remainingDaysAfterOnset({
          age: ageOnDate(makeIsoDate(person.birthDate), date),
          severity: found.severity,
          covered: coverage ? coverage.kind !== UNINSURED : null,
        });
        found.onsetEventId = event.id;
        found.deathDate = addDays(date, days);
        index(row.deathsByDate, found.deathDate, id);
        row.onsets += api.parameter("one");
        api.emit(event);
      }
      for (const id of [...(row.deathsByDate.get(date) ?? [])].sort()) {
        const person = api.state.people.get(id);
        const found = row.cases.get(id);
        if (!person?.alive || !found) continue;
        api.stopgap(data.stopgapId);
        const event = caseEvent(
          api,
          data,
          person,
          found,
          data.deathEventKind,
          data.deathSeverity,
          true,
        );
        found.deathEventId = event.id;
        api.updatePerson(id, { alive: false });
        row.deaths += api.parameter("one");
        api.emit(event);
      }
    },
  };
}

export const HEALTH_MODULE = createHealthModule();

/** Read-only report; inspection writes nothing. */
export function healthReport(core: Readonly<CoreState>) {
  const row = runtimes.get(core);
  return {
    initialized: row?.initialized ?? false,
    onsets: row?.onsets,
    deaths: row?.deaths,
    cases: row ? [...row.cases.values()] : [],
    conditionsByPerson: row?.conditionsByPerson ?? new Map(),
    resilienceLines: row?.resilienceLines ?? new Map(),
  };
}
