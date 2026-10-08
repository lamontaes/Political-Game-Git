import { describeInterval } from "./time-target-label";
import {
  scheduledActivityPerformanceTiming,
  scheduledActivityState,
  type EntityId,
  type ScheduledActivityRecord,
  type World,
} from "../simulation";
import { openingLifeLocation } from "./life-scene-flow";
import { resolveLifeScene } from "./life-scene";
import { proseDate } from "./prose-dates";
import { municipalWorkspaceFor } from "./municipal-workspace";
import { municipalActionAuthority } from "../simulation/municipal-public-work";
import { completedActivityHere } from "./scene-venues";
import { formatRoutineElapsedMinutes } from "./routine-outcome";
import { venueActivities } from "./venue-activity";

/** Pure read-model for the feature-local Places workspace. */
export type PlacesActionKind = "inspect" | "travel" | "return-home" | "attend";

export interface PlacesLocationView {
  readonly label: string | null;
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
  readonly declineActivityId?: EntityId;
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
    label: location?.label ?? null,
    setting: location?.setting ?? null,
    jurisdictionId: location?.jurisdictionId ?? null,
    sceneNote:
      scene.sceneId === null && location?.setting ? scene.reason : null,
  };

  const offers: PlacesOfferView[] = [];
  const venueEntries = venueActivities(world, personId);
  const bundledJourneyIds = new Set(
    venueEntries.flatMap((entry) =>
      entry.journey ? [entry.journey.activity.id] : [],
    ),
  );
  for (const entry of venueEntries) {
    // Attend owns the journey and the destination scene. A bare commute has
    // no scene of its own, so it is not a separate Places choice.
    if (
      entry.activity.kind === "travel" ||
      bundledJourneyIds.has(entry.activity.id)
    )
      continue;
    offers.push(
      projectVenueOffer(
        world,
        personId,
        entry.activity,
        entry.refusal,
        entry.elapsedMinutes,
        entry.journey,
        entry.declinable,
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
      detail: null,
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

function projectVenueOffer(
  world: World,
  personId: EntityId,
  activity: ScheduledActivityRecord,
  refusal: string | null,
  elapsedMinutes: number | null,
  journey: ReturnType<typeof venueActivities>[number]["journey"],
  declinable: boolean,
): PlacesOfferView {
  const detail = activity.summary.trim();
  let durationLabel: string | null = null;
  if (refusal === null && journey && !journey.alreadyCompleted)
    durationLabel = formatRoutineElapsedMinutes(journey.journeyMinutes);
  return {
    id: `venue-${activity.id}`,
    kind: "attend",
    title: activity.title,
    detail,
    minutes: elapsedMinutes,
    durationLabel,
    unavailable: refusal,
    companionLabel: null,
    activityId: activity.id,
    ...(declinable ? { declineActivityId: activity.id } : {}),
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
        durationLabel = describeInterval(timing.totalElapsedMinutes);
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
      : `${formatMinute(beforeMoment.minuteOfDay)} → ${formatMinute(afterMoment.minuteOfDay)}, ${proseDate(afterMoment.date)}`;
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
