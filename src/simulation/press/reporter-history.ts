import type { EntityId, World } from "../types";

/** Recorded press contacts make a reporter familiar to the story's subject. */
export function reporterContactCount(
  world: World,
  reporterPersonId: EntityId,
  subjectPersonIds: readonly EntityId[],
): number {
  const subjects = new Set(subjectPersonIds);
  return world.history.relationshipInteractions.filter(
    (interaction) =>
      interaction.personIds.includes(reporterPersonId) &&
      interaction.personIds.some((personId) => subjects.has(personId)) &&
      interaction.tags.some(
        (tag) => tag === "press.contact" || tag.startsWith("press."),
      ),
  ).length;
}
