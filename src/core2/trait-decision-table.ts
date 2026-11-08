/**
 * The table of every decision a person makes and the act kinds each option
 * expresses (`data/content/trait-decisions.json`), read by name. It sits in
 * its own file with no other imports so a module can read an option's act
 * kinds while it loads, whatever order the modules load in; the lean and
 * weight formulas that use it live in `trait-decisions.ts`.
 */
import table from "../../data/content/trait-decisions.json" with { type: "json" };

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
