import { personName, type EntityId, type World } from "../simulation";
import { projectOpeningFamily } from "./opening-story";
import { projectGovernmentBrowser } from "./politics-government";
import type { OrientationPerson } from "./world-orientation";
import { placeBackdropPeople } from "./backdrop-people";

/** Saved parents/guardians illustrated in their role, not in today's room. */
export function openingFamilyPeople(
  world: World,
  personId: EntityId,
): readonly OrientationPerson[] {
  return projectOpeningFamily(world, personId).parents.flatMap((member) => {
    const person = world.people[member.personId];
    if (!person) return [];
    const name = personName(person);
    return [
      {
        personId: person.id,
        name,
        title: member.introduction.startsWith(`${name}, `)
          ? member.introduction.slice(name.length + 2)
          : member.introduction,
        party: null,
        facts: [],
      },
    ];
  });
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
  const placed = placeBackdropPeople(
    world,
    personId,
    place,
    world.currentMoment,
    people,
    { standing: true },
  );
  return Object.assign(
    placed.filter((person) => ids.has(person.personId)),
    {
      overflow: placed.overflow.filter((person) => ids.has(person.personId)),
    },
  );
}
