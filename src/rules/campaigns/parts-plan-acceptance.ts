// STOPGAP RULES3-CAM-014: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-life-activities.ts :: planAcceptance.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 873: !record || record.subjectPersonId !== personId */
export function planAcceptanceRule1(facts: {
  readonly record: unknown;
  readonly recordSubjectPersonId: string;
  readonly personId: string;
}) {
  return !facts.record || facts.recordSubjectPersonId !== facts.personId;
}

/** Legacy line 874: !controlled(world, personId) || outcomeFor(world, record.id) */
export function planAcceptanceRule2(facts: {
  readonly controlledWorldPersonId: boolean;
  readonly outcomeForWorldRecordId: unknown;
}) {
  return !facts.controlledWorldPersonId || facts.outcomeForWorldRecordId;
}

/** Legacy line 877: tentative.kind !== "tentative" */
export function planAcceptanceRule3(facts: { readonly tentativeKind: string }) {
  return facts.tentativeKind !== "tentative";
}

/** Legacy line 880: state.status !== "scheduled" ||     compareSimulationMoments(state.start, world.currentMoment) <= 0 */
export function planAcceptanceRule4(facts: {
  readonly stateStatus: string;
  readonly compareSimulationMomentsStateStartWorldCurrentMoment: number;
}) {
  return (
    facts.stateStatus !== "scheduled" ||
    facts.compareSimulationMomentsStateStartWorldCurrentMoment <= 0
  );
}

/** Legacy line 887: journey ? [journey.id] : [] */
export function planAcceptanceRule5(facts: {
  readonly journey: unknown;
  readonly journeyId: unknown[];
}) {
  return facts.journey ? facts.journeyId : [];
}

/** Legacy line 888: compareSimulationMoments(leave, world.currentMoment) <= 0 */
export function planAcceptanceRule6(facts: {
  readonly compareSimulationMomentsLeaveWorldCurrentMoment: number;
}) {
  return facts.compareSimulationMomentsLeaveWorldCurrentMoment <= 0;
}

/** Legacy line 890: !host || deceased(world, host.id) */
export function planAcceptanceRule7(facts: {
  readonly host: unknown;
  readonly deceasedWorldHostId: boolean;
}) {
  return !facts.host || facts.deceasedWorldHostId;
}

/** Legacy line 894: subjectBusy(world, personId, entry, leave, state.end, ignored) ||     busy(world, [record.hostPersonId], state.start, state.end, ignored) */
export function planAcceptanceRule8(facts: {
  readonly subjectBusyWorldPersonIdEntryLeaveStateEndIgnored: boolean;
  readonly busyWorldRecordHostPersonIdStateStartStateEndIgnored: boolean;
}) {
  return (
    facts.subjectBusyWorldPersonIdEntryLeaveStateEndIgnored ||
    facts.busyWorldRecordHostPersonIdStateStartStateEndIgnored
  );
}
