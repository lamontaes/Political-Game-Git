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
  return traitLeanBetween(
    core,
    person,
    decisionKinds(decisionId, towardOptionId),
    decisionKinds(decisionId, overOptionId),
  );
}
