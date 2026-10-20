/**
 * Turns the mined clerk bank (`data/english/parts/filing-visit.json`) into the
 * filing visit's words (`src/director/filing-visit.ts`). The clerk speaks only
 * sentences a public-domain election record says; what no record says is left
 * empty here, and the visit leaves the line out. The rules and the slot each
 * rule's value fills are `data/filing-visit-rows.json`, which holds no
 * sentences.
 *
 * Slots map onto the visit's facts: a rule's value is `{{required}}` (the age,
 * the place), the filing office is `{{filing-office}}` (GOV's `filedWith`).
 */
import bankJson from "../../../data/english/parts/filing-visit.json" with { type: "json" };
import { heldByGrades } from "../../english/english-grades";
import rowsJson from "../data/filing-visit-rows.json" with { type: "json" };
import type { VisitWords } from "../filing-visit";
import type { Variant } from "../render";

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

/** Each rule the visit can state: the mined choice that words it, and the slot its value fills. */
export interface FilingRows {
  version: string;
  rules: Readonly<Record<string, { choice: string; slot?: string }>>;
}
export const FILING_ROWS = rowsJson as unknown as FilingRows;

function directorText(text: string, valueSlot?: string): string {
  return text.replace(/\{(\w+)\}/g, (_all, slot: string) =>
    slot === valueSlot ? "{{required}}" : `{{${slot.replace(/_/g, "-")}}}`,
  );
}

export function filingWordsFromBank(
  bank: { parts: MinedPart[] } = FILING_BANK,
  rows: FilingRows = FILING_ROWS,
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
    version: rows.version,
    greet: of("clerk", "greet"),
    pick: of("player", "pick"),
    // The deadline is said in every case.
    terms: of("clerk", "terms", "deadline").map((variant) => ({
      ...variant,
      stages: ["none"],
    })),
    rules: Object.fromEntries(
      Object.entries(rows.rules).map(([rule, { choice, slot }]) => [
        rule,
        of("clerk", "rule", choice, slot),
      ]),
    ),
    accept: of("player", "accept"),
    file: of("player", "file", "office"),
    filed: of("clerk", "filed", "office"),
  };
}
