import { runModuleCalendar } from "./module-calendar";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { advanceDate, duePeople, planningDays } from "./calendar";
import type { DuePerson } from "./calendar";
import { affectAt } from "./emotion";
import { compactQuietWorkResults } from "./work-state";
import { chooseAct, decisionFromScores, scoreOffers } from "./choice";
import { compactOriginalAnswer } from "./compact-choice";
import { FinanceReadGuard } from "./finance-plan";
import { ACCOUNTS_MODULE } from "./accounts";
import { PURCHASE_TAX_MODULE } from "./modules/purchase-tax";
import { planFreeTime, takePlannedActs, type PlannedAct } from "./free-block";
import {
  isExplicitlyControlledPersonV1,
  snapshotExplicitControlV1,
} from "./player-control-state-v1";
export { chooseAct } from "./choice";
// The player's control and clock, read by the director through this entry
// (the families guard: one family reaches another through its entry files).
export { isExplicitlyControlledPersonV1 } from "./player-control-state-v1";
export { passPlayerStopsV1, playerClockFrontierV1 } from "./player-stops-v1";
export { dailyFocusReason, knowsThePlayer } from "./calendar";

import {
  WORK_MODULE,
  discretionaryHours,
  recordDiscretionaryActivity,
} from "./modules/work";
import { LIFE_MODULE } from "./modules/life";
import { PEOPLE_MODULE } from "./modules/people";
import { FINANCE_MODULE } from "./modules/finance";
import { RESIDENTS_MODULE } from "./modules/residents";
import { COUNTED_MOVES_MODULE } from "./modules/counted-moves";
import { COUNTED_DEMOTION_MODULE } from "./modules/counted-demotion";
import { RETIREMENT_CLAIMS_MODULE } from "./modules/retirement-claims";
import { SCHOOL_MODULE } from "./modules/school";
import { DISASTERS_MODULE } from "./modules/disasters";
import { declareSnapshotCovered } from "./snapshot";
import { stopgap } from "./stopgaps";
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
  OfferRound,
  PersonState,
} from "./types";
import { OFFER_ROUND_PREDICTION } from "./types";

export type Controller = (
  decision: DecisionResult,
  offers: readonly ActOffer[],
) => string | undefined;

/**
 * The base world's engines, in install order, and when each is installed: the
 * one list `createLifeCore` installs and `coverBaseWorld` declares saveable.
 * A mod adds an engine through `options.modules` (the plug, `registerModule`,
 * is the registry); an engine's own part of opening the world is its module's
 * `dataFor`, `prepareOpening` and `onOpen`, not a call in this file.
 */
interface BaseEngine {
  readonly module: CoreModule;
  readonly when?: (world: {
    readonly input: CoreInput;
    readonly scheduledWork: boolean;
  }) => boolean;
}
const hasResidents = ({ input }: { input: CoreInput }) => !!input.residents;
function baseEngines(): readonly BaseEngine[] {
  // Built when a world is made, not as this file loads: an engine that reads
  // this file can load before the engines listed here have.
  return [
    { module: LIFE_MODULE },
    { module: PEOPLE_MODULE },
    { module: SCHOOL_MODULE },
    { module: DISASTERS_MODULE },
    // Attendance accrues wages; recorded payday cash precedes purchase budgets.
    // Firms use their recorded working capital, not future customer receipts.
    { module: WORK_MODULE, when: ({ scheduledWork }) => scheduledWork },
    { module: FINANCE_MODULE, when: ({ input }) => !!input.finance },
    { module: ACCOUNTS_MODULE },
    // Sales taxes in force collect on each paid sale (none until a law sets one).
    {
      module: PURCHASE_TAX_MODULE,
      when: ({ input }) => !!(input.finance || input.residents),
    },
    // The game's worlds (two levels) also claim retirement during play.
    { module: RESIDENTS_MODULE, when: hasResidents },
    { module: RETIREMENT_CLAIMS_MODULE, when: hasResidents },
    // Counted people move between places from causes (one model, two tiers).
    { module: COUNTED_MOVES_MODULE, when: hasResidents },
    // Filled-in people long out of the player's life return to the counts.
    { module: COUNTED_DEMOTION_MODULE, when: hasResidents },
  ];
}

// The base world's engines keep all their state where a world snapshot
// reaches it (src/core2/snapshot.test.ts proves the round trip). Declared
// when the first base world is made, not as this file loads: an engine that
// reads this file can load before the engines listed here have.
let baseCovered = false;
function coverBaseWorld(): void {
  if (baseCovered) return;
  baseCovered = true;
  declareSnapshotCovered(
    ...baseEngines().map((engine) => engine.module.id),
    // Installed on first use: the journal's cash writers.
    ...[
      DEFAULT_DATA.finance?.cashJournal?.moduleId,
      DEFAULT_DATA.work?.payrollCashModuleId,
    ].filter((id): id is string => !!id),
  );
}

export function createLifeCore(
  input: CoreInput,
  options: {
    observer?: boolean;
    scheduledWork?: boolean;
    data?: CoreData;
    modules?: readonly CoreModule[];
  } = {},
): CoreState {
  coverBaseWorld();
  const { scheduledWork = true, ...coreOptions } = options;
  const world = { input, scheduledWork };
  const modules = [
    ...baseEngines()
      .filter((engine) => !engine.when || engine.when(world))
      .map((engine) => engine.module),
    ...(options.modules ?? []),
  ];
  const data = options.data ?? DEFAULT_DATA;
  // Each engine's part of the opening input, in install order; with no work
  // engine, no recorded commitments or pay calendars.
  let preparedInput = scheduledWork
    ? input
    : { ...input, workCommitments: [], workPayrollCalendars: [] };
  const afterOpen: ((core: CoreState) => void)[] = [];
  if (scheduledWork)
    for (const module of modules) {
      const prepared = module.prepareOpening?.(preparedInput, { data });
      if (!prepared) continue;
      preparedInput = prepared.input;
      if (prepared.afterOpen) afterOpen.push(prepared.afterOpen);
    }
  // Each engine's part of the world's data, in install order.
  let worldData = scheduledWork ? data : { ...data, work: undefined };
  for (const module of modules)
    if (module.dataFor) worldData = module.dataFor(worldData);
  const core = createCore(preparedInput, {
    ...coreOptions,
    data: worldData,
    modules,
  });
  for (const module of modules) module.onOpen?.(core, input);
  for (const after of afterOpen) after(core);
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
  prediction = false,
): readonly ActOffer[] {
  const actor = core.people.get(personId);
  if (!actor?.alive) return [];
  if (actor.discretionaryEligibleV1 === false) return [];
  if (core.data.discretionaryIneligibleTiersV1?.includes(actor.tier)) return [];
  const api = coreAPI(core);
  const offers: ActOffer[] = [];
  // The same for every offer: the person's free hours today (computed once,
  // not per offer).
  const freeHours = discretionaryHours(api, actor.id);
  const zero = api.parameter("zero");
  // One round of offers: the providers share what they work out for
  // this person today (nothing they read changes while the offers are made).
  const round: OfferRound = new Map();
  if (prediction) round.set(OFFER_ROUND_PREDICTION, true);
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
    const override =
      core.data.work?.discretionaryDurationParameters?.[definition.effect];
    for (const offer of provide(api, actor, definition, round)) {
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
  // The act's own record keeps these reasons (recordAct).
  const decision = decisionFromScores(
    core,
    personId,
    scored,
    !!controller,
    false,
  );
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

type DayDecide = Parameters<NonNullable<CoreModule["onDay"]>>[1];
type DayRefresh = Parameters<NonNullable<CoreModule["onDay"]>>[2];
type DayCount = { decisions: number; acts: number };

/**
 * The one day loop (engine map E9), run once the date has moved: the module
 * calendar, every module's day, the acts planned for the day, the people due
 * to act, the end-of-day hooks and the day's compaction. advanceCore and the
 * player's clock (closeDay, player-v1.ts) both run it; the clock supplies its
 * own decide, refresh, activation and work day, so the person it controls acts
 * only on the player's answers.
 */
export function runDay(
  core: CoreState,
  api: CoreAPI,
  due: readonly DuePerson[],
  hooks: {
    decide: DayDecide;
    refresh: DayRefresh;
    activate: (row: DuePerson) => number;
    /** A module whose day the caller runs in its place, by module id. */
    ownDay?: ReadonlyMap<string, () => DayCount | void>;
  },
): DayCount {
  const one = parameter("one", core.data.parameters);
  let decisions = parameter("zero", core.data.parameters),
    acts = decisions;
  runModuleCalendar(core, api);
  for (const module of core.modules.values()) {
    const own = hooks.ownDay?.get(module.id);
    const committed = own
      ? own()
      : module.onDay?.(api, hooks.decide, hooks.refresh);
    if (committed) {
      decisions += committed.decisions;
      acts += committed.acts;
    }
  }
  // Acts people planned for today happen in every day, the player's too.
  for (const act of takePlannedActs(core, makeIsoDate(core.date)))
    if (performPlanned(core, act)) acts += one;
  for (const row of due) {
    decisions += one;
    acts += hooks.activate(row);
  }
  for (const module of core.modules.values()) module.onAfterDay?.(api);
  compactDay(core);
  return { decisions, acts };
}

/** End-of-day compaction, run by both the day loop and results mode. */
function compactDay(core: CoreState): void {
  compactRoutineMetrics(core);
  compactQuietWorkResults(core, coreAPI(core));
  condenseCircleDecisions(core);
}

/**
 * One day nobody watches (results mode): the module calendar's dated work and
 * the day's compaction, with no module's day and no person due to act. On the
 * first of each month every module's onResultsMonth brings its own daily work
 * up to date, so day-by-day play resumes after the skip.
 */
function runResultsDay(core: CoreState, api: CoreAPI): void {
  // stopgapId: SG-SPEED-results-mode-daily-work (a skipped day runs no module's day and no person; each engine with an onResultsMonth step catches up on the first of the month)
  stopgap("SG-SPEED-results-mode-daily-work", core);
  runModuleCalendar(core, api);
  for (const module of core.modules.values()) module.onResultsDay?.(api);
  const day = new Date(`${makeIsoDate(core.date)}T00:00:00.000Z`).getUTCDate();
  if (day === parameter("one", core.data.parameters))
    for (const module of core.modules.values()) module.onResultsMonth?.(api);
  compactDay(core);
}

export function advanceCore(
  core: CoreState,
  throughDate: string,
  options: { controller?: Controller; results?: boolean } = {},
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
    if (options.results) {
      advanceDate(core, date);
      runResultsDay(core, coreAPI(core));
      continue;
    }
    const due = duePeople(core, date);
    advanceDate(core, date);
    const api = coreAPI(core);
    const day = runDay(core, api, due, {
      // A module commits what this picks as an act, whose record keeps the reasons.
      decide: (actorId, offers, context) =>
        chooseAct(core, actorId, offers, context, false, false),
      refresh: (actor, needIds) => {
        if (needIds) return projectWorkNeeds(core, api, actor, needIds);
        refreshNeeds(core, api, actor);
        return undefined;
      },
      activate: (row) =>
        activate(core, row.personId, row.days, options.controller),
    });
    decisions += day.decisions;
    acts += day.acts;
  }
  return {
    simulatedDays: daysBetween(makeIsoDate(started), target),
    decisions,
    acts,
  };
}

// Re-exported so other engine families import through this entry, not the file (families guard).
export { snapshotExplicitControlV1 } from "./player-control-state-v1";
export {
  applyOpeningSettings,
  checkSettings,
  scaleOutsideSales,
  type WorldSettings,
} from "./world-settings";
