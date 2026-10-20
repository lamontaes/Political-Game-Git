import { bookkeeping } from "./bookkeeping";
import { initialPersonState } from "./person-state";
import { countedPersonOf } from "./counted-actor";
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
/** A counted person has the same utility inputs without admission, history or world writes. */
function decisionActor(core: CoreState, personId: string): PersonState {
  const full = core.people.get(personId);
  if (full) return full;
  const counted = countedPersonOf(core, personId);
  if (!counted) throw new Error("Decision actor is absent.");
  return initialPersonState(core, counted, false);
}

/** Per person: each act kind's summed trait pull, and the pulls one kind gets on average. */
/**
 * A traits record's summed pull per act kind, by the kind's index in
 * `KIND_INDEX` (a compact array: one is cached for every counted person).
 */
interface KindLean {
  sum: Float64Array;
  perKind: number;
}
/** Act kinds in the order first met; an index past an array's end reads 0. */
const KIND_INDEX = new Map<string, number>();
const kindIndex = (kind: string) => {
  let i = KIND_INDEX.get(kind);
  if (i === undefined) KIND_INDEX.set(kind, (i = KIND_INDEX.size));
  return i;
};
const kindLeans = new WeakMap<PersonState, KindLean>();
const leansByTraits = new WeakMap<object, { sum: number; lean: KindLean }>();

/** Every trait value, weighted by its place, so any edit changes the sum. */
function traitChecksum(traits: Readonly<Record<string, number>>): number {
  let sum = 0,
    i = 1;
  for (const key in traits) sum += (traits[key]! + 3) * i++ * 1.0000001;
  return sum + i;
}

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

/** One side of a trait's pull, as kind indices, and its share of the kinds. */
interface CompiledSide {
  toward: readonly number[];
  away: readonly number[];
  perKind: number;
}
interface CompiledPulls {
  rows: Map<string, { high?: CompiledSide; low?: CompiledSide }>;
  zero: number;
  one: number;
  traitScale: number;
}
/** The trait table with every kind given its index, once per data table. */
const compiledByData = new WeakMap<object, CompiledPulls>();
function compiledPulls(data: CoreState["data"]): CompiledPulls {
  const cached = compiledByData.get(data);
  if (cached) return cached;
  const p = (key: string) => parameter(key, data.parameters);
  const side = (
    row: { toward?: readonly string[]; away?: readonly string[] } | undefined,
  ): CompiledSide | undefined =>
    row && {
      toward: (row.toward ?? []).map(kindIndex),
      away: (row.away ?? []).map(kindIndex),
      perKind:
        ((row.toward?.length ?? p("zero")) + (row.away?.length ?? p("zero"))) /
        data.actKinds.length,
    };
  const rows = new Map<string, { high?: CompiledSide; low?: CompiledSide }>();
  for (const [id, row] of Object.entries(data.traitPulls))
    rows.set(id, { high: side(row.high), low: side(row.low) });
  const compiled = {
    rows,
    zero: p("zero"),
    one: p("one"),
    traitScale: p("traitScale"),
  };
  compiledByData.set(data, compiled);
  return compiled;
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
  // Callers that wrap a person in a fresh object each time (counted residents'
  // facts) still pass the same traits record: reuse its lean. In play a
  // traits record is written only while its person is built, so the cache
  // trusts it; with bookkeeping on (tests edit records in place), a checksum
  // confirms the values are unchanged.
  const checked = bookkeeping();
  const byTraits = leansByTraits.get(actor.traits);
  const checksum = checked ? traitChecksum(actor.traits) : Number.NaN;
  if (byTraits && (!checked || byTraits.sum === checksum)) return byTraits.lean;
  const table = compiledPulls(core.data);
  const zero = table.zero;
  const sum = new Float64Array(KIND_INDEX.size);
  let perKind = zero;
  // for...in also reads a counted person's traits, which are read in place
  // from their group's columns (one model, two tiers).
  for (const id in actor.traits) {
    const raw = actor.traits[id]!;
    const row = table.rows.get(id);
    if (!row || raw === zero) continue;
    const side = raw > zero ? row.high : row.low;
    if (!side) continue;
    const weight = Math.min(table.one, Math.abs(raw) / table.traitScale);
    for (let i = 0; i < side.toward.length; i++)
      sum[side.toward[i]!]! += weight;
    for (let i = 0; i < side.away.length; i++) sum[side.away[i]!]! -= weight;
    perKind += side.perKind;
  }
  const lean: KindLean = { sum, perKind };
  kindLeans.set(actor as PersonState, lean);
  leansByTraits.set(actor.traits, { sum: checksum, lean });
  return lean;
}

/**
 * How a person's traits lean toward an option that expresses these act kinds:
 * every matching trait pull summed, over the option's act kinds times the
 * number of pulls one kind gets on average from everything the person
 * carries, held within -1..1. That norm is the same for all of a person's
 * options, so a pull toward an option always raises it against the others
 * and a pull away always lowers it (until it reaches the bound, which only a
 * person with very few traits does). The chooser's trait reason, and the one trait term every
 * formula decision uses.
 */
export function traitLean(
  core: Pick<CoreState, "data">,
  actor: Pick<PersonState, "traits">,
  actKinds: readonly string[],
): number {
  // Called millions of times on a busy day: no per-call closures.
  const parameters = core.data.parameters;
  const zero = parameter("zero", parameters);
  const lean = kindLean(core, actor);
  let sum = zero;
  for (let i = 0; i < actKinds.length; i++)
    sum += lean.sum[KIND_INDEX.get(actKinds[i]!) ?? lean.sum.length] ?? zero;
  return actKinds.length && lean.perKind > zero
    ? Math.max(
        parameter("negativeOne", parameters),
        Math.min(
          parameter("one", parameters),
          sum / (actKinds.length * lean.perKind),
        ),
      )
    : zero;
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

/**
 * Whose choices save their reasons: the player, the people they deal with
 * (the focus), anyone a controller drives, and everyone while the debug
 * observer is on. The rest keep each reason's number and no copy of its terms.
 */
function savesReasons(core: CoreState, actorId: string): boolean {
  return (
    core.observer ||
    actorId === core.playerId ||
    core.focusPersonIds.has(actorId) ||
    isExplicitlyControlledPersonV1(core, actorId)
  );
}

/** Scores every offer once with the chooser's reasons; it chooses nothing. */
const NO_BINDINGS: readonly never[] = Object.freeze([]);

export function scoreOffers(
  core: CoreState,
  personId: string,
  offers: readonly ActOffer[],
  context?: DecisionContext,
  /** Keep every reason term for someone whose reasons are not saved (an original-answer capture). */
  keepTerms = false,
): ScoredOffer[] {
  const actor = decisionActor(core, personId);
  const keepReasonTerms = keepTerms || savesReasons(core, actor.id);
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
    // The strongest matching goal, without copying the person's goals.
    let goal = p("zero");
    if (action.goalKinds.length) {
      for (const row of actor.goals.values())
        if (action.goalKinds.includes(row.kind))
          goal = Math.max(
            goal,
            context?.goalUrgencies?.[row.id] ?? row.urgency,
          );
      for (const row of context?.goalRows ?? [])
        if (action.goalKinds.includes(row.kind))
          goal = Math.max(
            goal,
            context?.goalUrgencies?.[row.id] ?? row.urgency,
          );
    }
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
    const ownBindings = action.reasonBindings ?? NO_BINDINGS,
      offerBindings = offer.reasonBindings ?? NO_BINDINGS;
    const bindings =
      ownBindings.length && offerBindings.length
        ? [...ownBindings, ...offerBindings]
        : ownBindings.length
          ? ownBindings
          : offerBindings;
    // Retain at most the selected and runner-up terms. Full alternative scores stay detail-only.
    let reasonTerms: readonly WeightedReason[] = NO_BINDINGS;
    if (bindings.length) {
      const terms: WeightedReason[] = [];
      if (keepReasonTerms) reasonTerms = terms;
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
        if (keepReasonTerms)
          terms.push({
            ...binding,
            arguments: binding.arguments ? { ...binding.arguments } : undefined,
            value: result.value,
            sourceIds: result.sourceIds ? [...result.sourceIds] : undefined,
            contribution: weighted,
          });
      }
      reasons.module = contribution;
    }
    // Summed in the reasons' own order, without an array per offer.
    let score =
      p("zero") +
      reasons.need +
      reasons.goal +
      reasons.drive +
      reasons.trait +
      reasons.emotion +
      reasons.effort;
    if (reasons.module !== undefined) score += reasons.module;
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
    scoreOffers(core, personId, offers, context, captureOriginalScores),
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
  const actor = decisionActor(core, personId);
  const traced = savesReasons(core, actor.id);
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
