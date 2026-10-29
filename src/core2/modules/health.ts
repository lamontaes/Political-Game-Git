import healthJson from "../data/health.json" with { type: "json" };
import { worldRateFactor } from "../world-base-rates";
import { settleEstate } from "../estates";
import { HOUSING_STATUS_EVENT } from "../housing-homeless";
import {
  addDays,
  ageOnDate,
  dateAtAge,
  makeIsoDate,
  daysBetweenText,
} from "../kernel/dates";
import {
  CONDITION_PACK,
  conditionHazard,
  conditionPrevalence,
  personalityShares,
  startingConditionAssignments,
} from "../condition-pack";
import { remainingDaysAfterOnset } from "../death-causes";
import {
  DEATH_WEB_REFRESH_DAY,
  deathWebFactor,
  markWaitingHealthLinks,
  youthCannabisWeb,
} from "../health-web";
import {
  assignDeathCause,
  DEATH_CAUSE_FACT_KEY,
  SUBSTANCE_CONDITION,
} from "../death-cause";
import { incomeBandOf } from "../counted-income-fifth";
import {
  combineOwn,
  coverageSpellsNow,
  displacementFactor,
  displacementsOfPeople,
  longHoursFactor,
  ownCoverageFactor,
  readsOwnCoverage,
  spellOn,
  type OwnPart,
} from "../health-own";
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
import { isDemoted } from "../counted-groups";
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
  /** A serious illness begun in the wider population, recorded for the person and their household. */
  countedOnsetEventKind: string;
  /** A death in the wider population, recorded for the household that outlives them. */
  countedDeathEventKind: string;
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
  /**
   * Each full teen's past-month cannabis use, decided monthly by the
   * behavior conditions' rule; the outcome web's factor for `measure` moves
   * each teen's share (cannabis-sales-to-youth-use).
   */
  youthCannabis: {
    measure: string;
    fromAge: number;
    belowAge: number;
    shareParameter: string;
    logOddsPerLevelParameter: string;
    recordPrefix: string;
    unreadStopgapId: string;
  };
  traitStopgapId: string;
  onsetSeverity: Severity;
  jobLossSeverity: Severity;
  evictionSeverity: Severity;
  /** A missed debt payment weighs as a change in financial state (pool item traits-outcome-hardship-coping), in Holmes and Rahe units. */
  missedPaymentSeverity: Severity;
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

/** One teen's past-month cannabis use for a month: the share they were decided at and whether they used. */
export interface YouthCannabisRecord {
  readonly id: string;
  readonly personId: PersonId;
  readonly placeId: string;
  readonly month: string;
  /** Their own share after their conscientiousness moved it, scaled to the place's count. */
  readonly share: number;
  /** The national share times the web's factor, before personality. */
  readonly placeShare: number;
  readonly factor: number;
  /** The web month row the factor stands on, or null. */
  readonly webRecordId: string | null;
  readonly used: boolean;
}

interface HealthRuntime {
  initialized: boolean;
  /** People count at the last look; a change means newcomers to admit. */
  seenPeople: number;
  cases: Map<PersonId, HealthCase>;
  onsetsByDate: Map<IsoDate, Set<PersonId>>;
  deathsByDate: Map<IsoDate, Set<PersonId>>;
  conditionsByPerson: Map<PersonId, readonly string[]>;
  /** The cause each death was assigned (death-cause.ts), by person. */
  causeOfDeath: Map<PersonId, string>;
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
  /** Each full teen's latest past-month cannabis use record. */
  youthCannabis: Map<PersonId, YouthCannabisRecord>;
  /** The fraction of a user each place's count carried to the next month. */
  youthCannabisCarry: Map<string, number>;
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
  /**
   * The factor on this person's death hazard from their own records (health-own.ts),
   * from each month it moved, oldest first, with the reasons it stands on.
   */
  own: { date: Day; factor: number; parts: readonly OwnPart[] }[];
  /** The first month their coverage was read, and whether it was paid then (the table's own coverage). */
  coverageBase?: { date: Day; covered: boolean };
  evictedOn?: Day;
  /** The household income fifth the last monthly web refresh read, for the cause of death. */
  fifth?: number;
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
      causeOfDeath: new Map(),
      traitNorm: new Map(),
      youthCannabis: new Map(),
      youthCannabisCarry: new Map(),
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
  return daysBetweenText(birthDate, date) / api.parameter("daysPerMeanYear");
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
      conditionPrevalence(
        condition,
        age,
        data.calibrationCategory,
        worldRateFactor(api.state.seed, "conditions"),
      ) *
        shift
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
    own: [],
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
    ...plan.own.map((row) => row.date),
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
    const own =
      [...plan.own].reverse().find((row) => row.date <= date)?.factor ??
      p("one");
    // This world's life table: the published hazard times its mortality
    // factor, the same one counted people die by (one model, two tiers).
    const world = worldRateFactor(api.state.seed, "mortality");
    return {
      effectiveAt: date,
      micros: Math.round(plan.micros * housing * evicted * web * own * world),
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
  // Named people's own Medicaid coverage, read once for the month; null where
  // the world does not model it (their web factor then keeps the place row).
  const spells = coverageSpellsNow(api);
  // Who the jobs engine has displaced from a long job (its closure records).
  const displaced = displacementsOfPeople(api);
  for (const [id, plan] of row.plans) {
    const person = api.state.people.get(id);
    if (!person?.alive || row.cases.get(id)?.onsetEventId) continue;
    const monthly = pay.get(person.householdId);
    const fifth =
      monthly == null ? undefined : incomeBandOf(monthly * p("monthsPerYear"));
    plan.fifth = fifth;
    const age = Math.floor(exactAge(api, person.birthDate, today));
    const mine = spells?.get(id);
    // The job they hold now, whose recorded hours are the cause of long-hours-to-heart-and-stroke.
    const held = person.jobId ? api.state.jobs.get(person.jobId) : undefined;
    if (spells && !plan.coverageBase)
      plan.coverageBase = {
        date: today,
        covered: spellOn(mine, today) !== undefined,
      };
    // coverage-to-mortality-55-64: a full person's own Medicaid coverage sets
    // their factor at 55 to 64; job-loss-to-death-risk: a worker displaced
    // from a long job carries the excess after it; long-hours-to-heart-and-stroke:
    // a worker at long weekly hours carries the excess in their heart disease
    // and stroke deaths. A counted person has none of these records of their
    // own (the payment keeps a count; the counted flows read no closure or
    // job hours), so the counted tier keeps the place-level twin row and no
    // job-loss or long-hours factor.
    // stopgapId: SG-HEALTH-own-records-counted
    const own = combineOwn(
      plan.coverageBase && readsOwnCoverage(age)
        ? ownCoverageFactor({
            spells: mine,
            today,
            firstLook: plan.coverageBase,
          })
        : undefined,
      displacementFactor({
        displaced: displaced.get(id),
        today,
        daysPerYear: p("daysPerMeanYear"),
      }),
      longHoursFactor({
        weeklyHours: held ? held.hoursDaily * p("daysPerWeek") : undefined,
        age,
        jobId: held?.id,
      }),
    );
    if (own) api.stopgap("SG-HEALTH-own-records-counted");
    const web = deathWebFactor(
      api,
      person.placeId,
      age,
      fifth,
      spells !== null,
    ).factor;
    const last = plan.web.at(-1)?.factor ?? p("one");
    const ownFactor = own?.factor ?? p("one");
    const ownMoved = ownFactor !== (plan.own.at(-1)?.factor ?? p("one"));
    if (web === last && !ownMoved) continue;
    if (web !== last) plan.web.push({ date: today, factor: web });
    if (ownMoved)
      plan.own.push({
        date: today,
        factor: ownFactor,
        parts: own?.parts ?? [],
      });
    api.stopgap(data.stopgapId);
    scheduleOnset(api, data, row, person, today);
  }
}

/**
 * The share of people this age in a place who used cannabis in the past
 * month, before personality: the national share (NSDUH) times this world's
 * chronic-conditions factor (the one the adult drug-use condition takes) and
 * the outcome web's factor for the place (cannabis-sales-to-youth-use moves it where the
 * state's sales law is in force). Null outside the teen ages. One rule for
 * both tiers: a full teen's share is moved by their conscientiousness from
 * this, and a counted teen carries it times their count (births-counted.ts).
 */
export function youthCannabisShare(
  api: CoreAPI,
  placeId: string,
  age: number,
  data: HealthData = DEFAULT_HEALTH_DATA,
): { share: number; factor: number; recordId: string | null } | null {
  const band = data.youthCannabis;
  const whole = Math.floor(age);
  if (whole < band.fromAge || whole >= band.belowAge) return null;
  const web = youthCannabisWeb(api, placeId, band.measure, whole);
  return {
    share: Math.min(
      api.parameter("one"),
      api.parameter(band.shareParameter) *
        worldRateFactor(api.state.seed, "conditions") *
        web.factor,
    ),
    factor: web.factor,
    recordId: web.recordId,
  };
}

/**
 * Once a month, on the web's refresh day, each full teen's past-month
 * cannabis use, by the rule the behavior conditions follow at the opening
 * (condition-pack.ts): each teen's share is the place's share for their age
 * moved on the log-odds scale by their conscientiousness (Bogg and Roberts
 * 2004, the drug-use slope), the place's count is the shares' sum with the
 * fraction carried to next month, and a teen used where the running share
 * of that count passes a whole number. No roll: the count is the rate's,
 * personality decides who, the web's factor moves every teen's share.
 */
function refreshYouthCannabis(
  api: CoreAPI,
  data: HealthData,
  row: HealthRuntime,
) {
  const day = Number(api.state.date.slice(8, 10));
  if (day !== DEATH_WEB_REFRESH_DAY) return;
  const band = data.youthCannabis;
  const today = makeIsoDate(api.state.date);
  const month = api.state.date.slice(0, 7);
  const slope = api.parameter(band.logOddsPerLevelParameter);
  const byPlace = new Map<
    string,
    {
      person: Readonly<PersonState>;
      found: NonNullable<ReturnType<typeof youthCannabisShare>>;
    }[]
  >();
  for (const person of api.state.people.values()) {
    if (!person.alive || isDemoted(person)) continue;
    const found = youthCannabisShare(
      api,
      person.placeId,
      exactAge(api, person.birthDate, today),
      data,
    );
    if (!found) continue;
    const list = byPlace.get(person.placeId) ?? [];
    list.push({ person, found });
    byPlace.set(person.placeId, list);
  }
  row.youthCannabis.clear();
  if (!byPlace.size) return;
  // No other engine reads the record yet (school, the adult condition at 18).
  // stopgapId: SG-HEALTH-youth-cannabis-record-unread
  api.stopgap(band.unreadStopgapId);
  for (const [placeId, teens] of [...byPlace].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    teens.sort((a, b) =>
      a.person.id < b.person.id ? -1 : a.person.id > b.person.id ? 1 : 0,
    );
    const shares = teens.map((teen) => teen.found.share);
    const expected = shares.reduce((sum, share) => sum + share, 0);
    const owed = expected + (row.youthCannabisCarry.get(placeId) ?? 0);
    const count = Math.min(teens.length, Math.max(0, Math.round(owed)));
    row.youthCannabisCarry.set(placeId, owed - count);
    const weights = personalityShares(
      shares,
      teens.map((teen) => slope * conscientiousness(data, teen.person)),
      expected,
    );
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let running = api.parameter("zero");
    for (const [position, teen] of teens.entries()) {
      const before = Math.floor(running);
      if (total > 0) running += (count * weights[position]!) / total;
      const id = `${band.recordPrefix}:${teen.person.id}:${month}`;
      row.youthCannabis.set(teen.person.id, {
        id,
        personId: teen.person.id,
        placeId,
        month,
        share: weights[position] ?? 0,
        placeShare: teen.found.share,
        factor: teen.found.factor,
        webRecordId: teen.found.recordId,
        used: Math.floor(running) > before,
      });
    }
  }
}

/** A full teen's latest past-month cannabis use record, or null. */
export function youthCannabisRecordOf(
  state: Readonly<CoreState>,
  personId: PersonId,
): YouthCannabisRecord | null {
  return runtimes.get(state)?.youthCannabis.get(personId) ?? null;
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
    worldRateFactor(api.state.seed, "conditions"),
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

export function createHealthModule(
  data: HealthData = DEFAULT_HEALTH_DATA,
): CoreModule {
  return {
    id: "core2-health-producer-p10-v1",
    eventKinds: [HOUSING_STATUS_EVENT, "housing.eviction"],
    onEvent(api, event) {
      housingChanged(api, data, event);
    },
    onDay(api) {
      const row = runtime(api.state);
      if (!row.initialized) initialize(api, data, row);
      else admitNewcomers(api, data, row);
      if (row.initialized) {
        refreshWebFactors(api, data, row);
        refreshYouthCannabis(api, data, row);
      }
      const date = makeIsoDate(api.state.date);
      for (const id of [...(row.onsetsByDate.get(date) ?? [])].sort()) {
        const person = api.state.people.get(id);
        const found = row.cases.get(id);
        // Someone back in the counts is counted: the counted flows decide
        // their illness and death, by the same life-table share, and their
        // kept record waits for them to be met again (one model, two tiers).
        if (!person?.alive || !found || isDemoted(person)) continue;
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
        if (!person?.alive || !found || isDemoted(person)) continue;
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
        const died = assignDeathCause(api, {
          placeId: person.placeId,
          age: Math.floor(exactAge(api, person.birthDate, date)),
          incomeFifth: row.plans.get(id)?.fifth,
          substanceUse: (row.conditionsByPerson.get(id) ?? []).includes(
            SUBSTANCE_CONDITION,
          ),
        });
        found.deathEventId = event.id;
        row.causeOfDeath.set(id, died.cause);
        api.updatePerson(id, { alive: false });
        row.deaths += api.parameter("one");
        // A death is a public record (the death certificate) and local news
        // (the obituary): the town's counts, the news, kin and the seat's
        // vacancy rule all read it. An illness's onset stays private.
        api.emit({
          ...event,
          facts: {
            ...event.facts,
            [`event:${event.id}:${DEATH_CAUSE_FACT_KEY}`]: died.cause,
          },
          publicRecord: true,
          news: true,
        });
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
    causeOfDeath: row?.causeOfDeath ?? new Map(),
    resilienceLines: row?.resilienceLines ?? new Map(),
  };
}

/** The outcome web's factor now on one person's death hazard (1 where it has moved nothing). */
export function healthDeathWebOf(
  state: Readonly<CoreState>,
  personId: PersonId,
): number {
  return runtimes.get(state)?.plans.get(personId)?.web.at(-1)?.factor ?? 1;
}

/**
 * The factor now on one person's death hazard from their own records (1
 * where none has moved it) and the reasons it stands on: the link, its size,
 * the day their coverage was read at, whether it was paid then and at their
 * first look, and the obligations that paid it.
 */
export function healthDeathOwnOf(
  state: Readonly<CoreState>,
  personId: PersonId,
): { readonly factor: number; readonly parts: readonly OwnPart[] } {
  const last = runtimes.get(state)?.plans.get(personId)?.own.at(-1);
  return { factor: last?.factor ?? 1, parts: last?.parts ?? [] };
}

/**
 * The multiplier on the life table's hazard the engine now uses for one
 * person (conditions, housing, eviction, the web, their own records and the
 * world's mortality factor), with the web's and their own records' parts of
 * it. Undefined for someone with no health record.
 */
export function healthHazardOf(
  api: CoreAPI,
  personId: PersonId,
):
  | {
      readonly micros: number;
      readonly web: number;
      readonly own: number;
      /** The household income fifth the last monthly look read, for the web's factor. */
      readonly fifth: number | undefined;
    }
  | undefined {
  const plan = runtimes.get(api.state)?.plans.get(personId);
  if (!plan) return undefined;
  const now = segments(api, plan)
    .filter((segment) => segment.effectiveAt <= api.state.date)
    .at(-1);
  if (!now) return undefined;
  return {
    micros: now.micros,
    web: plan.web.at(-1)?.factor ?? 1,
    own: plan.own.at(-1)?.factor ?? 1,
    fifth: plan.fifth,
  };
}
