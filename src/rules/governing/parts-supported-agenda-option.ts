// STOPGAP RULES3-GOV-062: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: supportedAgendaOption.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1395: !evaluation || evaluation.outcomeKind !== "selected" */
export function supportedAgendaOptionRule1(facts: {
  readonly evaluation: unknown;
  readonly evaluationOutcomeKind: string;
}) {
  return !facts.evaluation || facts.evaluationOutcomeKind !== "selected";
}

/** Legacy line 1399: reason.optionKey === option.key */
export function supportedAgendaOptionRule2(facts: {
  readonly reasonOptionKey: string;
  readonly optionKey: string;
}) {
  return facts.reasonOptionKey === facts.optionKey;
}

/** Legacy line 1400: total + considerationScore(reason) */
export function supportedAgendaOptionRule3(facts: {
  readonly total: number;
  readonly considerationScoreReason: number;
}) {
  return facts.total + facts.considerationScoreReason;
}

/** Legacy line 1403: option.key === evaluation.selectedOptionKey */
export function supportedAgendaOptionRule4(facts: {
  readonly optionKey: string;
  readonly evaluationSelectedOptionKey: string | null;
}) {
  return facts.optionKey === facts.evaluationSelectedOptionKey!;
}

/** Legacy line 1405: selected &&     selected.score > 0 &&     scores.every(       (option) => option.key === selected.key || option.score < selected.score,     )     ? selected.key     : null */
export function supportedAgendaOptionRule5(facts: {
  readonly selected: unknown;
  readonly selectedScore: number;
  readonly scoresEveryOptionOptionKeySelectedKeyOptionScoreSelectedScore: boolean;
  readonly selectedKey: string;
}) {
  return facts.selected &&
    facts.selectedScore > 0 &&
    facts.scoresEveryOptionOptionKeySelectedKeyOptionScoreSelectedScore
    ? facts.selectedKey
    : null;
}

/** Legacy line 1408: option.key === selected.key || option.score < selected.score */
export function supportedAgendaOptionRule6(facts: {
  readonly optionKey: string;
  readonly selectedKey: string;
  readonly optionScore: number;
  readonly selectedScore: number;
}) {
  return (
    facts.optionKey === facts.selectedKey ||
    facts.optionScore < facts.selectedScore
  );
}
