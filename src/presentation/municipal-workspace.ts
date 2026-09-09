import {
  scheduledActivityState,
  workPendingEntriesFor,
} from "../simulation/time-work";
import { addSimulationMinutes } from "../simulation/dates";
import { municipalCapacityObservations } from "../simulation/municipal-capacity";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  primaryReading,
  municipalPublicMeetingSeries,
} from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  scheduleMunicipalMeeting,
  municipalActionAuthority,
  municipalMeetings,
  municipalMeasures,
  municipalStanding,
  openMunicipalWork,
} from "../simulation/municipal-public-work";
import type { EntityId, World } from "../simulation/types";

/** UI-core v1: a projection of this saved life; no alternate world or clock. */
export function municipalWorkspaceFor(world: World, inspectionKey?: string) {
  if (world.control.kind !== "person") return null;
  const capabilities = resolvePlayerCapabilities(world);
  const place = capabilities.homePlace;
  const homeGovernment = place ? municipalGovernmentForLifePlace(place) : null;
  const government = inspectionKey
    ? municipalGovernmentByKey(inspectionKey)
    : homeGovernment;
  if (!government) return null;
  const personId = world.control.personId;
  // Linkification of already compiled research references, not a government,
  // legal-rule or meeting-occurrence join. A reference grants no capability.
  const publicReferences = [
    ...new Set(
      government.readings.flatMap((reading) => [
        ...reading.sources.map((source) => source.url),
        ...reading.facts
          .filter((fact) => fact.path.startsWith("researchObservations."))
          .flatMap((fact) =>
            typeof fact.value === "string"
              ? (fact.value.match(/https?:\/\/[^\s<>`]+/g) ?? [])
              : [],
          ),
      ]),
    ),
  ].filter((url) => {
    try {
      return ["http:", "https:"].includes(new URL(url).protocol);
    } catch {
      return false;
    }
  });
  return {
    publicReferences,
    availableMeetingSeries: municipalPublicMeetingSeries(government),
    meetingNotes: workPendingEntriesFor(world, personId).filter(({ item }) =>
      item.stableKey.startsWith(
        `municipal-work:${government.key}:meeting-notes:`,
      ),
    ),
    government,
    isHomeGovernment: homeGovernment?.key === government.key,
    capacity: municipalCapacityObservations(
      government.identity ?? { censusGovernmentUnitId: null },
    ),
    reading: primaryReading(government),
    standing: municipalStanding(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
    }),
    meetings: municipalMeetings(world, government.key),
    measures: municipalMeasures(world, government.key),
    attendanceAuthority: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "attend-public-meeting",
    }),
  };
}

export function prepareMunicipalMeetingNotes(
  world: World,
  governmentKey: string,
  activityId: EntityId,
) {
  if (world.control.kind !== "person")
    return { ok: false as const, world, reason: "Person control is required." };
  const government = municipalGovernmentByKey(governmentKey);
  const activity = municipalMeetings(world, governmentKey).find(
    (row) => row.id === activityId,
  );
  if (!government || !activity)
    return {
      ok: false as const,
      world,
      reason: "No such municipal meeting is recorded.",
    };
  const personId = world.control.personId;
  const roles = municipalStanding(world, {
    governmentKey,
    personId,
    residentPlaceGeoid: null,
  }).roles;
  if (!roles.some((role) => role !== "resident"))
    return {
      ok: false as const,
      world,
      reason: "A current role in this government is required.",
    };
  const targetKey = `meeting-notes:${activityId}`;
  if (
    world.history.workItems.some(
      (row) =>
        row.stableKey ===
        `municipal-work:${governmentKey}:${targetKey}:${personId}`,
    )
  )
    return {
      ok: false as const,
      world,
      reason: "Meeting notes are already in Work.",
    };
  return {
    ok: true as const,
    world: openMunicipalWork(world, {
      governmentKey,
      personId,
      title: "Prepare meeting notes",
      summary: `Review the recorded agenda and measure history for ${activity.title}.`,
      jurisdictionId: activity.location.jurisdictionId,
      requiredMinutes: 20,
      scheduledActivityId: activityId,
      targetKey,
    }),
  };
}

/** Materialize this life's supported public context in canonical stores.
 * The session is explicitly authored game history, not a scraped real-world
 * meeting notice. Timing and duration are scenario inputs, not charter rules.
 */
export function synchronizeMunicipalPublicContext(
  world: World,
  seriesKey?: string,
): World {
  const view = municipalWorkspaceFor(world);
  if (!view || !view.attendanceAuthority.ok) return world;
  const series = view.availableMeetingSeries.find((row) =>
    seriesKey ? row.seriesKey === seriesKey : true,
  );
  if (!series) return world;
  const prefix = `municipal-meeting:${view.government.key}:${series.seriesKey}:`;
  const existing = municipalMeetings(world, view.government.key).filter(
    (meeting) => meeting.stableKey.startsWith(prefix),
  );
  if (
    existing.some(
      (meeting) =>
        scheduledActivityState(world, meeting.id)?.status === "scheduled",
    )
  )
    return world;
  let next = installMunicipalGovernment(world, {
    governmentKey: view.government.key,
    jurisdictionId: world.people[view.standing.personId]!.homeJurisdictionId,
    formedAt: world.currentDate,
  });
  let start = addSimulationMinutes(world.currentMoment, 60);
  if (
    existing.some((meeting) => meeting.stableKey === `${prefix}${start.date}`)
  )
    start = addSimulationMinutes(start, 24 * 60);
  next = scheduleMunicipalMeeting(next, {
    governmentKey: view.government.key,
    seriesKey: series.seriesKey,
    start,
    end: addSimulationMinutes(start, 90),
    participantPersonIds: [view.standing.personId],
    responsiblePersonId: view.standing.personId,
    jurisdictionId: world.people[view.standing.personId]!.homeJurisdictionId,
    occurrenceNote:
      "Game session: timing and duration are authored for this world. No real published meeting notice or agenda is asserted.",
  });
  return next;
}
