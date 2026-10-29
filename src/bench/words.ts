// The words the bench shows for records, all from the English engine's data.
import { admittedParts } from "../english/bank-parts";
import { JOURNAL_WORDS } from "../english/journal-words";
import { properName } from "../director/words";
import type { CoreState } from "../core2/types";
import { schoolsAttended } from "../core2/past";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import lineNames from "../core2/data/budgets/line-names.json" with { type: "json" };
import choiceBank from "../../data/english/parts/choice-names.json" with { type: "json" };

/** "aunt", "brother": the English engine's relation word for a kin key and the other person's look. */
export function relationWord(
  core: CoreState,
  otherId: string,
  kin: string | null | undefined,
): string | null {
  if (!kin) return null;
  const words = JOURNAL_WORDS.relationWords[kin];
  if (!words) return null;
  const gender = core.people.get(otherId)?.looks?.gender ?? "other";
  return words[gender as keyof typeof words] ?? words.other ?? null;
}

/** The schools a person attended, in order, named from each school's own record (the school engine's run before the start and its record in play). */
export function schoolsOf(core: CoreState, personId: string) {
  return (
    schoolsAttended(core, personId)
      // A school with no record of its own (a place the world does not
      // keep) has no name to show (SG-HIST-school-elsewhere-unnamed).
      .flatMap((row) =>
        row.name
          ? [
              {
                name: properName(row.name),
                date: row.date,
                recordId: row.recordId,
              },
            ]
          : [],
      )
      // One school for several stages (a district's elementary, middle and
      // high school) is listed once, from the year the person started there.
      .filter((school, at, all) => school.name !== all[at - 1]?.name)
  );
}

interface ChoicePart {
  key: string;
  move: string;
  text: string;
  transcriptsUsing: number;
}
const SLOT = /\{([a-z_]+)\}/g;
const HAS_SLOT = /\{[a-z_]+\}/;

/**
 * A choice's name from OPUS-WORDS' mined bank ("Take a break.", "Call
 * Sarah Sykes."): the most-used wording the owner's grades leave in for the
 * act whose slots the target's record can fill. Null where the bank has no
 * wording yet.
 */
export function choiceName(
  actionId: string,
  targetName: string | undefined,
): { text: string; key: string } | null {
  const parts = admittedParts(
    choiceBank.parts as ChoicePart[],
    (part) => part.move === actionId,
  )
    .filter((part) => !HAS_SLOT.test(part.text) || targetName)
    .sort(
      (a, b) =>
        b.transcriptsUsing - a.transcriptsUsing || a.key.localeCompare(b.key),
    );
  const part = parts[0];
  if (!part) return null;
  return {
    key: part.key,
    text: part.text.replace(SLOT, () => targetName ?? ""),
  };
}

/** Each policy question's and law amount's name on OPUS-GOV's bill catalog ("Limit groundwater withdrawal", "Minimum wage"). */
export function policyNames(): Record<string, string> {
  const names: Record<string, string> = {};
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      const row = value as {
        kind?: string;
        name?: string;
        question?: string;
        series?: string;
      };
      if (row.kind === "policy-question" && row.name && row.question)
        names[row.question] = row.name[0]!.toUpperCase() + row.name.slice(1);
      // A law amount (the minimum wage, a tax rate) by its series.
      if (row.kind === "law-amount" && row.name && row.series)
        names[row.series] = row.name;
      Object.values(value).forEach(walk);
    }
  };
  walk(billCatalog);
  return names;
}

/** A budget line a local seat takes a position on ("budget-line:police"), by its name on the budgets screen (the source table's own item label). */
export function budgetLineNames(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(
      (lineNames as { lines: Record<string, { name: string }> }).lines,
    ).map(([line, row]) => [`budget-line:${line}`, row.name]),
  );
}
