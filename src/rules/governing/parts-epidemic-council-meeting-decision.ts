// STOPGAP RULES3-GOV-016: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: epidemicCouncilMeetingDecision.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 604: sick.size === 0 */
export function epidemicCouncilMeetingDecisionRule1(facts: {
  readonly sickSize: number;
}) {
  return facts.sickSize === 0;
}

/** Legacy line 607: person.homeJurisdictionId === input.town &&       isPersonAliveAt(world, person.id, currentLifeCutoff(world)) */
export function epidemicCouncilMeetingDecisionRule2(facts: {
  readonly personHomeJurisdictionId: string;
  readonly inputTown: string;
  readonly isPersonAliveAtWorldPersonIdCurrentLifeCutoffWorld: boolean;
}) {
  return (
    facts.personHomeJurisdictionId === facts.inputTown &&
    facts.isPersonAliveAtWorldPersonIdCurrentLifeCutoffWorld
  );
}

/** Legacy line 612: Math.floor(input.memberPersonIds.length / 2) + 1 */
export function epidemicCouncilMeetingDecisionRule3(facts: {
  readonly inputMemberPersonIdsLength: number;
}) {
  return Math.floor(facts.inputMemberPersonIdsLength / 2) + 1;
}

/** Legacy line 613: input.memberPersonIds.length - membersSick.length */
export function epidemicCouncilMeetingDecisionRule4(facts: {
  readonly inputMemberPersonIdsLength: number;
  readonly membersSickLength: number;
}) {
  return facts.inputMemberPersonIdsLength - facts.membersSickLength;
}

/** Legacy line 615: chair ? riskApproachOf(world, chair) : "neutral" */
export function epidemicCouncilMeetingDecisionRule5(facts: {
  readonly chair: string | null;
  readonly riskApproachOfWorldChair: string;
}) {
  return facts.chair! ? facts.riskApproachOfWorldChair : "neutral";
}

/** Legacy line 616: residents.length === 0 ? 0 : townSick / residents.length */
export function epidemicCouncilMeetingDecisionRule6(facts: {
  readonly residentsLength: number;
  readonly townSick: number;
}) {
  return facts.residentsLength === 0
    ? 0
    : facts.townSick / facts.residentsLength;
}

/** Legacy line 618: input.memberPersonIds.length > 0 && well < quorum */
export function epidemicCouncilMeetingDecisionRule7(facts: {
  readonly inputMemberPersonIdsLength: number;
  readonly well: number;
  readonly quorum: number;
}) {
  return facts.inputMemberPersonIdsLength > 0 && facts.well < facts.quorum;
}

/** Legacy line 620: chair && share >= U.meetingCancelShare[approach] */
export function epidemicCouncilMeetingDecisionRule8(facts: {
  readonly chair: string | null;
  readonly share: number;
  readonly UMeetingCancelShareApproach: number;
}) {
  return facts.chair! && facts.share >= facts.UMeetingCancelShareApproach;
}

/** Legacy line 622: !reason */
export function epidemicCouncilMeetingDecisionRule9(facts: {
  readonly reason: string | null;
}) {
  return !facts.reason!;
}

/** Legacy line 623: chair ? personName(world.people[chair]!) : null */
export function epidemicCouncilMeetingDecisionRule10(facts: {
  readonly chair: string | null;
  readonly personNameWorldPeopleChair: string;
}) {
  return facts.chair! ? facts.personNameWorldPeopleChair : null;
}

/** Legacy line 630: chair ? [chair] : [] */
export function epidemicCouncilMeetingDecisionRule11(facts: {
  readonly chair: string | null;
  readonly chair2: unknown[];
}) {
  return facts.chair! ? facts.chair2 : [];
}

/** Legacy line 631: chair       ? [{ personId: chair, role: "agency:decider", detail: approach }]       : [] */
export function epidemicCouncilMeetingDecisionRule12(facts: {
  readonly chair: string | null;
  readonly personIdChairRoleAgencyDeciderDetailApproach: unknown[];
}) {
  return facts.chair! ? facts.personIdChairRoleAgencyDeciderDetailApproach : [];
}

/** Legacy line 643: chairName       ? `${chairName} canceled the meeting of the ${input.bodyName} because ${reason}.`       : `The meeting of the ${input.bodyName} was canceled because ${reason}.` */
export function epidemicCouncilMeetingDecisionRule13(facts: {
  readonly chairName: string | null;
  readonly inputBodyName: string;
  readonly reason: string;
}) {
  return facts.chairName!
    ? `${facts.chairName} canceled the meeting of the ${facts.inputBodyName} because ${facts.reason}.`
    : `The meeting of the ${facts.inputBodyName} was canceled because ${facts.reason}.`;
}
