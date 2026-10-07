import { daysBetween } from "./dates";
import { isSelectedDecision } from "./decisions";
import { COUPLE_STAGE_CHOICES, type CoupleStage } from "./couple-stage-data";
import type {
  DecisionContext,
  DecisionEvaluation,
  DecisionOption,
  IsoDate,
} from "./types";

type CoupleChoice = Pick<
  DecisionEvaluation,
  "outcomeKind" | "selectedOptionKey"
> & { readonly context: Pick<DecisionContext, "actorPersonId"> };

/** Same elapsed-year convention as the existing town-family minimums.
 * Missing or not-yet-started history contributes no duration. */
export function coupleYearsTogether(
  startedAt: IsoDate | null,
  asOfDate: IsoDate,
): number | null {
  if (startedAt === null || startedAt > asOfDate) return null;
  return daysBetween(startedAt, asOfDate) / 365.25;
}

export function coupleStageOptions(
  stage: CoupleStage,
  startedAt: IsoDate | null,
  asOfDate: IsoDate,
): readonly DecisionOption[] {
  const years = coupleYearsTogether(startedAt, asOfDate);
  return COUPLE_STAGE_CHOICES[stage]
    .filter(
      (choice) =>
        choice.minimumYearsTogether === undefined ||
        (years !== null && years >= choice.minimumYearsTogether),
    )
    .map(({ key, label, description }) => ({ key, label, description }));
}

/** Admit a consequence only from the two independently evaluated results.
 * This reads the shared evaluator's result; it never scores or chooses an
 * actor's option. Staying, an unknown option, and an unselected result do no
 * work. The shared evaluator owns tie handling. */
export function coupleStageConsent(input: {
  readonly stage: CoupleStage;
  readonly startedAt: IsoDate | null;
  readonly asOfDate: IsoDate;
  readonly optionKey: string;
  readonly first: CoupleChoice;
  readonly second: CoupleChoice;
}): boolean {
  const choice = COUPLE_STAGE_CHOICES[input.stage].find(
    (row) => row.key === input.optionKey,
  );
  if (!choice || choice.consent === "none") return false;
  if (
    !coupleStageOptions(input.stage, input.startedAt, input.asOfDate).some(
      (row) => row.key === choice.key,
    )
  )
    return false;
  const selects = (result: CoupleChoice) =>
    isSelectedDecision(result) && result.selectedOptionKey === choice.key;
  return choice.consent === "both"
    ? input.first.context.actorPersonId !==
        input.second.context.actorPersonId &&
        selects(input.first) &&
        selects(input.second)
    : selects(input.first) || selects(input.second);
}
