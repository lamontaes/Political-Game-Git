import {
  addDays,
  assertWorldIntegrity,
  assignWorkItem,
  canPersonAccess,
  createScheduledActivity,
  createWorkItem,
  makeSimulationMoment,
  performScheduledActivity,
  rescheduleScheduledActivity,
  scheduledActivitiesVisibleTo,
  scheduledActivityState,
  simulationMinutesBetween,
  workPendingEntriesFor,
} from "../simulation";
import type {
  EntityId,
  RescheduleScheduledActivityResult,
  ScheduledActivityRecord,
  ScheduledActivityStateRecord,
  SimulationMoment,
  WorkPendingEntry,
  World,
} from "../simulation";
import {
  createRunCFixture,
  RUN_C_DOCUMENT_STABLE_KEY,
  type RunCFixture,
} from "./run-c-working-document";

export const RUN_D_LITE_TIME_ZONE = "America/New_York";
export const RUN_D_LITE_UTC_OFFSET_MINUTES = -300;

export interface RunDLiteFixtureIds {
  readonly briefingActivityId: EntityId;
  readonly flexibleActivityId: EntityId;
  readonly travelActivityId: EntityId;
  readonly meetingActivityId: EntityId;
  readonly tentativeActivityId: EntityId;
  readonly hiddenActivityId: EntityId;
  readonly documentWorkItemId: EntityId;
  readonly delegableWorkItemId: EntityId;
  readonly waitingWorkItemId: EntityId;
  readonly staffWorkItemId: EntityId;
  readonly hiddenWorkItemId: EntityId;
  readonly collinsPersonId: EntityId;
  readonly reedPersonId: EntityId;
}

export interface RunDLiteFixture extends RunCFixture {
  readonly dLite: RunDLiteFixtureIds;
}

export interface RunDAgendaEntry {
  readonly activity: ScheduledActivityRecord;
  readonly state: ScheduledActivityStateRecord;
  readonly durationMinutes: number;
  readonly waitBeforeStartMinutes: number | null;
  readonly elapsedIfPerformedMinutes: number | null;
}

export interface RunDLiteProjection {
  readonly currentMoment: SimulationMoment;
  readonly weekDates: readonly string[];
  readonly agenda: readonly RunDAgendaEntry[];
  readonly work: readonly WorkPendingEntry[];
  readonly nextCommitment: RunDAgendaEntry | null;
}

function moment(date: string, hour: number, minute: number): SimulationMoment {
  return makeSimulationMoment({
    date,
    minuteOfDay: hour * 60 + minute,
    timeZone: RUN_D_LITE_TIME_ZONE,
    utcOffsetMinutes: RUN_D_LITE_UTC_OFFSET_MINUTES,
  });
}

function lastActivity(world: World): ScheduledActivityRecord {
  const activity = world.history.scheduledActivities.at(-1);
  if (!activity) throw new Error("Run D-Lite did not create its activity.");
  return activity;
}

function lastWorkItem(world: World) {
  const item = world.history.workItems.at(-1);
  if (!item) throw new Error("Run D-Lite did not create its work item.");
  return item;
}

export function createRunDLiteFixture(): RunDLiteFixture {
  const runC = createRunCFixture();
  let world = runC.world;
  const date = world.currentDate;
  const jurisdictionId = runC.roomContext.jurisdictionId;
  const playerPersonId = runC.playerPersonId;
  const collinsPersonId = runC.scenePerson.personId;
  const reedPersonId = runC.scenePeople[1].personId;
  const officeSource = [runC.officeEventId];

  world = createScheduledActivity(world, {
    stableKey: "run-d-lite:activity:office-briefing",
    title: "Constituent intake briefing",
    summary:
      "A confirmed office briefing with Reed on the morning constituent-service queue.",
    kind: "confirmed",
    start: moment(date, 9, 30),
    end: moment(date, 10, 15),
    participantPersonIds: [playerPersonId, reedPersonId],
    responsiblePersonId: playerPersonId,
    location: {
      locationKey: "lexington-legislative-office",
      label: "Legislative Office",
      jurisdictionId,
    },
    sourceEntityIds: officeSource,
    flexibility: { kind: "fixed" },
    access: { kind: "office" },
  });
  const briefingActivityId = lastActivity(world).id;

  world = createScheduledActivity(world, {
    stableKey: "run-d-lite:activity:flexible-draft-block",
    title: "Transit draft follow-up",
    summary:
      "A movable hour reserved for follow-up on the Transit Access Pilot working draft.",
    kind: "flexible",
    start: moment(date, 10, 30),
    end: moment(date, 11, 30),
    participantPersonIds: [playerPersonId],
    responsiblePersonId: playerPersonId,
    location: {
      locationKey: "lexington-legislative-office",
      label: "Legislative Office",
      jurisdictionId,
    },
    sourceEntityIds: [runC.policy.wideAlternativeId],
    flexibility: {
      kind: "movable",
      earliestStart: moment(date, 10, 20),
      latestEnd: moment(date, 14, 20),
    },
    access: { kind: "office" },
  });
  const flexibleActivityId = lastActivity(world).id;

  world = createScheduledActivity(world, {
    stableKey: "run-d-lite:activity:community-transit-meeting",
    title: "Community transit meeting",
    summary:
      "A confirmed off-site discussion with neighborhood transit-access organizers.",
    kind: "confirmed",
    start: moment(date, 14, 0),
    end: moment(date, 15, 15),
    participantPersonIds: [playerPersonId, collinsPersonId],
    responsiblePersonId: playerPersonId,
    location: {
      locationKey: "east-end-community-room",
      label: "East End Community Room",
      jurisdictionId,
    },
    sourceEntityIds: [runC.policy.wideAlternativeId],
    flexibility: { kind: "fixed" },
    access: { kind: "office" },
  });
  const meetingActivityId = lastActivity(world).id;

  world = createScheduledActivity(world, {
    stableKey: "run-d-lite:activity:travel-to-community-meeting",
    title: "Travel to community meeting",
    summary:
      "Twenty authored minutes from the legislative office to the East End meeting.",
    kind: "travel",
    start: moment(date, 13, 40),
    end: moment(date, 14, 0),
    participantPersonIds: [playerPersonId, collinsPersonId],
    responsiblePersonId: playerPersonId,
    location: {
      locationKey: "office-to-east-end",
      label: "Legislative Office → East End Community Room",
      jurisdictionId,
    },
    sourceEntityIds: [meetingActivityId],
    flexibility: { kind: "fixed" },
    access: { kind: "office" },
  });
  const travelActivityId = lastActivity(world).id;

  world = createScheduledActivity(world, {
    stableKey: "run-d-lite:activity:tentative-return-call",
    title: "Tentative constituent return call",
    summary: "A restrained hold for a return call after the community meeting.",
    kind: "tentative",
    start: moment(date, 15, 30),
    end: moment(date, 16, 0),
    participantPersonIds: [playerPersonId],
    responsiblePersonId: playerPersonId,
    location: {
      locationKey: "east-end-community-room",
      label: "East End Community Room",
      jurisdictionId,
    },
    sourceEntityIds: officeSource,
    flexibility: { kind: "fixed" },
    access: { kind: "office" },
  });
  const tentativeActivityId = lastActivity(world).id;

  world = createScheduledActivity(world, {
    stableKey: "run-d-lite:activity:hidden-reed-call",
    title: "Private Reed follow-up",
    summary: "A private NPC commitment not disclosed to Cameron.",
    kind: "confirmed",
    start: moment(date, 11, 0),
    end: moment(date, 11, 45),
    participantPersonIds: [reedPersonId],
    responsiblePersonId: reedPersonId,
    location: {
      locationKey: "private-field-call",
      label: "Private call",
      jurisdictionId,
    },
    sourceEntityIds: officeSource,
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [reedPersonId] },
  });
  const hiddenActivityId = lastActivity(world).id;

  world = createWorkItem(world, {
    stableKey: "run-d-lite:work:transit-draft-decision",
    title: "Transit Access Pilot draft",
    summary:
      "Review the current office working draft and decide the office's next drafting step.",
    jurisdictionId,
    sourceEntityIds: [runC.policy.wideAlternativeId],
    focus: {
      kind: "legislative-material",
      targetKey: RUN_C_DOCUMENT_STABLE_KEY,
      sourceEntityId: runC.policy.wideAlternativeId,
    },
    effort: null,
    access: { kind: "office" },
    assignedPersonIds: [playerPersonId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  const documentWorkItemId = lastWorkItem(world).id;

  world = createWorkItem(world, {
    stableKey: "run-d-lite:work:meeting-brief",
    title: "Prepare community meeting brief",
    summary:
      "Pull the current transit-draft context into a short meeting preparation note.",
    jurisdictionId,
    sourceEntityIds: [runC.policy.wideAlternativeId, meetingActivityId],
    focus: { kind: "calendar-item", scheduledActivityId: meetingActivityId },
    effort: { kind: "authored-duration", requiredMinutes: 90 },
    access: { kind: "office" },
    assignedPersonIds: [playerPersonId],
    playerRequirement: "action",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: meetingActivityId,
  });
  const delegableWorkItemId = lastWorkItem(world).id;

  world = createWorkItem(world, {
    stableKey: "run-d-lite:work:reed-verification",
    title: "Third referral verification",
    summary:
      "Reed is checking the third emergency-rent referral before the office can respond.",
    jurisdictionId,
    sourceEntityIds: officeSource,
    focus: { kind: "person", personId: reedPersonId },
    effort: null,
    access: { kind: "office" },
    assignedPersonIds: [reedPersonId],
    playerRequirement: "none",
    waitingOnPersonIds: [reedPersonId],
    blocker: "Waiting for Reed's verification from the third referral.",
    scheduledActivityId: null,
  });
  const waitingWorkItemId = lastWorkItem(world).id;

  world = createWorkItem(world, {
    stableKey: "run-d-lite:work:collins-analysis-summary",
    title: "Collins's transit analysis summary",
    summary:
      "A concise staff summary of the known Transit Access Pilot projections.",
    jurisdictionId,
    sourceEntityIds: [runC.policy.narrowEstimateId],
    focus: {
      kind: "legislative-material",
      targetKey: RUN_C_DOCUMENT_STABLE_KEY,
      sourceEntityId: runC.policy.narrowEstimateId,
    },
    effort: { kind: "authored-duration", requiredMinutes: 50 },
    access: { kind: "office" },
    assignedPersonIds: [collinsPersonId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  const staffWorkItemId = lastWorkItem(world).id;

  world = createWorkItem(world, {
    stableKey: "run-d-lite:work:hidden-reed-note",
    title: "Undisclosed Reed note",
    summary: "A private NPC work item not reported to Cameron.",
    jurisdictionId,
    sourceEntityIds: officeSource,
    focus: { kind: "person", personId: reedPersonId },
    effort: { kind: "authored-duration", requiredMinutes: 30 },
    access: { kind: "private", personIds: [reedPersonId] },
    assignedPersonIds: [reedPersonId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: hiddenActivityId,
  });
  const hiddenWorkItemId = lastWorkItem(world).id;
  assertWorldIntegrity(world);

  return {
    ...runC,
    world,
    dLite: {
      briefingActivityId,
      flexibleActivityId,
      travelActivityId,
      meetingActivityId,
      tentativeActivityId,
      hiddenActivityId,
      documentWorkItemId,
      delegableWorkItemId,
      waitingWorkItemId,
      staffWorkItemId,
      hiddenWorkItemId,
      collinsPersonId,
      reedPersonId,
    },
  };
}

export function projectRunDLite(
  world: World,
  fixture: RunDLiteFixture,
): RunDLiteProjection {
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  if (!controlledPersonId || controlledPersonId !== fixture.playerPersonId) {
    throw new Error("Run D-Lite projection requires its controlled player.");
  }
  const agenda = scheduledActivitiesVisibleTo(world, controlledPersonId).map(
    (activity) => {
      const state = scheduledActivityState(world, activity.id);
      const waitBeforeStartMinutes = simulationMinutesBetween(
        world.currentMoment,
        state.start,
      );
      return {
        activity,
        state,
        durationMinutes: simulationMinutesBetween(state.start, state.end),
        waitBeforeStartMinutes:
          state.status === "scheduled" && waitBeforeStartMinutes >= 0
            ? waitBeforeStartMinutes
            : null,
        elapsedIfPerformedMinutes:
          state.status === "scheduled" && waitBeforeStartMinutes >= 0
            ? simulationMinutesBetween(world.currentMoment, state.end)
            : null,
      };
    },
  );
  const nextCommitment =
    agenda.find(
      (entry) =>
        entry.state.status === "scheduled" &&
        simulationMinutesBetween(world.currentMoment, entry.state.end) > 0,
    ) ?? null;
  return {
    currentMoment: world.currentMoment,
    weekDates: Array.from({ length: 5 }, (_, index) =>
      addDays(world.currentDate, index),
    ),
    agenda,
    work: workPendingEntriesFor(world, controlledPersonId),
    nextCommitment,
  };
}

export function rescheduleRunDFlexibleBlock(
  world: World,
  fixture: RunDLiteFixture,
  choice: "valid" | "travel-conflict",
): RescheduleScheduledActivityResult {
  const date = world.currentDate;
  return rescheduleScheduledActivity(world, {
    stableKey: `run-d-lite:reschedule:flexible-block:${choice}`,
    activityId: fixture.dLite.flexibleActivityId,
    start: choice === "valid" ? moment(date, 11, 0) : moment(date, 13, 0),
    end: choice === "valid" ? moment(date, 12, 0) : moment(date, 14, 0),
  });
}

export function delegateRunDMeetingBrief(
  world: World,
  fixture: RunDLiteFixture,
): World {
  return assignWorkItem(world, {
    stableKey: "run-d-lite:work:meeting-brief:assigned-collins",
    workItemId: fixture.dLite.delegableWorkItemId,
    assigneePersonId: fixture.dLite.collinsPersonId,
  });
}

export function performRunDBriefing(
  world: World,
  fixture: RunDLiteFixture,
): World {
  return performScheduledActivity(world, fixture.dLite.briefingActivityId);
}

export function hiddenRunDStateIsFiltered(
  world: World,
  fixture: RunDLiteFixture,
): boolean {
  const hiddenActivity = world.history.scheduledActivities.find(
    (activity) => activity.id === fixture.dLite.hiddenActivityId,
  );
  const hiddenWork = world.history.workItems.find(
    (item) => item.id === fixture.dLite.hiddenWorkItemId,
  );
  return !!(
    hiddenActivity &&
    hiddenWork &&
    !canPersonAccess(hiddenActivity.access, fixture.playerPersonId) &&
    !canPersonAccess(hiddenWork.access, fixture.playerPersonId)
  );
}
