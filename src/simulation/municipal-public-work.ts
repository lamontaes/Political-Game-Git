import {
  activeOrganizationParticipationsAt,
  organizationProfileAt,
} from "./life-queries";
import { measureActions, measuresForJurisdiction } from "./legislation";
import {
  createScheduledActivity,
  createWorkItem,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import type {
  EntityId,
  OrganizationParticipationRoleKind,
  World,
} from "./types";

/** Source adapters supply explicit identities; names never establish a join. */
export interface MunicipalGovernmentBinding {
  readonly governmentKey: string;
  readonly organizationId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly residentJurisdictionIds: readonly EntityId[];
  readonly censusPlaceGeoid: string | null;
  readonly censusGovernmentUnitId: string | null;
  readonly countyGovernmentKey: string | null;
  readonly identitySourceUrls: readonly string[];
  readonly structure: {
    readonly form: string | null;
    readonly bodyName: string | null;
    readonly bodySize: number | null;
    readonly mayorIsBodyMember: boolean | null;
    readonly professionalManager: boolean | null;
    readonly assemblyMethod:
      | "elected-council"
      | "open-town-meeting"
      | "representative-town-meeting"
      | null;
  };
  /** Exact existing role taxonomy keys, established by the canonical role writer. */
  readonly agendaWorkRoles: readonly OrganizationParticipationRoleKind[];
}

/** A notice points at the existing schedule and existing legislative measures. */
export interface MunicipalMeetingNotice {
  readonly governmentKey: string;
  readonly scheduledActivityId: EntityId;
  readonly publicAttendance: "SUPPORTED" | "UNKNOWN" | "CLOSED";
  readonly attendanceSourceUrls: readonly string[];
  readonly agendaMeasureIds: readonly EntityId[];
}

export type MunicipalRefusal =
  | "person-control-required"
  | "government-identity-unresolved"
  | "meeting-not-supported"
  | "public-attendance-unresolved"
  | "meeting-not-scheduled"
  | "role-required"
  | "calendar-conflict"
  | "already-recorded";

export type MunicipalActionResult =
  | { readonly ok: true; readonly world: World }
  | {
      readonly ok: false;
      readonly world: World;
      readonly reason: MunicipalRefusal;
    };

function refuse(world: World, reason: MunicipalRefusal): MunicipalActionResult {
  return { ok: false, world, reason };
}

export function municipalBindingExists(
  world: World,
  binding: MunicipalGovernmentBinding,
): boolean {
  const organization = world.history.organizations.find(
    (row) => row.id === binding.organizationId,
  );
  const profile = organizationProfileAt(world, binding.organizationId);
  return Boolean(
    organization &&
    organization.stableKey ===
      `municipal-government:${binding.governmentKey}` &&
    world.jurisdictions[binding.jurisdictionId] &&
    profile?.locationJurisdictionId === binding.jurisdictionId &&
    binding.identitySourceUrls.length > 0 &&
    binding.identitySourceUrls.every((url) => /^https:\/\//.test(url)),
  );
}

/** Residency selects an explicitly linked government, never the nearest/name match. */
export function municipalGovernmentsForResident(
  world: World,
  bindings: readonly MunicipalGovernmentBinding[],
): readonly MunicipalGovernmentBinding[] {
  if (world.control.kind !== "person") return [];
  const person = world.people[world.control.personId];
  if (!person) return [];
  return bindings.filter(
    (binding) =>
      municipalBindingExists(world, binding) &&
      binding.residentJurisdictionIds.includes(person.homeJurisdictionId),
  );
}

export function municipalAgendaWorkAuthorized(
  world: World,
  binding: MunicipalGovernmentBinding,
): boolean {
  if (
    world.control.kind !== "person" ||
    !municipalBindingExists(world, binding)
  )
    return false;
  return activeOrganizationParticipationsAt(world, world.control.personId).some(
    ({ participation, state }) =>
      participation.organizationId === binding.organizationId &&
      state.roleKind !== null &&
      binding.agendaWorkRoles.includes(state.roleKind),
  );
}

function meetingSupported(
  world: World,
  binding: MunicipalGovernmentBinding,
  notice: MunicipalMeetingNotice,
): boolean {
  const activity = world.history.scheduledActivities.find(
    (row) => row.id === notice.scheduledActivityId,
  );
  return (
    notice.governmentKey === binding.governmentKey &&
    Boolean(
      activity &&
      activity.sourceEntityIds.includes(binding.organizationId) &&
      activity.location.jurisdictionId === binding.jurisdictionId,
    )
  );
}

export function municipalAgenda(
  world: World,
  binding: MunicipalGovernmentBinding,
  notice: MunicipalMeetingNotice,
) {
  if (
    !municipalBindingExists(world, binding) ||
    !meetingSupported(world, binding, notice) ||
    notice.publicAttendance !== "SUPPORTED" ||
    notice.attendanceSourceUrls.length === 0
  )
    return [];
  return measuresForJurisdiction(world, binding.jurisdictionId)
    .filter((measure) => notice.agendaMeasureIds.includes(measure.id))
    .map((measure) => ({
      measure,
      actions: measureActions(world, measure.id),
    }));
}

/** Attendance creates only a personal calendar commitment. It grants no role. */
export function attendMunicipalMeeting(
  world: World,
  binding: MunicipalGovernmentBinding,
  notice: MunicipalMeetingNotice,
): MunicipalActionResult {
  if (world.control.kind !== "person")
    return refuse(world, "person-control-required");
  if (!municipalBindingExists(world, binding))
    return refuse(world, "government-identity-unresolved");
  if (!meetingSupported(world, binding, notice))
    return refuse(world, "meeting-not-supported");
  if (
    notice.publicAttendance !== "SUPPORTED" ||
    notice.attendanceSourceUrls.length === 0
  )
    return refuse(world, "public-attendance-unresolved");
  const activity = world.history.scheduledActivities.find(
    (row) => row.id === notice.scheduledActivityId,
  )!;
  const state = scheduledActivityState(world, activity.id);
  if (!state || state.status !== "scheduled")
    return refuse(world, "meeting-not-scheduled");
  const stableKey = `municipal-attendance:${activity.id}:${world.control.personId}`;
  if (
    world.history.scheduledActivities.some((row) => row.stableKey === stableKey)
  )
    return refuse(world, "already-recorded");
  try {
    const scheduled = createScheduledActivity(world, {
      stableKey,
      title: `Attend ${activity.title}`,
      summary: `Public attendance. ${activity.summary}`,
      kind: "confirmed",
      start: state.start,
      end: state.end,
      participantPersonIds: [world.control.personId],
      responsiblePersonId: world.control.personId,
      location: activity.location,
      sourceEntityIds: [binding.organizationId, activity.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [world.control.personId] },
    });
    const visit = scheduled.history.scheduledActivities.find(
      (row) => row.stableKey === stableKey,
    )!;
    const performed = performScheduledActivity(scheduled, visit.id);
    // A refusal must retain the original world, including its sequence counter.
    if (scheduledActivityState(performed, visit.id)?.status !== "completed")
      return refuse(world, "calendar-conflict");
    return { ok: true, world: performed };
  } catch (error) {
    if (error instanceof Error && /conflict|past/.test(error.message))
      return refuse(world, "calendar-conflict");
    throw error;
  }
}

/** An office work item, not a vote, enactment, election, or new role. */
export function prepareMunicipalAgenda(
  world: World,
  binding: MunicipalGovernmentBinding,
  notice: MunicipalMeetingNotice,
): MunicipalActionResult {
  if (
    !municipalAgendaWorkAuthorized(world, binding) ||
    world.control.kind !== "person"
  )
    return refuse(world, "role-required");
  if (!meetingSupported(world, binding, notice))
    return refuse(world, "meeting-not-supported");
  const stableKey = `municipal-agenda-work:${notice.scheduledActivityId}:${world.control.personId}`;
  if (world.history.workItems.some((row) => row.stableKey === stableKey))
    return refuse(world, "already-recorded");
  return {
    ok: true,
    world: createWorkItem(world, {
      stableKey,
      title: "Prepare meeting notes",
      summary: "Review the recorded agenda and existing measure history.",
      jurisdictionId: binding.jurisdictionId,
      sourceEntityIds: [binding.organizationId, notice.scheduledActivityId],
      focus: {
        kind: "calendar-item",
        scheduledActivityId: notice.scheduledActivityId,
      },
      effort: null,
      access: { kind: "private", personIds: [world.control.personId] },
      assignedPersonIds: [world.control.personId],
      playerRequirement: "action",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: notice.scheduledActivityId,
    }),
  };
}
