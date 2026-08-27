import {
  addDays,
  addSimulationMinutes,
  assertSimulationMoment,
  compareSimulationMoments,
  makeSimulationMoment,
  sameSimulationMoment,
  simulationMinutesBetween,
} from "./dates";
import { createStableId } from "./ids";
import {
  policySemanticsEntityAvailableAt,
  policySemanticsEntityExists,
} from "./policy-semantics";
import type {
  CanonicalAccess,
  EntityId,
  FutureTransitionHandlerRegistry,
  ScheduledActivityFlexibility,
  ScheduledActivityKind,
  ScheduledActivityRecord,
  ScheduledActivityStateRecord,
  SimulationMoment,
  WorkFocusTarget,
  WorkItemRecord,
  WorkItemStateRecord,
  WorkPlayerRequirement,
  World,
} from "./types";
import {
  EMPTY_FUTURE_TRANSITION_HANDLERS,
  resolveFutureDueItemsThrough,
} from "./future-transitions";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export interface CreateScheduledActivityInput {
  readonly stableKey: string;
  readonly title: string;
  readonly summary: string;
  readonly kind: ScheduledActivityKind;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  readonly participantPersonIds: readonly EntityId[];
  readonly responsiblePersonId: EntityId | null;
  readonly location: ScheduledActivityRecord["location"];
  readonly sourceEntityIds: readonly EntityId[];
  readonly flexibility: ScheduledActivityFlexibility;
  readonly access: CanonicalAccess;
}

export interface RescheduleScheduledActivityInput {
  readonly stableKey: string;
  readonly activityId: EntityId;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
}

export type ScheduleFailureReason =
  | "activity-not-scheduled"
  | "fixed-commitment"
  | "outside-flexibility-range"
  | "starts-in-the-past"
  | "conflict";

export type RescheduleScheduledActivityResult =
  | {
      readonly ok: true;
      readonly world: World;
      readonly state: ScheduledActivityStateRecord;
    }
  | {
      readonly ok: false;
      readonly world: World;
      readonly reason: ScheduleFailureReason;
      readonly conflictingActivityIds: readonly EntityId[];
    };

export interface CreateWorkItemInput {
  readonly stableKey: string;
  readonly title: string;
  readonly summary: string;
  readonly jurisdictionId: EntityId | null;
  readonly sourceEntityIds: readonly EntityId[];
  readonly focus: WorkFocusTarget;
  readonly effort: WorkItemRecord["effort"];
  readonly access: CanonicalAccess;
  readonly assignedPersonIds: readonly EntityId[];
  readonly playerRequirement: WorkPlayerRequirement;
  readonly waitingOnPersonIds: readonly EntityId[];
  readonly blocker: string | null;
  readonly scheduledActivityId: EntityId | null;
}

export interface AssignWorkItemInput {
  readonly stableKey: string;
  readonly workItemId: EntityId;
  readonly assigneePersonId: EntityId;
}

export type WorkPendingGroup =
  "needs-you" | "waiting-on-others" | "staff-handling" | "completed-ready";

export interface WorkPendingEntry {
  readonly item: WorkItemRecord;
  readonly state: WorkItemStateRecord;
  readonly group: WorkPendingGroup;
}

const SCHEDULE_KINDS = [
  "confirmed",
  "tentative",
  "flexible",
  "travel",
] as const;
const ACTIVITY_STATUSES = ["scheduled", "completed", "cancelled"] as const;
const ACTIVITY_CHANGES = [
  "created",
  "rescheduled",
  "completed",
  "cancelled",
] as const;
const WORK_STATUSES = [
  "active",
  "ready-for-review",
  "completed",
  "cancelled",
] as const;
const PLAYER_REQUIREMENTS = ["decision", "action", "none"] as const;

function canonicalIds(ids: readonly EntityId[], label: string): EntityId[] {
  const result = [...new Set(ids)].sort();
  if (result.length !== ids.length) {
    throw new Error(`${label} contains duplicate IDs.`);
  }
  return result;
}

function requireText(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}

function cloneMoment(moment: SimulationMoment): SimulationMoment {
  return makeSimulationMoment(moment);
}

function cloneAccess(access: CanonicalAccess): CanonicalAccess {
  return access.kind === "office"
    ? { kind: "office" }
    : { kind: "private", personIds: canonicalIds(access.personIds, "Access") };
}

function cloneFlexibility(
  flexibility: ScheduledActivityFlexibility,
): ScheduledActivityFlexibility {
  return flexibility.kind === "fixed"
    ? { kind: "fixed" }
    : {
        kind: "movable",
        earliestStart: cloneMoment(flexibility.earliestStart),
        latestEnd: cloneMoment(flexibility.latestEnd),
      };
}

function latestActivityStateUnchecked(
  world: World,
  activityId: EntityId,
): ScheduledActivityStateRecord | null {
  return (
    world.history.scheduledActivityStates
      .filter((state) => state.activityId === activityId)
      .at(-1) ?? null
  );
}

export function scheduledActivityState(
  world: World,
  activityId: EntityId,
): ScheduledActivityStateRecord {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  const state = latestActivityStateUnchecked(world, activityId);
  if (!activity || !state) {
    throw new Error(`Missing scheduled activity or state: ${activityId}`);
  }
  return state;
}

function latestWorkStateUnchecked(
  world: World,
  workItemId: EntityId,
): WorkItemStateRecord | null {
  return (
    world.history.workItemStates
      .filter((state) => state.workItemId === workItemId)
      .at(-1) ?? null
  );
}

export function workItemState(
  world: World,
  workItemId: EntityId,
): WorkItemStateRecord {
  const item = world.history.workItems.find(
    (candidate) => candidate.id === workItemId,
  );
  const state = latestWorkStateUnchecked(world, workItemId);
  if (!item || !state) {
    throw new Error(`Missing work item or state: ${workItemId}`);
  }
  return state;
}

function intervalsOverlap(
  leftStart: SimulationMoment,
  leftEnd: SimulationMoment,
  rightStart: SimulationMoment,
  rightEnd: SimulationMoment,
): boolean {
  return (
    compareSimulationMoments(leftStart, rightEnd) < 0 &&
    compareSimulationMoments(rightStart, leftEnd) < 0
  );
}

function conflictingActivityIds(
  world: World,
  participantPersonIds: readonly EntityId[],
  start: SimulationMoment,
  end: SimulationMoment,
  excludedActivityId: EntityId | null,
): EntityId[] {
  const participants = new Set(participantPersonIds);
  return world.history.scheduledActivities
    .filter((activity) => activity.id !== excludedActivityId)
    .filter((activity) =>
      activity.participantPersonIds.some((personId) =>
        participants.has(personId),
      ),
    )
    .filter((activity) => {
      const state = latestActivityStateUnchecked(world, activity.id);
      return (
        state?.status === "scheduled" &&
        intervalsOverlap(start, end, state.start, state.end)
      );
    })
    .map((activity) => activity.id)
    .sort();
}

export function createScheduledActivity(
  world: World,
  input: CreateScheduledActivityInput,
): World {
  assertWorldIntegrity(world);
  requireText(input.stableKey, "Scheduled activity stable key");
  requireText(input.title, "Scheduled activity title");
  requireText(input.summary, "Scheduled activity summary");
  requireText(input.location.locationKey, "Scheduled activity location key");
  requireText(input.location.label, "Scheduled activity location label");
  const start = cloneMoment(input.start);
  const end = cloneMoment(input.end);
  if (simulationMinutesBetween(start, end) <= 0) {
    throw new Error("Scheduled activity must have a positive real interval.");
  }
  if (compareSimulationMoments(start, world.currentMoment) < 0) {
    throw new Error("A new scheduled activity cannot start in the past.");
  }
  const participantPersonIds = canonicalIds(
    input.participantPersonIds,
    "Scheduled activity participants",
  );
  if (participantPersonIds.length === 0) {
    throw new Error("A scheduled activity requires at least one participant.");
  }
  for (const personId of participantPersonIds) {
    if (!world.people[personId]) {
      throw new Error(
        `Scheduled activity references missing person: ${personId}`,
      );
    }
  }
  if (
    input.responsiblePersonId !== null &&
    !participantPersonIds.includes(input.responsiblePersonId)
  ) {
    throw new Error("Responsible person must be an activity participant.");
  }
  if (
    input.location.jurisdictionId !== null &&
    !world.jurisdictions[input.location.jurisdictionId]
  ) {
    throw new Error("Scheduled activity references a missing jurisdiction.");
  }
  const sourceEntityIds = canonicalIds(
    input.sourceEntityIds,
    "Scheduled activity sources",
  );
  if (sourceEntityIds.length === 0) {
    throw new Error("Scheduled activity requires canonical provenance.");
  }
  validateFlexibility(input.flexibility, start, end);
  const conflicts = conflictingActivityIds(
    world,
    participantPersonIds,
    start,
    end,
    null,
  );
  if (conflicts.length > 0) {
    throw new Error(
      `Scheduled activity conflicts with ${conflicts.join(", ")}.`,
    );
  }
  const access = cloneAccess(input.access);
  validateAccess(world, access);
  const id = createStableId(
    "scheduled-activity",
    `${world.id}:${input.stableKey}`,
  );
  const activity: ScheduledActivityRecord = {
    id,
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    createdAt: cloneMoment(world.currentMoment),
    title: input.title,
    summary: input.summary,
    kind: input.kind,
    participantPersonIds,
    responsiblePersonId: input.responsiblePersonId,
    location: { ...input.location },
    sourceEntityIds,
    flexibility: cloneFlexibility(input.flexibility),
    access,
  };
  const stateStableKey = `${input.stableKey}:state:created`;
  const state: ScheduledActivityStateRecord = {
    id: createStableId(
      "scheduled-activity-state",
      `${world.id}:${stateStableKey}`,
    ),
    stableKey: stateStableKey,
    sequence: world.history.nextSequence + 1,
    activityId: id,
    recordedAt: cloneMoment(world.currentMoment),
    start,
    end,
    status: "scheduled",
    change: "created",
    outcomeEventId: null,
    supersedesStateId: null,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 2,
      scheduledActivities: [...world.history.scheduledActivities, activity],
      scheduledActivityStates: [
        ...world.history.scheduledActivityStates,
        state,
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function rescheduleScheduledActivity(
  world: World,
  input: RescheduleScheduledActivityInput,
): RescheduleScheduledActivityResult {
  assertWorldIntegrity(world);
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === input.activityId,
  );
  const previous = latestActivityStateUnchecked(world, input.activityId);
  if (!activity || previous?.status !== "scheduled") {
    return failure(world, "activity-not-scheduled");
  }
  if (activity.flexibility.kind !== "movable") {
    return failure(world, "fixed-commitment");
  }
  const start = cloneMoment(input.start);
  const end = cloneMoment(input.end);
  if (simulationMinutesBetween(start, end) <= 0) {
    return failure(world, "outside-flexibility-range");
  }
  if (compareSimulationMoments(start, world.currentMoment) < 0) {
    return failure(world, "starts-in-the-past");
  }
  if (
    compareSimulationMoments(start, activity.flexibility.earliestStart) < 0 ||
    compareSimulationMoments(end, activity.flexibility.latestEnd) > 0
  ) {
    return failure(world, "outside-flexibility-range");
  }
  const conflicts = conflictingActivityIds(
    world,
    activity.participantPersonIds,
    start,
    end,
    activity.id,
  );
  if (conflicts.length > 0) {
    return {
      ok: false,
      world,
      reason: "conflict",
      conflictingActivityIds: conflicts,
    };
  }
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "schedule.activity-rescheduled",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [
      activity.id,
      ...activity.participantPersonIds,
      ...(activity.location.jurisdictionId
        ? [activity.location.jurisdictionId]
        : []),
    ],
    participants: activity.responsiblePersonId
      ? [
          {
            personId: activity.responsiblePersonId,
            role: "agency:schedule-change",
            detail: `Moved ${activity.title} to a valid interval`,
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: activity.access.kind === "office" ? "limited" : "private",
    tags: ["schedule.activity", "simulation.subday-time"],
    summary: `${activity.title} was moved to another valid working interval.`,
    context: {
      location: {
        jurisdictionId: activity.location.jurisdictionId,
        label: activity.location.label,
        setting: "Scheduled activity planning",
      },
      socialContext: "An explicit schedule change.",
      pressure: null,
      choice: "Move a flexible work block.",
      motivation: "Resolve the office agenda without moving fixed commitments.",
      immediateReaction:
        "The flexible block now occupies the selected interval.",
    },
  });
  const outcomeEvent = next.history.events.at(-1);
  if (!outcomeEvent) throw new Error("Rescheduling did not record its event.");
  const state: ScheduledActivityStateRecord = {
    id: createStableId(
      "scheduled-activity-state",
      `${next.id}:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    activityId: activity.id,
    recordedAt: cloneMoment(next.currentMoment),
    start,
    end,
    status: "scheduled",
    change: "rescheduled",
    outcomeEventId: outcomeEvent.id,
    supersedesStateId: previous.id,
  };
  next = appendActivityState(next, state);
  return { ok: true, world: next, state };
}

function failure(
  world: World,
  reason: Exclude<ScheduleFailureReason, "conflict">,
): RescheduleScheduledActivityResult {
  return { ok: false, world, reason, conflictingActivityIds: [] };
}

export function createWorkItem(
  world: World,
  input: CreateWorkItemInput,
): World {
  assertWorldIntegrity(world);
  requireText(input.stableKey, "Work item stable key");
  requireText(input.title, "Work item title");
  requireText(input.summary, "Work item summary");
  if (
    input.jurisdictionId !== null &&
    !world.jurisdictions[input.jurisdictionId]
  ) {
    throw new Error("Work item references a missing jurisdiction.");
  }
  const sourceEntityIds = canonicalIds(
    input.sourceEntityIds,
    "Work item sources",
  );
  if (sourceEntityIds.length === 0) {
    throw new Error("Work item requires canonical provenance.");
  }
  const assignedPersonIds = canonicalIds(
    input.assignedPersonIds,
    "Work item assignees",
  );
  const waitingOnPersonIds = canonicalIds(
    input.waitingOnPersonIds,
    "Work item dependencies",
  );
  for (const personId of [...assignedPersonIds, ...waitingOnPersonIds]) {
    if (!world.people[personId]) {
      throw new Error(`Work item references missing person: ${personId}`);
    }
  }
  validateInitialWorkResponsibility(
    world,
    assignedPersonIds,
    input.playerRequirement,
    waitingOnPersonIds,
    input.blocker,
  );
  validateFocus(world, input.focus);
  if (
    input.effort !== null &&
    (!Number.isSafeInteger(input.effort.requiredMinutes) ||
      input.effort.requiredMinutes <= 0)
  ) {
    throw new Error("Authored work duration must be a positive minute count.");
  }
  if (
    input.scheduledActivityId !== null &&
    !world.history.scheduledActivities.some(
      (activity) => activity.id === input.scheduledActivityId,
    )
  ) {
    throw new Error("Work item references a missing scheduled activity.");
  }
  const access = cloneAccess(input.access);
  validateAccess(world, access);
  const id = createStableId("work-item", `${world.id}:${input.stableKey}`);
  const item: WorkItemRecord = {
    id,
    stableKey: input.stableKey,
    sequence: world.history.nextSequence,
    createdAt: cloneMoment(world.currentMoment),
    title: input.title,
    summary: input.summary,
    jurisdictionId: input.jurisdictionId,
    sourceEntityIds,
    focus: cloneFocus(input.focus),
    effort: input.effort ? { ...input.effort } : null,
    access,
  };
  const stateStableKey = `${input.stableKey}:state:active`;
  const state: WorkItemStateRecord = {
    id: createStableId("work-item-state", `${world.id}:${stateStableKey}`),
    stableKey: stateStableKey,
    sequence: world.history.nextSequence + 1,
    workItemId: id,
    recordedAt: cloneMoment(world.currentMoment),
    status: "active",
    assignedPersonIds,
    playerRequirement: input.playerRequirement,
    waitingOnPersonIds,
    blocker: input.blocker,
    completedEffortMinutes: 0,
    scheduledActivityId: input.scheduledActivityId,
    outcomeEventId: null,
    supersedesStateId: null,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 2,
      workItems: [...world.history.workItems, item],
      workItemStates: [...world.history.workItemStates, state],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export function assignWorkItem(
  world: World,
  input: AssignWorkItemInput,
): World {
  assertWorldIntegrity(world);
  const item = world.history.workItems.find(
    (candidate) => candidate.id === input.workItemId,
  );
  const previous = latestWorkStateUnchecked(world, input.workItemId);
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  if (
    !item ||
    !previous ||
    previous.status !== "active" ||
    !controlledPersonId ||
    previous.playerRequirement === "none" ||
    !previous.assignedPersonIds.includes(controlledPersonId)
  ) {
    throw new Error(
      "Only controlled-person work that needs action can be delegated.",
    );
  }
  if (
    !world.people[input.assigneePersonId] ||
    input.assigneePersonId === controlledPersonId
  ) {
    throw new Error("Work delegation requires another existing person.");
  }
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: "work.item-assigned",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: item.jurisdictionId,
    involvedEntityIds: [
      item.id,
      controlledPersonId,
      input.assigneePersonId,
      ...(item.jurisdictionId ? [item.jurisdictionId] : []),
    ],
    participants: [
      {
        personId: controlledPersonId,
        role: "agency:delegator",
        detail: `Assigned ${item.title}`,
      },
      {
        personId: input.assigneePersonId,
        role: "agency:assignee",
        detail: `Accepted responsibility for ${item.title}`,
      },
    ],
    personFactConstraints: [],
    visibility: item.access.kind === "office" ? "limited" : "private",
    tags: ["work.assignment", "simulation.staff-work"],
    summary: `${item.title} was assigned to staff.`,
    context: {
      location: item.jurisdictionId
        ? {
            jurisdictionId: item.jurisdictionId,
            label: "Legislative office",
            setting: "Office work assignment",
          }
        : null,
      socialContext: "An explicit office delegation.",
      pressure: null,
      choice: "Delegate the bounded work item.",
      motivation:
        "Allow office work to proceed while the player handles other commitments.",
      immediateReaction:
        "The assigned staff member can now work independently.",
    },
  });
  const outcomeEvent = next.history.events.at(-1);
  if (!outcomeEvent)
    throw new Error("Work assignment did not record its event.");
  const state: WorkItemStateRecord = {
    id: createStableId("work-item-state", `${next.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    workItemId: item.id,
    recordedAt: cloneMoment(next.currentMoment),
    status: "active",
    assignedPersonIds: [input.assigneePersonId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    completedEffortMinutes: previous.completedEffortMinutes,
    scheduledActivityId: previous.scheduledActivityId,
    outcomeEventId: outcomeEvent.id,
    supersedesStateId: previous.id,
  };
  next = appendWorkState(next, state);
  return next;
}

export function workPendingEntriesFor(
  world: World,
  controlledPersonId: EntityId,
): readonly WorkPendingEntry[] {
  return world.history.workItems
    .filter((item) => canPersonAccess(item.access, controlledPersonId))
    .map((item) => ({ item, state: workItemState(world, item.id) }))
    .map(({ item, state }) => ({
      item,
      state,
      group: deriveWorkPendingGroup(state, controlledPersonId),
    }))
    .filter((entry): entry is WorkPendingEntry => entry.group !== null)
    .sort(
      (left, right) =>
        groupOrder(left.group) - groupOrder(right.group) ||
        left.item.title.localeCompare(right.item.title) ||
        left.item.id.localeCompare(right.item.id),
    );
}

export function scheduledActivitiesVisibleTo(
  world: World,
  personId: EntityId,
): readonly ScheduledActivityRecord[] {
  return world.history.scheduledActivities
    .filter((activity) => canPersonAccess(activity.access, personId))
    .filter((activity) => activity.participantPersonIds.includes(personId))
    .sort((left, right) => {
      const leftState = scheduledActivityState(world, left.id);
      const rightState = scheduledActivityState(world, right.id);
      return (
        compareSimulationMoments(leftState.start, rightState.start) ||
        left.id.localeCompare(right.id)
      );
    });
}

function deriveWorkPendingGroup(
  state: WorkItemStateRecord,
  controlledPersonId: EntityId,
): WorkPendingGroup | null {
  if (state.status === "ready-for-review" || state.status === "completed") {
    return "completed-ready";
  }
  if (state.status !== "active") return null;
  if (state.waitingOnPersonIds.length > 0) return "waiting-on-others";
  if (
    state.playerRequirement !== "none" ||
    state.assignedPersonIds.includes(controlledPersonId)
  ) {
    return "needs-you";
  }
  if (
    state.assignedPersonIds.some((personId) => personId !== controlledPersonId)
  ) {
    return "staff-handling";
  }
  return null;
}

function groupOrder(group: WorkPendingGroup): number {
  return [
    "needs-you",
    "waiting-on-others",
    "staff-handling",
    "completed-ready",
  ].indexOf(group);
}

export function canPersonAccess(
  access: CanonicalAccess,
  personId: EntityId,
): boolean {
  return access.kind === "office" || access.personIds.includes(personId);
}

export function advanceWorldMinutes(
  world: World,
  minutes: number,
  transitionHandlers: FutureTransitionHandlerRegistry = EMPTY_FUTURE_TRANSITION_HANDLERS,
): World {
  return advanceCanonicalMinutes(world, minutes, null, transitionHandlers);
}

export function performScheduledActivity(
  world: World,
  activityId: EntityId,
  transitionHandlers: FutureTransitionHandlerRegistry = EMPTY_FUTURE_TRANSITION_HANDLERS,
): World {
  assertWorldIntegrity(world);
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  const state = latestActivityStateUnchecked(world, activityId);
  if (!activity || state?.status !== "scheduled") {
    throw new Error("Only a currently scheduled activity can be performed.");
  }
  if (!activity.responsiblePersonId || world.control.kind !== "person") {
    throw new Error("Scheduled activity performance requires person control.");
  }
  if (activity.responsiblePersonId !== world.control.personId) {
    throw new Error(
      "The controlled person is not responsible for this activity.",
    );
  }
  if (compareSimulationMoments(world.currentMoment, state.start) > 0) {
    throw new Error(
      "A scheduled activity cannot be started after its interval began.",
    );
  }
  const minutesToEnd = simulationMinutesBetween(world.currentMoment, state.end);
  if (minutesToEnd <= 0) {
    throw new Error("Scheduled activity has no remaining future interval.");
  }
  return advanceCanonicalMinutes(
    world,
    minutesToEnd,
    activityId,
    transitionHandlers,
  );
}

interface ExactTransition {
  readonly at: SimulationMoment;
  readonly priority: number;
  readonly creationSequence: number;
  readonly stableId: string;
  readonly kind:
    | "date-boundary"
    | "work-completion"
    | "work-progress"
    | "activity-completion";
  readonly entityId: EntityId | null;
  readonly completedEffortMinutes: number | null;
}

function advanceCanonicalMinutes(
  inputWorld: World,
  minutes: number,
  completedActivityId: EntityId | null,
  transitionHandlers: FutureTransitionHandlerRegistry,
): World {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new Error(
      "Sub-day time advancement requires positive whole minutes.",
    );
  }
  assertWorldIntegrity(inputWorld);
  const start = inputWorld.currentMoment;
  const target = addSimulationMinutes(start, minutes);
  const transitions: ExactTransition[] = [];
  for (
    let date = addDays(start.date, 1);
    date <= target.date;
    date = addDays(date, 1)
  ) {
    const boundary = makeSimulationMoment({
      date,
      minuteOfDay: 0,
      timeZone: start.timeZone,
      utcOffsetMinutes: start.utcOffsetMinutes,
    });
    if (compareSimulationMoments(boundary, target) <= 0) {
      transitions.push({
        at: boundary,
        priority: 0,
        creationSequence: 0,
        stableId: date,
        kind: "date-boundary",
        entityId: null,
        completedEffortMinutes: null,
      });
    }
  }
  for (const progress of projectStaffProgress(inputWorld, start, target)) {
    transitions.push({
      at: progress.completed ? progress.at : target,
      priority: progress.completed ? 1 : 3,
      creationSequence: progress.item.sequence,
      stableId: progress.item.id,
      kind: progress.completed ? "work-completion" : "work-progress",
      entityId: progress.item.id,
      completedEffortMinutes: progress.completedEffortMinutes,
    });
  }
  if (completedActivityId !== null) {
    const activity = inputWorld.history.scheduledActivities.find(
      (candidate) => candidate.id === completedActivityId,
    );
    if (!activity) {
      throw new Error("Performed activity identity is missing.");
    }
    const state = scheduledActivityState(inputWorld, completedActivityId);
    if (!sameSimulationMoment(state.end, target)) {
      throw new Error(
        "Performed activity must resolve at its exact scheduled end.",
      );
    }
    transitions.push({
      at: target,
      priority: 2,
      creationSequence: activity.sequence,
      stableId: completedActivityId,
      kind: "activity-completion",
      entityId: completedActivityId,
      completedEffortMinutes: null,
    });
  }
  transitions.sort(
    (left, right) =>
      compareSimulationMoments(left.at, right.at) ||
      left.priority - right.priority ||
      left.creationSequence - right.creationSequence ||
      left.stableId.localeCompare(right.stableId),
  );

  let world = inputWorld;
  for (const transition of transitions) {
    if (transition.kind === "date-boundary") {
      world = resolveFutureDueItemsThrough(
        world,
        transition.at.date,
        transitionHandlers,
      );
      world = setCurrentMoment(world, transition.at);
    } else if (transition.kind === "work-completion" && transition.entityId) {
      world = setCurrentMoment(world, transition.at);
      world = completeStaffWork(
        world,
        transition.entityId,
        transition.completedEffortMinutes ?? 0,
        inputWorld.actionSequence,
      );
    } else if (transition.kind === "work-progress" && transition.entityId) {
      world = setCurrentMoment(world, transition.at);
      world = recordStaffProgress(
        world,
        transition.entityId,
        transition.completedEffortMinutes ?? 0,
        inputWorld.actionSequence,
      );
    } else if (
      transition.kind === "activity-completion" &&
      transition.entityId
    ) {
      world = setCurrentMoment(world, transition.at);
      world = completeActivity(
        world,
        transition.entityId,
        inputWorld.actionSequence,
      );
    }
  }
  world = setCurrentMoment(world, target);
  const actionSequence = inputWorld.actionSequence;
  world = { ...world, actionSequence: actionSequence + 1 };
  world = recordWorldEvent(world, {
    stableKey: `action:${actionSequence}:minutes-advanced:${start.date}:${start.minuteOfDay}:${minutes}:${target.date}:${target.minuteOfDay}`,
    type: "simulation.minutes-advanced",
    occurredAt: target.date,
    recordedAt: target.date,
    jurisdictionId: world.jurisdictionOrder[0] ?? null,
    involvedEntityIds: world.jurisdictionOrder[0]
      ? [world.jurisdictionOrder[0]!]
      : [],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["simulation.time", "simulation.subday-time"],
    summary: `Simulation time advanced ${minutes} minutes.`,
    context: {
      location: world.jurisdictionOrder[0]
        ? {
            jurisdictionId: world.jurisdictionOrder[0]!,
            label: "Primary simulation jurisdiction",
            setting: null,
          }
        : null,
      socialContext: "Deterministic canonical minute-level time transition.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  assertWorldIntegrity(world);
  return world;
}

interface StaffProgressProjection {
  readonly item: WorkItemRecord;
  readonly at: SimulationMoment;
  readonly completed: boolean;
  readonly completedEffortMinutes: number;
}

function projectStaffProgress(
  world: World,
  start: SimulationMoment,
  target: SimulationMoment,
): StaffProgressProjection[] {
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  const totalMinutes = simulationMinutesBetween(start, target);
  const results: StaffProgressProjection[] = [];
  for (const item of world.history.workItems) {
    const state = latestWorkStateUnchecked(world, item.id);
    if (
      !state ||
      state.status !== "active" ||
      !item.effort ||
      state.playerRequirement !== "none" ||
      state.waitingOnPersonIds.length > 0 ||
      state.assignedPersonIds.length === 0 ||
      state.assignedPersonIds.includes(controlledPersonId ?? ("" as EntityId))
    ) {
      continue;
    }
    let completedEffortMinutes = state.completedEffortMinutes;
    let completionOffset: number | null = null;
    for (let offset = 0; offset < totalMinutes; offset += 1) {
      const minuteStart = addSimulationMinutes(start, offset);
      const minuteEnd = addSimulationMinutes(start, offset + 1);
      if (
        state.assignedPersonIds.every((personId) =>
          isPersonAvailable(world, personId, minuteStart, minuteEnd),
        )
      ) {
        completedEffortMinutes += 1;
        if (completedEffortMinutes >= item.effort.requiredMinutes) {
          completedEffortMinutes = item.effort.requiredMinutes;
          completionOffset = offset + 1;
          break;
        }
      }
    }
    if (completedEffortMinutes === state.completedEffortMinutes) continue;
    results.push({
      item,
      at: addSimulationMinutes(start, completionOffset ?? totalMinutes),
      completed: completionOffset !== null,
      completedEffortMinutes,
    });
  }
  return results;
}

function isPersonAvailable(
  world: World,
  personId: EntityId,
  start: SimulationMoment,
  end: SimulationMoment,
): boolean {
  return !world.history.scheduledActivities.some((activity) => {
    if (!activity.participantPersonIds.includes(personId)) return false;
    const state = latestActivityStateUnchecked(world, activity.id);
    return (
      state?.status === "scheduled" &&
      intervalsOverlap(start, end, state.start, state.end)
    );
  });
}

function completeStaffWork(
  world: World,
  itemId: EntityId,
  completedEffortMinutes: number,
  actionSequence: number,
): World {
  const item = world.history.workItems.find(
    (candidate) => candidate.id === itemId,
  );
  const previous = latestWorkStateUnchecked(world, itemId);
  if (!item || !previous || previous.status !== "active" || !item.effort) {
    return world;
  }
  const stableKey = `action:${actionSequence}:work-ready:${item.id}`;
  let next = recordWorldEvent(world, {
    stableKey: `${stableKey}:event`,
    type: "work.item-ready-for-review",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: item.jurisdictionId,
    involvedEntityIds: [
      item.id,
      ...previous.assignedPersonIds,
      ...(item.jurisdictionId ? [item.jurisdictionId] : []),
    ],
    participants: previous.assignedPersonIds.map((personId) => ({
      personId,
      role: "agency:staff-work",
      detail: `Completed ${item.title} for review`,
    })),
    personFactConstraints: [],
    visibility: item.access.kind === "office" ? "limited" : "private",
    tags: ["work.completed", "simulation.staff-work"],
    summary: `${item.title} is ready for review.`,
    context: {
      location: item.jurisdictionId
        ? {
            jurisdictionId: item.jurisdictionId,
            label: "Legislative office",
            setting: "Parallel staff work",
          }
        : null,
      socialContext:
        "Staff work progressed while the controlled person was occupied elsewhere.",
      pressure: null,
      choice: null,
      motivation: "Complete an explicitly assigned office task.",
      immediateReaction:
        "The result is available to the controlled office for review.",
    },
  });
  const event = next.history.events.at(-1);
  if (!event) throw new Error("Staff completion did not record its event.");
  next = appendWorkState(next, {
    id: createStableId("work-item-state", `${next.id}:${stableKey}`),
    stableKey,
    sequence: next.history.nextSequence,
    workItemId: item.id,
    recordedAt: cloneMoment(next.currentMoment),
    status: "ready-for-review",
    assignedPersonIds: previous.assignedPersonIds,
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    completedEffortMinutes,
    scheduledActivityId: previous.scheduledActivityId,
    outcomeEventId: event.id,
    supersedesStateId: previous.id,
  });
  return next;
}

function recordStaffProgress(
  world: World,
  itemId: EntityId,
  completedEffortMinutes: number,
  actionSequence: number,
): World {
  const previous = latestWorkStateUnchecked(world, itemId);
  if (!previous || previous.status !== "active") return world;
  const stableKey = `action:${actionSequence}:work-progress:${itemId}:${world.currentMoment.date}:${world.currentMoment.minuteOfDay}`;
  return appendWorkState(world, {
    ...previous,
    id: createStableId("work-item-state", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: cloneMoment(world.currentMoment),
    completedEffortMinutes,
    outcomeEventId: null,
    supersedesStateId: previous.id,
  });
}

function completeActivity(
  world: World,
  activityId: EntityId,
  actionSequence: number,
): World {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  const previous = latestActivityStateUnchecked(world, activityId);
  if (!activity || previous?.status !== "scheduled") return world;
  const stableKey = `action:${actionSequence}:activity-completed:${activity.id}`;
  let next = recordWorldEvent(world, {
    stableKey: `${stableKey}:event`,
    type: "schedule.activity-completed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [
      activity.id,
      ...activity.participantPersonIds,
      ...(activity.location.jurisdictionId
        ? [activity.location.jurisdictionId]
        : []),
    ],
    participants: activity.participantPersonIds.map((personId) => ({
      personId,
      role: "presence:participant",
      detail: `Participated in ${activity.title}`,
    })),
    personFactConstraints: [],
    visibility: activity.access.kind === "office" ? "limited" : "private",
    tags: ["schedule.completed", "simulation.subday-time"],
    summary: `${activity.title} concluded.`,
    context: {
      location: {
        jurisdictionId: activity.location.jurisdictionId,
        label: activity.location.label,
        setting: "Scheduled activity",
      },
      socialContext: activity.summary,
      pressure: null,
      choice: "Commit the scheduled activity interval.",
      motivation: "Carry out a meaningful in-world commitment.",
      immediateReaction: "The scheduled interval is complete.",
    },
  });
  const event = next.history.events.at(-1);
  if (!event) throw new Error("Activity completion did not record its event.");
  next = appendActivityState(next, {
    id: createStableId("scheduled-activity-state", `${next.id}:${stableKey}`),
    stableKey,
    sequence: next.history.nextSequence,
    activityId,
    recordedAt: cloneMoment(next.currentMoment),
    start: previous.start,
    end: previous.end,
    status: "completed",
    change: "completed",
    outcomeEventId: event.id,
    supersedesStateId: previous.id,
  });
  return next;
}

function appendActivityState(
  world: World,
  state: ScheduledActivityStateRecord,
): World {
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      scheduledActivityStates: [
        ...world.history.scheduledActivityStates,
        state,
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function appendWorkState(world: World, state: WorkItemStateRecord): World {
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      workItemStates: [...world.history.workItemStates, state],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function setCurrentMoment(world: World, moment: SimulationMoment): World {
  return {
    ...world,
    currentDate: moment.date,
    currentMoment: cloneMoment(moment),
  };
}

function validateFlexibility(
  flexibility: ScheduledActivityFlexibility,
  start: SimulationMoment,
  end: SimulationMoment,
): void {
  if (flexibility.kind === "fixed") return;
  const earliest = cloneMoment(flexibility.earliestStart);
  const latest = cloneMoment(flexibility.latestEnd);
  if (
    compareSimulationMoments(earliest, start) > 0 ||
    compareSimulationMoments(latest, end) < 0 ||
    simulationMinutesBetween(earliest, latest) <= 0
  ) {
    throw new Error(
      "Movable activity interval lies outside its flexibility range.",
    );
  }
}

function validateAccess(world: World, access: CanonicalAccess): void {
  if (access.kind === "private") {
    if (access.personIds.length === 0) {
      throw new Error("Private canonical access requires at least one person.");
    }
    for (const personId of access.personIds) {
      if (!world.people[personId]) {
        throw new Error(
          `Canonical access references missing person: ${personId}`,
        );
      }
    }
  }
}

function validateInitialWorkResponsibility(
  world: World,
  assignedPersonIds: readonly EntityId[],
  requirement: WorkPlayerRequirement,
  waitingOnPersonIds: readonly EntityId[],
  blocker: string | null,
): void {
  if (assignedPersonIds.length === 0) {
    throw new Error("Active work requires at least one responsible person.");
  }
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  if (
    requirement !== "none" &&
    (!controlledPersonId || !assignedPersonIds.includes(controlledPersonId))
  ) {
    throw new Error(
      "Player-required work must be assigned to the controlled person.",
    );
  }
  if (waitingOnPersonIds.length > 0 && requirement !== "none") {
    throw new Error(
      "Waiting work cannot simultaneously require player action.",
    );
  }
  if (waitingOnPersonIds.length > 0 !== (blocker !== null)) {
    throw new Error(
      "Waiting-on-person state and blocker explanation must agree.",
    );
  }
  if (blocker !== null) requireText(blocker, "Work blocker");
}

function cloneFocus(focus: WorkFocusTarget): WorkFocusTarget {
  return { ...focus };
}

function validateFocus(world: World, focus: WorkFocusTarget): void {
  if (focus.kind === "person") {
    if (!world.people[focus.personId])
      throw new Error("Work focus person is missing.");
  } else if (focus.kind === "calendar-item") {
    if (
      !world.history.scheduledActivities.some(
        (activity) => activity.id === focus.scheduledActivityId,
      )
    ) {
      throw new Error("Work focus activity is missing.");
    }
  } else {
    requireText(focus.targetKey, "Work focus target key");
    if (!canonicalSourceExists(world, focus.sourceEntityId)) {
      throw new Error("Work focus source entity is missing.");
    }
  }
}

function canonicalSourceExists(world: World, id: EntityId): boolean {
  return !!(
    world.people[id] ||
    world.jurisdictions[id] ||
    world.history.events.some((record) => record.id === id) ||
    policySemanticsEntityExists(world, id) ||
    timeWorkEntityExists(world, id)
  );
}

function canonicalSourceAvailable(
  world: World,
  id: EntityId,
  at: SimulationMoment,
  sequenceExclusive: number,
): boolean {
  if (world.people[id] || world.jurisdictions[id]) return true;
  const event = world.history.events.find((record) => record.id === id);
  if (event)
    return event.sequence < sequenceExclusive && event.occurredAt <= at.date;
  if (policySemanticsEntityExists(world, id)) {
    return policySemanticsEntityAvailableAt(
      world,
      id,
      at.date,
      sequenceExclusive,
    );
  }
  const record = timeWorkRecordById(world, id);
  return !!record && record.sequence < sequenceExclusive;
}

function timeWorkRecordById(
  world: World,
  id: EntityId,
):
  | ScheduledActivityRecord
  | ScheduledActivityStateRecord
  | WorkItemRecord
  | WorkItemStateRecord
  | null {
  return (
    world.history.scheduledActivities.find((record) => record.id === id) ??
    world.history.scheduledActivityStates.find((record) => record.id === id) ??
    world.history.workItems.find((record) => record.id === id) ??
    world.history.workItemStates.find((record) => record.id === id) ??
    null
  );
}

export function timeWorkEntityExists(world: World, id: EntityId): boolean {
  return timeWorkRecordById(world, id) !== null;
}

export function timeWorkEntityAvailableAt(
  world: World,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  const record = timeWorkRecordById(world, id);
  if (!record || record.sequence >= sequenceExclusive) return false;
  const moment = "createdAt" in record ? record.createdAt : record.recordedAt;
  return moment.date <= asOfDate;
}

export function timeWorkHistoryRecords(
  world: World,
): readonly (
  | ScheduledActivityRecord
  | ScheduledActivityStateRecord
  | WorkItemRecord
  | WorkItemStateRecord
)[] {
  return [
    ...world.history.scheduledActivities,
    ...world.history.scheduledActivityStates,
    ...world.history.workItems,
    ...world.history.workItemStates,
  ];
}

export function assertTimeWorkIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  assertSequenceOrdered(
    world.history.scheduledActivities,
    "scheduled activity",
  );
  assertSequenceOrdered(
    world.history.scheduledActivityStates,
    "scheduled activity state",
  );
  assertSequenceOrdered(world.history.workItems, "work item");
  assertSequenceOrdered(world.history.workItemStates, "work item state");
  assertUniqueKeys(world.history.scheduledActivities, "scheduled activity");
  assertUniqueKeys(
    world.history.scheduledActivityStates,
    "scheduled activity state",
  );
  assertUniqueKeys(world.history.workItems, "work item");
  assertUniqueKeys(world.history.workItemStates, "work item state");

  const activityById = new Map<EntityId, ScheduledActivityRecord>();
  for (const activity of world.history.scheduledActivities) {
    assertIdentity(ids, world, activity, "scheduled-activity");
    assertSimulationMoment(activity.createdAt);
    if (compareSimulationMoments(activity.createdAt, world.currentMoment) > 0) {
      throw new Error(
        `Scheduled activity was created in the future: ${activity.id}`,
      );
    }
    requireText(activity.title, "Scheduled activity title");
    requireText(activity.summary, "Scheduled activity summary");
    if (!SCHEDULE_KINDS.includes(activity.kind)) {
      throw new Error(`Invalid scheduled activity kind: ${activity.id}`);
    }
    canonicalIds(
      activity.participantPersonIds,
      "Scheduled activity participants",
    );
    if (activity.participantPersonIds.length === 0) {
      throw new Error(`Scheduled activity has no participants: ${activity.id}`);
    }
    for (const personId of activity.participantPersonIds) {
      if (!world.people[personId]) {
        throw new Error(
          `Scheduled activity has missing participant: ${activity.id}`,
        );
      }
    }
    if (
      activity.responsiblePersonId !== null &&
      !activity.participantPersonIds.includes(activity.responsiblePersonId)
    ) {
      throw new Error(
        `Scheduled activity has invalid responsibility: ${activity.id}`,
      );
    }
    if (
      activity.location.jurisdictionId !== null &&
      !world.jurisdictions[activity.location.jurisdictionId]
    ) {
      throw new Error(
        `Scheduled activity has missing location: ${activity.id}`,
      );
    }
    requireText(
      activity.location.locationKey,
      "Scheduled activity location key",
    );
    requireText(activity.location.label, "Scheduled activity location label");
    canonicalIds(activity.sourceEntityIds, "Scheduled activity sources");
    if (
      activity.sourceEntityIds.length === 0 ||
      activity.sourceEntityIds.some(
        (id) =>
          !canonicalSourceAvailable(
            world,
            id,
            activity.createdAt,
            activity.sequence,
          ),
      )
    ) {
      throw new Error(
        `Scheduled activity has unavailable provenance: ${activity.id}`,
      );
    }
    validateAccess(world, activity.access);
    activityById.set(activity.id, activity);
  }

  const activityStates = new Map<EntityId, ScheduledActivityStateRecord[]>();
  for (const state of world.history.scheduledActivityStates) {
    assertIdentity(ids, world, state, "scheduled-activity-state");
    const activity = activityById.get(state.activityId);
    if (!activity || activity.sequence >= state.sequence) {
      throw new Error(
        `Scheduled activity state lacks its prior activity: ${state.id}`,
      );
    }
    assertSimulationMoment(state.recordedAt);
    assertSimulationMoment(state.start);
    assertSimulationMoment(state.end);
    if (
      compareSimulationMoments(state.recordedAt, activity.createdAt) < 0 ||
      compareSimulationMoments(state.recordedAt, world.currentMoment) > 0 ||
      simulationMinutesBetween(state.start, state.end) <= 0 ||
      !ACTIVITY_STATUSES.includes(state.status) ||
      !ACTIVITY_CHANGES.includes(state.change)
    ) {
      throw new Error(`Scheduled activity state is malformed: ${state.id}`);
    }
    validateFlexibility(activity.flexibility, state.start, state.end);
    const prior = activityStates.get(activity.id) ?? [];
    const previous = prior.at(-1);
    if (state.change === "created") {
      if (
        previous ||
        state.status !== "scheduled" ||
        state.supersedesStateId !== null ||
        state.outcomeEventId !== null
      ) {
        throw new Error(
          `Invalid initial scheduled activity state: ${state.id}`,
        );
      }
    } else {
      if (
        !previous ||
        previous.status !== "scheduled" ||
        state.supersedesStateId !== previous.id
      ) {
        throw new Error(`Invalid scheduled activity lifecycle: ${state.id}`);
      }
      if (state.change === "rescheduled") {
        if (
          activity.flexibility.kind !== "movable" ||
          state.status !== "scheduled"
        ) {
          throw new Error(`Invalid activity reschedule: ${state.id}`);
        }
      } else if (state.change === "completed") {
        if (
          state.status !== "completed" ||
          !sameSimulationMoment(state.recordedAt, state.end) ||
          state.outcomeEventId === null
        ) {
          throw new Error(`Invalid activity completion: ${state.id}`);
        }
      } else if (state.status !== "cancelled") {
        throw new Error(`Invalid activity cancellation: ${state.id}`);
      }
    }
    validateOutcomeEvent(
      world,
      state.outcomeEventId,
      activity.id,
      state.sequence,
      state.recordedAt,
    );
    prior.push(state);
    activityStates.set(activity.id, prior);
  }
  for (const activity of world.history.scheduledActivities) {
    if ((activityStates.get(activity.id) ?? []).length === 0) {
      throw new Error(`Scheduled activity lacks state: ${activity.id}`);
    }
  }
  const activeScheduled = world.history.scheduledActivities.filter(
    (activity) => {
      const state = latestActivityStateUnchecked(world, activity.id);
      return state?.status === "scheduled";
    },
  );
  for (let index = 0; index < activeScheduled.length; index += 1) {
    const left = activeScheduled[index]!;
    const leftState = latestActivityStateUnchecked(world, left.id)!;
    for (const right of activeScheduled.slice(index + 1)) {
      const rightState = latestActivityStateUnchecked(world, right.id)!;
      if (
        left.participantPersonIds.some((personId) =>
          right.participantPersonIds.includes(personId),
        ) &&
        intervalsOverlap(
          leftState.start,
          leftState.end,
          rightState.start,
          rightState.end,
        )
      ) {
        throw new Error(`Scheduled activities overlap: ${left.id}:${right.id}`);
      }
    }
  }

  const workById = new Map<EntityId, WorkItemRecord>();
  for (const item of world.history.workItems) {
    assertIdentity(ids, world, item, "work-item");
    assertSimulationMoment(item.createdAt);
    if (compareSimulationMoments(item.createdAt, world.currentMoment) > 0) {
      throw new Error(`Work item was created in the future: ${item.id}`);
    }
    requireText(item.title, "Work item title");
    requireText(item.summary, "Work item summary");
    if (
      item.jurisdictionId !== null &&
      !world.jurisdictions[item.jurisdictionId]
    ) {
      throw new Error(`Work item has missing jurisdiction: ${item.id}`);
    }
    canonicalIds(item.sourceEntityIds, "Work item sources");
    if (
      item.sourceEntityIds.length === 0 ||
      item.sourceEntityIds.some(
        (id) =>
          !canonicalSourceAvailable(world, id, item.createdAt, item.sequence),
      )
    ) {
      throw new Error(`Work item has unavailable provenance: ${item.id}`);
    }
    validateFocus(world, item.focus);
    if (
      item.effort &&
      (!Number.isSafeInteger(item.effort.requiredMinutes) ||
        item.effort.requiredMinutes <= 0)
    ) {
      throw new Error(`Work item has invalid authored duration: ${item.id}`);
    }
    validateAccess(world, item.access);
    workById.set(item.id, item);
  }
  const workStates = new Map<EntityId, WorkItemStateRecord[]>();
  for (const state of world.history.workItemStates) {
    assertIdentity(ids, world, state, "work-item-state");
    const item = workById.get(state.workItemId);
    if (!item || item.sequence >= state.sequence) {
      throw new Error(`Work item state lacks its prior item: ${state.id}`);
    }
    assertSimulationMoment(state.recordedAt);
    if (
      compareSimulationMoments(state.recordedAt, item.createdAt) < 0 ||
      compareSimulationMoments(state.recordedAt, world.currentMoment) > 0 ||
      !WORK_STATUSES.includes(state.status) ||
      !PLAYER_REQUIREMENTS.includes(state.playerRequirement) ||
      !Number.isSafeInteger(state.completedEffortMinutes) ||
      state.completedEffortMinutes < 0 ||
      (item.effort === null && state.completedEffortMinutes !== 0) ||
      (item.effort !== null &&
        state.completedEffortMinutes > item.effort.requiredMinutes)
    ) {
      throw new Error(`Work item state is malformed: ${state.id}`);
    }
    canonicalIds(state.assignedPersonIds, "Work item assignees");
    canonicalIds(state.waitingOnPersonIds, "Work item dependencies");
    for (const personId of [
      ...state.assignedPersonIds,
      ...state.waitingOnPersonIds,
    ]) {
      if (!world.people[personId])
        throw new Error(`Work state has missing person: ${state.id}`);
    }
    validateInitialWorkResponsibility(
      world,
      state.assignedPersonIds,
      state.playerRequirement,
      state.waitingOnPersonIds,
      state.blocker,
    );
    if (state.status !== "active" && state.playerRequirement !== "none") {
      throw new Error(
        `Terminal work state still requires player action: ${state.id}`,
      );
    }
    if (
      state.status === "ready-for-review" &&
      (!item.effort ||
        state.completedEffortMinutes !== item.effort.requiredMinutes)
    ) {
      throw new Error(
        `Ready work does not satisfy authored effort: ${state.id}`,
      );
    }
    if (
      state.scheduledActivityId !== null &&
      !activityById.has(state.scheduledActivityId)
    ) {
      throw new Error(`Work state has missing schedule linkage: ${state.id}`);
    }
    const prior = workStates.get(item.id) ?? [];
    const previous = prior.at(-1);
    if (!previous) {
      if (
        state.supersedesStateId !== null ||
        state.outcomeEventId !== null ||
        state.status !== "active"
      ) {
        throw new Error(`Invalid initial work state: ${state.id}`);
      }
    } else {
      if (
        previous.status !== "active" ||
        state.supersedesStateId !== previous.id ||
        state.completedEffortMinutes < previous.completedEffortMinutes
      ) {
        throw new Error(`Invalid work lifecycle: ${state.id}`);
      }
    }
    validateOutcomeEvent(
      world,
      state.outcomeEventId,
      item.id,
      state.sequence,
      state.recordedAt,
    );
    prior.push(state);
    workStates.set(item.id, prior);
  }
  for (const item of world.history.workItems) {
    if ((workStates.get(item.id) ?? []).length === 0) {
      throw new Error(`Work item lacks state: ${item.id}`);
    }
  }
}

function validateOutcomeEvent(
  world: World,
  eventId: EntityId | null,
  entityId: EntityId,
  stateSequence: number,
  at: SimulationMoment,
): void {
  if (eventId === null) return;
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
  if (
    !event ||
    event.sequence >= stateSequence ||
    event.occurredAt !== at.date ||
    !event.involvedEntityIds.includes(entityId)
  ) {
    throw new Error(
      `Exact-time state has an invalid outcome event: ${entityId}`,
    );
  }
}

function assertIdentity(
  ids: Set<EntityId>,
  world: World,
  record: { readonly id: EntityId; readonly stableKey: string },
  kind: Parameters<typeof createStableId>[0],
): void {
  if (
    ids.has(record.id) ||
    record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)
  ) {
    throw new Error(`Invalid or duplicate ${kind} identity: ${record.id}`);
  }
  ids.add(record.id);
}

function assertSequenceOrdered(
  records: readonly { readonly sequence: number }[],
  label: string,
): void {
  if (
    records.some(
      (record, index) =>
        index > 0 && record.sequence <= records[index - 1]!.sequence,
    )
  ) {
    throw new Error(`${label} history is not append ordered.`);
  }
}

function assertUniqueKeys(
  records: readonly { readonly stableKey: string }[],
  label: string,
): void {
  const keys = new Set<string>();
  for (const record of records) {
    if (keys.has(record.stableKey))
      throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
    keys.add(record.stableKey);
  }
}
