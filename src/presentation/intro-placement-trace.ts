import type { BackdropPerson } from "./backdrop-people";
import type { LivingSceneActor } from "./living-scene-facts";
import { recipeFiles } from "./appearance-engine/pack";
import {
  PEOPLE_PACK,
  peoplePackFileAvailable,
} from "./appearance-engine/runtime";

/** Proof telemetry reads actual placement and actor selection. It never chooses either. */
export function introPlacementTrace(
  placements: readonly BackdropPerson[],
  actors: readonly LivingSceneActor[],
) {
  return {
    people: placements.map((person) => {
      const matching = actors.filter(
        (actor) =>
          actor.person.personId === person.personId &&
          actor.person.title === person.title,
      );
      const actor = matching.length === 1 ? matching[0]! : null;
      return {
        personId: person.personId,
        slotId: person.slotId,
        slotRole: person.slotRole,
        pose: person.resolvedPose,
        view: person.resolvedView,
        facing: person.facing,
        depth: person.depth,
        selection: actor
          ? {
              recordIds: actor.recordIds,
              provenance: actor.provenance,
              presenceBasis: actor.presenceBasis,
            }
          : null,
        selectionGap: actor
          ? null
          : matching.length > 1
            ? "ambiguous-actor"
            : "missing-actor",
        art: {
          packVersion: PEOPLE_PACK.version,
          recipe: person.engine,
          files: recipeFiles(
            PEOPLE_PACK,
            person.engine,
            peoplePackFileAvailable,
          ),
        },
      };
    }),
    unstagedActors: actors
      .filter(
        (actor) =>
          !placements.some(
            (person) =>
              person.personId === actor.person.personId &&
              person.title === actor.person.title,
          ),
      )
      .map((actor) => ({
        personId: actor.person.personId,
        actorSlotKey: actor.slotKey,
        recordIds: actor.recordIds,
        provenance: actor.provenance,
        presenceBasis: actor.presenceBasis,
        reason: "no-physical-placement" as const,
      })),
  };
}
