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
  municipalMeetings,
  municipalSeats,
  municipalStanding,
  scheduleMunicipalMeeting,
  installMunicipalGovernment,
} from "../simulation/municipal-public-work";
import { addSimulationMinutes } from "../simulation/dates";
import { scheduledActivityState } from "../simulation/time-work";
import { resolvePlayerCapabilities } from "./player-capabilities";
import type { EntityId, World } from "../simulation/types";

/**
 * Feature-local ordinary municipal route for A / FABLE-UI.
 *
 * Read and write through canonical World records only. UI-core owns
 * registration; this file must not be imported from the recovered Fable shell.
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
    meetings: municipalMeetings(world, government.key).map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      status: scheduledActivityState(world, meeting.id)?.status ?? null,
    })),
    managerAppointment: world.history.events.find(
      (event) =>
        event.stableKey === `municipal-manager-appointed:${government.key}`,
    ),
  };
}

export function ensureAuthoredPublicMeeting(
  world: World,
  governmentKey: string,
  seriesKey: string,
) {
  const view = projectMunicipalGoverning(world, governmentKey);
  if (!view || !view.attendance.ok) {
    const reason =
      view && !view.attendance.ok
        ? view.attendance.reason
        : "No compiled government.";
    return { ok: false as const, world, reason };
  }
  const existing = municipalMeetings(world, governmentKey).find(
    (meeting) =>
      meeting.stableKey.startsWith(
        `municipal-meeting:${governmentKey}:${seriesKey}:`,
      ) && scheduledActivityState(world, meeting.id)?.status === "scheduled",
  );
  if (existing) return { ok: true as const, world, activityId: existing.id };
  if (world.control.kind !== "person")
    return {
      ok: false as const,
      world,
      reason: "Person control is required.",
    };
  const personId = world.control.personId;
  let next = installMunicipalGovernment(world, {
    governmentKey,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    formedAt: world.currentDate,
  });
  const start = addSimulationMinutes(next.currentMoment, 60);
  next = scheduleMunicipalMeeting(next, {
    governmentKey,
    seriesKey,
    start,
    end: addSimulationMinutes(start, 90),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    occurrenceNote:
      "Game session: timing and duration are authored for this world. No real published meeting notice or agenda is asserted.",
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
) {
  return appointMunicipalManager(world, { governmentKey, appointeePersonId });
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
