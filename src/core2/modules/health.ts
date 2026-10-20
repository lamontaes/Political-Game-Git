import healthJson from "../data/health.json" with { type: "json" };
import { settleEstate } from "../estates";
import { HOUSING_STATUS_EVENT } from "../housing-homeless";
import {
  addDays,
  ageOnDate,
  dateAtAge,
  daysBetween,
  makeIsoDate,
} from "../kernel/dates";
import {
  CONDITION_PACK,
  conditionHazard,
  conditionPrevalence,
  startingConditionAssignments,
} from "../condition-pack";
import { remainingDaysAfterOnset } from "../death-causes";
import {
  DEATH_WEB_REFRESH_DAY,
  deathWebFactor,
  markWaitingHealthLinks,
} from "../health-web";
import { incomeBandOf } from "../counted-income-fifth";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
} from "../health-hazard";
import { SSA_2023_MAX_AGE } from "../health-mortality-table";
import { survivalThresholdFromDraws } from "../kernel/fixed-point";
import { stableHash } from "../kernel/ids";
import { parameter } from "../parameters";
import { countedIllnessOf, endCountedIllness } from "../counted-illness";
import { residentsRuntime } from "./residents";
import { declareSnapshotCovered, registerWorldMapPart } from "../snapshot";
import type { EntityId } from "../kernel/brands";
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
  deathEventKind: string;
  topicPrefix: string;
  desiredChangePrefix: string;
  unconditionedTopic: string;
  conditionFactKey: string;
  resilienceKey: string;
  conditionHoldingKey: string;
  resilienceScaleParameter: string;
  resilience: { stopgapId: string };
  resilienceSpread: string;
  /** The trait that stands for conscientiousness (the dimension its facets are anchored to). */
  conscientiousnessTrait: string;
  /** Strain scales with it (Kern and Friedman 2008), the population mean held. */
  hazardLogPerLevelParameter: string;
  /** Conditions that behavior drives: who holds them shifts with it (Bogg and Roberts 2004). */
  behaviorConditions: readonly {
    key: string;
    logOddsPerLevelParameter: string;
  }[];
  traitStopgapId: string;
  onsetSeverity: Severity;
  jobLossSeverity: Severity;
  evictionSeverity: Severity;
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
  /** People count at the last look; a change means newcomers to admit. */
  seenPeople: number;
  cases: Map<PersonId, HealthCase>;
  onsetsByDate: Map<IsoDate, Set<PersonId>>;
  deathsByDate: Map<IsoDate, Set<PersonId>>;
  conditionsByPerson: Map<PersonId, readonly string[]>;
  /** Generation fact per person: their own resilience line (fixed-point integrated hazard). */
  resilienceLines: Map<PersonId, bigint>;
  onsets: number;
  deaths: number;
  /** Each person's strain as assigned, to recompute when their conditions of life change. */
  plans: Map<PersonId, HealthPlan>;
  /**
   * The mean of each trait-driven factor over the people at the opening
   * (key: "hazard" or a condition key), so the factor is divided by it and
   * the population's totals stay what the life tables say: personality
   * shifts who, not how many.
   */
  traitNorm: Map<string, number>;
  /**
   * What a death moved in kin who are still counted, kept for the day they are
   * filled in (one model, two tiers): a counted person has no mood to move, so
   * the impulse waits on the counted household and lands decayed by the days
   * gone, as it would have on a full person who was watched all along.
   */
  bereaved: Map<PersonId, Bereavement[]>;
}

interface Bereavement {
  readonly eventId: string;
  readonly deadId: PersonId;
  readonly date: Day;
  readonly moodImpulse: number;
  readonly stressImpulse: number;
}

/** A day on the hazard model's calendar. */
type Day = ReturnType<typeof makeIsoDate>;

/** What a person's onset day is computed from, and what has changed it since. */
interface HealthPlan {
  from: Day;
  threshold: bigint;
  /** The conditions' combined weight, in millionths. */
  micros: number;
  conditionKey?: string;
  /** Housing status changes, oldest first: the date and the factor on strain from then. */
  housing: { date: Day; factor: number }[];
  /** The outcome web's factor on this person's death hazard, from each month it moved, oldest first. */
  web: { date: Day; factor: number }[];
  evictedOn?: Day;
}

const runtimes = new WeakMap<object, HealthRuntime>();
registerWorldMapPart("health-runtime", runtimes);

function runtime(state: Readonly<CoreState>): HealthRuntime {
  let row = runtimes.get(state);
  if (!row) {
    const zero = parameter("zero", state.data.parameters);
    row = {
      initialized: false,
      seenPeople: zero,
      cases: new Map(),
      onsetsByDate: new Map(),
      deathsByDate: new Map(),
      conditionsByPerson: new Map(),
      resilienceLines: new Map(),
      onsets: zero,
      deaths: zero,
      plans: new Map(),
      traitNorm: new Map(),
      bereaved: new Map(),
    };
    runtimes.set(state, row);
  }
  return row;
}

/** A person's conscientiousness level, -2..2 (zero when they carry none). */
function conscientiousness(
  data: HealthData,
  person: Readonly<Pick<PersonState, "traits">>,
): number {
  return person.traits[data.conscientiousnessTrait] ?? 0;
}

/**
 * The factor on a person's strain from their conscientiousness: the log
 * hazard per level (Kern and Friedman 2008, r = .11 with longevity) times
 * their level, over the opening's mean of the same factor. Read each time
 * their onset is booked, so a changed trait changes the next booking.
 */
function hazardFactor(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  person: Readonly<PersonState>,
): number {
  const slope = api.parameter(data.hazardLogPerLevelParameter);
  return (
    Math.exp(slope * conscientiousness(data, person)) /
    (row.traitNorm.get("hazard") ?? api.parameter("one"))
  );
}

/** The log-odds slopes by behavior-driven condition. */
function behaviorSlopes(
  api: CoreAPI,
  data: HealthData,
): ReadonlyMap<string, number> {
  return new Map(
    data.behaviorConditions.map((row) => [
      row.key,
      api.parameter(row.logOddsPerLevelParameter),
    ]),
  );
}

/** Each factor's mean over the people alive at the opening. */
function setTraitNorms(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  people: readonly Readonly<PersonState>[],
) {
  const n = Math.max(people.length, api.parameter("one"));
  const mean = (slope: number) =>
    people.reduce(
      (sum, person) => sum + Math.exp(slope * conscientiousness(data, person)),
      api.parameter("zero"),
    ) / n;
  row.traitNorm.set(
    "hazard",
    mean(api.parameter(data.hazardLogPerLevelParameter)),
  );
  for (const condition of data.behaviorConditions)
    row.traitNorm.set(
      condition.key,
      mean(api.parameter(condition.logOddsPerLevelParameter)),
    );
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

/**
 * One person's conditions when they are not part of the opening cohort. The
 * opening ranks a whole cell (place, age, category) by household income, so a
 * single late person cannot be ranked jointly. The closest honest per-person
 * form: each pack condition is held when the person's own stable generation
 * quantile (a hash of the world seed and their id, like the resilience line)
 * falls under that condition's prevalence at their age. Totals match the
 * prevalence cells in expectation; the same person gets the same answer on
 * any day. Seeded generation of who exists, not a roll on an actor's act.
 */
function lateConditions(
  api: CoreAPI,
  data: HealthData,
  person: Readonly<PersonState>,
  age: number,
): readonly string[] {
  const digits = api.parameter("resilienceHashDigits");
  const radix = api.parameter("seedPlaceHashRadix");
  const held: string[] = [];
  const row = runtime(api.state);
  const slopes = behaviorSlopes(api, data);
  for (const condition of CONDITION_PACK) {
    // Behavior-driven conditions: the odds scale with conscientiousness,
    // over the opening's mean so the prevalence overall is unchanged.
    const slope = slopes.get(condition.key);
    const shift =
      slope === undefined
        ? api.parameter("one")
        : Math.exp(slope * conscientiousness(data, person)) /
          (row.traitNorm.get(condition.key) ?? api.parameter("one"));
    const hash = stableHash(
      `${api.state.seed}:${data.conditionHoldingKey}:${condition.key}:${person.id}`,
    );
    const quantile =
      Number.parseInt(hash.slice(api.parameter("zero"), digits), radix) /
      radix ** digits;
    if (
      quantile <
      conditionPrevalence(condition, age, data.calibrationCategory) * shift
    )
      held.push(condition.key);
  }
  return held;
}

/**
 * One full person's health record, from the model the opening uses: their
 * conditions, their own resilience line, strain from `from` (the opening day,
 * or the day they were filled in) and the first day it crosses the line.
 */
function assignPerson(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  person: Readonly<PersonState>,
  conditions: readonly string[],
  from: ReturnType<typeof makeIsoDate>,
) {
  const p = (key: string) => api.parameter(key);
  const line = resilienceLine(api, data, person.id);
  row.resilienceLines.set(person.id, line);
  row.conditionsByPerson.set(person.id, conditions);
  const threshold = thresholdUnits(
    (line * BigInt(MULTIPLIER_ONE)) /
      BigInt(Math.round(p(data.resilienceScaleParameter) * MULTIPLIER_ONE)),
  );
  const age = exactAge(api, person.birthDate, from);
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
  row.plans.set(person.id, {
    from,
    threshold,
    micros,
    ...(strongest ? { conditionKey: strongest.key } : {}),
    housing: [],
    web: [],
  });
  scheduleOnset(api, data, row, person, from);
}

/**
 * The strain's segments: the conditions' weight from the plan's start, times
 * the housing status's factor from each change, times the eviction factor
 * for the years after an eviction (Collinson et al. 2024).
 */
function segments(api: CoreAPI, plan: HealthPlan) {
  const p = (key: string) => api.parameter(key);
  const evictionEnds = plan.evictedOn
    ? addDays(plan.evictedOn, p("healthEvictionEffectDays"))
    : undefined;
  const dates = [
    plan.from,
    ...plan.housing.map((row) => row.date),
    ...plan.web.map((row) => row.date),
    ...(plan.evictedOn && evictionEnds ? [plan.evictedOn, evictionEnds] : []),
  ]
    .filter((date) => date >= plan.from)
    .sort();
  return [...new Set(dates)].map((date) => {
    const housing =
      [...plan.housing].reverse().find((row) => row.date <= date)?.factor ??
      p("one");
    const evicted =
      plan.evictedOn &&
      evictionEnds &&
      date >= plan.evictedOn &&
      date < evictionEnds
        ? p("healthEvictionHazardFactor")
        : p("one");
    const web =
      [...plan.web].reverse().find((row) => row.date <= date)?.factor ??
      p("one");
    return {
      effectiveAt: date,
      micros: Math.round(plan.micros * housing * evicted * web),
    };
  });
}

/** Books (or moves) the person's onset: the first day their strain crosses their line. */
function scheduleOnset(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  person: Readonly<PersonState>,
  from: Day,
) {
  const plan = row.plans.get(person.id);
  if (!plan) return;
  const found = row.cases.get(person.id);
  // An illness that has begun runs its course.
  if (found?.onsetEventId) return;
  if (found) row.onsetsByDate.get(found.onsetDate)?.delete(person.id);
  row.cases.delete(person.id);
  const horizon = dateAtAge(makeIsoDate(person.birthDate), SSA_2023_MAX_AGE);
  if (horizon <= from) return;
  const multipliers = segments(api, plan);
  // Their conscientiousness, read now, sets how fast strain builds; the
  // illness's severity below stays the conditions' own.
  const factor = hazardFactor(api, data, row, person);
  api.stopgap(data.traitStopgapId);
  const onset = firstThresholdDay(
    {
      birthDate: makeIsoDate(person.birthDate),
      category: data.calibrationCategory,
      exposureStart: plan.from,
      multipliers: multipliers.map((segment) => ({
        ...segment,
        micros: Math.round(segment.micros * factor),
      })),
    },
    plan.threshold,
    from,
    horizon,
  );
  if (!onset) return;
  // A crossing on the day it is computed is heard on the next simulated day.
  const due = onset <= from ? addDays(from, api.parameter("one")) : onset;
  row.cases.set(person.id, {
    personId: person.id,
    conditions: row.conditionsByPerson.get(person.id) ?? [],
    ...(plan.conditionKey ? { conditionKey: plan.conditionKey } : {}),
    severity:
      Math.max(...multipliers.map((segment) => segment.micros)) /
      MULTIPLIER_ONE,
    onsetDate: due,
  });
  index(row.onsetsByDate, due, person.id);
}

/**
 * Losing a home, or an eviction, changes a person's strain from that day:
 * sheltered and unsheltered people fall seriously ill and die sooner
 * (homelessness item 5). Their onset is recomputed from today.
 */
function housingChanged(
  api: CoreAPI,
  data: HealthData,
  event: Readonly<CoreEventInput>,
) {
  const row = runtime(api.state);
  const date = makeIsoDate(api.state.date);
  const factors: Readonly<Record<string, string>> = {
    housed: "one",
    "doubled-up": "healthDoubledUpHazardFactor",
    sheltered: "healthShelteredHazardFactor",
    unsheltered: "healthUnshelteredHazardFactor",
  };
  for (const id of event.personIds) {
    const person = api.state.people.get(id);
    const plan = row.plans.get(id);
    if (!person?.alive || !plan) continue;
    if (event.kind === HOUSING_STATUS_EVENT) {
      const status = String(event.facts?.status ?? "housed");
      plan.housing.push({
        date,
        factor: api.parameter(factors[status] ?? "one"),
      });
    } else plan.evictedOn = date;
    api.stopgap(data.stopgapId);
    scheduleOnset(api, data, row, person, date);
  }
}

/**
 * Once a month, after the outcome web has written its month, each person's
 * death hazard takes the web's factor for their age and income fifth (the
 * same factor a counted person's chance of a serious illness takes). A
 * change books a new segment from today and moves the onset; past strain
 * keeps the factors it was earned under. An illness already begun runs its
 * course.
 */
function refreshWebFactors(api: CoreAPI, data: HealthData, row: HealthRuntime) {
  const day = Number(api.state.date.slice(8, 10));
  if (day !== DEATH_WEB_REFRESH_DAY) return;
  markWaitingHealthLinks(api);
  const p = (key: string) => api.parameter(key);
  const today = makeIsoDate(api.state.date);
  const pay = householdMonthlyPay(api);
  for (const [id, plan] of row.plans) {
    const person = api.state.people.get(id);
    if (!person?.alive || row.cases.get(id)?.onsetEventId) continue;
    const monthly = pay.get(person.householdId);
    const web = deathWebFactor(
      api,
      person.placeId,
      Math.floor(exactAge(api, person.birthDate, today)),
      monthly == null ? undefined : incomeBandOf(monthly * p("monthsPerYear")),
    ).factor;
    const last = plan.web.at(-1)?.factor ?? p("one");
    if (web === last) continue;
    plan.web.push({ date: today, factor: web });
    api.stopgap(data.stopgapId);
    scheduleOnset(api, data, row, person, today);
  }
}

function initialize(api: CoreAPI, data: HealthData, row: HealthRuntime) {
  api.stopgap(data.stopgapId);
  const start = makeIsoDate(api.state.startedAt);
  const pay = householdMonthlyPay(api);
  const alive = [...api.state.people.values()].filter((person) => person.alive);
  setTraitNorms(api, data, row, alive);
  const assignments = startingConditionAssignments(
    alive.map((person) => ({
      personId: person.id as EntityId,
      placeKey: person.placeId,
      age: exactAge(api, person.birthDate, start),
      category: data.calibrationCategory,
      monthlyHouseholdIncomeMinor: pay.get(person.householdId) ?? null,
      conscientiousness: conscientiousness(data, person),
    })),
    behaviorSlopes(api, data),
  );
  for (const person of alive)
    assignPerson(
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
 * Anyone who became a full person after the opening (filled in from the
 * counts, born, moved in) gets a record on the day the people count changes;
 * on every other day this is one number compared. Strain starts that day.
 */
function admitNewcomers(api: CoreAPI, data: HealthData, row: HealthRuntime) {
  if (api.state.people.size === row.seenPeople) return;
  row.seenPeople = api.state.people.size;
  for (const person of api.state.people.values())
    giveHealthRecord(api, person.id, data);
}

/**
 * Give one person who just became full (a fill-in, a birth, a move in) their
 * health record now, from the same model and seeded by the world and the
 * person, so it is the same whenever they are filled in. Fill-in calls this;
 * anyone it misses is caught on the next day the people count changes. A
 * person who already has a record keeps it.
 */
export function giveHealthRecord(
  api: CoreAPI,
  personId: PersonId,
  data: HealthData = DEFAULT_HEALTH_DATA,
): void {
  const row = runtime(api.state);
  const person = api.state.people.get(personId);
  if (!row.initialized || !person?.alive) return;
  if (row.conditionsByPerson.has(personId)) return;
  api.stopgap(data.stopgapId);
  const today = makeIsoDate(api.state.date);
  assignPerson(
    api,
    data,
    row,
    person,
    lateConditions(api, data, person, exactAge(api, person.birthDate, today)),
    today,
  );
  carryCountedIllness(api, data, row, personId, today);
}

/**
 * A counted person who was seriously ill when filled in is ill in their
 * record: the same illness the group booked, with its onset in the past and
 * its death on the day the group set. The counted row ends with it (they
 * are no longer counted), so the death is the health engine's from here.
 */
function carryCountedIllness(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
  personId: PersonId,
  today: Day,
) {
  const counted = countedIllnessOf(api, personId);
  if (!counted) return;
  endCountedIllness(api, personId);
  const planned = row.cases.get(personId);
  if (planned) row.onsetsByDate.get(planned.onsetDate)?.delete(personId);
  const deathDate =
    counted.dueDate > today
      ? counted.dueDate
      : addDays(today, api.parameter("one"));
  row.cases.set(personId, {
    personId,
    conditions: row.conditionsByPerson.get(personId) ?? [],
    ...(planned?.conditionKey ? { conditionKey: planned.conditionKey } : {}),
    severity: planned?.severity ?? api.parameter("one"),
    onsetDate: counted.onsetDate,
    onsetEventId: `${data.onsetEventKind}:${personId}:${counted.onsetDate}`,
    deathDate,
  });
  index(row.deathsByDate, deathDate, personId);
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

export function severityImpulse(api: CoreAPI, severity: Severity) {
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

/**
 * The dead person's kin and housemates who are counted (not yet people of the
 * world) cannot be witnesses, so what the death moved in them is kept on the
 * health record by their id and lands when they are filled in.
 */
export function keepForCountedKin(
  api: CoreAPI,
  dead: Readonly<PersonState>,
  event: CoreEventInput,
): void {
  const kin = new Set<PersonId>(dead.familyIds);
  for (const id of api.state.households.get(dead.householdId)?.memberIds ?? [])
    kin.add(id);
  keepBereavement(api, dead.id, kin, event);
}

/** The same for a death in the counts: its counted kin, named by id, keep what it moved. */
export function keepBereavement(
  api: CoreAPI,
  deadId: PersonId,
  kinIds: Iterable<PersonId>,
  event: Pick<CoreEventInput, "id" | "date" | "moodImpulse" | "stressImpulse">,
): void {
  const row = runtime(api.state);
  const counted = residentsRuntime(api.state)?.store;
  if (!counted || (!event.moodImpulse && !event.stressImpulse)) return;
  for (const id of [...new Set(kinIds)].sort()) {
    if (id === deadId || api.state.people.has(id)) continue;
    if (counted.countedMember(id) === undefined) continue;
    const list = row.bereaved.get(id) ?? [];
    list.push({
      eventId: event.id,
      deadId,
      date: makeIsoDate(event.date),
      moodImpulse: event.moodImpulse ?? api.parameter("zero"),
      stressImpulse: event.stressImpulse ?? api.parameter("zero"),
    });
    row.bereaved.set(id, list);
  }
}

/** The part of an impulse left `days` after it, on the affect model's own half-life. */
function remaining(api: CoreAPI, days: number, halfLifeParameter: string) {
  return Math.exp(
    (-Math.log(api.parameter("two")) * days) / api.parameter(halfLifeParameter),
  );
}

export function createHealthModule(
  data: HealthData = DEFAULT_HEALTH_DATA,
): CoreModule {
  return {
    id: "core2-health-producer-p10-v1",
    eventKinds: [HOUSING_STATUS_EVENT, "housing.eviction"],
    onEvent(api, event) {
      housingChanged(api, data, event);
    },
    // Kin filled in after a death meet it now: the part of its impulse left
    // by today lands on them as one late event naming the dead.
    onFillIn(api, { memberIds }) {
      const row = runtime(api.state);
      for (const id of memberIds) {
        const kept = row.bereaved.get(id);
        if (!kept || !api.state.people.has(id)) continue;
        row.bereaved.delete(id);
        for (const death of kept) {
          const days = daysBetween(death.date, makeIsoDate(api.state.date));
          api.emit({
            id: `${death.eventId}:late:${id}`,
            date: api.state.date,
            kind: `${data.deathEventKind}.late`,
            personIds: [death.deadId],
            witnessIds: [id],
            placeId: api.state.people.get(id)!.placeId,
            moodImpulse:
              death.moodImpulse * remaining(api, days, "moodHalfLifeDays"),
            stressImpulse:
              death.stressImpulse * remaining(api, days, "stressHalfLifeDays"),
            source: { ...data.source, asOf: api.state.date },
          });
        }
      }
    },
    onDay(api) {
      const row = runtime(api.state);
      if (!row.initialized) initialize(api, data, row);
      else admitNewcomers(api, data, row);
      if (row.initialized) refreshWebFactors(api, data, row);
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
        // A death is a public record (the death certificate) and local news
        // (the obituary): the town's counts, the news, kin and the seat's
        // vacancy rule all read it. An illness's onset stays private.
        api.emit({ ...event, publicRecord: true, news: true });
        keepForCountedKin(api, person, event);
        // Their cash passes to their heirs, or escheats (money audit defect 6).
        settleEstate(api, id, event.id);
      }
    },
  };
}

export const HEALTH_MODULE = createHealthModule();
declareSnapshotCovered(HEALTH_MODULE.id);

/**
 * How much care a person's health asks of the people close to them today,
 * from 0 up toward 1. A serious illness under way asks for all of it. Short
 * of that, held conditions ask for a share that grows with their combined
 * hazard weight above ordinary health (the weight that sets the onset):
 * excess / (excess + the excess that asks for half). A sliding scale; no
 * threshold, and nothing here rolls a die. Zero for someone with no health
 * record, or where the health module is not installed.
 */
export function careNeedOf(
  state: Readonly<CoreState>,
  personId: PersonId,
): number {
  const row = runtimes.get(state);
  const zero = parameter("zero", state.data.parameters);
  if (!row) return zero;
  if (row.cases.get(personId)?.onsetEventId)
    return parameter("one", state.data.parameters);
  const plan = row.plans.get(personId);
  if (!plan) return zero;
  const excess = Math.max(zero, plan.micros / MULTIPLIER_ONE - 1);
  return (
    excess /
    (excess + parameter("careNeedHalfExcessHazard", state.data.parameters))
  );
}

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
    /** Counted kin a death moved who are not yet filled in, by id. */
    bereaved: new Map(
      [...(row?.bereaved ?? new Map())].map(([id, list]) => [id, [...list]]),
    ),
  };
}

/** The outcome web's factor now on one person's death hazard (1 where it has moved nothing). */
export function healthDeathWebOf(
  state: Readonly<CoreState>,
  personId: PersonId,
): number {
  return runtimes.get(state)?.plans.get(personId)?.web.at(-1)?.factor ?? 1;
}
