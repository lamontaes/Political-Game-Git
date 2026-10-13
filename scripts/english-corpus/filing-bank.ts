/**
 * Turns the mined clerk bank (`data/english/parts/filing-visit.json`) into the
 * filing visit's words (`src/director/filing-visit.ts`). The clerk speaks only
 * sentences a public-domain election record says; what no record says (the
 * signature count, the player's own picks) is left empty here, and
 * the screen shows it as the filing record's data.
 *
 * Slots map onto the visit's facts: a rule's value is `{{required}}` (the age,
 * the place), the filing office is `{{filing-office}}` (GOV's `filedWith`).
 *
 * OPUS-WORDS owns this file until OPUS-PEOPLE folds it into the director.
 */
import bankJson from "../../data/english/parts/filing-visit.json" with { type: "json" };
import { heldByGrades } from "../../src/presentation/english-grades";
import { FILING_VISIT_WORDS } from "../../src/director/filing-visit";
import type { Variant } from "../../src/director/render";

type VisitWords = typeof FILING_VISIT_WORDS;
interface Use {
  subject: string;
  role: string;
  choice: string;
}
interface MinedPart {
  key: string;
  text: string;
  uses: Use[];
  shippable: boolean;
}
export const FILING_BANK = bankJson as unknown as { parts: MinedPart[] };

/** The visit's rule keys, and the slot each rule's value fills. */
const RULES: Record<string, { choice: string; slot?: string }> = {
  "filing-deadline": { choice: "late", slot: "deadline" },
  "already-filed": { choice: "filed" },
  "minimum-age": { choice: "age", slot: "age" },
  residency: { choice: "live", slot: "place" },
  "registered-voter": { choice: "register" },
  signatures: { choice: "short-signatures" },
};

function directorText(text: string, valueSlot?: string): string {
  return text.replace(/\{(\w+)\}/g, (_all, slot: string) =>
    slot === valueSlot ? "{{required}}" : `{{${slot.replace(/_/g, "-")}}}`,
  );
}

export function filingWordsFromBank(
  bank: { parts: MinedPart[] } = FILING_BANK,
): VisitWords {
  const of = (subject: string, role: string, choice?: string, slot?: string) =>
    bank.parts
      .filter(
        (part) =>
          part.shippable &&
          !heldByGrades(part.key) &&
          part.uses.some(
            (use) =>
              use.subject === subject &&
              use.role === role &&
              (choice === undefined || use.choice === choice),
          ),
      )
      .map((part): Variant => ({
        key: part.key,
        text: directorText(part.text, slot),
      }));
  return {
    ...FILING_VISIT_WORDS,
    version: "words-filing-visit-v1",
    greet: of("clerk", "greet"),
    pick: of("player", "pick"),
    // The deadline is said in every case; signatures are record data on the
    // screen until a record says them.
    terms: of("clerk", "terms", "deadline").map((variant) => ({
      ...variant,
      stages: ["signatures", "none"],
    })),
    rules: Object.fromEntries(
      Object.entries(RULES).map(([rule, { choice, slot }]) => [
        rule,
        of("clerk", "rule", choice, slot),
      ]),
    ),
    accept: of("player", "accept"),
    gather: of("player", "gather"),
  };
}
