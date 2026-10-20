/**
 * P15 part 2b: a person's free hours hold several acts, each taking its own
 * duration, chosen from one scoring pass.
 *
 * The activation scores every offer once. Each day up to the person's next
 * activation is filled best act first: at most one act per need, each act
 * fitting the hours left that day, and every act but the activation's own pick
 * worth more than doing nothing. Between days the scores follow what the
 * planned acts change: a visit moves the date the need for company regrows
 * from and restarts that tie's fading; any other act lowers the need it answers
 * by its own effect. Acts planned for a later date are kept here and happen on
 * that date, so their effects land when they occur.
 */
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import type { ScoredOffer } from "./choice";
import {
  closenessAfter,
  halfLifeDays,
  hoursFromLevel,
  hoursLost,
} from "./closeness";
import { parameter } from "./parameters";
import { plannedWorkMinutesOnDate } from "./modules/work";
import freeBlockJson from "./data/free-block.json" with { type: "json" };
import timeUse from "./data/time-use-reference.json" with { type: "json" };
import { resolveOperation } from "./state";
import type {
  ActOffer,
  CoreAPI,
  CoreState,
  DecisionReason,
  IsoDate,
  PersonState,
  Relationship,
  WeightedReason,
} from "./types";
import { registerWorldMapPart } from "./snapshot";

export const FREE_BLOCK_DATA = freeBlockJson;

export const FREE_BLOCK = {
  stopgapId: "SG-P15-free-block-plan",
  /** The effect whose act moves the date of last contact. */
  contactEffect: "contact",
  /** The prefix of the goal each need carries (life.ts refreshNeeds). */
  needGoalPrefix: "need:",
  /** The reason provider whose pull is the hours a tie has lost. */
  tieProvider: "tie-fading",
  /** Need evaluators that read the date of last contact. */
  contactEvaluators: ["contact-gap"] as readonly string[],
} as const;

export interface PlannedAct {
  date: IsoDate;
  personId: string;
  offer: ActOffer;
  score: number;
  reasons: DecisionReason;
  reasonTerms?: readonly WeightedReason[];
}

const plans = new WeakMap<CoreState, Map<IsoDate, PlannedAct[]>>();
registerWorldMapPart("core2-free-block-plans", plans);

/** Acts planned for this date, removed from the plan as they are handed out. */
export function takePlannedActs(
  core: CoreState,
  date: IsoDate,
): readonly PlannedAct[] {
  const byDate = plans.get(core);
  const due = byDate?.get(date) ?? [];
  byDate?.delete(date);
  return due;
}

type PlannedActRunner = (core: CoreState, act: PlannedAct) => boolean;
let runner: PlannedActRunner | undefined;

/** The life loop supplies how a planned act happens (life.ts). */
export function registerPlannedActRunner(run: PlannedActRunner): void {
  runner = run;
}

/**
 * Runs the acts planned for today that have not run yet. advanceCore runs them
 * before the day's activations; any other day loop (the player API) reaches
 * them here through the people module's end-of-day hook. Taken plans leave the
 * store, so a plan never runs twice.
 */
export function runDuePlannedActs(core: CoreState): number {
  let ran = 0;
  for (const act of takePlannedActs(core, core.date as IsoDate))
    if (runner?.(core, act)) ran += 1;
  return ran;
}

function keep(core: CoreState, act: PlannedAct): void {
  let byDate = plans.get(core);
  if (!byDate) {
    byDate = new Map();
    plans.set(core, byDate);
  }
  const due = byDate.get(act.date);
  if (due) due.push(act);
  else byDate.set(act.date, [act]);
}

/** Waking hours on a date less the person's planned work that date. */
function freeHours(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  date: IsoDate,
): number {
  const data = api.state.data.work;
  if (!data) return api.parameter("hoursPerDay");
  let minutes = api.parameter("zero");
  for (const id of api.state.work.commitmentsByPerson.get(actor.id) ?? []) {
    const row = api.state.work.commitments.get(id)!;
    if (row.jobId !== actor.jobId) continue;
    minutes += plannedWorkMinutesOnDate(api, row, date);
  }
  return Math.max(
    api.parameter("zero"),
    api.parameter("hoursPerDay") -
      api.parameter(data.sleepReserveParameter) -
      minutes / api.parameter("minutesPerHour"),
  );
}

interface ReserveRow {
  midAge: number;
  hours: number;
}

const reserves = new WeakMap<object, ReserveRow[]>();

/**
 * Hours a day of the activities the game does not model, by ATUS age group:
 * personal care beyond the sleep the schedule already reserves, meals,
 * household work, shopping and the rest. Each group stands at its middle age;
 * the open top group reaches as far past its start as the group below spans.
 */
function reserveRows(api: CoreAPI): ReserveRow[] {
  const cached = reserves.get(api.state.data);
  if (cached) return cached;
  const p = (key: string) => api.parameter(key);
  const data = FREE_BLOCK_DATA.reserve;
  const sleep = api.state.data.work
    ? p(api.state.data.work.sleepReserveParameter)
    : p("zero");
  const rows: ReserveRow[] = [];
  let previousSpan = p("zero");
  for (const row of timeUse.rows) {
    if (row.cohort === data.totalCohort) continue;
    const [low, top] = (row.cohort.match(/\d+/g) ?? []).map(Number);
    const high = top ?? low! + previousSpan;
    previousSpan = high - low! + p("one");
    const hours = row.hoursPerDiaryDay as Record<string, { value: number }>;
    rows.push({
      midAge: (low! + high + p("one")) / p("two"),
      hours:
        Math.max(p("zero"), hours[data.personalCareCategory]!.value - sleep) +
        data.categories.reduce(
          (sum, key) => sum + hours[key]!.value,
          p("zero"),
        ),
    });
  }
  reserves.set(api.state.data, rows);
  return rows;
}

/** The person's daily hours of unmodeled activities, smooth in age between groups. */
function reserveHours(api: CoreAPI, actor: Readonly<PersonState>): number {
  const rows = reserveRows(api);
  const age =
    daysBetween(makeIsoDate(actor.birthDate), makeIsoDate(api.state.date)) /
    api.parameter("daysPerMeanYear");
  const [first] = rows;
  if (age <= first!.midAge) return first!.hours;
  for (
    let index = api.parameter("one");
    index < rows.length;
    index += api.parameter("one")
  ) {
    const low = rows[index - api.parameter("one")]!,
      high = rows[index]!;
    if (age <= high.midAge)
      return (
        low.hours +
        ((high.hours - low.hours) * (age - low.midAge)) /
          (high.midAge - low.midAge)
      );
  }
  return rows[rows.length - api.parameter("one")]!.hours;
}

interface Projection {
  /** Days from today to the last contact (negative in the past). */
  contactDay: number;
}

const dates = new WeakMap<
  CoreState,
  { today: string; byDay: Map<number, IsoDate> }
>();

/** The date a number of days from today, shared by everyone planning today. */
function dateAt(core: CoreState, day: number): IsoDate {
  let row = dates.get(core);
  if (row?.today !== core.date) {
    row = { today: core.date, byDay: new Map() };
    dates.set(core, row);
  }
  let date = row.byDay.get(day);
  if (date === undefined) {
    date = addDays(makeIsoDate(core.date), day) as IsoDate;
    row.byDay.set(day, date);
  }
  return date;
}

function needsOn(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  projection: Projection,
  day: number,
): Record<string, number> {
  if (day === api.parameter("zero")) return actor.needs;
  // Need evaluators read the current date; the last contact moves back by the
  // days ahead so the gap since it is the gap on the planned date. Needs whose
  // evaluator does not read the last contact keep today's value.
  const view: PersonState = Object.create(actor);
  view.lastContactDate = dateAt(api.state, projection.contactDay - day);
  const values: Record<string, number> = Object.create(actor.needs);
  for (const definition of api.state.data.needs) {
    if (!FREE_BLOCK.contactEvaluators.includes(definition.evaluator)) continue;
    const evaluate = resolveOperation(
      api.state,
      "needEvaluators",
      definition.evaluator,
    );
    if (!evaluate)
      throw new Error(`Unregistered need evaluator: ${definition.evaluator}`);
    values[definition.id] = evaluate(api, view, definition);
  }
  return values;
}

/** A tie's fading pull, from its hours at the last contact and the days since. */
interface TiePull {
  /** The fading-tie part of the act's module reasons on the activation day. */
  pull: number;
  hours: number;
  halfLife: number;
  elapsed: number;
  lost: number;
  relationship: Relationship;
  visitDay?: number;
  visitHours?: number;
}

interface Candidate {
  row: ScoredOffer;
  /** The score less the parts that change from day to day. */
  base: number;
  need: string;
  effortHours: number;
  /** The strongest matching goal that is not a need's own goal. */
  otherGoal: number;
  /** Needs whose own goals match the act's goal kinds. */
  needGoals: readonly string[];
  tie?: TiePull;
}

function candidates(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  scored: readonly ScoredOffer[],
): Candidate[] {
  const core = api.state;
  const p = (key: string) => parameter(key, core.data.parameters);
  const zero = p("zero");
  const goals = new Map<string, { otherGoal: number; needGoals: string[] }>();
  const out: Candidate[] = [];
  for (const row of scored) {
    const definition = row.offer.definition;
    let goal = goals.get(definition.id);
    if (!goal) {
      goal = { otherGoal: zero, needGoals: [] };
      for (const entry of actor.goals.values()) {
        if (!definition.goalKinds.includes(entry.kind)) continue;
        if (entry.id.startsWith(FREE_BLOCK.needGoalPrefix))
          goal.needGoals.push(entry.id.slice(FREE_BLOCK.needGoalPrefix.length));
        else goal.otherGoal = Math.max(goal.otherGoal, entry.urgency);
      }
      goals.set(definition.id, goal);
    }
    // Only the fading-tie reason moves between planned days; other module
    // reasons (grief) keep their activation value.
    const binding = (definition.reasonBindings ?? []).find(
      (row) => row.provider === FREE_BLOCK.tieProvider,
    );
    let tie: TiePull | undefined;
    if (definition.effect === FREE_BLOCK.contactEffect && binding) {
      const relationship = core.relationships.get(
        [actor.id, row.offer.targetId].sort().join(":"),
      );
      const lost = relationship ? hoursLost(core, relationship) : zero;
      const pull =
        relationship && lost > zero
          ? (core.reasonProviders.get(binding.provider)?.(
              api,
              actor,
              row.offer,
              binding,
            )?.value ?? zero) * p(binding.weightParameter)
          : zero;
      if (relationship && pull !== zero)
        tie = {
          pull,
          hours: hoursFromLevel(p, relationship.level),
          halfLife: halfLifeDays(p, relationship.kind),
          elapsed: daysBetween(
            makeIsoDate(relationship.lastContactDate),
            makeIsoDate(core.date),
          ),
          lost,
          relationship,
        };
    }
    out.push({
      row,
      base:
        row.score -
        row.reasons.need -
        row.reasons.goal -
        row.reasons.effort -
        (tie ? tie.pull : zero),
      need: definition.need,
      effortHours: row.offer.effortHours ?? zero,
      otherGoal: goal.otherGoal,
      needGoals: goal.needGoals,
      tie,
    });
  }
  return out;
}

/** The fading-tie pull on a day, after any visit planned before it. */
function tieOn(
  candidate: Candidate,
  day: number,
  one: number,
  two: number,
): number {
  const tie = candidate.tie!;
  const lost =
    tie.visitDay === undefined
      ? tie.hours * (one - two ** (-(tie.elapsed + day) / tie.halfLife))
      : tie.visitHours! * (one - two ** (-(day - tie.visitDay) / tie.halfLife));
  return (tie.pull * lost) / tie.lost;
}

/**
 * Fills today's free hours after the activation's own pick and plans each
 * later day up to the next activation. Returns today's further acts; later
 * acts are kept for their dates.
 */
export function planFreeTime(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  scored: readonly ScoredOffer[],
  first: ActOffer | undefined,
  days: number,
): PlannedAct[] {
  const core = api.state;
  const p = (key: string) => parameter(key, core.data.parameters);
  const zero = p("zero"),
    one = p("one"),
    two = p("two");
  const needWeight = p("needWeight"),
    goalWeight = p("goalWeight"),
    effortWeight = p("effortWeight");
  api.stopgap(FREE_BLOCK.stopgapId);
  const today: PlannedAct[] = [];
  const projection: Projection = {
    contactDay: -daysBetween(
      makeIsoDate(actor.lastContactDate),
      makeIsoDate(core.date),
    ),
  };
  const pool = candidates(api, actor, scored);
  const scores = new Float64Array(pool.length);
  const byNeed = new Map<string, number[]>();
  pool.forEach((candidate, index) => {
    const rows = byNeed.get(candidate.need);
    if (rows) rows.push(index);
    else byNeed.set(candidate.need, [index]);
  });
  const flexible = new Set<string>(FREE_BLOCK_DATA.flexibleEffects);
  // An act that is one conversation is planned once, not on every later day.
  const once = new Set<string>(FREE_BLOCK_DATA.oncePerPlanEffects);
  const spent = new Set<number>();
  // An act after the pick must be worth more than its hours spent in the
  // leisure the game does not model; leisure itself (rest) needs only to be
  // worth doing at all.
  const leisureValue = p("unmodeledLeisureValuePerHour");
  const leisure = (candidate: Candidate) =>
    flexible.has(candidate.row.offer.definition.effect)
      ? zero
      : candidate.effortHours * leisureValue;
  let hours = zero;
  const fits = (candidate: Candidate) =>
    flexible.has(candidate.row.offer.definition.effect) && hours > zero;
  const better = (index: number, than: number) =>
    than < zero ||
    scores[index]! > scores[than]! ||
    (scores[index] === scores[than] &&
      pool[index]!.row.key < pool[than]!.row.key);
  const visit = (candidate: Candidate, day: number, date: IsoDate) => {
    if (candidate.row.offer.definition.effect !== FREE_BLOCK.contactEffect)
      return;
    projection.contactDay = day;
    const target = candidate.row.offer.targetId;
    for (const other of pool) {
      if (!other.tie || other.row.offer.targetId !== target) continue;
      other.tie.visitDay = day;
      other.tie.visitHours = hoursFromLevel(
        p,
        closenessAfter(
          { data: core.data, date },
          other.tie.relationship,
          other.tie.relationship.kind,
          candidate.effortHours,
        ),
      );
    }
  };
  // The free block holds only the hours left after the activities the game
  // does not model (ATUS), so acts compete for a real evening.
  const reserve = reserveHours(api, actor);
  let available = p("hoursPerDay");
  for (const row of scored)
    available = Math.min(available, row.offer.availableHours);
  for (let day = zero; day < days; day += one) {
    const date = dateAt(core, day);
    hours = (day === zero ? available : freeHours(api, actor, date)) - reserve;
    const needs = needsOn(api, actor, projection, day);
    const used = new Set<string>();
    if (day === zero && first) {
      used.add(first.definition.need);
      hours -= first.effortHours ?? zero;
      const picked = pool.find((row) => row.row.offer === first);
      if (picked) visit(picked, day, date);
      if (once.has(first.definition.effect))
        pool.forEach((row, index) => {
          if (row.row.offer === first) spent.add(index);
        });
    }
    const effortHours = hours;
    // Each need's best act that fits the hours, from one pass.
    const winners = new Map<string, number>();
    for (let index = zero; index < pool.length; index += one) {
      if (spent.has(index)) {
        scores[index] = -Infinity;
        continue;
      }
      const candidate = pool[index]!;
      let goal = candidate.otherGoal;
      for (const need of candidate.needGoals)
        goal = Math.max(goal, needs[need] ?? zero);
      scores[index] =
        candidate.base +
        (needs[candidate.need] ?? zero) * needWeight +
        goal * goalWeight +
        (candidate.tie ? tieOn(candidate, day, one, two) : zero) +
        (effortHours > zero
          ? (-candidate.effortHours / effortHours) * effortWeight
          : zero);
      if (
        scores[index]! > leisure(candidate) &&
        !used.has(candidate.need) &&
        (candidate.effortHours <= hours || fits(candidate)) &&
        better(index, winners.get(candidate.need) ?? -one)
      )
        winners.set(candidate.need, index);
    }
    for (;;) {
      // The best act overall is the best of the needs' best acts.
      let best = -one;
      for (const [need, index] of winners)
        if (!used.has(need) && index >= zero && better(index, best))
          best = index;
      if (best < zero) break;
      if (pool[best]!.effortHours > hours && !fits(pool[best]!)) {
        // Earlier acts took the hours it needed; take that need's next best.
        const need = pool[best]!.need;
        let next = -one;
        for (const index of byNeed.get(need)!)
          if (
            scores[index]! > leisure(pool[index]!) &&
            (pool[index]!.effortHours <= hours || fits(pool[index]!)) &&
            better(index, next)
          )
            next = index;
        winners.set(need, next);
        continue;
      }
      const candidate = pool[best]!;
      if (once.has(candidate.row.offer.definition.effect)) spent.add(best);
      used.add(candidate.need);
      // A flexible act (leisure) takes what is left of the day up to its length.
      const taken = Math.min(candidate.effortHours, hours);
      const offer =
        taken < candidate.effortHours
          ? { ...candidate.row.offer, effortHours: taken }
          : candidate.row.offer;
      hours -= taken;
      let goal = candidate.otherGoal;
      for (const need of candidate.needGoals)
        goal = Math.max(goal, needs[need] ?? zero);
      const reasons: DecisionReason = {
        ...candidate.row.reasons,
        need: (needs[candidate.need] ?? zero) * needWeight,
        goal: goal * goalWeight,
        effort:
          effortHours > zero
            ? (-candidate.effortHours / effortHours) * effortWeight
            : zero,
        ...(candidate.tie
          ? {
              module:
                (candidate.row.reasons.module ?? zero) -
                candidate.tie.pull +
                tieOn(candidate, day, one, two),
            }
          : {}),
      };
      const act: PlannedAct = {
        date,
        personId: actor.id,
        offer,
        score: scores[best]!,
        reasons,
        ...(candidate.row.reasonTerms?.length
          ? { reasonTerms: candidate.row.reasonTerms }
          : {}),
      };
      visit(candidate, day, date);
      if (day === zero) today.push(act);
      else keep(core, act);
    }
  }
  return today;
}
