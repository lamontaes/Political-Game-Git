import {
  activeChildAuthoritiesAt,
  ageOnDate,
  householdMembershipsAt,
  peopleInHouseholdAt,
  personName,
  scheduledActivityPerformanceTiming,
  scheduledActivityState,
  type EntityId,
  type ScheduledActivityRecord,
  type World,
} from "../simulation";
import {
  openingLifeLocation,
  openingNeighborhoodWalkOffer,
  type OpeningWalkOffer,
} from "./life-scene-flow";
import { resolveLifeScene } from "./life-scene";
import { municipalWorkspaceFor } from "./municipal-workspace";
import { municipalActionAuthority } from "../simulation/municipal-public-work";
import {
  completedActivityHere,
  sceneVenueForLocationKey,
} from "./scene-venues";
import { venueActivities } from "./venue-activity";

/** Pure read-model for the feature-local Places workspace. */
export type PlacesActionKind = "inspect" | "travel" | "return-home" | "attend";

export interface PlacesLocationView {
  readonly label: string;
  readonly setting: string | null;
  readonly jurisdictionId: EntityId | null;
  /** Honest note when no released scene art matches the recorded location. */
  readonly sceneNote: string | null;
}

export interface PlacesOfferView {
  readonly id: string;
  readonly kind: PlacesActionKind;
  readonly title: string;
  readonly detail: string | null;
  readonly minutes: number | null;
  readonly durationLabel: string | null;
  readonly unavailable: string | null;
  readonly companionLabel: string | null;
  readonly walkDestination?: "home" | "neighborhood";
  readonly activityId?: EntityId;
  readonly governmentKey?: string;
  readonly meetingId?: EntityId;
  readonly inspectGovernmentKey?: string;
}

export interface PlacesWorkspaceModel {
  readonly current: PlacesLocationView;
  readonly offers: readonly PlacesOfferView[];
  readonly completedHere: {
    readonly title: string;
    readonly locationLabel: string;
  } | null;
}

export function projectPlacesWorkspace(
  world: World,
  personId: EntityId,
): PlacesWorkspaceModel | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  if (!world.people[personId]) return null;

  const location = openingLifeLocation(world, personId);
  const scene = resolveLifeScene(world, personId);
  const current: PlacesLocationView = {
    label: location?.label ?? "Location not recorded",
    setting: location?.setting ?? null,
    jurisdictionId: location?.jurisdictionId ?? null,
    sceneNote:
      scene.sceneId === null && location?.setting ? scene.reason : null,
  };

  const offers: PlacesOfferView[] = [];
  for (const destination of ["neighborhood", "home"] as const) {
    offers.push(projectWalkOffer(world, personId, destination));
  }

  for (const entry of venueActivities(world, personId)) {
    offers.push(
      projectVenueOffer(
        world,
        personId,
        entry.activity,
        entry.refusal,
        entry.elapsedMinutes,
      ),
    );
  }

  const municipal = municipalWorkspaceFor(world);
  if (municipal) {
    for (const meeting of municipal.meetings) {
      offers.push(
        projectMunicipalMeetingOffer(
          world,
          personId,
          municipal.government.key,
          meeting,
        ),
      );
    }
    offers.push({
      id: `inspect-government-${municipal.government.key}`,
      kind: "inspect",
      title: municipal.government.displayName,
      detail:
        "Inspect this government’s public meetings and records. This does not move you or change where you live.",
      minutes: null,
      durationLabel: null,
      unavailable: null,
      companionLabel: null,
      inspectGovernmentKey: municipal.government.key,
    });
  }

  const completed = completedActivityHere(world, personId);
  return {
    current,
    offers,
    completedHere: completed
      ? { title: completed.title, locationLabel: completed.location.label }
      : null,
  };
}

function projectWalkOffer(
  world: World,
  personId: EntityId,
  destination: "home" | "neighborhood",
): PlacesOfferView {
  const offer = openingNeighborhoodWalkOffer(world, personId, destination);
  const companionLabel = walkCompanionLabel(world, personId, offer);
  return {
    id: destination === "home" ? "walk-home" : "walk-neighborhood",
    kind: destination === "home" ? "return-home" : "travel",
    title: offer.label,
    detail: offer.fromLabel ? `From ${offer.fromLabel}.` : null,
    minutes: offer.minutes,
    durationLabel: `${offer.minutes} minutes`,
    unavailable: offer.unavailable,
    companionLabel,
    walkDestination: destination,
  };
}

function projectVenueOffer(
  world: World,
  personId: EntityId,
  activity: ScheduledActivityRecord,
  refusal: string | null,
  elapsedMinutes: number | null,
): PlacesOfferView {
  const venue = sceneVenueForLocationKey(activity.location.locationKey);
  const detailParts = [
    activity.summary.trim(),
    venue?.isJourney
      ? "This is a journey, not a room you enter at the end."
      : venue?.sceneId
        ? null
        : (venue?.reason ??
          "No released room art is bound to this activity yet."),
  ].filter(Boolean);
  let durationLabel: string | null = null;
  if (refusal === null && elapsedMinutes !== null) {
    try {
      durationLabel = `${elapsedMinutes} minutes, including any wait before it begins.`;
    } catch {
      durationLabel = null;
    }
  }
  return {
    id: `venue-${activity.id}`,
    kind: "attend",
    title: activity.title,
    detail: detailParts.join(" "),
    minutes: elapsedMinutes,
    durationLabel,
    unavailable: refusal,
    companionLabel: null,
    activityId: activity.id,
  };
}

function projectMunicipalMeetingOffer(
  world: World,
  personId: EntityId,
  governmentKey: string,
  meeting: ScheduledActivityRecord,
): PlacesOfferView {
  const state = scheduledActivityState(world, meeting.id);
  let unavailable: string | null = null;
  let durationLabel: string | null = null;
  if (state?.status !== "scheduled") {
    unavailable = "This meeting is no longer scheduled.";
  } else {
    const authority = municipalActionAuthority(world, {
      governmentKey,
      personId,
      residentPlaceGeoid: null,
      action: "attend-public-meeting",
    });
    if (!authority.ok) unavailable = authority.reason;
    else {
      try {
        const timing = scheduledActivityPerformanceTiming(world, meeting.id);
        durationLabel = `${timing.totalElapsedMinutes} minutes for this session.`;
      } catch (error) {
        unavailable =
          error instanceof Error
            ? error.message
            : "This meeting cannot be attended now.";
      }
    }
  }
  return {
    id: `municipal-${meeting.id}`,
    kind: "attend",
    title: meeting.title,
    detail: meeting.summary,
    minutes: null,
    durationLabel,
    unavailable,
    companionLabel: null,
    governmentKey,
    meetingId: meeting.id,
  };
}

function sceneHouseholdId(world: World, personId: EntityId): EntityId | null {
  const memberships = householdMembershipsAt(world, personId);
  const primary = memberships.filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  const household =
    primary.length === 1
      ? primary[0]
      : memberships.length === 1
        ? memberships[0]
        : undefined;
  return household?.household.id ?? null;
}

function walkCompanionLabel(
  world: World,
  personId: EntityId,
  offer: OpeningWalkOffer,
): string | null {
  if (offer.unavailable !== null) return null;
  const age = ageOnDate(world.people[personId]!.birthDate, world.currentDate);
  if (age >= 18) return null;
  const householdId = sceneHouseholdId(world, personId);
  if (!householdId) return null;
  const housemates = peopleInHouseholdAt(world, householdId);
  const guardian = activeChildAuthoritiesAt(world, personId).find(
    (entry) =>
      entry.authority.holder.kind === "person" &&
      housemates.includes(entry.authority.holder.personId),
  );
  if (guardian?.authority.holder.kind !== "person") return null;
  return `${personName(world.people[guardian.authority.holder.personId]!)} would come with you.`;
}

/** Reports clock and arrival changes after a committed Places action. */
export function describePlacesOutcome(
  before: World,
  after: World,
  personId: EntityId,
): string {
  if (after === before) return "Nothing changed. No time passed.";
  const beforeMoment = before.currentMoment;
  const afterMoment = after.currentMoment;
  const beforePlace = openingLifeLocation(before, personId)?.label ?? null;
  const afterPlace = openingLifeLocation(after, personId)?.label ?? null;
  const formatMinute = (minuteOfDay: number) => {
    const hour24 = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour = hour24 % 12 || 12;
    return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
  };
  const clock =
    afterMoment.date === beforeMoment.date
      ? `${formatMinute(beforeMoment.minuteOfDay)} → ${formatMinute(afterMoment.minuteOfDay)}`
      : `${formatMinute(beforeMoment.minuteOfDay)} → ${formatMinute(afterMoment.minuteOfDay)}, ${afterMoment.date}`;
  const moved =
    afterPlace && afterPlace !== beforePlace ? ` · ${afterPlace}` : "";
  if (
    afterMoment.date === beforeMoment.date &&
    afterMoment.minuteOfDay === beforeMoment.minuteOfDay &&
    !moved
  )
    return "Done. No time passed.";
  return `${clock}${moved}`;
}
