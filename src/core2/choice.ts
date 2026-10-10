import { parameter } from "./parameters";
import { coreAPI } from "./state";
import type {
  ActOffer,
  CoreState,
  DecisionContext,
  DecisionReason,
  DecisionResult,
  PersonState,
  WeightedReason,
} from "./types";
const traitScores = new WeakMap<PersonState, Map<string, number>>();

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
  context?: DecisionContext,
): DecisionResult {
  const actor = core.people.get(personId);
  if (!actor) throw new Error("Decision actor is absent.");
  const p = (key: string) => parameter(key, core.data.parameters);
  let best:
    | {
        offer: ActOffer;
        score: number;
        reasons: DecisionReason;
        reasonTerms?: readonly WeightedReason[];
      }
    | undefined;
  const traced =
    core.observer ||
    actor.id === core.playerId ||
    core.focusPersonIds.has(actor.id);
  const scores: NonNullable<DecisionResult["scores"]>[number][] | undefined =
    traced ? [] : undefined;
  for (const offer of offers) {
    const action = offer.definition;
    const effortHours = offer.effortHours ?? p(action.effortParameter);
    if (!Number.isFinite(offer.availableHours) || !Number.isFinite(effortHours))
      throw new Error("Non-finite choice utility.");
    if (offer.availableHours < p("zero") || effortHours < p("zero"))
      throw new Error("Invalid choice time budget.");
    const drive = offer.driveId ? actor.drives.get(offer.driveId) : undefined;
    const goal = [...actor.goals.values(), ...(context?.goalRows ?? [])].reduce(
      (strength, row) =>
        action.goalKinds.includes(row.kind)
          ? Math.max(strength, context?.goalUrgencies?.[row.id] ?? row.urgency)
          : strength,
      p("zero"),
    );
    const reasons: DecisionReason = {
      need:
        (context?.needValues?.[action.need] ??
          actor.needs[action.need] ??
          p("zero")) * p("needWeight"),
      goal: goal * p("goalWeight"),
      drive: (drive?.strength ?? p("zero")) * p("driveWeight"),
      trait: traitScore(core, actor, offer) * p("traitWeight"),
      emotion:
        p("emotionWeight") *
        ((context?.affect ?? actor.affect).mood *
          p(action.emotion?.moodMultiplierParameter ?? "zero") +
          (context?.affect ?? actor.affect).stress *
            p(action.emotion?.stressMultiplierParameter ?? "zero")),
      effort:
        offer.availableHours > p("zero")
          ? (-effortHours / offer.availableHours) * p("effortWeight")
          : p("zero"),
    };
    const bindings = [
      ...(action.reasonBindings ?? []),
      ...(offer.reasonBindings ?? []),
    ];
    const reasonTerms: WeightedReason[] | undefined = traced ? [] : undefined;
    if (bindings.length) {
      const api = coreAPI(core),
        ids = new Set<string>();
      let contribution = p("zero");
      for (const binding of bindings) {
        if (!binding.id.trim() || ids.has(binding.id))
          throw new Error(
            "Reason bindings require distinct nonempty identities.",
          );
        ids.add(binding.id);
        const provide = core.reasonProviders.get(binding.provider);
        if (!provide)
          throw new Error(`Unregistered reason provider: ${binding.provider}`);
        const weight = api.parameter(binding.weightParameter);
        if (binding.stopgapId) api.stopgap(binding.stopgapId);
        const result = provide(api, actor, offer, binding, context);
        if (!result) continue;
        const weighted = result.value * weight;
        if (
          !Number.isFinite(result.value) ||
          !Number.isFinite(weighted) ||
          result.sourceIds?.some((id) => !id.trim())
        )
          throw new Error("Invalid module reason value or source identity.");
        contribution += weighted;
        if (!Number.isFinite(contribution))
          throw new Error("Non-finite module reason sum.");
        reasonTerms?.push({
          ...binding,
          arguments: binding.arguments ? { ...binding.arguments } : undefined,
          value: result.value,
          sourceIds: result.sourceIds ? [...result.sourceIds] : undefined,
          contribution: weighted,
        });
      }
      reasons.module = contribution;
    }
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
      ...(reasonTerms?.length ? { reasonTerms } : {}),
    });
    const key = `${action.id}:${offer.targetId}`;
    const bestKey = best
      ? `${best.offer.definition.id}:${best.offer.targetId}`
      : undefined;
    if (!best || score > best.score || (score === best.score && key < bestKey!))
      best = { offer, score, reasons, reasonTerms };
  }
  return {
    actorId: personId,
    date: core.date,
    selected: best?.offer,
    selectedReasons: best?.reasons,
    selectedReasonTerms: best?.reasonTerms?.length
      ? best.reasonTerms
      : undefined,
    reasonKey: best
      ? `utility:${best.offer.definition.need}:${best.offer.driveId ?? best.offer.definition.effect}`
      : "no-available-act",
    scores,
  };
}
