import { workplacePresence } from "./workplace-presence";
import type { EntityId, World } from "../simulation";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
} from "./life-scene-flow";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";

/** The same current presence projection used by the ordinary play surface.
 * An authored scene supplies its event key. A quiet home uses a context key,
 * not a fabricated scene event. Art coverage never grants or denies speech.
 */
export function currentLifeTalkScene(world: World, personId: EntityId) {
  const opening = currentOpeningLifeScene(world, personId);
  if (opening) return opening;
  const work = workplacePresence(world, personId);
  if (work)
    return {
      eventId: work.eventId,
      definition: {
        setting: "work" as const,
        key: `workplace:${work.workRelationshipId}`,
      },
      presentPersonIds: work.personIds,
    };
  const context = resolveOpeningPlaySceneContext(world, personId);
  if (context.purpose !== "home") return null;
  const location = openingLifeLocation(world, personId);
  if (location && location.setting !== "home") return null;
  return {
    eventId: `quiet-home:${personId}:${JSON.stringify(world.currentMoment)}`,
    definition: { setting: "home" as const, key: "quiet.home" },
    presentPersonIds: [
      personId,
      ...context.presentPeople.map((person) => person.personId),
    ],
  };
}
