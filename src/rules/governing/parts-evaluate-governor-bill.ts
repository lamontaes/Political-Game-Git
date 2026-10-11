// STOPGAP RULES3-GOV-089: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/governor-bill-decision.ts :: evaluateGovernorBill.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 426: input.playerChoice       ? [           {             stableKey: "executive:player-instruction",             optionKey:               input.playerChoice.optionKey === BILL_SIGN                 ? BILL_RETURN                 : BILL_SIGN,             kin */
export function evaluateGovernorBillRule1(facts: {
  readonly inputPlayerChoice: unknown;
  readonly stableKeyExecutivePlayerInstructionOptionKeyInputPlayerChoic: unknown[];
}) {
  return facts.inputPlayerChoice
    ? facts.stableKeyExecutivePlayerInstructionOptionKeyInputPlayerChoic
    : [];
}

/** Legacy line 431: input.playerChoice.optionKey === BILL_SIGN                 ? BILL_RETURN                 : BILL_SIGN */
export function evaluateGovernorBillRule2(facts: {
  readonly inputPlayerChoiceOptionKey: string;
  readonly BILL_SIGN: string;
  readonly BILL_RETURN: string;
}) {
  return facts.inputPlayerChoiceOptionKey === facts.BILL_SIGN
    ? facts.BILL_RETURN
    : facts.BILL_SIGN;
}

/** Legacy line 442: input.playerChoice.matterKnowledgeId                 ? [                     {                       kind: "event-knowledge" as const,                       knowledgeId: input.playerChoice.matterKnowledgeId,                     },                   ] */
export function evaluateGovernorBillRule3(facts: {
  readonly inputPlayerChoiceMatterKnowledgeId: string | undefined;
  readonly kindEventKnowledgeAsConstKnowledgeIdInputPlayerChoiceMatterK: unknown[];
}) {
  return facts.inputPlayerChoiceMatterKnowledgeId!
    ? facts.kindEventKnowledgeAsConstKnowledgeIdInputPlayerChoiceMatterK
    : [];
}

/** Legacy line 460: input.executiveTitle         ? {             ...reason,             explanation: reason.explanation.replace(               /\bgovernor\b/g,               input.executiveTitle.toLowerCase(),             ),           }         : reason */
export function evaluateGovernorBillRule4(facts: {
  readonly inputExecutiveTitle: string | undefined;
  readonly reasonExplanationReasonExplanationReplaceBgovernorBGInputExe: unknown;
  readonly reason: unknown;
}) {
  return facts.inputExecutiveTitle!
    ? facts.reasonExplanationReasonExplanationReplaceBgovernorBGInputExe
    : facts.reason;
}
