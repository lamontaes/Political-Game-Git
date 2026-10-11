// STOPGAP RULES3-GOV-069: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/municipal-public-work.ts :: evaluateMunicipalManagerElection.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1569: !government */
export function evaluateMunicipalManagerElectionRule1(facts: {
  readonly government: unknown;
}) {
  return !facts.government;
}

/** Legacy line 1574: councilors.length === 0 */
export function evaluateMunicipalManagerElectionRule2(facts: {
  readonly councilorsLength: number;
}) {
  return facts.councilorsLength === 0;
}

/** Legacy line 1577: reading.bodyName ?? reading.displayName */
export function evaluateMunicipalManagerElectionRule3(facts: {
  readonly readingBodyName: string | null;
  readonly readingDisplayName: string;
}) {
  return facts.readingBodyName! ?? facts.readingDisplayName;
}

/** Legacy line 1580: input.dispositions.length === 0 */
export function evaluateMunicipalManagerElectionRule4(facts: {
  readonly inputDispositionsLength: number;
}) {
  return facts.inputDispositionsLength === 0;
}

/** Legacy line 1583: reading.bodyName ?? reading.displayName */
export function evaluateMunicipalManagerElectionRule5(facts: {
  readonly readingBodyName: string | null;
  readonly readingDisplayName: string;
}) {
  return facts.readingBodyName! ?? facts.readingDisplayName;
}

/** Legacy line 1592: entry.memberKey.trim().length === 0 */
export function evaluateMunicipalManagerElectionRule6(facts: {
  readonly entryMemberKeyTrimLength: number;
}) {
  return facts.entryMemberKeyTrimLength === 0;
}

/** Legacy line 1602: entry.personId && seenPeople.has(entry.personId) */
export function evaluateMunicipalManagerElectionRule7(facts: {
  readonly entryPersonId: string | null;
  readonly seenPeopleHasEntryPersonId: boolean;
}) {
  return facts.entryPersonId! && facts.seenPeopleHasEntryPersonId;
}

/** Legacy line 1610: !entry.personId || !seatedByPerson.has(entry.personId) */
export function evaluateMunicipalManagerElectionRule8(facts: {
  readonly entryPersonId: string | null;
  readonly seatedByPersonHasEntryPersonId: boolean;
}) {
  return !facts.entryPersonId! || !facts.seatedByPersonHasEntryPersonId;
}

/** Legacy line 1613: reading.bodyName ?? reading.displayName */
export function evaluateMunicipalManagerElectionRule9(facts: {
  readonly readingBodyName: string | null;
  readonly readingDisplayName: string;
}) {
  return facts.readingBodyName! ?? facts.readingDisplayName;
}

/** Legacy line 1618: !quorumThreshold */
export function evaluateMunicipalManagerElectionRule10(facts: {
  readonly quorumThreshold: unknown;
}) {
  return !facts.quorumThreshold;
}

/** Legacy line 1626: reading.procedure.quorumText ?? "Quorum." */
export function evaluateMunicipalManagerElectionRule11(facts: {
  readonly readingProcedureQuorumText: string | null;
}) {
  return facts.readingProcedureQuorumText! ?? "Quorum.";
}

/** Legacy line 1627: reading.procedure.quorumText ?? "quorum" */
export function evaluateMunicipalManagerElectionRule12(facts: {
  readonly readingProcedureQuorumText: string | null;
}) {
  return facts.readingProcedureQuorumText! ?? "quorum";
}

/** Legacy line 1635: quorumRule.countedAgainst === "members-present"       ? presentMembers       : quorumRule.countedAgainst === "members-voting"         ? tally.yea + tally.nay         : eligibleMembers */
export function evaluateMunicipalManagerElectionRule13(facts: {
  readonly quorumRuleCountedAgainst: string;
  readonly presentMembers: number;
  readonly tallyYea: number;
  readonly tallyNay: number;
  readonly eligibleMembers: number;
}) {
  return facts.quorumRuleCountedAgainst === "members-present"
    ? facts.presentMembers
    : facts.quorumRuleCountedAgainst === "members-voting"
      ? facts.tallyYea + facts.tallyNay
      : facts.eligibleMembers;
}

/** Legacy line 1641: presentMembers < quorum.requiredVotes */
export function evaluateMunicipalManagerElectionRule14(facts: {
  readonly presentMembers: number;
  readonly quorumRequiredVotes: number;
}) {
  return facts.presentMembers < facts.quorumRequiredVotes;
}

/** Legacy line 1644: reading.bodyName ?? reading.displayName */
export function evaluateMunicipalManagerElectionRule15(facts: {
  readonly readingBodyName: string | null;
  readonly readingDisplayName: string;
}) {
  return facts.readingBodyName! ?? facts.readingDisplayName;
}

/** Legacy line 1644: reading.procedure.quorumText ?? "the instrument names a quorum" */
export function evaluateMunicipalManagerElectionRule16(facts: {
  readonly readingProcedureQuorumText: string | null;
}) {
  return facts.readingProcedureQuorumText! ?? "the instrument names a quorum";
}

/** Legacy line 1649: power.power === "APPOINTMENT" &&       (power.heldByRole === "COUNCIL" || power.heldByRole === "COMMISSION") */
export function evaluateMunicipalManagerElectionRule17(facts: {
  readonly powerPower: string;
  readonly powerHeldByRole: string;
}) {
  return (
    facts.powerPower === "APPOINTMENT" &&
    (facts.powerHeldByRole === "COUNCIL" ||
      facts.powerHeldByRole === "COMMISSION")
  );
}

/** Legacy line 1652: reading.manager?.title ?? "professional manager" */
export function evaluateMunicipalManagerElectionRule18(facts: {
  readonly readingManagerTitle: string | undefined;
}) {
  return facts.readingManagerTitle! ?? "professional manager";
}

/** Legacy line 1653: appointment?.threshold     ? municipalVoteThresholdRule(         appointment.threshold,         appointment.conditions.join(" ") || `Election of the ${title}.`,         municipalRuleSourceRef(reading, appointment.target ?? title),       )     : manag */
export function evaluateMunicipalManagerElectionRule19(facts: {
  readonly appointmentThreshold: unknown;
  readonly municipalVoteThresholdRuleResult: unknown;
  readonly managerElectionDecisionRuleInputGovernmentKey: unknown;
}) {
  return facts.appointmentThreshold
    ? facts.municipalVoteThresholdRuleResult
    : facts.managerElectionDecisionRuleInputGovernmentKey;
}

/** Legacy line 1656: appointment.conditions.join(" ") || `Election of the ${title}.` */
export function evaluateMunicipalManagerElectionRule20(facts: {
  readonly appointmentConditionsJoin: string;
  readonly title: string;
}) {
  return facts.appointmentConditionsJoin || `Election of the ${facts.title}.`;
}

/** Legacy line 1657: appointment.target ?? title */
export function evaluateMunicipalManagerElectionRule21(facts: {
  readonly appointmentTarget: string | null;
  readonly title: string;
}) {
  return facts.appointmentTarget! ?? facts.title;
}

/** Legacy line 1660: !electionRule */
export function evaluateMunicipalManagerElectionRule22(facts: {
  readonly electionRule: unknown;
}) {
  return !facts.electionRule;
}

/** Legacy line 1667: tally.yea + tally.nay === 0 */
export function evaluateMunicipalManagerElectionRule23(facts: {
  readonly tallyYea: number;
  readonly tallyNay: number;
}) {
  return facts.tallyYea + facts.tallyNay === 0;
}

/** Legacy line 1670: reading.bodyName ?? reading.displayName */
export function evaluateMunicipalManagerElectionRule24(facts: {
  readonly readingBodyName: string | null;
  readonly readingDisplayName: string;
}) {
  return facts.readingBodyName! ?? facts.readingDisplayName;
}

/** Legacy line 1675: electionRule.countedAgainst === "members-present"       ? presentMembers       : electionRule.countedAgainst === "members-elected"         ? eligibleMembers         : tally.yea + tally.nay */
export function evaluateMunicipalManagerElectionRule25(facts: {
  readonly electionRuleCountedAgainst: string;
  readonly presentMembers: number;
  readonly eligibleMembers: number;
  readonly tallyYea: number;
  readonly tallyNay: number;
}) {
  return facts.electionRuleCountedAgainst === "members-present"
    ? facts.presentMembers
    : facts.electionRuleCountedAgainst === "members-elected"
      ? facts.eligibleMembers
      : facts.tallyYea + facts.tallyNay;
}

/** Legacy line 1681: tally.yea < election.requiredVotes */
export function evaluateMunicipalManagerElectionRule26(facts: {
  readonly tallyYea: number;
  readonly electionRequiredVotes: number;
}) {
  return facts.tallyYea < facts.electionRequiredVotes;
}

/** Legacy line 1684: reading.bodyName ?? reading.displayName */
export function evaluateMunicipalManagerElectionRule27(facts: {
  readonly readingBodyName: string | null;
  readonly readingDisplayName: string;
}) {
  return facts.readingBodyName! ?? facts.readingDisplayName;
}
