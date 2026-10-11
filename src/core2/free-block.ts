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
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import type { ScoredOffer } from "./choice";
import {
  closenessAfter,
  halfLifeDays,
  hoursFromLevel,
  hoursLost,
} from "./closeness";
import { parameter } from "./parameters";
import { plannedWorkMinutesOnDate } from "./modules/work";
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
  let available = p("hoursPerDay");
  for (const row of scored)
    available = Math.min(available, row.offer.availableHours);
  for (let day = zero; day < days; day += one) {
    const date = dateAt(core, day);
    let hours = day === zero ? available : freeHours(api, actor, date);
    const needs = needsOn(api, actor, projection, day);
    const used = new Set<string>();
    if (day === zero && first) {
      used.add(first.definition.need);
      hours -= first.effortHours ?? zero;
      const picked = pool.find((row) => row.row.offer === first);
      if (picked) visit(picked, day, date);
    }
    const effortHours = hours;
    // Each need's best act that fits the hours, from one pass.
    const winners = new Map<string, number>();
    for (let index = zero; index < pool.length; index += one) {
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
        scores[index]! > zero &&
        !used.has(candidate.need) &&
        candidate.effortHours <= hours &&
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
      if (pool[best]!.effortHours > hours) {
        // Earlier acts took the hours it needed; take that need's next best.
        const need = pool[best]!.need;
        let next = -one;
        for (const index of byNeed.get(need)!)
          if (
            scores[index]! > zero &&
            pool[index]!.effortHours <= hours &&
            better(index, next)
          )
            next = index;
        winners.set(need, next);
        continue;
      }
      const candidate = pool[best]!;
      used.add(candidate.need);
      hours -= candidate.effortHours;
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
        offer: candidate.row.offer,
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
