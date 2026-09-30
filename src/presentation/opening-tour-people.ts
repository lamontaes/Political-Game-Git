import { personName, type EntityId, type World } from "../simulation";
import {
  homeLocalGovernmentUnits,
  localGovernmentDisplayName,
} from "../simulation/nationwide-world/local-governments";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import { projectGovernmentBrowser } from "./politics-government";
import type { OrientationPerson } from "./world-orientation";
import { placeBackdropPeople } from "./backdrop-people";

/** Established county boards; a saved seat is not a mapped electoral district. */
export function openingCountyScene(world: World, personId: EntityId) {
  const units = homeLocalGovernmentUnits(world, personId);
  if (
    units.municipal.length ||
    units.townships.length ||
    units.countyStatus !== "established" ||
    !units.counties.length
  )
    return null;
  const people: OrientationPerson[] = units.counties.flatMap((unit) =>
    sittingLocalOfficers(world, unit).flatMap((seat) => {
      const person = world.people[seat.personId];
      return person
        ? [
            {
              personId: person.id,
              name: personName(person),
              title: `${seat.mayor ? "County officeholder" : "County board member"} · ${localGovernmentDisplayName(unit)}`,
              party: null,
              facts: [],
            },
          ]
        : [];
    }),
  );
  return {
    governmentNames: units.counties.map(localGovernmentDisplayName),
    people,
  };
}

/** Public role illustration, not attendance, acquaintance or travel. */
export function openingLegislaturePeople(
  world: World,
  personId: EntityId,
): readonly OrientationPerson[] {
  const represented = projectGovernmentBrowser(world, personId, {
    scope: "state",
  }).representedBy;
  return (represented ?? [])
    .filter((row) => row.key.startsWith("state:"))
    .flatMap((row) =>
      row.holders.flatMap((holder) =>
        holder.status === "member" &&
        holder.personId &&
        holder.name &&
        world.people[holder.personId]
          ? [
              {
                personId: holder.personId,
                name: holder.name,
                title: row.district
                  ? `${row.office.replace(/^House of (?:Delegates|Representatives)$/, "House")}, ${row.district.replace(/^State (?:House |Senate |Legislative )?/, "")}`
                  : row.office,
                party: null,
                facts: [],
              },
            ]
          : [],
      ),
    );
}

/** Keep the explicitly illustrated roster; never add scheduled workers. */
export function openingTourStagedPeople(
  world: World,
  personId: EntityId,
  place: string,
  people: readonly OrientationPerson[],
) {
  const ids = new Set(people.map((person) => person.personId));
  return placeBackdropPeople(
    world,
    personId,
    place,
    world.currentMoment,
    people,
    { standing: true },
  )
    .filter((person) => ids.has(person.personId))
    .map((person, index, roster) => ({
      ...person,
      // This is a public-role illustration. Space its saved cast across the
      // chamber floor so one representative's plate cannot cover another.
      leftPercent:
        ((index + 0.5) / roster.length) * 100 - person.widthPercent / 2,
    }));
}
