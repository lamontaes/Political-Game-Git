// STOPGAP RULES3-CAM-044: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-helpers.ts :: helperAskConsiderations.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 57: view.belief.salience === "central"         ? "decisive"         : view.belief.salience === "high"           ? "strong"           : view.belief.salience === "moderate"             ? "moderate"             : "slight" */
export function helperAskConsiderationsRule1(facts: {
  readonly viewBeliefSalience: string;
}) {
  return facts.viewBeliefSalience === "central"
    ? "decisive"
    : facts.viewBeliefSalience === "high"
      ? "strong"
      : facts.viewBeliefSalience === "moderate"
        ? "moderate"
        : "slight";
}

/** Legacy line 66: view.belief.position === "support" ? "help" : "decline" */
export function helperAskConsiderationsRule2(facts: {
  readonly viewBeliefPosition: string;
}) {
  return facts.viewBeliefPosition === "support" ? "help" : "decline";
}

/** Legacy line 72: view.belief.position === "support"           ? "They have a favorable view of the candidate."           : "They have reservations about the candidate." */
export function helperAskConsiderationsRule3(facts: {
  readonly viewBeliefPosition: string;
}) {
  return facts.viewBeliefPosition === "support"
    ? "They have a favorable view of the candidate."
    : "They have reservations about the candidate.";
}

/** Legacy line 97: warmth.band !== "none" */
export function helperAskConsiderationsRule4(facts: {
  readonly warmthBand: string;
}) {
  return facts.warmthBand !== "none";
}

/** Legacy line 98: -1 */
export function helperAskConsiderationsRule5() {
  return -1;
}

/** Legacy line 100: interactionId ?? "recorded" */
export function helperAskConsiderationsRule6(facts: {
  readonly interactionId: string | undefined;
}) {
  return facts.interactionId! ?? "recorded";
}

/** Legacy line 101: warmth.adverse ? "decline" : "help" */
export function helperAskConsiderationsRule7(facts: {
  readonly warmthAdverse: boolean;
}) {
  return facts.warmthAdverse ? "decline" : "help";
}

/** Legacy line 105: warmth.band === "strong"           ? "strong"           : warmth.band === "marked"             ? "moderate"             : "slight" */
export function helperAskConsiderationsRule8(facts: {
  readonly warmthBand: string;
}) {
  return facts.warmthBand === "strong"
    ? "strong"
    : facts.warmthBand === "marked"
      ? "moderate"
      : "slight";
}

/** Legacy line 111: warmth.adverse         ? "Their relationship has been strained."         : "Their relationship has been warm." */
export function helperAskConsiderationsRule9(facts: {
  readonly warmthAdverse: boolean;
}) {
  return facts.warmthAdverse
    ? "Their relationship has been strained."
    : "Their relationship has been warm.";
}

/** Legacy line 114: interactionId         ? [{ kind: "relationship-interaction", interactionId }]         : [] */
export function helperAskConsiderationsRule10(facts: {
  readonly interactionId: string | undefined;
  readonly kindRelationshipInteractionInteractionId: unknown;
}) {
  return facts.interactionId!
    ? facts.kindRelationshipInteractionInteractionId
    : [];
}

/** Legacy line 121: sum + schedule.weeklyHours */
export function helperAskConsiderationsRule11(facts: {
  readonly sum: number;
  readonly scheduleWeeklyHours: number;
}) {
  return facts.sum + facts.scheduleWeeklyHours;
}

/** Legacy line 124: Math.max(0, 168 - scheduledHours) */
export function helperAskConsiderationsRule12(facts: {
  readonly scheduledHours: number;
}) {
  return Math.max(0, 168 - facts.scheduledHours);
}

/** Legacy line 127: freeHours >= 96 ? "help" : "decline" */
export function helperAskConsiderationsRule13(facts: {
  readonly freeHours: number;
}) {
  return facts.freeHours >= 96 ? "help" : "decline";
}

/** Legacy line 131: freeHours >= 120 ? "strong" : freeHours >= 72 ? "moderate" : "slight" */
export function helperAskConsiderationsRule14(facts: {
  readonly freeHours: number;
}) {
  return facts.freeHours >= 120
    ? "strong"
    : facts.freeHours >= 72
      ? "moderate"
      : "slight";
}

/** Legacy line 134: freeHours >= 96         ? "Their work schedule leaves room for campaign work."         : "Their work schedule leaves little free time for campaign work." */
export function helperAskConsiderationsRule15(facts: {
  readonly freeHours: number;
}) {
  return facts.freeHours >= 96
    ? "Their work schedule leaves room for campaign work."
    : "Their work schedule leaves little free time for campaign work.";
}

/** Legacy line 140: campaign.candidatePersonId === candidateId */
export function helperAskConsiderationsRule16(facts: {
  readonly campaignCandidatePersonId: string;
  readonly candidateId: string;
}) {
  return facts.campaignCandidatePersonId === facts.candidateId;
}

/** Legacy line 142: state.status === "won" || state.status === "lost" */
export function helperAskConsiderationsRule17(facts: {
  readonly stateStatus: string;
}) {
  return facts.stateStatus === "won" || facts.stateStatus === "lost";
}

/** Legacy line 143: left.campaign.sequence - right.campaign.sequence */
export function helperAskConsiderationsRule18(facts: {
  readonly leftCampaignSequence: number;
  readonly rightCampaignSequence: number;
}) {
  return facts.leftCampaignSequence - facts.rightCampaignSequence;
}

/** Legacy line 144: -1 */
export function helperAskConsiderationsRule19() {
  return -1;
}

/** Legacy line 148: lastCampaign.state.status === "won" ? "help" : "decline" */
export function helperAskConsiderationsRule20(facts: {
  readonly lastCampaignStateStatus: string;
}) {
  return facts.lastCampaignStateStatus === "won" ? "help" : "decline";
}

/** Legacy line 153: lastCampaign.state.reason ?? lastCampaign.state.status */
export function helperAskConsiderationsRule21(facts: {
  readonly lastCampaignStateReason: string | null;
  readonly lastCampaignStateStatus: string;
}) {
  return facts.lastCampaignStateReason! ?? facts.lastCampaignStateStatus;
}

/** Legacy line 161: event.type === "campaign.concession" &&         event.participants.some(           (participant) =>             participant.personId === candidateId &&             participant.role === "focus:subject",         ) */
export function helperAskConsiderationsRule22(facts: {
  readonly eventType: string;
  readonly eventparticipantssomeResult: boolean;
}) {
  return (
    facts.eventType === "campaign.concession" &&
    facts.eventparticipantssomeResult
  );
}

/** Legacy line 164: participant.personId === candidateId &&             participant.role === "focus:subject" */
export function helperAskConsiderationsRule23(facts: {
  readonly participantPersonId: string;
  readonly candidateId: string;
  readonly participantRole: string;
}) {
  return (
    facts.participantPersonId === facts.candidateId &&
    facts.participantRole === "focus:subject"
  );
}

/** Legacy line 170: left.occurredAt.localeCompare(right.occurredAt) ||         left.sequence - right.sequence */
export function helperAskConsiderationsRule24(facts: {
  readonly leftOccurredAtLocaleCompareRightOccurredAt: number;
  readonly leftSequence: number;
  readonly rightSequence: number;
}) {
  return (
    facts.leftOccurredAtLocaleCompareRightOccurredAt ||
    facts.leftSequence - facts.rightSequence
  );
}

/** Legacy line 173: -1 */
export function helperAskConsiderationsRule25() {
  return -1;
}

/** Legacy line 179: reaction === "stayed-quiet" ? "decline" : "help" */
export function helperAskConsiderationsRule26(facts: {
  readonly reaction: string;
}) {
  return facts.reaction === "stayed-quiet" ? "decline" : "help";
}

/** Legacy line 182: reaction === "cheered" ? "moderate" : "slight" */
export function helperAskConsiderationsRule27(facts: {
  readonly reaction: string;
}) {
  return facts.reaction === "cheered" ? "moderate" : "slight";
}

/** Legacy line 191: interaction.kind === "support:campaign-thanked" &&         interaction.eventId === concession.id &&         interaction.personIds.includes(candidateId) &&         interaction.personIds.includes(personId) */
export function helperAskConsiderationsRule28(facts: {
  readonly interactionKind: string;
  readonly interactionEventId: string | null;
  readonly concessionId: string;
  readonly interactionPersonIdsIncludesCandidateId: boolean;
  readonly interactionPersonIdsIncludesPersonId: boolean;
}) {
  return (
    facts.interactionKind === "support:campaign-thanked" &&
    facts.interactionEventId! === facts.concessionId &&
    facts.interactionPersonIdsIncludesCandidateId &&
    facts.interactionPersonIdsIncludesPersonId
  );
}
