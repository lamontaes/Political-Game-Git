// STOPGAP RULES3-GOV-060: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: completedGoverningMatterWork.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1245: !matter ||     !decision ||     !matter.workItemId ||     matter.status !== "decided" ||     decision.occurredAt > world.currentDate ||     decision.recordedAt > world.currentDate ||     decision.sequence <= matter.openedEvent.sequence ||     !decisi */
export function completedGoverningMatterWorkRule1(facts: {
  readonly matter: unknown;
  readonly decision: unknown;
  readonly matterWorkItemId: string | null;
  readonly matterStatus: string;
  readonly decisionOccurredAt: string;
  readonly currentDate: string;
  readonly decisionRecordedAt: string;
  readonly decisionSequence: number;
  readonly matterOpenedEventSequence: number;
  readonly decisionTagsIncludesOffice$MatterOfficeKey: boolean;
  readonly decisionTagsIncludesMatterFamily$MatterFamily: boolean;
  readonly decisionparticipantssomeResult: boolean;
}) {
  return (
    !facts.matter ||
    !facts.decision ||
    !facts.matterWorkItemId! ||
    facts.matterStatus !== "decided" ||
    facts.decisionOccurredAt > facts.currentDate ||
    facts.decisionRecordedAt > facts.currentDate ||
    facts.decisionSequence <= facts.matterOpenedEventSequence ||
    !facts.decisionTagsIncludesOffice$MatterOfficeKey ||
    !facts.decisionTagsIncludesMatterFamily$MatterFamily ||
    !facts.decisionparticipantssomeResult
  );
}

/** Legacy line 1255: row.role === "agency:decider" && world.people[row.personId] */
export function completedGoverningMatterWorkRule2(facts: {
  readonly rowRole: string;
  readonly peopleRowPersonId: unknown;
}) {
  return facts.rowRole === "agency:decider" && facts.peopleRowPersonId;
}

/** Legacy line 1260: item.id === matter.workItemId */
export function completedGoverningMatterWorkRule3(facts: {
  readonly itemId: string;
  readonly matterWorkItemId: string | null;
}) {
  return facts.itemId === facts.matterWorkItemId!;
}

/** Legacy line 1263: !work ||     !work.sourceEntityIds.includes(matter.id) ||     work.focus.kind !== "other" ||     work.focus.sourceEntityId !== matter.id ||     !world.history.workItemStates.some((state) => state.workItemId === work.id) */
export function completedGoverningMatterWorkRule4(facts: {
  readonly work: unknown;
  readonly workSourceEntityIdsIncludesMatterId: boolean;
  readonly workFocusKind: string;
  readonly workFocusSourceEntityId: string;
  readonly matterId: string;
  readonly historyWorkItemStatesSomeStateStateWorkItemIdWorkId: boolean;
}) {
  return (
    !facts.work ||
    !facts.workSourceEntityIdsIncludesMatterId ||
    facts.workFocusKind !== "other" ||
    facts.workFocusSourceEntityId !== facts.matterId ||
    !facts.historyWorkItemStatesSomeStateStateWorkItemIdWorkId
  );
}

/** Legacy line 1267: state.workItemId === work.id */
export function completedGoverningMatterWorkRule5(facts: {
  readonly stateWorkItemId: string;
  readonly workId: string;
}) {
  return facts.stateWorkItemId === facts.workId;
}

/** Legacy line 1271: state.status === "completed" &&     state.outcomeEventId === decision.id &&     state.sequence > decision.sequence &&     compareSimulationMoments(state.recordedAt, world.currentMoment) <= 0     ? state     : null */
export function completedGoverningMatterWorkRule6(facts: {
  readonly stateStatus: string;
  readonly stateOutcomeEventId: string | null;
  readonly decisionId: string;
  readonly stateSequence: number;
  readonly decisionSequence: number;
  readonly compareSimulationMomentsStateRecordedAtWorldCurrentMoment: number;
  readonly state: unknown;
}) {
  return facts.stateStatus === "completed" &&
    facts.stateOutcomeEventId! === facts.decisionId &&
    facts.stateSequence > facts.decisionSequence &&
    facts.compareSimulationMomentsStateRecordedAtWorldCurrentMoment <= 0
    ? facts.state
    : null;
}
