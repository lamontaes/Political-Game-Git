import type { EntityId, World } from "../simulation";
import { projectStorySceneDay } from "../presentation/story-scene-day";
import { projectOrdinaryMeetingScene } from "../presentation/ordinary-meeting-scene";
import type { ShellRef } from "../presentation/shell-navigation";

/** The day mounts the resolver's present roster; expected attendance stays off it. */
export function StorySceneDayPanel({
  world,
  personId,
  onOpenEntity,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenEntity: (ref: ShellRef) => void;
}) {
  // The existing meeting panel displays its resolver-filtered roster and choices.
  if (projectOrdinaryMeetingScene(world, personId)) return null;
  const scene = projectStorySceneDay(world, personId);
  if (!scene || scene.status !== "resolved" || scene.presentPeople.length === 0)
    return null;
  return (
    <section className="pg-meeting-panel" data-testid="story-scene-day">
      <h2>Here</h2>
      <ul>
        {scene.presentPeople.map((person) => (
          <li key={person.personId}>
            <button
              type="button"
              className="ui-link"
              onClick={() =>
                onOpenEntity({ kind: "person", id: person.personId })
              }
            >
              {person.name}
            </button>
          </li>
        ))}
      </ul>
      {scene.facts.map((fact, index) => (
        <p key={index}>{fact.text}</p>
      ))}
    </section>
  );
}
