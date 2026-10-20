// The words the bench shows for records, all from the English engine's data.
import { JOURNAL_DATA } from "../director/journal";
import { properName } from "../director/words";
import type { CoreState } from "../core2/types";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import choiceBank from "../../data/english/parts/choice-names.json" with { type: "json" };

/** "aunt", "brother": the English engine's relation word for a kin key and the other person's look. */
export function relationWord(
  core: CoreState,
  otherId: string,
  kin: string | null | undefined,
): string | null {
  if (!kin) return null;
  const words = JOURNAL_DATA.relationWords[kin];
  if (!words) return null;
  const gender = core.people.get(otherId)?.looks?.gender ?? "other";
  return words[gender as keyof typeof words] ?? words.other ?? null;
}

/**
 * The schools a person's past records, in order, as written on their records.
 * A school that serves two stages in a row (a K-8 school's elementary and
 * middle years) is one line, the first stage's record naming it.
 */
export function schoolsOf(core: CoreState, personId: string) {
  const stages = (core.people.get(personId)?.pastFacts ?? [])
    // The school stages themselves, not the classmates met there.
    .filter((fact) => fact.facts?.schoolName && fact.facts.stage)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((fact) => ({
      name: properName(fact.facts!.schoolName!),
      date: fact.date,
      recordId: fact.id,
    }));
  return stages.filter(
    (row, at) => at === 0 || stages[at - 1]!.name !== row.name,
  );
}

interface ChoicePart {
  key: string;
  move: string;
  text: string;
  transcriptsUsing: number;
  shippable: boolean;
}
const SLOT = /\{([a-z_]+)\}/g;
const HAS_SLOT = /\{[a-z_]+\}/;

/**
 * A choice's name from OPUS-WORDS' mined bank ("Take a break.", "Call
 * Sarah Sykes."): the most-used shippable wording for the act whose slots
 * the target's record can fill. Null where the bank has no wording yet.
 */
export function choiceName(
  actionId: string,
  targetName: string | undefined,
): { text: string; key: string } | null {
  const parts = (choiceBank.parts as ChoicePart[])
    .filter((part) => part.move === actionId && part.shippable)
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

/**
 * Every act's name as a short control label ("Take a break", "Look after"),
 * from the bank: the most-used wording without a slot, else the most-used
 * wording with its slot taken out. Served to the play screen with the other
 * control names.
 */
export function actionNames(): Record<string, string> {
  const names: Record<string, string> = {};
  const parts = (choiceBank.parts as ChoicePart[]).filter(
    (part) => part.shippable,
  );
  for (const move of new Set(parts.map((part) => part.move))) {
    const part = choiceName(move, undefined);
    const text = part
      ? part.text
      : parts
          .filter((row) => row.move === move)
          .sort(
            (a, b) =>
              b.transcriptsUsing - a.transcriptsUsing ||
              a.key.localeCompare(b.key),
          )[0]!
          .text.replace(SLOT, "");
    names[move] = text
      .replace(/\s+/g, " ")
      .replace(/[\s.!?]+$/, "")
      .trim();
  }
  return names;
}
