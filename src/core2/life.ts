import { runModuleCalendar } from "./module-calendar";
import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import {
  advanceDate,
  duePeople,
  catchUpPerson,
  planningDays,
} from "./calendar";
import { affectAt } from "./emotion";
import { compactQuietWorkResults } from "./work-state";
import { chooseAct, decisionFromScores, scoreOffers } from "./choice";
import { planFreeTime, takePlannedActs, type PlannedAct } from "./free-block";
import {
  isExplicitlyControlledPersonV1,
  snapshotExplicitControlV1,
} from "./player-control-state-v1";
export { chooseAct } from "./choice";
import {
  WORK_MODULE,
  discretionaryHours,
  recordDiscretionaryActivity,
  catchUpScheduledWork,
  openingWorkCommitments,
} from "./modules/work";
import {
  openingWorkPayrollCalendars,
  OPENING_PAYROLL_CALENDAR_STOPGAP,
} from "./opening-payroll-calendar";
import { LIFE_MODULE } from "./modules/life";
import { PEOPLE_MODULE } from "./modules/people";
import { FINANCE_MODULE } from "./modules/finance";
import { parameter, parameterValues } from "./parameters";
import { DEFAULT_DATA } from "./data";
import { coreAPI, createCore, resolveOperation } from "./state";
import type {
  ActOffer,
  CoreAPI,
  CoreData,
  CoreInput,
  CoreModule,
  CoreState,
  DecisionContext,
  DecisionResult,
  PersonState,
} from "./types";

export type Controller = (
  decision: DecisionResult,
  offers: readonly ActOffer[],
) => string | undefined;

export function createLifeCore(
  input: CoreInput,
  options: {
    observer?: boolean;
    scheduledWork?: boolean;
    data?: CoreData;
    modules?: readonly CoreModule[];
  } = {},
): CoreState {
  const { scheduledWork = true, ...coreOptions } = options;
  const data = options.data ?? DEFAULT_DATA;
  const primaryJobByPerson = new Map(
    input.people.map((person) => [person.id, person.jobId]),
  );
  const payroll =
    scheduledWork && data.work
      ? openingWorkPayrollCalendars(
          {
            ...input,
            workCommitments:
              input.workCommitments ??
              openingWorkCommitments(
                input.jobs.filter(
                  (job) =>
                    primaryJobByPerson.get(job.personId) === job.id &&
                    (job.endsAt === undefined || job.endsAt > input.startedAt),
                ),
                input.organizations,
                input.startedAt,
                data.work,
                data.parameters,
              ),
          },
          { parameters: data.parameters },
        )
      : undefined;
  const preparedInput = scheduledWork
    ? payroll
      ? {
          ...input,
          workCommitments: payroll.workCommitments,
          workPayrollCalendars: payroll.calendars,
          gaps: [...input.gaps, ...payroll.gaps],
        }
      : input
    : { ...input, workCommitments: [], workPayrollCalendars: [] };
  const core = createCore(preparedInput, {
    ...coreOptions,
    data: scheduledWork
      ? options.data
      : { ...(options.data ?? DEFAULT_DATA), work: undefined },
    modules: [
      LIFE_MODULE,
      PEOPLE_MODULE,
      // Attendance accrues wages; recorded payday cash precedes purchase budgets.
      // Firms use their recorded working capital, not future customer receipts.
      ...(scheduledWork ? [WORK_MODULE] : []),
      ...(input.finance ? [FINANCE_MODULE] : []),
      ...(options.modules ?? []),
    ],
  });
  if (payroll?.estimates.length)
    coreAPI(core).stopgap(OPENING_PAYROLL_CALENDAR_STOPGAP);
  core.gaps.add(
    "Recorded work is scored and earned on its scheduled dates; cash settles on separately recorded employer paydays. Remaining time admits one discretionary scored act per tier activation. Sleep reserve, shift placement and opening pay-calendar conventions remain tunable; education, care, consumption and a complete diary are not modeled.",
  );
  core.gaps.add(
    "Business receipts and standing purchases cover recorded counterparties only; missing suppliers, public budgets, hiring, nonwage income, demography, elections and law effects prevent realism claims.",
  );
  return core;
}

export function refreshNeeds(
  core: CoreState,
  api: CoreAPI,
  actor: PersonState,
): void {
  api.stopgap("SG-P8-life-utility");
  api.stopgap("SG-P8-emotion-model");
  api.updatePerson(actor.id, {
    affect: affectAt(
      actor.affect,
      core.date,
      parameterValues(core.data.parameters),
    ),
  });
  const values: Record<string, number> = {};
  for (const definition of core.data.needs) {
    const evaluate = resolveOperation(
      core,
      "needEvaluators",
      definition.evaluator,
    );
    if (!evaluate)
      throw new Error(`Unregistered need evaluator: ${definition.evaluator}`);
    const value = evaluate(api, actor, definition);
    if (!Number.isFinite(value) || value < api.parameter("zero"))
      throw new Error(`Invalid evaluated need: ${definition.id}`);
    values[definition.id] = value;
    api.updateGoal(actor.id, {
      id: `need:${definition.id}`,
      kind: definition.goalKind,
      urgency: value,
    });
  }
  api.updateNeeds(actor.id, values);
}

/** Routine attendance projects only its two current needs; it does not rewrite weekly actor state. */
export function projectWorkNeeds(
  core: CoreState,
  api: CoreAPI,
  actor: PersonState,
  ids: readonly string[],
): DecisionContext {
  const affect = affectAt(
    actor.affect,
    core.date,
    parameterValues(core.data.parameters),
  );
  const view = { ...actor, affect };
  const needValues: Record<string, number> = {},
    goalUrgencies: Record<string, number> = {};
  const goalRows: NonNullable<DecisionContext["goalRows"]>[number][] = [];
  for (const id of new Set(ids)) {
    const definition = core.data.needs.find((row) => row.id === id);
    if (!definition)
      throw new Error(`Work action references absent need: ${id}`);
    const evaluate = resolveOperation(
      core,
      "needEvaluators",
      definition.evaluator,
    );
    if (!evaluate)
      throw new Error(
        `Unregistered work need evaluator: ${definition.evaluator}`,
      );
    const value = evaluate(api, view, definition);
    if (!Number.isFinite(value) || value < api.parameter("zero"))
      throw new Error("Invalid projected work need.");
    needValues[id] = value;
    goalUrgencies[`need:${id}`] = value;
    goalRows.push({
      id: `need:${id}`,
      kind: definition.goalKind,
      urgency: value,
    });
  }
  return { affect, needValues, goalUrgencies, goalRows };
}

function admits(
  core: CoreState,
  api: CoreAPI,
  actor: PersonState,
  offer: ActOffer,
): boolean {
  return (offer.definition.prerequisites ?? []).every((rule) => {
    const accepts = resolveOperation(core, "eligibilityRules", rule.operation);
    if (!accepts)
      throw new Error(`Unregistered eligibility rule: ${rule.operation}`);
    return accepts(api, actor, offer, rule.argument);
  });
}

export function availableActs(
  core: CoreState,
  personId: string,
): readonly ActOffer[] {
  const actor = core.people.get(personId);
  if (!actor?.alive) return [];
  if (core.data.discretionaryIneligibleTiersV1?.includes(actor.tier)) return [];
  const api = coreAPI(core);
  const offers: ActOffer[] = [];
  for (const definition of core.data.actions) {
    const provide = resolveOperation(
      core,
      "offerProviders",
      definition.targetKind,
    );
    if (!provide)
      throw new Error(
        `Unregistered available-act provider: ${definition.targetKind}`,
      );
    for (const offer of provide(api, actor, definition)) {
      if (
        core.data.work?.discretionaryExclusions.includes(definition.effect) &&
        [...(core.work.commitmentsByPerson.get(actor.id) ?? [])].some((id) => {
          const row = core.work.commitments.get(id)!;
          return (
            row.jobId === actor.jobId &&
            (row.endsAt === undefined || row.endsAt >= core.date)
          );
        })
      )
        continue;
      const override =
        core.data.work?.discretionaryDurationParameters?.[definition.effect];
      offer.effortHours = override
        ? api.parameter(override)
        : api.parameter(definition.effortParameter);
      offer.availableHours = Math.min(
        offer.availableHours,
        discretionaryHours(api, actor.id),
      );
      if (
        !Number.isFinite(offer.effortHours) ||
        offer.effortHours < api.parameter("zero")
      )
        throw new Error("Invalid activity duration.");
      if (
        offer.effortHours > offer.availableHours ||
        offer.availableHours <= api.parameter("zero")
      )
        continue;
      if (admits(core, api, actor, offer)) offers.push(offer);
    }
  }
  return offers;
}

function perform(
  core: CoreState,
  api: CoreAPI,
  personId: string,
  chosen: ActOffer,
  decision: DecisionResult,
  days: number,
): boolean {
  const effect = resolveOperation(
    core,
    "effectHandlers",
    chosen.definition.effect,
  );
  if (!effect)
    throw new Error(
      `Unregistered effect operation: ${chosen.definition.effect}`,
    );
  if (chosen.definition.stopgapId) api.stopgap(chosen.definition.stopgapId);
  const result = effect(api, personId, chosen, core.date, days, decision);
  if (!result?.recordedActId)
    api.recordAct(personId, chosen, core.date, decision);
  if (!result?.recordedActivity)
    recordDiscretionaryActivity(api, personId, chosen);
  return result?.recordedLastActDate === true;
}

function plannedDecision(core: CoreState, act: PlannedAct): DecisionResult {
  return {
    actorId: act.personId,
    date: core.date,
    selected: act.offer,
    selectedReasons: act.reasons,
    selectedReasonTerms: act.reasonTerms,
    reasonKey: `planned:utility:${act.offer.definition.need}:${act.offer.driveId ?? act.offer.definition.effect}`,
  };
}

/**
 * P15 part 2b: one scoring pass per activation. The chooser's pick happens
 * now; the rest of today's free hours and each later day up to the next
 * activation are filled from the same scores (free-block.ts).
 */
export function activate(
  core: CoreState,
  personId: string,
  days: number,
  controller?: Controller,
): number {
  const actor = core.people.get(personId)!;
  const api = coreAPI(core);
  refreshNeeds(core, api, actor);
  const offers = availableActs(core, personId);
  const scored = scoreOffers(core, personId, offers);
  const decision = decisionFromScores(core, personId, scored);
  if (controller) {
    const requested = controller(decision, offers);
    if (requested !== undefined) {
      const chosen = offers.find(
        (offer) => `${offer.definition.id}:${offer.targetId}` === requested,
      );
      if (!chosen) throw new Error("Controller requested an unavailable act.");
      const forced = chooseAct(core, personId, [chosen]);
      decision.selected = chosen;
      decision.selectedReasons = forced.selectedReasons;
      decision.reasonKey = `controller:${forced.reasonKey}`;
    }
  }
  const chosen = decision.selected;
  const later = planFreeTime(
    api,
    actor,
    scored,
    chosen,
    planningDays(core, actor),
  );
  let recordedLastActDate = false;
  let acts = api.parameter("zero");
  // The rest of the block first, so the person's last choice and reason stay
  // the activation's own pick; the day's order of acts is not modeled.
  for (const act of later) {
    if (
      perform(core, api, personId, act.offer, plannedDecision(core, act), days)
    )
      recordedLastActDate = true;
    acts += api.parameter("one");
  }
  if (chosen) {
    if (perform(core, api, personId, chosen, decision, days))
      recordedLastActDate = true;
    acts += api.parameter("one");
  }
  if (!recordedLastActDate)
    api.updatePerson(personId, { lastActDate: core.date });
  return acts;
}

/**
 * A planned act happens on its date if the person and the act are still
 * possible: both people alive, the act still admitted and its hours free.
 */
function performPlanned(core: CoreState, act: PlannedAct): boolean {
  const api = coreAPI(core);
  const actor = core.people.get(act.personId);
  if (!actor?.alive) return false;
  const target = core.people.get(act.offer.targetId);
  if (target && !target.alive) return false;
  if (act.offer.driveId && !actor.drives.has(act.offer.driveId)) return false;
  const hours = act.offer.effortHours ?? api.parameter("zero");
  if (hours > discretionaryHours(api, actor.id)) return false;
  if (!admits(core, api, actor, act.offer)) return false;
  perform(
    core,
    api,
    act.personId,
    act.offer,
    plannedDecision(core, act),
    api.parameter("one"),
  );
  return true;
}

/** Routine statistics compact by indexed month; visible history and open callbacks are exempt. */
export function compactRoutineMetrics(core: CoreState): void {
  const p = (key: string) => parameter(key, core.data.parameters);
  const cutoff = new Date(core.date);
  cutoff.setUTCDate(p("one"));
  cutoff.setUTCMonth(
    cutoff.getUTCMonth() - p("metricRetentionMonths") + p("one"),
  );
  const month = cutoff.toISOString().slice(p("zero"), p("isoMonthCharacters"));
  for (const [key, ids] of core.actCountersByMonth)
    if (key < month) {
      for (const id of ids) core.actCounters.delete(id);
      core.actCountersByMonth.delete(key);
    }
}

export function advanceCore(
  core: CoreState,
  throughDate: string,
  options: { controller?: Controller } = {},
): { simulatedDays: number; decisions: number; acts: number } {
  if (snapshotExplicitControlV1(core).personId !== undefined)
    throw new Error(
      "Use the resumable player clock while a person is controlled.",
    );
  const target = makeIsoDate(throughDate);
  if (target < core.date) throw new Error("Core advance cannot move backward.");
  const p = (key: string) => parameter(key, core.data.parameters);
  const started = core.date;
  let decisions = p("zero"),
    acts = p("zero");
  while (core.date < target) {
    const date = addDays(makeIsoDate(core.date), p("one"));
    const due = duePeople(core, date);
    advanceDate(core, date);
    const api = coreAPI(core);
    runModuleCalendar(core, api);
    for (const module of core.modules.values()) {
      const committed = module.onDay?.(
        api,
        (actorId, offers, context) => chooseAct(core, actorId, offers, context),
        (actor, needIds) => {
          if (needIds) return projectWorkNeeds(core, api, actor, needIds);
          refreshNeeds(core, api, actor);
          return undefined;
        },
      );
      if (committed) {
        decisions += committed.decisions;
        acts += committed.acts;
      }
    }
    for (const act of takePlannedActs(core, date))
      if (performPlanned(core, act)) acts += p("one");
    for (const row of due) {
      decisions += p("one");
      acts += activate(core, row.personId, row.days, options.controller);
    }
    for (const module of core.modules.values()) module.onAfterDay?.(api);
    compactRoutineMetrics(core);
    compactQuietWorkResults(core, coreAPI(core));
  }
  return {
    simulatedDays: daysBetween(makeIsoDate(started), target),
    decisions,
    acts,
  };
}

export function catchUpLife(core: CoreState, personId: string): void {
  if (isExplicitlyControlledPersonV1(core, personId))
    throw new Error("Controlled choices require the resumable player clock.");
  // Chronological work was already settled at each indexed scheduled date.
  // This returns arithmetic/current records and never makes an endpoint choice for elapsed days.
  catchUpScheduledWork(coreAPI(core), personId);
  const due = catchUpPerson(core, personId, core.date);
  if (due.days > parameter("zero", core.data.parameters))
    activate(core, personId, due.days);
}
