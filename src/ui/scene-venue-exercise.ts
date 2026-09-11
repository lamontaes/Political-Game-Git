import {
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivitiesVisibleTo,
  type EntityId,
  type ScheduledActivityRecord,
  type World,
} from "../simulation";
import { resolveLifeScene } from "../presentation/life-scene";
import {
  createNewGameWorld,
  type NewGameSetup,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { createRunDLiteFixture } from "../presentation/run-d-lite";
import {
  PRODUCTION_OFFICE_SCENE_ID,
  PUBLIC_MEETING_ROOM_SCENE_ID,
} from "../presentation/scene-registry";

/** Isolated development exercises use canonical activity execution. These
 * include a named office fixture; they are not normal-player acceptance.
 */

export interface VenueExercise {
  readonly id: string;
  /** What a reviewer is being shown, in their words. */
  readonly what: string;
  /** The scene id this exercise expects, or null when it expects no room. */
  readonly expected: string | null;
  readonly actual: string | null;
  readonly passed: boolean;
  /** `resolveLifeScene`'s own reason, unedited. */
  readonly reason: string;
}

function setupFor(seed: string, startingLife: NewGameSetup["startingLife"]) {
  return {
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife,
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } satisfies NewGameSetup;
}

function ordinaryLife(seed: string): {
  readonly world: World;
  readonly personId: EntityId;
} {
  const created = createNewGameWorld(setupFor(seed, "ordinary-life"));
  return {
    world: openOrdinaryLife(created.world, created.playerPersonId),
    personId: created.playerPersonId,
  };
}

function activityAt(
  world: World,
  personId: EntityId,
  locationKey: string,
): ScheduledActivityRecord | null {
  return (
    scheduledActivitiesVisibleTo(world, personId).find(
      (activity) => activity.location.locationKey === locationKey,
    ) ?? null
  );
}

function record(
  id: string,
  what: string,
  expected: string | null,
  world: World,
  personId: EntityId,
): VenueExercise {
  const resolved = resolveLifeScene(world, personId);
  return {
    id,
    what,
    expected,
    actual: resolved.sceneId,
    passed:
      expected === null
        ? resolved.sceneId !== PUBLIC_MEETING_ROOM_SCENE_ID &&
          resolved.sceneId !== PRODUCTION_OFFICE_SCENE_ID
        : resolved.sceneId === expected,
    reason: resolved.reason,
  };
}

export function exerciseSceneVenues(): readonly VenueExercise[] {
  const results: VenueExercise[] = [];

  const life = ordinaryLife("gallery-exercise");
  const meeting = activityAt(
    life.world,
    life.personId,
    "ordinary-life:meeting-room",
  );

  if (!meeting) {
    return [
      {
        id: "meeting-missing",
        what: "An ordinary life should post a public meeting on its calendar.",
        expected: PUBLIC_MEETING_ROOM_SCENE_ID,
        actual: null,
        passed: false,
        reason:
          "No activity at `ordinary-life:meeting-room` was found for this life, so the room could not be exercised.",
      },
    ];
  }

  results.push(
    record(
      "meeting-completed",
      "Performing the posted meeting records attendance and shows its immediate aftermath.",
      PUBLIC_MEETING_ROOM_SCENE_ID,
      performScheduledActivity(life.world, meeting.id),
      life.personId,
    ),
  );

  results.push(
    record(
      "meeting-not-yet",
      "Before the meeting starts, they are at home instead — the room does not run ahead of the clock.",
      null,
      life.world,
      life.personId,
    ),
  );

  // Travel to the room, naming the room's own key, must still resolve nothing.
  const travelling = createScheduledActivity(life.world, {
    stableKey: "gallery-exercise:journey",
    title: "On the way",
    summary: "Travelling to the meeting room.",
    kind: "travel",
    start: { ...life.world.currentMoment },
    end: {
      ...life.world.currentMoment,
      minuteOfDay: life.world.currentMoment.minuteOfDay + 30,
    },
    participantPersonIds: [life.personId],
    responsiblePersonId: life.personId,
    location: {
      locationKey: "ordinary-life:meeting-room",
      label: "On the way to the meeting room",
      jurisdictionId: null,
    },
    sourceEntityIds: [...meeting.sourceEntityIds],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [life.personId] },
  });
  results.push(
    record(
      "travelling-there",
      "While travelling to it — naming the room's own location key — they are still not in it. Changing a backdrop is not travel.",
      null,
      travelling,
      life.personId,
    ),
  );

  // Somebody the activity does not admit gets no room from it.
  const other = Object.keys(life.world.people).find(
    (id) => id !== life.personId,
  );
  if (other) {
    results.push(
      record(
        "not-admitted",
        "Somebody the activity does not admit gets no room from it. Knowing a location key is not standing in the room.",
        null,
        performScheduledActivity(life.world, meeting.id),
        other as EntityId,
      ),
    );
  }

  // A FRESH LEGISLATIVE START WRITES NO LOCATED STAFF DAY.
  //
  // This exercise expects NO room, and that expectation is the finding. When
  // it was first written it expected the workroom, and running it on the real
  // build is what showed that `lexington-legislative-office` is written only
  // by `createRunDLiteFixture` — a development fixture reached at
  // `?view=office-fixture`. The room, the plate and the mapping are all fine;
  // no production path schedules a located day of staff work.
  const staff = createNewGameWorld(
    setupFor("gallery-exercise-office", "legislative-office"),
  );
  results.push(
    record(
      "staff-workroom-production",
      "A FRESH legislative start resolves no workroom, because no production path writes a located day of staff work. This is the gap, not a bug in the room.",
      null,
      staff.world,
      staff.playerPersonId,
    ),
  );

  // And the mapping itself, proven through the world that DOES write the key.
  const fixture = createRunDLiteFixture("gallery-exercise-fixture");
  const fixtureOffice = activityAt(
    fixture.world,
    fixture.playerPersonId,
    "lexington-legislative-office",
  );
  results.push(
    fixtureOffice
      ? record(
          "staff-workroom-fixture",
          "Through the Run D-Lite DEVELOPMENT fixture, which is the only thing that writes that location key, the mapping resolves the shared workroom — not the quarantined council-staff fixture with the Fayette County map.",
          PRODUCTION_OFFICE_SCENE_ID,
          performScheduledActivity(fixture.world, fixtureOffice.id),
          fixture.playerPersonId,
        )
      : {
          id: "staff-workroom-fixture",
          what: "The Run D-Lite fixture should write an activity at `lexington-legislative-office`.",
          expected: PRODUCTION_OFFICE_SCENE_ID,
          actual: null,
          passed: false,
          reason:
            "The fixture wrote no activity at that key, so the mapping could not be exercised at all.",
        },
  );

  return results;
}
