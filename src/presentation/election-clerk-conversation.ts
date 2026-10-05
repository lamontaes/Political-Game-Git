import {
  recordSceneBinding,
  sceneBindingsFor,
} from "../simulation/scene-bindings";
import type { EntityId, World } from "../simulation/types";
import { electionClerksForPerson } from "./election-clerk";
import { electionClerkOffices } from "./election-clerk-offices";

/** A currently recorded encounter is required; a work roster is insufficient. */
export function bindElectionClerkConversation(
  world: World,
  playerPersonId: EntityId,
  clerkPersonId: EntityId,
): World {
  const clerk = electionClerksForPerson(world, playerPersonId).find(
    (row) => row.personId === clerkPersonId,
  );
  if (!clerk?.presenceEventId)
    throw new Error("The clerk is not recorded here with you now.");
  if (
    sceneBindingsFor(world, playerPersonId, "election-clerk").some(
      (bound) =>
        bound.binding.speakerPersonId === clerkPersonId &&
        bound.binding.sourceEntityIds[0] === clerk.presenceEventId,
    )
  )
    return world;
  return recordSceneBinding(
    world,
    {
      version: 1,
      family: "election-clerk",
      variant: "filing-inquiry",
      playerPersonId,
      speakerPersonId: clerkPersonId,
      relationship: clerk.title,
      place: clerk.organizationName,
      jurisdictionId: clerk.jurisdictionId,
      request: "Ask about running for office.",
      sourceEntityIds: [
        clerk.presenceEventId,
        clerk.roleRecordId,
        clerk.statusRecordId,
        clerk.workRelationshipId,
        clerk.organizationId,
      ],
      facts: {
        "clerk-role": clerk.title,
        offices: JSON.stringify(electionClerkOffices(world, playerPersonId)),
      },
      knownRecordIds: [
        clerk.roleRecordId,
        clerk.statusRecordId,
        clerk.presenceEventId,
      ],
      target: null,
      date: world.currentDate,
      expiresAt: world.currentDate,
    },
    "A filing inquiry with the clerk is available.",
  );
}
