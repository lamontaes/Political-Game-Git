import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  type EntityId,
  type World,
} from "../simulation";
import { workSchedulesFor } from "../simulation/living-world/work-schedules";
import { currentOpeningLifeScene } from "./life-scene-flow";
import { completedActivityHere } from "./scene-venues";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import {
  resolveStoryScene,
  readStorySceneSituation,
  type StorySceneRequest,
} from "./story-scene-resolver";

/** Select only canonical place IDs. A venue label never establishes presence. */
export function currentStorySceneRequest(
  world: World,
  viewerPersonId: EntityId,
): StorySceneRequest | null {
  const basis = { viewerPersonId, moment: world.currentMoment };
  const meeting = projectOrdinaryMeetingScene(world, viewerPersonId);
  if (meeting)
    return {
      ...basis,
      place: { kind: "activity", activityId: meeting.activityId },
    };
  const opening = currentOpeningLifeScene(world, viewerPersonId);
  if (opening)
    return {
      ...basis,
      place: { kind: "opened-scene", eventId: opening.eventId },
    };
  const latest = world.history.events
    .filter(
      (event) =>
        ["life.scene.arrived", "life.scene.opened"].includes(event.type) &&
        event.occurredAt <= world.currentDate &&
        event.recordedAt <= world.currentDate &&
        event.sequence < world.history.nextSequence &&
        event.participants.some((person) => person.personId === viewerPersonId),
    )
    .at(-1);
  if (latest?.type === "life.scene.arrived") {
    if (latest.context.location?.setting === "work") {
      const work = activeWorkRelationshipsAt(world, viewerPersonId).find(
        (job) =>
          latest.involvedEntityIds.includes(job.relationship.id) &&
          job.relationship.organizationId !== null &&
          latest.involvedEntityIds.includes(job.relationship.organizationId) &&
          job.role.locationJurisdictionId ===
            latest.context.location?.jurisdictionId,
      );
      const schedule =
        work &&
        workSchedulesFor(world, viewerPersonId).find(
          (entry) => entry.workRelationshipId === work.relationship.id,
        );
      const organizationId = work?.relationship.organizationId;
      const jurisdictionId = work?.role.locationJurisdictionId;
      if (!schedule || !organizationId || !jurisdictionId) return null;
      return {
        ...basis,
        place: {
          kind: "workplace",
          organizationId,
          jurisdictionId,
          workPlaceCategory: schedule.place,
        },
      };
    }
    const activity = world.history.scheduledActivities.find(
      (entry) =>
        entry.kind !== "travel" && latest.involvedEntityIds.includes(entry.id),
    );
    if (activity)
      return { ...basis, place: { kind: "activity", activityId: activity.id } };
  }
  const completed = completedActivityHere(world, viewerPersonId);
  if (completed)
    return { ...basis, place: { kind: "activity", activityId: completed.id } };
  const home = householdMembershipsAt(world, viewerPersonId)[0];
  return home
    ? { ...basis, place: { kind: "household", householdId: home.household.id } }
    : null;
}

export function projectStorySceneDay(world: World, personId: EntityId) {
  const request = currentStorySceneRequest(world, personId);
  return request ? resolveStoryScene(world, request) : null;
}

/** Clerk/scene consumer seam for block one. Reading has no simulation effects. */
export function currentStorySceneSituation(world: World, personId: EntityId) {
  const request = currentStorySceneRequest(world, personId);
  return request ? readStorySceneSituation(world, request) : null;
}

/** Retain existing meeting words and roles; canonical options gate visibility. */
export function projectStoryMeetingScene(world: World, personId: EntityId) {
  const scene = projectOrdinaryMeetingScene(world, personId);
  if (!scene) return null;
  const resolved = resolveStoryScene(world, {
    viewerPersonId: personId,
    place: { kind: "activity", activityId: scene.activityId },
    moment: world.currentMoment,
  });
  if (resolved.status !== "resolved") return null;
  return {
    ...scene,
    actors: scene.actors.filter((actor) =>
      resolved.presentPeople.some(
        (person) => person.personId === actor.personId,
      ),
    ),
    availableActions: scene.availableActions.filter((action) =>
      resolved.options.some(
        (option) =>
          option.kind === "meeting-action" && option.action === action,
      ),
    ),
    speechChoices: scene.speechChoices.filter((choice) =>
      resolved.options.some(
        (option) =>
          option.kind === "meeting-speech" &&
          option.choice === choice.key &&
          option.words === choice.words,
      ),
    ),
  };
}
