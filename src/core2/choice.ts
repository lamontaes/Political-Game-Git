import { parameter } from "./parameters";
import { isExplicitlyControlledPersonV1 } from "./player-control-state-v1";
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
  const scores = traitScores.get(previous);
  if (scores) traitScores.set(next, scores);
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

/** One scored offer: its total, its reasons, and the chooser's tie-break key. */
export interface ScoredOffer {
  offer: ActOffer;
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
  const traced =
    core.observer ||
    actor.id === core.playerId ||
  const scored: ScoredOffer[] = [];
