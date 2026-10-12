import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { backdropStaging } from "../presentation/backdrop-people";
import { backdropFile, scenePlace } from "./scene";
import type { CoreState } from "../core2/types";
import { relationWord } from "./words";

/** Everyone in the family: where each one is and what they are doing now. */
export function familyView(core: CoreState, personId: string) {
  const person = core.people.get(personId);
  if (!person) throw new Error("No such person.");
  const relation = new Map<string, string>();
  for (const fact of person.pastFacts ?? [])
    if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
      relation.set(fact.facts.otherPersonId, fact.kind.slice("family:".length));
  for (const id of person.familyIds)
    if (!relation.has(id)) relation.set(id, "");
  return [...relation].map(([id, key]) => {
    const kind = relationWord(core, id, key);
    const other = core.people.get(id);
    if (!other) return { personId: id, relation: kind, known: false };
    const age = ageOnDate(makeIsoDate(other.birthDate), makeIsoDate(core.date));
    if (!other.alive)
      return {
        personId: id,
        name: `${other.givenName} ${other.familyName}`,
        relation: kind,
        age,
        alive: false,
      };
    const { place, why } = scenePlace(core, id);
    const stage = backdropStaging(place);
    const hero = stage?.spots.find((spot) => spot.hero);
    const spotId = hero
      ? (hero.id ?? `${place}:spot:${stage!.spots.indexOf(hero)}`)
      : undefined;
    return {
      personId: id,
      name: `${other.givenName} ${other.familyName}`,
      relation: kind,
      age,
      alive: true,
      place,
      doing: why,
      backdrop: backdropFile(place, 12 * 60).url,
      figureUrl:
        spotId && age >= 18
          ? `/api/figure?person=${encodeURIComponent(id)}&place=${encodeURIComponent(place)}&spot=${encodeURIComponent(spotId)}&date=${core.date}`
          : undefined,
    };
  });
}
