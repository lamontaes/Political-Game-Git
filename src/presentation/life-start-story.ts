import type { EntityId, World } from "../simulation";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { projectLifeSoFarJournal } from "./life-so-far-english";

/** A loading checkpoint is a view of the real World, never a second history. */
export function projectLifeStartStory(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const chapters = new Map<string, string[]>();
  for (const line of projectLifeSoFarJournal(world, personId)) {
    const year = line.date.slice(0, 4);
    const sentences = chapters.get(year) ?? [];
    sentences.push(line.text);
    chapters.set(year, sentences);
  }
  return {
    year: world.currentDate.slice(0, 4),
    date: world.currentDate,
    place: place?.displayName ?? null,
    stateUsps: place?.stateJurisdictionKey?.slice(3) ?? null,
    chapters: [...chapters].map(([year, sentences]) => ({ year, sentences })),
    // These are the press desk's saved editions, including corrections. Do not
    // synthesize a headline from an event the desk has not published.
    headlines: (world.history.publications ?? [])
      .filter(
        (story) =>
          story.jurisdictionId === person.homeJurisdictionId &&
          story.publishedAt <= world.currentDate,
      )
      .sort(
        (a, b) =>
          b.publishedAt.localeCompare(a.publishedAt) || b.sequence - a.sequence,
      ),
  };
}
