import {
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
  primaryReading,
} from "../simulation/municipal-government";
import {
  appointMunicipalManager,
  attendMunicipalPublicMeeting,
  introduceMunicipalOrdinance,
  municipalActionAuthority,
  municipalGovernmentJurisdictionId,
  municipalMeetings,
  municipalSeats,
  municipalStanding,
  scheduleMunicipalMeeting,
  installMunicipalGovernment,
} from "../simulation/municipal-public-work";
import { addSimulationMinutes } from "../simulation/dates";
import { scheduledActivityState } from "../simulation/time-work";
import { resolvePlayerCapabilities } from "./player-capabilities";
import type {
  EntityId,
  LegislativeVoteDisposition,
  World,
} from "../simulation/types";

/**
 * Feature-local ordinary municipal route for A / FABLE-UI.
 *
 * Read and write through canonical World records only. UI-core owns
 * registration; this file must not be imported from the recovered Fable shell.
 * Inspection projects existing records. It does not install a government,
 * schedule a sitting, or grant a seat.
 */
export function projectMunicipalGoverning(
  world: World,
  governmentKey?: string,
) {
  if (world.control.kind !== "person") return null;
  const personId = world.control.personId;
  const place = resolvePlayerCapabilities(world).homePlace;
  const home = place ? municipalGovernmentForLifePlace(place) : null;
  const government = governmentKey
    ? municipalGovernmentByKey(governmentKey)
    : home;
  if (!government) return null;
  const reading = primaryReading(government);
  const pack = municipalRulePackFor(government);
  const standing = municipalStanding(world, {
    governmentKey: government.key,
    personId,
    residentPlaceGeoid: place?.sourceGeoid ?? null,
  });
  return {
    governmentKey: government.key,
    displayName: reading.displayName,
    bodyName: reading.bodyName,
    evidence: reading.evidence,
    jurisdictionId: municipalGovernmentJurisdictionId(world, government.key),
    standing,
    seats: municipalSeats(world, government.key),
    attendance: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "attend-public-meeting",
    }),
    appointment: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "appoint-the-manager",
    }),
    ordinanceIntroduction: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "introduce-ordinance",
    }),
    ordinanceVote: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "vote-on-ordinance",
    }),
    procedureGaps: pack.ok
      ? []
      : pack.missing.map((entry) => ({
          field: entry.field,
          reason: entry.reason,
        })),
    meetings: discoverMunicipalPublicMeetings(world, government.key),
    managerAppointment: world.history.events.find(
      (event) =>
        event.stableKey === `municipal-manager-appointed:${government.key}`,
    ),
  };
}

/** Existing sittings already on the calendar. Inspection must not add one. */
export function discoverMunicipalPublicMeetings(
  world: World,
  governmentKey: string,
) {
  return municipalMeetings(world, governmentKey).map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    status: scheduledActivityState(world, meeting.id)?.status ?? null,
  }));
}

/**
 * Authored review convenience: one sitting in 60 minutes lasting 90 minutes.
 *
 * This is not ordinary meeting discovery, not a resident power, and not a
 * charter schedule. Call it only when a review world needs an explicit
 * game-authored occurrence.
 */
export function ensureAuthoredPublicMeeting(
  world: World,
  governmentKey: string,
  seriesKey: string,
) {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government) {
    return { ok: false as const, world, reason: "No compiled government." };
  }
  if (world.control.kind !== "person")
    return {
      ok: false as const,
      world,
      reason: "Person control is required.",
    };
  const personId = world.control.personId;
  const place = resolvePlayerCapabilities(world).homePlace;
  const attendance = municipalActionAuthority(world, {
    governmentKey,
    personId,
    residentPlaceGeoid: place?.sourceGeoid ?? null,
    action: "attend-public-meeting",
  });
  if (!attendance.ok) {
    return { ok: false as const, world, reason: attendance.reason };
  }
  const existing = municipalMeetings(world, governmentKey).find(
    (meeting) =>
      meeting.stableKey.startsWith(
        `municipal-meeting:${governmentKey}:${seriesKey}:`,
      ) && scheduledActivityState(world, meeting.id)?.status === "scheduled",
  );
  if (existing) return { ok: true as const, world, activityId: existing.id };
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    governmentKey,
  );
  let next = installMunicipalGovernment(world, {
    governmentKey,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  const resolvedJurisdiction =
    municipalGovernmentJurisdictionId(next, governmentKey) ?? jurisdictionId;
  const start = addSimulationMinutes(next.currentMoment, 60);
  next = scheduleMunicipalMeeting(next, {
    governmentKey,
    seriesKey,
    start,
    end: addSimulationMinutes(start, 90),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    jurisdictionId: resolvedJurisdiction,
    occurrenceNote:
      "Game session: timing and duration are authored for this world. No real published meeting notice or agenda is asserted. This helper is not ordinary municipal meeting discovery.",
  });
  const meeting = municipalMeetings(next, governmentKey).at(-1);
  if (!meeting)
    return {
      ok: false as const,
      world,
      reason: "The authored sitting was not recorded.",
    };
  return { ok: true as const, world: next, activityId: meeting.id };
}

export function attendProjectedPublicMeeting(
  world: World,
  governmentKey: string,
  activityId: EntityId,
) {
  return attendMunicipalPublicMeeting(world, governmentKey, activityId);
}

export function appointProjectedManager(
  world: World,
  governmentKey: string,
  appointeePersonId: EntityId,
  dispositions: readonly LegislativeVoteDisposition[],
) {
  return appointMunicipalManager(world, {
    governmentKey,
    appointeePersonId,
    dispositions,
  });
}

export function introduceProjectedOrdinance(
  world: World,
  governmentKey: string,
  designation: string,
) {
  return introduceMunicipalOrdinance(world, {
    governmentKey,
    designation,
    shortTitle: designation,
    summary:
      "Member-sponsored municipal ordinance using the compiled council pack.",
  });
}

/**
 * The small ordinary-route mount A consumes. Recovered MunicipalWorkspace is
 * not redesigned here; UI-core registers this adapter.
 */
export function mountOrdinaryMunicipalRoute() {
  return {
    inspect: projectMunicipalGoverning,
    discoverPublicMeetings: discoverMunicipalPublicMeetings,
    authorPublicMeetingForReview: ensureAuthoredPublicMeeting,
    attendPublicMeeting: attendProjectedPublicMeeting,
    appointManager: appointProjectedManager,
    introduceOrdinance: introduceProjectedOrdinance,
  };
}
