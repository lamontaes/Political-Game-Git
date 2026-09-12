import {
  activeEducationEnrollmentsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  type EntityId,
  type EpisodeSceneSetting,
  type World,
} from "../simulation";
import { resolveLifeScene } from "./life-scene";
import type { ScenePerson, StoryScene } from "./life-story";
import {
  DOMESTIC_SCENE_IDS,
  SCENE_REGISTRY,
  type SceneRegistry,
} from "./scene-registry";
import {
  completedActivityHere,
  resolveVenueScene,
  sceneVenueForLocationKey,
  type VenueResolution,
} from "./scene-venues";
import {
  PRODUCTION_VISUAL_LIBRARY,
  type RuntimeVisualLibrary,
} from "./visual-integration";

/**
 * Where the current play moment is, for art and who is standing in the room.
 *
 * PlayerGame used `resolveLifeScene` alone, which falls through to household
 * apartment art whenever no completed activity named a room. School corridor
 * copy then played over a living room. This resolver sits on that seam: it
 * reads the chosen story scene's setting, the venue table, and household
 * membership, and it refuses to paint a home as a school.
 *
 * A owns the PlayerGame mount. Call `resolvePlaySceneContext` instead of
 * `resolveLifeScene` for the play surface; keep municipal activity handling
 * in the root if that path stays there.
 */

export const SCHOOL_CORRIDOR_LOCATION_KEY = "formative:school-corridor";
export const EPISODE_SCHOOL_LOCATION_KEY = "episode:school";

const SCHOOL_SITUATION_KEYS: ReadonlySet<string> = new Set([
  "formative.school-entry",
  "formative.school-rule-input",
  "formative.lunch-table",
  "formative.teacher-mentor",
]);

export type PlayScenePurpose =
  "home" | "school" | "activity" | "recollection" | "unspecified";

export interface PlaySceneContext {
  readonly purpose: PlayScenePurpose;
  readonly locationKey: string | null;
  readonly sceneId: string | null;
  readonly reason: string;
  readonly placeLabel: string | null;
  readonly presentPeople: readonly ScenePerson[];
}

export function resolvePlaySceneContext(
  world: World,
  personId: EntityId,
  scene: StoryScene,
  scenes: SceneRegistry = SCENE_REGISTRY,
  library: RuntimeVisualLibrary = PRODUCTION_VISUAL_LIBRARY,
): PlaySceneContext {
  const activityVenue = resolveVenueScene(world, personId, scenes, library);
  if (activityVenue.activityId !== null) {
    return contextFromActivity(world, personId, scene, activityVenue);
  }

  const setting = settingOf(scene);
  if (setting === "recollection") {
    const home = resolveLifeScene(world, personId, scenes, library);
    return {
      purpose: "recollection",
      locationKey: null,
      sceneId: home.sceneId,
      reason:
        "The text remembers another place. The current room is unchanged, and nobody is moved because a story mentioned school.",
      placeLabel: null,
      presentPeople: presentAtHome(world, personId, scene.presentPeople),
    };
  }

  if (setting === "school") {
    const venue =
      sceneVenueForLocationKey(SCHOOL_CORRIDOR_LOCATION_KEY) ??
      sceneVenueForLocationKey(EPISODE_SCHOOL_LOCATION_KEY);
    const sceneId = venue?.sceneId ?? null;
    if (sceneId && DOMESTIC_SCENE_IDS.includes(sceneId)) {
      throw new Error(
        "School context resolved to household art. That substitution is forbidden.",
      );
    }
    return {
      purpose: "school",
      locationKey: SCHOOL_CORRIDOR_LOCATION_KEY,
      sceneId: sceneId && libraryHas(scenes, library, sceneId) ? sceneId : null,
      reason:
        sceneId && libraryHas(scenes, library, sceneId)
          ? "A released school plate is bound to this location key."
          : (venue?.reason ??
            "No school plate is released; household art is not substituted."),
      placeLabel: currentSchoolLabel(world, personId),
      presentPeople: presentAtSchool(world, personId, scene),
    };
  }

  const home = resolveLifeScene(world, personId, scenes, library);
  return {
    purpose: setting === "home" ? "home" : "unspecified",
    locationKey: null,
    sceneId: home.sceneId,
    reason: home.reason,
    placeLabel: null,
    presentPeople: presentAtHome(world, personId, scene.presentPeople),
  };
}

function contextFromActivity(
  world: World,
  personId: EntityId,
  scene: StoryScene,
  venue: VenueResolution,
): PlaySceneContext {
  const activity = completedActivityHere(world, personId, venue.activityId!);
  const attendees = new Set(
    scene.presentPeople
      .filter(
        (person) =>
          completedActivityHere(world, person.personId, venue.activityId!) !==
          null,
      )
      .map((person) => person.personId),
  );
  return {
    purpose: "activity",
    locationKey: activity?.location.locationKey ?? null,
    sceneId: venue.sceneId,
    reason: venue.reason,
    placeLabel: activity?.location.label ?? null,
    presentPeople: scene.presentPeople.filter((person) =>
      attendees.has(person.personId),
    ),
  };
}

function settingOf(scene: StoryScene): EpisodeSceneSetting | null {
  if (scene.kind === "episode") return scene.beat.sceneSetting;
  if (scene.kind === "formative" || scene.kind === "adult") {
    if (SCHOOL_SITUATION_KEYS.has(scene.situationKey)) return "school";
    if (
      scene.situationKey.startsWith("formative.household") ||
      scene.situationKey.startsWith("adult.household")
    ) {
      return "home";
    }
  }
  return null;
}

function presentAtSchool(
  world: World,
  personId: EntityId,
  scene: StoryScene,
): readonly ScenePerson[] {
  const allowed = new Set(
    scene.kind === "episode"
      ? scene.beat.physicallyPresentPersonIds
      : scene.presentPeople.map((person) => person.personId),
  );
  return scene.presentPeople.filter((person) => {
    if (!allowed.has(person.personId)) return false;
    return sharesSchool(world, personId, person.personId);
  });
}

function presentAtHome(
  world: World,
  personId: EntityId,
  people: readonly ScenePerson[],
): readonly ScenePerson[] {
  const residents = householdResidentIds(world, personId);
  const visiting = new Set<EntityId>();
  const playerActivity = completedActivityHere(world, personId);
  if (playerActivity) {
    for (const person of people) {
      if (
        completedActivityHere(world, person.personId, playerActivity.id) !==
        null
      ) {
        visiting.add(person.personId);
      }
    }
  }
  return people.filter(
    (person) => residents.has(person.personId) || visiting.has(person.personId),
  );
}

export function householdResidentIds(
  world: World,
  personId: EntityId,
): ReadonlySet<EntityId> {
  const cutoff = currentLifeCutoff(world);
  const ids = new Set<EntityId>();
  for (const entry of householdMembershipsAt(world, personId, cutoff)) {
    for (const otherId of peopleInHouseholdAt(
      world,
      entry.membership.householdId,
      cutoff,
    )) {
      if (otherId === personId) continue;
      if (
        world.history.personDeaths.some(
          (death) =>
            death.personId === otherId && death.diedAt <= world.currentDate,
        )
      ) {
        continue;
      }
      ids.add(otherId);
    }
  }
  return ids;
}

function sharesSchool(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): boolean {
  // A saved story moment can legitimately outlive a generated supporting
  // person after later generation repairs. Presence must degrade to omission,
  // not make an otherwise playable continuation fail to load.
  if (!world.people[personId] || !world.people[otherId]) return false;
  const cutoff = currentLifeCutoff(world);
  const mine = activeEducationEnrollmentsAt(world, personId, cutoff);
  if (mine.length === 0) return false;
  const theirs = activeEducationEnrollmentsAt(world, otherId, cutoff);
  const organizations = new Set(
    mine.map((entry) => entry.enrollment.organizationId),
  );
  return theirs.some((entry) =>
    organizations.has(entry.enrollment.organizationId),
  );
}

function currentSchoolLabel(world: World, personId: EntityId): string | null {
  const cutoff = currentLifeCutoff(world);
  const enrollment = activeEducationEnrollmentsAt(world, personId, cutoff)[0];
  if (!enrollment) return "School";
  return (
    organizationProfileAt(world, enrollment.enrollment.organizationId)?.name ??
    "School"
  );
}

function libraryHas(
  scenes: SceneRegistry,
  library: RuntimeVisualLibrary,
  sceneId: string,
): boolean {
  const scene = scenes.scenes.get(sceneId);
  return Boolean(
    scene?.raster &&
    scene.presentationStatus === "production" &&
    library.has(scene.raster.assetId),
  );
}
