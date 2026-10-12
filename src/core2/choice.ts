import { parameter } from "./parameters";
import { isExplicitlyControlledPersonV1 } from "./player-control-state-v1";
import { coreAPI } from "./state";
import type {
  ActOffer,
  CoreState,
  CompactChoiceScoreV1,
  CompactChoiceTraceV1,
  DecisionContext,
  DecisionReason,
  DecisionResult,
  PersonState,
  WeightedReason,
} from "./types";
/** Per person: each act kind's summed trait pull. */
interface KindLean {
  sum: Map<string, number>;
}
const kindLeans = new WeakMap<PersonState, KindLean>();

/** Preserve existing utility cache across the light writer's shallow canonical actor replacement. */
export function carryTraitScores(
  previous: PersonState,
  next: PersonState,
): void {
  const before = Object.getOwnPropertyDescriptor(previous, "traits"),
    after = Object.getOwnPropertyDescriptor(next, "traits");
  if (
    !before ||
    !after ||
    !("value" in before) ||
    !("value" in after) ||
    before.value !== after.value
  )
    throw new Error(
      "Trait cache transfer requires the exact unchanged traits reference.",
    );
  const lean = kindLeans.get(previous);
  if (lean) kindLeans.set(next, lean);
}

/**
 * Every trait's pull on every act kind for one person, computed once per
 * person: each trait counts on its high side when above the middle and its
 * low side when below, weighted by how far from the middle it sits.
 */
function kindLean(
  core: Pick<CoreState, "data">,
  actor: Pick<PersonState, "traits">,
): KindLean {
  const cached = kindLeans.get(actor as PersonState);
  if (cached) return cached;
  const p = (key: string) => parameter(key, core.data.parameters);
  const lean: KindLean = { sum: new Map() };
  const add = (kind: string, value: number) =>
    lean.sum.set(kind, (lean.sum.get(kind) ?? p("zero")) + value);
  for (const [id, raw] of Object.entries(actor.traits)) {
    const row = core.data.traitPulls[id];
    if (!row || raw === p("zero")) continue;
    const side = raw > p("zero") ? row.high : row.low;
    if (!side) continue;
    const weight = Math.min(p("one"), Math.abs(raw) / p("traitScale"));
    for (const kind of side.toward ?? []) add(kind, weight);
    for (const kind of side.away ?? []) add(kind, -weight);
  }
  kindLeans.set(actor as PersonState, lean);
  return lean;
}

/**
 * How a person's traits lean toward an option that expresses these act kinds:
 * every matching trait pull summed, over the option's act kinds times the
 * typical number of pulls on one kind (`traitPullsPerKind`). A pull toward an
 * option always raises it and a pull away always lowers it, whatever else the
 * person carries. The chooser's trait reason, and the one trait term every
 * formula decision uses.
 */
export function traitLean(
  core: Pick<CoreState, "data">,
  actor: Pick<PersonState, "traits">,
  actKinds: readonly string[],
): number {
  const p = (key: string) => parameter(key, core.data.parameters);
  const lean = kindLean(core, actor);
  let sum = p("zero");
  for (const kind of actKinds) sum += lean.sum.get(kind) ?? p("zero");
  return actKinds.length
    ? sum / (actKinds.length * p("traitPullsPerKind"))
    : p("zero");
}

function traitScore(
  core: CoreState,
  actor: PersonState,
  offer: ActOffer,
): number {
  return traitLean(core, actor, offer.definition.actKinds);
}

/** One scored offer: its total, its reasons, and the chooser's tie-break key. */
export interface ScoredOffer {
  /** The offer's position in the list it was scored from. */
  offerIndex: number;
  offer: ActOffer;
  effortHours: number;
  score: number;
  reasons: DecisionReason;
  reasonTerms?: readonly WeightedReason[];
  key: string;
}

/** Scores every offer once with the chooser's reasons; it chooses nothing. */
export function scoreOffers(
  core: CoreState,
  personId: string,
  offers: readonly ActOffer[],
  context?: DecisionContext,
): ScoredOffer[] {
  const actor = core.people.get(personId);
  if (!actor) throw new Error("Decision actor is absent.");
  const p = (key: string) => parameter(key, core.data.parameters);
  const scored: ScoredOffer[] = [];
  let nextOfferIndex = p("zero");
  for (const offer of offers) {
    const offerIndex = nextOfferIndex++;
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
    // Retain at most the selected and runner-up terms. Full alternative scores stay detail-only.
    const reasonTerms: WeightedReason[] = [];
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
        reasonTerms.push({
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
    scored.push({
      offerIndex,
      offer,
      effortHours,
      score,
      reasons,
      reasonTerms,
      key: `${action.id}:${offer.targetId}`,
    });
  }
  return scored;
}

export function chooseAct(
  core: CoreState,
  personId: string,
  offers: readonly ActOffer[],
  context?: DecisionContext,
  captureOriginalScores = false,
): DecisionResult {
  return decisionFromScores(
    core,
    personId,
    scoreOffers(core, personId, offers, context),
    captureOriginalScores,
  );
}

function compact(row: ScoredOffer): Readonly<CompactChoiceScoreV1> {
  return Object.freeze({
    offerIndex: row.offerIndex,
    actionId: row.offer.definition.id,
    targetId: row.offer.targetId,
    availableHours: row.offer.availableHours,
    effortHours: row.effortHours,
    ...(row.offer.driveId === undefined ? {} : { driveId: row.offer.driveId }),
    score: row.score,
    contributions: Object.freeze({ ...row.reasons }),
    ...(row.reasonTerms?.length
      ? {
          reasonTerms: Object.freeze(
            row.reasonTerms.map((term) =>
              Object.freeze({
                bindingId: term.id,
                provider: term.provider,
                weightParameter: term.weightParameter,
                value: term.value,
                contribution: term.contribution,
                ...(term.sourceIds === undefined
                  ? {}
                  : { sourceIds: Object.freeze([...term.sourceIds]) }),
              }),
            ),
          ),
        }
      : {}),
  });
}

/** The chooser's pick from a scoring pass: the highest score, ties to the lowest key. */
export function decisionFromScores(
  core: CoreState,
  personId: string,
  scored: readonly ScoredOffer[],
  captureOriginalScores = false,
): DecisionResult {
  const actor = core.people.get(personId);
  if (!actor) throw new Error("Decision actor is absent.");
  const traced =
    core.observer ||
    actor.id === core.playerId ||
    core.focusPersonIds.has(actor.id) ||
    isExplicitlyControlledPersonV1(core, actor.id);
  let best: ScoredOffer | undefined, runnerUp: ScoredOffer | undefined;
  for (const row of scored) {
    if (
      !best ||
      row.score > best.score ||
      (row.score === best.score && row.key < best.key)
    ) {
      if (best) runnerUp = best;
      best = row;
    } else if (
      !runnerUp ||
      row.score > runnerUp.score ||
      (row.score === runnerUp.score && row.key < runnerUp.key)
    )
      runnerUp = row;
  }
  return {
    actorId: personId,
    date: core.date,
    selected: best?.offer,
    selectedReasons: best?.reasons,
    // Preserve the old quiet/full retention contract outside the compact pair.
    selectedReasonTerms:
      traced && best?.reasonTerms?.length ? best.reasonTerms : undefined,
    reasonKey: best
      ? `utility:${best.offer.definition.need}:${best.offer.driveId ?? best.offer.definition.effect}`
      : "no-available-act",
    scores:
      traced || captureOriginalScores
        ? scored.map((row) => ({
            actionId: row.offer.definition.id,
            targetId: row.offer.targetId,
            score: row.score,
            reasons: row.reasons,
            ...(row.reasonTerms?.length
              ? { reasonTerms: row.reasonTerms }
              : {}),
          }))
        : undefined,
    ...(best && (traced || captureOriginalScores)
      ? {
          compactChoice: Object.freeze({
            version: "core2-compact-choice-v1",
            actorId: personId,
            date: core.date,
            selection: "utility-max",
            chosen: compact(best),
            ...(runnerUp ? { runnerUp: compact(runnerUp) } : {}),
            runnerUpStatus: runnerUp ? "saved" : "no-distinct-alternative",
            sourceRecordRefs: Object.freeze([
              Object.freeze({ kind: "person", id: personId }),
            ]),
          } satisfies CompactChoiceTraceV1),
        }
      : {}),
  };
}
