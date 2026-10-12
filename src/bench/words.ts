// The words the bench shows for records, all from the English engine's data.
import { JOURNAL_DATA } from "../director/journal";
import { properName } from "../director/words";
import type { CoreState } from "../core2/types";
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

/** The schools a person's past records, in order, as written on their records. */
export function schoolsOf(core: CoreState, personId: string) {
  return (
    (core.people.get(personId)?.pastFacts ?? [])
      // The school stages themselves, not the classmates met there.
      .filter((fact) => fact.facts?.schoolName && fact.facts.stage)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((fact) => ({
        name: properName(fact.facts!.schoolName!),
        date: fact.date,
        recordId: fact.id,
      }))
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
