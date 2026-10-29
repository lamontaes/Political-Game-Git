/**
 * Turns the mined choice-names bank (`data/english/parts/choice-names.json`)
 * into the control names the decision bench shows on its choice buttons, in
 * the shape of the bench's `controls.json`: `actions` maps a core action id
 * to its button name. Every name is mined from public-domain federal records
 * or authored to the calibrated patterns (text rule, Oct 15).
 *
 * A button names the act ("Go to work"); the bench shows the target beside
 * it. So a name with a slot ("Call {name}.") is offered separately in
 * `actionTemplates`, for a button that names its target inside the words
 * ("Call Maria Ortega"). An action no record names keeps the bench's own
 * control name.
 *
 * Of several mined names for one action, the one the most documents say is
 * chosen, so the same button always reads the same.
 *
 * OPUS-WORDS owns this file until PLAY folds it into the bench.
 */
import bankJson from "../../data/english/parts/choice-names.json" with { type: "json" };
import { admittedParts } from "../../src/english/bank-parts";

interface MinedPart {
  key: string;
  text: string;
  uses: { subject: string; role: string }[];
  transcriptsUsing: number;
}
export const CHOICE_NAMES_BANK = bankJson as unknown as { parts: MinedPart[] };

/** Stance questions and answers are lines, not buttons. */
const NOT_A_BUTTON = new Set(["stance-question", "stance-answer"]);

/** A button reads without its closing period: "Go to work". */
function buttonText(text: string): string {
  return text.replace(/\.$/, "");
}

export interface BenchControlNames {
  /** Action id to its button name, with no slot. */
  actions: Record<string, string>;
  /** Action id to a name with its target slot (`{name}`, `{group}`, ...). */
  actionTemplates: Record<string, string>;
  /** Each name's part key, for the owner's grades and provenance. */
  keys: Record<string, string>;
}

/**
 * `current` is the bench's own control names (`controls.json` `actions`):
 * where one of them is also a mined name, the button keeps it, so a mined
 * name changes no button that already reads right.
 */
export function benchControlNames(
  current: Readonly<Record<string, string>> = {},
  bank: { parts: MinedPart[] } = CHOICE_NAMES_BANK,
): BenchControlNames {
  const same = (part: MinedPart, action: string) =>
    buttonText(part.text).toLowerCase() === current[action]?.toLowerCase();
  const best = new Map<string, MinedPart>();
  const bestTemplate = new Map<string, MinedPart>();
  for (const part of admittedParts(bank.parts)) {
    for (const use of part.uses) {
      if (use.subject !== "action" || NOT_A_BUTTON.has(use.role)) continue;
      const into = /\{\w+\}/.test(part.text) ? bestTemplate : best;
      const held = into.get(use.role);
      if (
        !held ||
        (same(part, use.role) && !same(held, use.role)) ||
        (same(part, use.role) === same(held, use.role) &&
          part.transcriptsUsing > held.transcriptsUsing) ||
        (same(part, use.role) === same(held, use.role) &&
          part.transcriptsUsing === held.transcriptsUsing &&
          part.key < held.key)
      )
        into.set(use.role, part);
    }
  }
  const names: BenchControlNames = {
    actions: {},
    actionTemplates: {},
    keys: {},
  };
  for (const [action, part] of [...best].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    names.actions[action] = buttonText(part.text);
    names.keys[action] = part.key;
  }
  for (const [action, part] of [...bestTemplate].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    names.actionTemplates[action] = buttonText(part.text);
    names.keys[`${action}:template`] = part.key;
  }
  return names;
}

/** Stance questions and answers, for the conversation's stance moves. */
export function stanceWords(bank: { parts: MinedPart[] } = CHOICE_NAMES_BANK): {
  questions: string[];
  answers: string[];
} {
  const of = (role: string) =>
    admittedParts(bank.parts, (part) =>
      part.uses.some((use) => use.role === role),
    ).map((part) => part.text);
  return { questions: of("stance-question"), answers: of("stance-answer") };
}
