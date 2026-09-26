import type { QuestionnaireItem } from "./setup-questionnaire-bank";

/** This historical rewrite bank has no player-facing copy. */
export const TEXT39_SETUP_COPY: Readonly<
  Record<
    string,
    {
      readonly prompt: string;
      readonly options: Readonly<Record<string, string>>;
    }
  >
> = {};

export function text39QuestionnaireItem(
  item: QuestionnaireItem,
): QuestionnaireItem {
  throw new Error(`The withdrawn setup question ${item.key} cannot be shown.`);
}
