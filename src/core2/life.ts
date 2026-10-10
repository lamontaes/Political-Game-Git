import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import { advanceDate, duePeople, catchUpPerson } from "./calendar";
import { affectAt } from "./emotion";
import { compactQuietWorkResults } from "./work-state";
import { chooseAct } from "./choice";
export { chooseAct } from "./choice";
import {
  WORK_MODULE,
  discretionaryHours,
  recordDiscretionaryActivity,
  catchUpScheduledWork,
} from "./modules/work";
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
  const core = createCore(
    scheduledWork ? input : { ...input, workCommitments: [] },
    {
      ...coreOptions,
      data: scheduledWork
        ? options.data
        : { ...(options.data ?? DEFAULT_DATA), work: undefined },
      modules: [
        LIFE_MODULE,
        PEOPLE_MODULE,
        // Modeled within-day order: actual work pay arrives before purchase budgets.
        // Firms use their recorded working capital, not future customer receipts.
        ...(scheduledWork ? [WORK_MODULE] : []),
        ...(input.finance ? [FINANCE_MODULE] : []),
        ...(options.modules ?? []),
      ],
    },
  );
  core.gaps.add(
    "Recorded work is scored and settled on its scheduled dates; remaining time admits one discretionary scored act per tier activation. Sleep reserve and shift placement remain tunable; education, care, consumption and a complete diary are not modeled.",
  );
  core.gaps.add(
    "Business receipts and standing purchases cover recorded counterparties only; missing suppliers, public budgets, hiring, nonwage income, demography, elections and law effects prevent realism claims.",
  );
  return core;
}

function refreshNeeds(core: CoreState, api: CoreAPI, actor: PersonState): void {
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
function projectWorkNeeds(
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

export function availableActs(
  core: CoreState,
  personId: string,
): readonly ActOffer[] {
  const actor = core.people.get(personId);
  if (!actor?.alive) return [];
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
      const eligible = (definition.prerequisites ?? []).every((rule) => {
        const accepts = resolveOperation(
          core,
          "eligibilityRules",
          rule.operation,
        );
        if (!accepts)
          throw new Error(`Unregistered eligibility rule: ${rule.operation}`);
        return accepts(api, actor, offer, rule.argument);
      });
      if (eligible) offers.push(offer);
    }
  }
  return offers;
}

function activate(
  core: CoreState,
  personId: string,
  days: number,
  controller?: Controller,
): boolean {
  const actor = core.people.get(personId)!;
  const api = coreAPI(core);
  refreshNeeds(core, api, actor);
  const offers = availableActs(core, personId);
  const decision = chooseAct(core, personId, offers);
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
  let recordedLastActDate = false;
  if (chosen) {
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
    recordedLastActDate = result?.recordedLastActDate === true;
  }
  if (!recordedLastActDate)
    api.updatePerson(personId, { lastActDate: core.date });
  return chosen !== undefined;
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
    for (const row of due) {
      decisions += p("one");
      if (activate(core, row.personId, row.days, options.controller))
        acts += p("one");
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
  // Chronological work was already settled at each indexed scheduled date.
  // This returns arithmetic/current records and never makes an endpoint choice for elapsed days.
  catchUpScheduledWork(coreAPI(core), personId);
  const due = catchUpPerson(core, personId, core.date);
  if (due.days > parameter("zero", core.data.parameters))
    activate(core, personId, due.days);
}
