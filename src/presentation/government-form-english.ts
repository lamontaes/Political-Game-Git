import governmentFormBank from "../../data/english/parts/government-form.json" with { type: "json" };
import governmentFormMoves from "../../data/english/government-form-moves.json" with { type: "json" };
import {
  primaryReading,
  type MunicipalGovernment,
} from "../simulation/municipal-government";
import { composeFromBank, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";

/**
 * How a town's government is organized, from its recorded form of government
 * (CTO ruling on #3895, October 8, 2026). News shows record values, so this
 * is the term public sources use for the form, from the government-form bank,
 * not a sentence; which part words which recorded form is data. A form with
 * no term, or no recorded form, shows nothing, and neither does a term the
 * government's own name already says, such as an urban county government's.
 */

const BANK = governmentFormBank as EnglishBank;
const MOVES = governmentFormMoves.moves as Readonly<Record<string, string>>;

export interface GovernmentFormTerm {
  readonly text: string;
  /** The bank part, for the owner's grades. */
  readonly parts: readonly string[];
}

export function governmentFormTerm(
  government: MunicipalGovernment,
  grades: PartGradeLedger = PART_GRADES,
): GovernmentFormTerm | null {
  const form = primaryReading(government).form;
  const move = form ? MOVES[form] : undefined;
  if (!move) return null;
  const term = composeFromBank(
    BANK,
    move,
    {},
    `government-form:${government.key}`,
    undefined,
    grades,
  );
  if (!term || words(government.displayName).includes(words(term.text)))
    return null;
  return { text: term.text, parts: [`bank:${term.partKey}`] };
}

function words(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()} `;
}
