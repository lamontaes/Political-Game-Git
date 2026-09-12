import {
  canPersonAccess,
  compareSimulationMoments,
  scheduledActivityState,
  type EntityId,
  type ScheduledActivityRecord,
  type World,
} from "../simulation";
import {
  COURTROOM_SCENE_ID,
  DOMESTIC_ORDINARY_SCENE_ID,
  HEARING_ROOM_SCENE_ID,
  LEGISLATIVE_CHAMBER_SCENE_ID,
  PRODUCTION_OFFICE_SCENE_ID,
  PUBLIC_MEETING_ROOM_SCENE_ID,
  SCENE_REGISTRY,
  type SceneRegistry,
} from "./scene-registry";
import {
  PRODUCTION_VISUAL_LIBRARY,
  type RuntimeVisualLibrary,
} from "./visual-integration";

/** Scene art follows recorded activity completion, never a calendar invitation.
 * This projection is an immediate activity aftermath, not a persistent travel
 * or location store. Reads and inspection have no simulation effects.
 */

/** Why a canonical location does or does not resolve to a room. */
export interface SceneVenue {
  /** The authored canonical key, as written by whatever scheduled the activity. */
  readonly locationKey: string;
  /**
   * The registered scene, or null when this game has no truthful room for it.
   * Null is a statement about the art bank, not a gap in this table.
   */
  readonly sceneId: string | null;
  /** Developer-facing. Why this key maps where it does. */
  readonly reason: string;
  /**
   * True when the key names a journey rather than a place. A journey never
   * resolves a room even if its endpoints both have one.
   */
  readonly isJourney: boolean;
}

/**
 * Explicitly supported canonical location bindings and their room.
 *
 * Keys come from the systems that schedule: `ordinary-life.ts`,
 * `campaign-projection.ts`, `run-d-lite.ts` and the executive and judicial
 * kernel banks. A key that is not in this table gets no room and says so, which
 * is what keeps a newly authored activity from silently inheriting somebody
 * else's picture.
 */
export const SCENE_VENUES: readonly SceneVenue[] = [
  {
    locationKey: "formative:school-corridor",
    sceneId: null,
    reason:
      "No school interior is released. A household apartment is not a school corridor, and borrowing one would label the living room as class.",
    isJourney: false,
  },
  {
    locationKey: "episode:school",
    sceneId: null,
    reason:
      "School episodes are immediate scenes at school. Missing school art is an honest empty plate, never a reused home.",
    isJourney: false,
  },
  {
    locationKey: "life-circumstance:covered-shift",
    sceneId: null,
    reason:
      "This is ordinary paid work recorded on the player's calendar. No released workplace interior is bound to it, so the activity remains playable without borrowing another institution's room.",
    isJourney: false,
  },
  {
    locationKey: "ordinary-life:meeting-room",
    sceneId: PUBLIC_MEETING_ROOM_SCENE_ID,
    reason:
      "The posted public meeting an ordinary life can attend. A generic community hall is exactly what this is, and the baked audience remains anonymous decor, never attendance evidence.",
    isJourney: false,
  },
  {
    locationKey: "east-end-community-room",
    sceneId: PUBLIC_MEETING_ROOM_SCENE_ID,
    reason:
      "A neighbourhood meeting in a community room. Same generic hall; nothing in the plate names a neighbourhood, and the World supplies what it is called.",
    isJourney: false,
  },
  {
    locationKey: "lexington-legislative-office",
    sceneId: PRODUCTION_OFFICE_SCENE_ID,
    reason:
      "Legislative staff work happens in the shared workroom. The production workroom is generic and unscoped; the frozen council-staff FIXTURE is not used here, because it has a Fayette County map on its wall and is quarantined to its own consumer. CAVEAT, and it is the important part: today this key is written ONLY by `createRunDLiteFixture`, which reaches a player through the development route `?view=office-fixture`. The mapping is correct and proven, and no production path writes the key, so no ordinary life reaches this room yet.",
    isJourney: false,
  },
  {
    locationKey: "executive-office",
    sceneId: null,
    reason:
      "No executive room is released. The banked executive master is 1672px wide, below the 4608px environment master minimum, so it cannot be carried into the runtime. The 5504px candidate that would replace it is unapproved. See asset request 'env-executive-office-4k-master'.",
    isJourney: false,
  },
  {
    locationKey: "campaign-call-desk",
    sceneId: null,
    reason:
      "No campaign room is released. Calling voters from a desk is a real canonical activity with no picture of it; the two 5504px field-office candidates in the drive sweep are unapproved. See asset request 'env-campaign-storefront'.",
    isJourney: false,
  },
  {
    locationKey: "campaign-office",
    sceneId: null,
    reason:
      "Same gap as the call desk. The shared workroom is NOT substituted: a campaign storefront is not a legislative staff room, and lending one to the other is how a room stops meaning anything.",
    isJourney: false,
  },
  {
    locationKey: "campaign-doors",
    sceneId: null,
    reason:
      "Canvassing happens outdoors. Every registered scene in this game is an interior and no environment family describes an outdoor space, so there is no room to resolve and none is borrowed.",
    isJourney: false,
  },
  {
    locationKey: "private-field-call",
    sceneId: null,
    reason:
      "A private call names no room at all. Nothing is resolved rather than picking somewhere plausible for it to have happened.",
    isJourney: false,
  },
  {
    locationKey: "office-to-east-end",
    sceneId: null,
    reason:
      "A JOURNEY, not a place. Somebody travelling between the office and the east end is in neither of them, and painting the destination behind them would be exactly the background-only teleport this table exists to prevent.",
    isJourney: true,
  },
];

const VENUES_BY_KEY: ReadonlyMap<string, SceneVenue> = new Map(
  SCENE_VENUES.map((venue) => [venue.locationKey, venue]),
);

export function sceneVenueForLocationKey(
  locationKey: string,
): SceneVenue | null {
  return VENUES_BY_KEY.get(locationKey) ?? null;
}

/** The outcome of asking where somebody is, with the reason kept attached. */
export interface VenueResolution {
  readonly sceneId: string | null;
  readonly reason: string;
  /** The activity that decided it, when one did. */
  readonly activityId: EntityId | null;
}

/** An actual completion at the current instant is evidence of attendance.
 * A scheduled participant list alone is only an invitation. A later clock
 * movement expires this projection rather than inventing continued presence.
 */
export function completedActivityHere(
  world: World,
  personId: EntityId,
  activityId?: EntityId,
): ScheduledActivityRecord | null {
  const completed = world.history.scheduledActivities
    .filter((activity) => !activityId || activity.id === activityId)
    .filter((activity) => activity.participantPersonIds.includes(personId))
    .filter((activity) => canPersonAccess(activity.access, personId))
    .filter((activity) => {
      const state = scheduledActivityState(world, activity.id);
      if (
        state.status !== "completed" ||
        compareSimulationMoments(state.recordedAt, world.currentMoment) !== 0 ||
        compareSimulationMoments(state.end, world.currentMoment) !== 0
      )
        return false;
      const event = world.history.events.find(
        (entry) => entry.id === state.outcomeEventId,
      );
      return (
        event?.type === "schedule.activity-completed" &&
        event.involvedEntityIds.includes(activity.id) &&
        event.participants.some(
          (entry) =>
            entry.personId === personId &&
            entry.role === "presence:participant",
        )
      );
    })
    .sort(
      (a, b) =>
        scheduledActivityState(world, b.id).sequence -
        scheduledActivityState(world, a.id).sequence,
    );
  return completed[0] ?? null;
}

export function resolveActivityVenueScene(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  venue: SceneVenue,
  scenes: SceneRegistry = SCENE_REGISTRY,
  library: RuntimeVisualLibrary = PRODUCTION_VISUAL_LIBRARY,
): VenueResolution {
  const activity = completedActivityHere(world, personId, activityId);
  if (!activity || activity.location.locationKey !== venue.locationKey) {
    return {
      sceneId: null,
      activityId: null,
      reason: "No matching completed attendance at this instant.",
    };
  }
  if (activity.kind === "travel" || venue.isJourney) {
    return {
      sceneId: null,
      activityId,
      reason: "Travel completion is not evidence of entering a room.",
    };
  }
  const scene = venue.sceneId ? scenes.scenes.get(venue.sceneId) : null;
  if (
    !scene?.raster ||
    scene.presentationStatus !== "production" ||
    !library.has(scene.raster.assetId)
  ) {
    return {
      sceneId: null,
      activityId,
      reason: venue.sceneId
        ? "The venue has no released production plate."
        : venue.reason,
    };
  }
  return {
    sceneId: scene.sceneId,
    activityId,
    reason: `Recorded attendance at ${activity.location.label}; immediate activity aftermath.`,
  };
}

/** Pure immediate-aftermath projection through the existing World history. */
export function resolveVenueScene(
  world: World,
  personId: EntityId,
  scenes: SceneRegistry = SCENE_REGISTRY,
  library: RuntimeVisualLibrary = PRODUCTION_VISUAL_LIBRARY,
): VenueResolution {
  const activity = completedActivityHere(world, personId);
  if (!activity)
    return {
      sceneId: null,
      activityId: null,
      reason: "No completed attendance at this instant.",
    };
  const venue = sceneVenueForLocationKey(activity.location.locationKey);
  if (!venue)
    return {
      sceneId: null,
      activityId: activity.id,
      reason: "The completed activity has no supported scene binding.",
    };
  return resolveActivityVenueScene(
    world,
    personId,
    activity.id,
    venue,
    scenes,
    library,
  );
}

/**
 * Rooms this table names that no released plate can paint.
 *
 * The mirror of `unconsumedProductionScenes`: that one finds art nothing uses,
 * this one finds uses that have no art. Both are gaps; reporting only the first
 * is how a game ends up with a bank of pictures and a page of text.
 */
export function venuesWithoutRooms(): readonly SceneVenue[] {
  return SCENE_VENUES.filter(
    (venue) => venue.sceneId === null && !venue.isJourney,
  );
}

/**
 * Registered production scenes this table can never reach.
 *
 * The courtroom is the standing example and is why this function exists: its
 * plate is approved, its ladder is derived and its geometry is authored, and no
 * canonical location key in this game names a court, because nothing calls
 * `applyJudicialGameplayPlan`. Naming that plainly is better than a scene that
 * looks wired because it is registered.
 */
export function scenesNoVenueReaches(
  scenes: SceneRegistry = SCENE_REGISTRY,
): readonly string[] {
  const reachable = new Set(
    SCENE_VENUES.map((venue) => venue.sceneId).filter(
      (sceneId): sceneId is string => sceneId !== null,
    ),
  );
  return [...scenes.scenes.values()]
    .filter(
      (scene) =>
        scene.presentationStatus === "production" &&
        !reachable.has(scene.sceneId),
    )
    .map((scene) => scene.sceneId)
    .sort();
}

/** Scene ids supported by the explicit location bindings, not route acceptance. */
export const VENUE_REACHABLE_SCENE_IDS: readonly string[] = [
  PUBLIC_MEETING_ROOM_SCENE_ID,
  PRODUCTION_OFFICE_SCENE_ID,
];

/**
 * Bindings with a production activity producer. Actual player reachability also
 * requires the UI owner's VenueActivityPanel integration and browser evidence.
 * The workroom key is currently produced only by the Run D-Lite fixture.
 */
export const VENUE_WITH_PRODUCTION_ACTIVITY: readonly string[] = [
  PUBLIC_MEETING_ROOM_SCENE_ID,
];

/**
 * Rooms named by a scene id here purely so a reader can see they were
 * considered and deliberately not wired to a venue key.
 */
export const VENUE_DELIBERATELY_UNREACHED: ReadonlyMap<string, string> =
  new Map([
    [
      COURTROOM_SCENE_ID,
      "The current JUD-WORK2 consumer establishes office preparation only, not a source-confirmed courtroom kind. Its location key cannot admit this unreleased plate.",
    ],
    [
      HEARING_ROOM_SCENE_ID,
      "Committee hearings are canonical, but they are scheduled as future due items rather than as located activities, so they carry no location key for this table to map. The room is ready; the hearing needs a location before it has one.",
    ],
    [
      LEGISLATIVE_CHAMBER_SCENE_ID,
      "Floor votes are canonical and, like committee hearings, carry no located activity. Same room-is-ready, same missing location.",
    ],
    [
      DOMESTIC_ORDINARY_SCENE_ID,
      "Home art supplies residence context only when no later established place or completed travel contradicts it. A quiet calendar does not prove physical presence at home.",
    ],
  ]);
