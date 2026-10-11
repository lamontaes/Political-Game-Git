// STOPGAP RULES3-GOV-039: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/constituent-views.ts :: constituentsConsideration.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 71: side.bySalience.low * weight.low +       side.bySalience.moderate * weight.moderate +       side.bySalience.high * weight.high +       side.bySalience.central * weight.central */
export function constituentsConsiderationRule1(facts: {
  readonly sideBySalienceLow: number;
  readonly weightLow: number;
  readonly sideBySalienceModerate: number;
  readonly weightModerate: number;
  readonly sideBySalienceHigh: number;
  readonly weightHigh: number;
  readonly sideBySalienceCentral: number;
  readonly weightCentral: number;
}) {
  return (
    facts.sideBySalienceLow * facts.weightLow +
    facts.sideBySalienceModerate * facts.weightModerate +
    facts.sideBySalienceHigh * facts.weightHigh +
    facts.sideBySalienceCentral * facts.weightCentral
  );
}

/** Legacy line 77: people += views.support.people + views.oppose.people */
export function constituentsConsiderationRule2(facts: {
  readonly people: number;
  readonly viewsSupportPeople: number;
  readonly viewsOpposePeople: number;
}) {
  return facts.people + (facts.viewsSupportPeople + facts.viewsOpposePeople);
}

/** Legacy line 78: peopleFor +=       answer.answer === "yes" ? views.support.people : views.oppose.people */
export function constituentsConsiderationRule3(facts: {
  readonly peopleFor: number;
  readonly answerAnswer: string;
  readonly viewsSupportPeople: number;
  readonly viewsOpposePeople: number;
}) {
  return (
    facts.peopleFor +
    (facts.answerAnswer === "yes"
      ? facts.viewsSupportPeople
      : facts.viewsOpposePeople)
  );
}

/** Legacy line 80: forIt += answer.answer === "yes" ? yes : no */
export function constituentsConsiderationRule4(facts: {
  readonly forIt: number;
  readonly answerAnswer: string;
  readonly yes: number;
  readonly no: number;
}) {
  return facts.forIt + (facts.answerAnswer === "yes" ? facts.yes : facts.no);
}

/** Legacy line 81: against += answer.answer === "yes" ? no : yes */
export function constituentsConsiderationRule5(facts: {
  readonly against: number;
  readonly answerAnswer: string;
  readonly no: number;
  readonly yes: number;
}) {
  return facts.against + (facts.answerAnswer === "yes" ? facts.no : facts.yes);
}

/** Legacy line 84: messagesByProposition.get(answer.propositionId) ??       [] */
export function constituentsConsiderationRule6(facts: {
  readonly messagesByPropositionGetAnswerPropositionId: unknown;
}) {
  return facts.messagesByPropositionGetAnswerPropositionId ?? [];
}

/** Legacy line 88: !prior ||         message.occurredAt > prior.occurredAt ||         (message.occurredAt === prior.occurredAt &&           message.sequence > prior.sequence) */
export function constituentsConsiderationRule7(facts: {
  readonly prior: unknown;
  readonly messageOccurredAt: string;
  readonly priorOccurredAt: string;
  readonly messageSequence: number;
  readonly priorSequence: number;
}) {
  return (
    !facts.prior ||
    facts.messageOccurredAt > facts.priorOccurredAt ||
    (facts.messageOccurredAt === facts.priorOccurredAt &&
      facts.messageSequence > facts.priorSequence)
  );
}

/** Legacy line 99: message.stance === answer.answer ? "for" : "against" */
export function constituentsConsiderationRule8(facts: {
  readonly messageStance: string;
  readonly answerAnswer: string;
}) {
  return facts.messageStance === facts.answerAnswer ? "for" : "against";
}

/** Legacy line 107: message.stance === "for" */
export function constituentsConsiderationRule9(facts: {
  readonly messageStance: string;
}) {
  return facts.messageStance === "for";
}

/** Legacy line 107: messageFor += message.weight */
export function constituentsConsiderationRule10(facts: {
  readonly messageFor: number;
  readonly messageWeight: number;
}) {
  return facts.messageFor + facts.messageWeight;
}

/** Legacy line 108: messageAgainst += message.weight */
export function constituentsConsiderationRule11(facts: {
  readonly messageAgainst: number;
  readonly messageWeight: number;
}) {
  return facts.messageAgainst + facts.messageWeight;
}

/** Legacy line 110: forIt + messageFor */
export function constituentsConsiderationRule12(facts: {
  readonly forIt: number;
  readonly messageFor: number;
}) {
  return facts.forIt + facts.messageFor;
}

/** Legacy line 111: against + messageAgainst */
export function constituentsConsiderationRule13(facts: {
  readonly against: number;
  readonly messageAgainst: number;
}) {
  return facts.against + facts.messageAgainst;
}

/** Legacy line 113: combinedFor === combinedAgainst ||     (messageSenders.size === 0 && !distinguishable(peopleFor, people)) */
export function constituentsConsiderationRule14(facts: {
  readonly combinedFor: number;
  readonly combinedAgainst: number;
  readonly messageSendersSize: number;
  readonly distinguishablePeopleForPeople: boolean;
}) {
  return (
    facts.combinedFor === facts.combinedAgainst ||
    (facts.messageSendersSize === 0 && !facts.distinguishablePeopleForPeople)
  );
}

/** Legacy line 117: combinedFor > combinedAgainst */
export function constituentsConsiderationRule15(facts: {
  readonly combinedFor: number;
  readonly combinedAgainst: number;
}) {
  return facts.combinedFor > facts.combinedAgainst;
}

/** Legacy line 118: favor     ? [combinedFor, combinedAgainst]     : [combinedAgainst, combinedFor] */
export function constituentsConsiderationRule16(facts: {
  readonly favor: boolean;
  readonly combinedForCombinedAgainst: number[];
  readonly combinedAgainstCombinedFor: number[];
}) {
  return facts.favor
    ? facts.combinedForCombinedAgainst
    : facts.combinedAgainstCombinedFor;
}

/** Legacy line 134: favor       ? "member:constituents:for"       : "member:constituents:against" */
export function constituentsConsiderationRule17(facts: {
  readonly favor: boolean;
}) {
  return facts.favor
    ? "member:constituents:for"
    : "member:constituents:against";
}

/** Legacy line 137: favor ? "vote-yea" : "vote-nay" */
export function constituentsConsiderationRule18(facts: {
  readonly favor: boolean;
}) {
  return facts.favor ? "vote-yea" : "vote-nay";
}

/** Legacy line 140: more >= 2 * less ? "moderate" : "slight" */
export function constituentsConsiderationRule19(facts: {
  readonly more: number;
  readonly less: number;
}) {
  return facts.more >= 2 * facts.less ? "moderate" : "slight";
}

/** Legacy line 143: messageRefs.length > 0         ? `Of the ${people} voters here who hold a settled view, and constituents who wrote their elected officials (${senderNames.join(", ")}), the stronger recorded considerations lean ${favor ? "for" : "against"} it.`        */
export function constituentsConsiderationRule20(facts: {
  readonly messageRefsLength: number;
  readonly people: number;
  readonly senderNamesJoin: string;
  readonly favor: boolean;
}) {
  return facts.messageRefsLength > 0
    ? `Of the ${facts.people} voters here who hold a settled view, and constituents who wrote their elected officials (${facts.senderNamesJoin}), the stronger recorded considerations lean ${facts.favor ? "for" : "against"} it.`
    : `Of the ${facts.people} voters here who hold a settled view, those who care most lean ${facts.favor ? "for" : "against"} it.`;
}
