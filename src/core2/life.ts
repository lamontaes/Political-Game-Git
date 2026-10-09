import { addDays, daysBetween, makeIsoDate } from "../simulation/dates";
import { advanceDate, duePeople, catchUpPerson } from "./calendar";
import { affectAt } from "./emotion";
import { LIFE_MODULE } from "./modules/life";
import { parameter, parameterValues } from "./parameters";
import { coreAPI, createCore, resolveOperation } from "./state";
import type {
  ActOffer,
  CoreAPI,
  CoreData,
  CoreInput,
  CoreModule,
  CoreState,
  DecisionReason,
  DecisionResult,
  PersonState,
} from "./types";

export type Controller = (
  decision: DecisionResult,
  offers: readonly ActOffer[],
) => string | undefined;
const traitScores = new WeakMap<PersonState, Map<string, number>>();

export function createLifeCore(
  input: CoreInput,
  options: {
    observer?: boolean;
    data?: CoreData;
    modules?: readonly CoreModule[];
  } = {},
): CoreState {
  const core = createCore(input, {
    ...options,
    modules: [LIFE_MODULE, ...(options.modules ?? [])],
  });
  core.gaps.add(
    "Prototype selects one discretionary scored act per tier activation; a complete daily activity plan is not yet modeled.",
  );
  core.gaps.add(
    "Household consumption contracts, hiring, employer revenue, demography, elections, and law effects are not implemented; their totals cannot establish realism.",
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
      if (api.parameter(definition.effortParameter) > offer.availableHours)
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

function traitScore(
  core: CoreState,
  actor: PersonState,
  offer: ActOffer,
): number {
  let scores = traitScores.get(actor);
  if (!scores) {
    scores = new Map();
    traitScores.set(actor, scores);
  }
  const previous = scores.get(offer.definition.id);
  if (previous !== undefined) return previous;
  const p = (key: string) => parameter(key, core.data.parameters);
  let sum = p("zero");
  let contributing = p("zero");
  for (const [id, raw] of Object.entries(actor.traits)) {
    const row = core.data.traitPulls[id];
    if (!row || raw === p("zero")) continue;
    const side = raw > p("zero") ? row.high : row.low;
    if (!side) continue;
    const weight = Math.min(p("one"), Math.abs(raw) / p("traitScale"));
    for (const kind of offer.definition.actKinds) {
      if (side.toward?.includes(kind)) {
        sum += weight;
        contributing += p("one");
      }
      if (side.away?.includes(kind)) {
        sum -= weight;
        contributing += p("one");
      }
    }
  }
  const result = contributing > p("zero") ? sum / contributing : p("zero");
  scores.set(offer.definition.id, result);
  return result;
}

export function chooseAct(
  core: CoreState,
  personId: string,
  offers: readonly ActOffer[],
): DecisionResult {
  const actor = core.people.get(personId);
  if (!actor) throw new Error("Decision actor is absent.");
  const p = (key: string) => parameter(key, core.data.parameters);
  let best:
    { offer: ActOffer; score: number; reasons: DecisionReason } | undefined;
  const traced =
    core.observer ||
    actor.id === core.playerId ||
    core.focusPersonIds.has(actor.id);
  const scores: NonNullable<DecisionResult["scores"]>[number][] | undefined =
    traced ? [] : undefined;
  for (const offer of offers) {
    const action = offer.definition;
    const drive = offer.driveId ? actor.drives.get(offer.driveId) : undefined;
    const goal = [...actor.goals.values()].reduce(
      (strength, row) =>
        action.goalKinds.includes(row.kind)
          ? Math.max(strength, row.urgency)
          : strength,
      p("zero"),
    );
    const reasons: DecisionReason = {
      need: (actor.needs[action.need] ?? p("zero")) * p("needWeight"),
      goal: goal * p("goalWeight"),
      drive: (drive?.strength ?? p("zero")) * p("driveWeight"),
      trait: traitScore(core, actor, offer) * p("traitWeight"),
      emotion:
        p("emotionWeight") *
        (actor.affect.mood *
          p(action.emotion?.moodMultiplierParameter ?? "zero") +
          actor.affect.stress *
            p(action.emotion?.stressMultiplierParameter ?? "zero")),
      effort:
        (-p(action.effortParameter) / offer.availableHours) * p("effortWeight"),
    };
    const score = Object.values(reasons).reduce(
      (sum, value) => sum + value,
      p("zero"),
    );
    if (!Number.isFinite(score)) throw new Error("Non-finite choice utility.");
    scores?.push({
      actionId: action.id,
      targetId: offer.targetId,
      score,
      reasons,
    });
    const key = `${action.id}:${offer.targetId}`;
    const bestKey = best
      ? `${best.offer.definition.id}:${best.offer.targetId}`
      : undefined;
    if (!best || score > best.score || (score === best.score && key < bestKey!))
      best = { offer, score, reasons };
  }
  return {
    actorId: personId,
    date: core.date,
    selected: best?.offer,
    selectedReasons: best?.reasons,
    reasonKey: best
      ? `utility:${best.offer.definition.need}:${best.offer.driveId ?? best.offer.definition.effect}`
      : "no-available-act",
    scores,
  };
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
    effect(api, personId, chosen, core.date, days);
    api.recordAct(personId, chosen, core.date, decision);
  }
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
    for (const row of due) {
      decisions += p("one");
      if (activate(core, row.personId, row.days, options.controller))
        acts += p("one");
    }
    compactRoutineMetrics(core);
  }
  return {
    simulatedDays: daysBetween(makeIsoDate(started), target),
    decisions,
    acts,
  };
}

export function catchUpLife(core: CoreState, personId: string): void {
  const due = catchUpPerson(core, personId, core.date);
  if (due.days > parameter("zero", core.data.parameters))
    activate(core, personId, due.days);
}
