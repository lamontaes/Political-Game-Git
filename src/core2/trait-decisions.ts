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
  return leanedYesWithTerm(
    core,
    person,
    decisionId,
    yesOptionId,
    noOptionId,
    bare,
  ).yes;
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
  const lean = leanBetween(
    core,
    person,
    decisionKinds(decisionId, yesOptionId),
    decisionKinds(decisionId, noOptionId),
    (key) => parameter(key, core.data.parameters),
  );
  const term = lean * decisionTraitWeight(core, decisionId);
  const yes = bare + term > parameter("zero", core.data.parameters);
  const probe = traitProbe();
  if (probe?.formula)
    probe.formula({
      decisionId,
      actorId: person.id,
      lean,
      bare,
      yes,
      turned: yes !== bare > parameter("zero", core.data.parameters),
    });
  return { yes, term };
}
