import healthJson from "../data/health.json" with { type: "json" };
import {
  addDays,
  ageOnDate,
  dateAtAge,
  daysBetween,
  makeIsoDate,
} from "../../simulation/dates";
import {
  conditionHazard,
  startingConditionAssignments,
} from "../../simulation/crisis/condition-pack";
import { remainingDaysAfterOnset } from "../../simulation/crisis/death-causes";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
} from "../../simulation/crisis/hazard";
import { SSA_2023_MAX_AGE } from "../../simulation/crisis/mortality-table";
import { STRAIN_THRESHOLD } from "../../simulation/crisis/mortality";
import { parameter } from "../parameters";
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
 * begins on the day the strain crosses the one fixed threshold. The death
 * follows after the old rule's remaining days. Both are typed events the
 * family hears; words come later from the English engine.
 */
export interface HealthData {
  version: string;
  stopgapId: string;
  calibrationCategory: "equal-mixture" | "male" | "female";
  onsetEventKind: string;
  deathEventKind: string;
  topicPrefix: string;
  desiredChangePrefix: string;
  unconditionedTopic: string;
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
  onsets: number;
  deaths: number;
}

const runtimes = new WeakMap<object, HealthRuntime>();

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
  const threshold = thresholdUnits(STRAIN_THRESHOLD);
  for (const person of alive) {
    const conditions = assignments.get(person.id as EntityId) ?? [];
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
    const horizon = dateAtAge(makeIsoDate(person.birthDate), SSA_2023_MAX_AGE);
    if (horizon <= start) continue;
    const onset = firstThresholdDay(
      {
        birthDate: makeIsoDate(person.birthDate),
        category: data.calibrationCategory,
        exposureStart: start,
        multipliers: [{ effectiveAt: start, micros }],
      },
      threshold,
      start,
      horizon,
    );
    if (!onset) continue;
    // An opening-day crossing is heard on the first simulated day.
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
  row.initialized = true;
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
    facts: { [`event:${id}:condition`]: topicKey },
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
      const date = makeIsoDate(api.state.date);
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
        const days = remainingDaysAfterOnset({
          age: ageOnDate(makeIsoDate(person.birthDate), date),
          severity: found.severity,
          covered: null,
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
  };
}
