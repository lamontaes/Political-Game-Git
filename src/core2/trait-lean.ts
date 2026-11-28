import { bookkeeping } from "./bookkeeping";
import { parameter } from "./parameters";
import { registerRestoreReset } from "./snapshot";
import type { CoreState, PersonState } from "./types";

/** Per person: each act kind's summed trait pull, and the pulls one kind gets on average. */
/**
 * A traits record's summed pull per act kind, by the kind's index in
 * `KIND_INDEX` (a compact array: one is cached for every counted person).
 */
export interface KindLean {
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
let kindLeans = new WeakMap<PersonState, KindLean>();
let leansByTraits = new WeakMap<object, { sum: number; lean: KindLean }>();

/**
 * Drops one person's cached lean. A person whose traits object is replaced
 * (a trait changed with age or after a life event) must not keep the lean
 * computed from the old one; the by-traits cache is keyed by the object, so
 * the new object misses it by itself.
 */
export function forgetTraitLean(actor: PersonState): void {
  kindLeans.delete(actor);
}

/** Drops every cached lean: the trait audit rewrites traits in place before a twin world runs. */
export function forgetTraitLeans(): void {
  kindLeans = new WeakMap();
  leansByTraits = new WeakMap();
}
// A restore refills each person's traits in place, so a lean kept from the
// rebuilt opening would outlive the traits it was built from.
registerRestoreReset(forgetTraitLeans);

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
 * low side when below, weighted by how far from the middle it sits. The
 * object stands for the person's traits until it is forgotten, so a lean
 * worked out from it can be kept by it (`trait-decisions.ts`).
 */
export function kindLean(
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
  // Called millions of times on a busy day: no per-call closures, and in
  // play the bounds are read once per parameter table.
  const bounds = leanBounds(core.data.parameters);
  const zero = bounds.zero;
  const lean = kindLean(core, actor);
  let sum = zero;
  for (let i = 0; i < actKinds.length; i++)
    sum += lean.sum[KIND_INDEX.get(actKinds[i]!) ?? lean.sum.length] ?? zero;
  return actKinds.length && lean.perKind > zero
    ? Math.max(
        bounds.negativeOne,
        Math.min(bounds.one, sum / (actKinds.length * lean.perKind)),
      )
    : zero;
}

/** traitLean's bounds, kept per parameter table in play; tests re-read them, since some change a value in place. */
const boundsByParameters = new WeakMap<
  object,
  { zero: number; one: number; negativeOne: number }
>();
function leanBounds(parameters: CoreState["data"]["parameters"]) {
  const kept = bookkeeping() ? undefined : boundsByParameters.get(parameters);
  if (kept) return kept;
  const bounds = {
    zero: parameter("zero", parameters),
    one: parameter("one", parameters),
    negativeOne: parameter("negativeOne", parameters),
  };
  boundsByParameters.set(parameters, bounds);
  return bounds;
}
