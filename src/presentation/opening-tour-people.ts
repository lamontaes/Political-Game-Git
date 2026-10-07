import { personName, type EntityId, type World } from "../simulation";
import { projectOpeningFamily } from "./opening-story";
import { projectGovernmentBrowser } from "./politics-government";
import type {
  OrientationChamber,
  OrientationPerson,
} from "./world-orientation";
import { placeBackdropPeople } from "./backdrop-people";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import {
  stateLegislators,
  type StateLegislatorView,
} from "../simulation/nationwide-world/state-legislature-opening";
import {
  activeChildAuthoritiesAt,
  kinshipRelationshipsAt,
} from "../simulation/life-queries";

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

/**
 * The members on a chamber's floor (OW-15), read from its seat roster: the
 * player's own members first, then the rest of the home state's delegation,
 * then every other member in seat order, up to the number the room can hold.
 */
export function chamberFloorPeople(
  chamber: OrientationChamber | null | undefined,
  options: {
    readonly first?: readonly OrientationPerson[];
    readonly homeUsps?: string | null;
    readonly limit: number;
  },
): readonly OrientationPerson[] {
  const members = (chamber?.roster ?? []).flatMap((row) =>
    row.person ? [{ row, person: row.person }] : [],
  );
  const home = options.homeUsps
    ? (row: { readonly seatKey: string }) =>
        row.seatKey.includes(`:${options.homeUsps}-`) ||
        row.seatKey.includes(`:${options.homeUsps}:`)
    : () => false;
  const ordered = [
    ...(options.first ?? []).filter((person) =>
      members.some((member) => member.person.personId === person.personId),
    ),
    ...members.filter(({ row }) => home(row)).map(({ person }) => person),
    ...members.filter(({ row }) => !home(row)).map(({ person }) => person),
  ];
  const seen = new Set<EntityId>();
  return ordered
    .filter((person) => {
      if (seen.has(person.personId)) return false;
      seen.add(person.personId);
      return true;
    })
    .slice(0, options.limit);
}

/**
 * Who is home with you on your life's card (OW-15 presence rule): everyone
 * the household record says lives with you, parents and roommates alike.
 */
export function openingHouseholdPeople(
  world: World,
  personId: EntityId,
): readonly OrientationPerson[] {
  const family = projectOpeningFamily(world, personId);
  return [
    ...family.parents.filter((member) => member.livesWithYou && !member.died),
    ...family.household.filter((member) => !member.died),
  ].flatMap((member) => {
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
  return openingLegislatureActorSources(world, personId).map(
    (source) => source.person,
  );
}

/** Full recorded roster for the player's state legislature, in seat order. */
export function stateLegislatureFloorPeople(
  world: World,
  personId: EntityId,
): readonly OrientationPerson[] {
  const state = homeStateUsps(world, personId);
  const pack = state ? stateCandidacyPack(`US-${state}`) : null;
  if (!pack) return [];
  return stateLegislators(world, pack.packId).flatMap((member) => {
    const person = world.people[member.personId];
    return person
      ? [
          {
            personId: member.personId,
            name: personName(person),
            title: member.title,
            party: member.party,
            facts: [],
          },
        ]
      : [];
  });
}

/** Retain the exact district-qualified selector and its canonical seat source. */
export function openingLegislatureActorSources(
  world: World,
  personId: EntityId,
): readonly {
  person: OrientationPerson;
  seatKey: string;
  member: StateLegislatorView | null;
}[] {
  const state = homeStateUsps(world, personId);
  const pack = state ? stateCandidacyPack(`US-${state}`) : null;
  const members = pack ? stateLegislators(world, pack.packId) : [];
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
                seatKey: holder.key,
                member: (() => {
                  const matching = members.filter(
                    (member) =>
                      member.personId === holder.personId &&
                      `${member.officeKey}:${member.ordinal}` === holder.key,
                  );
                  return matching.length === 1 ? matching[0]! : null;
                })(),
                person: {
                  personId: holder.personId,
                  name: holder.name,
                  title: row.district
                    ? `${row.office.replace(/^House of (?:Delegates|Representatives)$/, "House")}, ${row.district.replace(/^State (?:House |Senate |Legislative )?/, "")}`
                    : row.office,
                  party: null,
                  facts: [],
                },
              },
            ]
          : [],
      ),
    );
}

/** Selected family illustrations need kinship/authority, not residence inference. */
export function openingFamilyActorSources(world: World, personId: EntityId) {
  const kinships = kinshipRelationshipsAt(world, personId);
  const authorities = activeChildAuthoritiesAt(world, personId);
  return openingFamilyPeople(world, personId).map((person) => {
    const related = kinships.filter((record) =>
      record.personIds.includes(person.personId),
    );
    const held = authorities.filter(
      ({ authority }) =>
        authority.holder.kind === "person" &&
        authority.holder.personId === person.personId,
    );
    return {
      person,
      recordIds: [
        ...related.map((record) => record.id),
        ...held.flatMap(({ authority, state }) => [authority.id, state.id]),
      ],
      kind: related.length
        ? ("kinship" as const)
        : held.length
          ? ("child-authority" as const)
          : null,
    };
  });
}

/** Keep the explicitly illustrated roster; never add scheduled workers. */
export function openingTourStagedPeople(
  world: World,
  personId: EntityId,
  place: string,
  people: readonly OrientationPerson[],
  options: {
    readonly furniture?: boolean;
    readonly memberIds?: ReadonlySet<EntityId>;
    readonly faceRoom?: boolean;
  } = {},
) {
  const ids = new Set(people.map((person) => person.personId));
  const placed = placeBackdropPeople(
    world,
    personId,
    place,
    world.currentMoment,
    people.map((person) => ({
      ...person,
      ...(options.memberIds?.has(person.personId)
        ? { role: "member-at-dais" as const }
        : {}),
    })),
    {
      standing: !options.furniture,
      rosterOnly: true,
      faceRoom: options.faceRoom ?? false,
    },
  );
  return Object.assign(
    placed.filter((person) => ids.has(person.personId)),
    {
      overflow: placed.overflow.filter((person) => ids.has(person.personId)),
    },
  );
}
