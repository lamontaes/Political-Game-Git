/**
 * The shared table of every decision a person makes and the act kinds each
 * option expresses (`data/content/trait-decisions.json`), so every trait in
 * `trait-act-pulls.json` reaches every option. Modules whose options live in
 * the table read their act kinds here; formula decisions add the same trait
 * lean the chooser uses (`traitLean`), never a hand-picked trait sum.
 */
import table from "../../data/content/trait-decisions.json" with { type: "json" };
import { traitLean } from "./choice";
import { parameter } from "./parameters";
import { probeCallerSite, traitProbe } from "./trait-probe";
import type { CoreState, PersonState } from "./types";

interface OptionRow {
  id: string;
  actKinds?: readonly string[];
  from?: string;
}

const OPTIONS = new Map(
  (
    table.decisions as readonly { id: string; options: readonly OptionRow[] }[]
  ).map((decision) => [
    decision.id,
    new Map(decision.options.map((option) => [option.id, option])),
  ]),
);

/** The act kinds of one option the table names directly. */
export function decisionKinds(
  decisionId: string,
  optionId: string,
): readonly string[] {
  const kinds = OPTIONS.get(decisionId)?.get(optionId)?.actKinds;
  if (!kinds)
    throw new Error(
      `Trait decision ${decisionId} has no act kinds for ${optionId}.`,
    );
  return kinds;
}

/**
 * How much more a person's traits lean toward one option than another, scaled
 * so the strongest personalities reach about 1 (`traitLeanScale`): the trait
 * term a formula decision adds, through the same table and the same lean the
 * chooser scores.
 */
export function traitLeanBetween(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  toward: readonly string[],
  over: readonly string[],
): number {
  const p = (key: string) => parameter(key, core.data.parameters);
  const lean = leanBetween(core, person, toward, over, p);
  const probe = traitProbe();
  if (probe?.formula && !probingDecision)
    probe.formula({ decisionId: probeCallerSite(), lean });
  return lean;
}

/** Set while `decisionLean` reads, so the probe counts the call once, by its table id. */
let probingDecision = false;

function leanBetween(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  toward: readonly string[],
  over: readonly string[],
  p: (key: string) => number,
): number {
  // Clamped to -1..1: the raw difference over the scale can reach 3.3, and every caller weighs the lean as a -1..1 term.
  return Math.max(
    p("negativeOne"),
    Math.min(
      p("one"),
      (traitLean(core, person, toward) - traitLean(core, person, over)) /
        p("traitLeanScale"),
    ),
  );
}

/** `traitLeanBetween` for two options the table names directly. */
export function decisionLean(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  decisionId: string,
  towardOptionId: string,
  overOptionId: string,
): number {
  const probe = traitProbe();
  if (!probe?.formula)
    return traitLeanBetween(
      core,
      person,
      decisionKinds(decisionId, towardOptionId),
      decisionKinds(decisionId, overOptionId),
    );
  probingDecision = true;
  try {
    const lean = traitLeanBetween(
      core,
      person,
      decisionKinds(decisionId, towardOptionId),
      decisionKinds(decisionId, overOptionId),
    );
    probe.formula({ decisionId, lean });
    return lean;
  } finally {
    probingDecision = false;
  }
}

/** The calibrated trait weight of a decision row (`traitWeightParameter`), else the general `traitWeight`. */
export function decisionTraitWeight(
  core: Pick<CoreState, "data">,
  decisionId: string,
): number {
  return parameter(
    WEIGHT_KEYS.get(decisionId) ?? "traitWeight",
    core.data.parameters,
  );
}

const WEIGHT_KEYS = new Map(
  (
    table.decisions as readonly { id: string; traitWeightParameter?: string }[]
  ).flatMap((row) =>
    row.traitWeightParameter
      ? [[row.id, row.traitWeightParameter] as const]
      : [],
  ),
);

/**
 * A two-way decision settled by a sum of reasons: yes when the case for it
 * (`bare`, every reason but personality) plus the person's calibrated trait
 * lean toward `yesOptionId` over `noOptionId` is above zero. The one formula
 * every two-way trait decision uses, so the audit sees each call and whether
 * personality turned it.
 */
export function leanedYes(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
): boolean {
  return (
    leanedScore(core, person, decisionId, yesOptionId, noOptionId, bare) >
    parameter("zero", core.data.parameters)
  );
}

/**
 * A decision's score with the person's calibrated trait term added: `bare`
 * (every reason but personality) plus the lean toward `yesOptionId` over
 * `noOptionId` times the decision's weight. For a decision whose size, not
 * only its direction, depends on the score (a gift, a readiness to answer).
 * Reports to the probe like `leanedYes`.
 */
export function leanedScore(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
): number {
  return reportLeaned(
    core,
    person,
    decisionId,
    leanBetween(
      core,
      person,
      decisionKinds(decisionId, yesOptionId),
      decisionKinds(decisionId, noOptionId),
      (key) => parameter(key, core.data.parameters),
    ),
    bare,
  );
}

/**
 * A counted person's two-way decision on exactly the chooser's arithmetic: the
 * case for it (`bare`, every reason but personality) plus the decision's
 * calibrated weight times the person's trait lean toward the yes option's
 * act kinds less the no option's, unscaled, as `scoreOffers` adds it for a full
 * person. The same weight therefore moves a counted person and a full person
 * the same amount. For options whose act kinds live in their module's data.
 */
export function leanedByKinds(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesKinds: readonly string[],
  noKinds: readonly string[],
  bare: number,
): boolean {
  return (
    reportLeaned(
      core,
      person,
      decisionId,
      traitLean(core, person, yesKinds) - traitLean(core, person, noKinds),
      bare,
    ) > parameter("zero", core.data.parameters)
  );
}

/** `bare` plus the weighted lean, reported to the audit probe with whether personality turned it. */
function reportLeaned(
  core: Pick<CoreState, "data">,
  person: { id?: string },
  decisionId: string,
  lean: number,
  bare: number,
): number {
  const score = bare + lean * decisionTraitWeight(core, decisionId);
  const probe = traitProbe();
  if (probe?.formula) {
    const zero = parameter("zero", core.data.parameters);
    probe.formula({
      decisionId,
      actorId: person.id,
      lean,
      bare,
      yes: score > zero,
      turned: score > zero !== bare > zero,
    });
  }
  return score;
}

/**
 * The trait term of a counted person's summed pull: the decision's calibrated
 * weight times the lean toward the first act kinds less the second's, unscaled,
 * as the chooser adds it for a full person.
 */
export function decisionTraitTerm(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
  decisionId: string,
  toward: readonly string[],
  over: readonly string[],
): number {
  const lean = traitLean(core, person, toward) - traitLean(core, person, over);
  traitProbe()?.formula?.({ decisionId, lean });
  return lean * decisionTraitWeight(core, decisionId);
}

/**
 * The trait term of a decision settled by a sum of reasons (`bare` is every
 * reason but personality): the person's lean toward `yesOptionId` over
 * `noOptionId`, read through `shape` where the site bends it (a taste for
 * change read against how settled a law is), times the decision's calibrated
 * weight. Reports the call, the sum's outcome and whether personality turned
 * it to the audit's probe, as `leanedYes` does.
 */
export function leanedTerm(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
  shape: (lean: number) => number = (lean) => lean,
): number {
  return termOfLean(
    core,
    person,
    decisionId,
    shape(
      leanBetween(
        core,
        person,
        decisionKinds(decisionId, yesOptionId),
        decisionKinds(decisionId, noOptionId),
        (key) => parameter(key, core.data.parameters),
      ),
    ),
    bare,
  );
}

/**
 * The trait term for a lean already read (and bent, if the site bends it):
 * the lean times the decision's calibrated weight, reported to the audit's
 * probe with the sum it joins. For a site that reads a person's lean once
 * and weighs it against many cases.
 */
export function termOfLean(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  lean: number,
  bare: number,
): number {
  return reportLeaned(core, person, decisionId, lean, bare) - bare;
}

/**
 * `leanedYes` that also returns the trait term it added (the lean times the
 * decision's calibrated weight), for a site that keeps its reasons on a record.
 */
export function leanedYesWithTerm(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits"> & { id?: string },
  decisionId: string,
  yesOptionId: string,
  noOptionId: string,
  bare: number,
): { readonly yes: boolean; readonly term: number } {
  const score = leanedScore(
    core,
    person,
    decisionId,
    yesOptionId,
    noOptionId,
    bare,
  );
  return {
    yes: score > parameter("zero", core.data.parameters),
    term: score - bare,
  };
}
