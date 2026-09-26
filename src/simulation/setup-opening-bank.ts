import type {
  QuestionnaireEligibility,
  QuestionnaireItem,
} from "./setup-questionnaire-bank";

/** The fixed setup scene bank was withdrawn. */
export const OPENING_FIXED_ITEMS: readonly QuestionnaireItem[] = [];
export const OPENING_BANK_ITEMS: readonly QuestionnaireItem[] = [];

export function requireEligibility(
  table: Readonly<Record<string, QuestionnaireEligibility>>,
  key: string,
): QuestionnaireEligibility {
  const found = table[key];
  if (!found)
    throw new Error(`Setup item ${key} has no eligibility declaration.`);
  return found;
}
