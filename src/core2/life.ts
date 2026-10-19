import { runModuleCalendar } from "./module-calendar";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import {
  advanceDate,
  duePeople,
  catchUpPerson,
  planningDays,
} from "./calendar";
import { affectAt } from "./emotion";
import { compactQuietWorkResults } from "./work-state";
import { chooseAct, decisionFromScores, scoreOffers } from "./choice";
import { compactOriginalAnswer } from "./compact-choice";
import { FinanceReadGuard } from "./finance-plan";
import {
  planFreeTime,
  registerPlannedActRunner,
  takePlannedActs,
  type PlannedAct,
} from "./free-block";
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
import { withGrief } from "./grief";
import { FINANCE_MODULE } from "./modules/finance";
import { RESIDENTS_MODULE, admitResidents } from "./modules/residents";
import { ACCOUNTS_MODULE } from "./accounts";
import { COUNTED_MOVES_MODULE } from "./modules/counted-moves";
import { COUNTED_DEMOTION_MODULE } from "./modules/counted-demotion";
import { PURCHASE_TAX_MODULE } from "./modules/purchase-tax";
import { RETIREMENT_CLAIMS_MODULE } from "./modules/retirement-claims";
import { SCHOOL_MODULE } from "./modules/school";
import { DISASTERS_MODULE } from "./modules/disasters";
import { declareSnapshotCovered } from "./snapshot";
import { parameter, parameterValues } from "./parameters";
import { DEFAULT_DATA } from "./data";
import {
  condenseCircleDecisions,
  coreAPI,
  createCore,
  resolveOperation,
} from "./state";
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

// The base world's engines keep all their state where a world snapshot
// reaches it (src/core2/snapshot.test.ts proves the round trip).
declareSnapshotCovered(
  LIFE_MODULE.id,
  PEOPLE_MODULE.id,
  SCHOOL_MODULE.id,
  DISASTERS_MODULE.id,
  WORK_MODULE.id,
  FINANCE_MODULE.id,
  ACCOUNTS_MODULE.id,
  PURCHASE_TAX_MODULE.id,
  RESIDENTS_MODULE.id,
  RETIREMENT_CLAIMS_MODULE.id,
  COUNTED_MOVES_MODULE.id,
  COUNTED_DEMOTION_MODULE.id,
  // Installed on first use: the journal's cash writers.
  ...[
    DEFAULT_DATA.finance?.cashJournal?.moduleId,
    DEFAULT_DATA.work?.payrollCashModuleId,
  ].filter((id): id is string => !!id),
);

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
    // P15 part 4: the people module is always loaded here, so the acts grief
    // bears on carry its reason (withGrief), as drives add their own acts.
    data: withGrief(
      scheduledWork
        ? (options.data ?? DEFAULT_DATA)
        : { ...(options.data ?? DEFAULT_DATA), work: undefined },
    ),
    modules: [
      LIFE_MODULE,
      PEOPLE_MODULE,
      SCHOOL_MODULE,
      DISASTERS_MODULE,
      // Attendance accrues wages; recorded payday cash precedes purchase budgets.
      // Firms use their recorded working capital, not future customer receipts.
      ...(scheduledWork ? [WORK_MODULE] : []),
      ...(input.finance ? [FINANCE_MODULE] : []),
      ACCOUNTS_MODULE,
      // Sales taxes in force collect on each paid sale (none until a law sets one).
      ...(input.finance || input.residents ? [PURCHASE_TAX_MODULE] : []),
      // The game's worlds (two levels) also claim retirement during play.
      ...(input.residents
        ? [
            RESIDENTS_MODULE,
            RETIREMENT_CLAIMS_MODULE,
            // Counted people move between places from causes (one model, two tiers).
            COUNTED_MOVES_MODULE,
            // Filled-in people long out of the player's life return to the counts.
            COUNTED_DEMOTION_MODULE,
          ]
        : []),
      ...(options.modules ?? []),
    ],
  });
  if (input.residents) admitResidents(core, input.residents);
  if (payroll?.estimates.length)
    coreAPI(core).stopgap(OPENING_PAYROLL_CALENDAR_STOPGAP);
  core.gaps.add(
    "Recorded work is scored and earned on its scheduled dates; cash settles on separately recorded employer paydays. Remaining free hours hold several scored acts from one scoring pass per activation, at most one per need a day. Sleep reserve, shift placement and opening pay-calendar conventions remain tunable; education, care, consumption and a complete diary are not modeled.",
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
  if (actor.discretionaryEligibleV1 === false) return [];
  if (core.data.discretionaryIneligibleTiersV1?.includes(actor.tier)) return [];
  const api = coreAPI(core);
  const offers: ActOffer[] = [];
  // The same for every offer: the person's free hours today, and whether
  // they hold a current commitment at their own job (computed once, not per
  // offer).
  const freeHours = discretionaryHours(api, actor.id);
  const zero = api.parameter("zero");
  let atOwnJob: boolean | undefined;
  const holdsOwnJob = () => {
    if (atOwnJob === undefined) {
      atOwnJob = false;
      for (const id of core.work.commitmentsByPerson.get(actor.id) ?? []) {
        const row = core.work.commitments.get(id)!;
        if (
          row.jobId === actor.jobId &&
          (row.endsAt === undefined || row.endsAt >= core.date)
        ) {
          atOwnJob = true;
          break;
        }
      }
    }
    return atOwnJob;
  };
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
    const excludedAtWork =
      core.data.work?.discretionaryExclusions.includes(definition.effect) ??
      false;
    const override =
      core.data.work?.discretionaryDurationParameters?.[definition.effect];
    for (const offer of provide(api, actor, definition)) {
      if (excludedAtWork && holdsOwnJob()) continue;
      offer.effortHours = override
        ? api.parameter(override)
        : api.parameter(definition.effortParameter);
      offer.availableHours = Math.min(offer.availableHours, freeHours);
      if (!Number.isFinite(offer.effortHours) || offer.effortHours < zero)
        throw new Error("Invalid activity duration.");
      if (
        offer.effortHours > offer.availableHours ||
        offer.availableHours <= zero
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
  // The chooser's retention contract: full reason terms only for traced people.
  const traced =
    core.observer ||
    act.personId === core.playerId ||
    core.focusPersonIds.has(act.personId) ||
    isExplicitlyControlledPersonV1(core, act.personId);
  return {
    actorId: act.personId,
    date: core.date,
    selected: act.offer,
    selectedReasons: act.reasons,
    ...(traced && act.reasonTerms?.length
      ? { selectedReasonTerms: act.reasonTerms }
      : {}),
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
  const offers = availableActs(core, personId).map((offer) =>
    controller
      ? {
          ...offer,
          effortHours:
            offer.effortHours ??
            api.parameter(offer.definition.effortParameter),
        }
      : offer,
  );
  const scored = scoreOffers(core, personId, offers);
  const decision = decisionFromScores(core, personId, scored, !!controller);
  const retainFullScores =
    core.observer ||
    actor.id === core.playerId ||
    core.focusPersonIds.has(actor.id) ||
    isExplicitlyControlledPersonV1(core, actor.id);
  if (controller) {
    const originalReads = new FinanceReadGuard();
    originalReads.payload(
      decision,
      api.parameter("zero"),
      api.parameter("one"),
    );
    originalReads.payload(offers, api.parameter("zero"), api.parameter("one"));
    const requested = controller(decision, offers);
    originalReads.verify();
    if (requested !== undefined) {
      const chosen = offers.find(
        (offer) => `${offer.definition.id}:${offer.targetId}` === requested,
      );
      if (!chosen) throw new Error("Controller requested an unavailable act.");
      const index = offers.indexOf(chosen);
      const scored = decision.scores![index]!;
      decision.selected = chosen;
      decision.selectedReasons = scored.reasons;
      decision.selectedReasonTerms = retainFullScores
        ? scored.reasonTerms
        : undefined;
      decision.compactChoice = compactOriginalAnswer(decision, offers, index);
      decision.reasonKey = `controller:utility:${chosen.definition.need}:${chosen.driveId ?? chosen.definition.effect}`;
    }
  }
  if (!retainFullScores) decision.scores = undefined;
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
  // A person under the player's control acts only on the player's answers.
  if (isExplicitlyControlledPersonV1(core, act.personId)) return false;
  const target = core.people.get(act.offer.targetId);
  if (target && !target.alive) return false;
  // A drive that faded since the plan is written once at zero and retired.
  if (
    act.offer.driveId &&
    !((actor.drives.get(act.offer.driveId)?.strength ?? 0) > 0)
  )
    return false;
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
registerPlannedActRunner(performPlanned);

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
    condenseCircleDecisions(core);
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
