import { personName, type EntityId, type World } from "../simulation";
import { immediateFamilyOf } from "../simulation/crisis/fatal-illness";
import { describePersonContext } from "../simulation/person-context";
import {
  localHeadOfGovernment,
  sittingLocalOfficers,
} from "../simulation/living-world/local-government-seats";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { US_STATE_NAMES } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { projectWorldOrientation } from "./living-world-orientation";
import { localGoverningSeatFor } from "./local-governing-seat";
import { projectMacroConditions } from "./macro-conditions";
import {
  openingLocalChamber,
  projectOpeningFamily,
  projectOpeningLegislature,
} from "./opening-story";
import {
  chamberFloorPeople,
  openingLegislaturePeople,
} from "./opening-tour-people";
import { homeStateUsps as stateOfHome } from "../simulation/nationwide-world/state-executives";
import {
  backdropForLocation,
  homePlacesForPerson,
  middayBackdropUrl,
} from "./place-backdrops";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { projectGovernmentBrowser } from "./politics-government";
import {
  projectOrientationView,
  type OrientationChamber,
  type OrientationPerson,
  type OrientationView,
} from "./world-orientation";

/**
 * The opening as the owner approved it on October 8, 2026 (revised 11:14
 * p.m.): six stops, cut to as the President's address reaches each level of
 * government and then the player. In an inauguration year the address is the
 * inaugural, given outside the Capitol; otherwise it is the State of the
 * Union, given from the House rostrum. Each stop is a place with the people
 * actually there; a plaque names only the people who matter to that stop, by
 * name and their relationship to the player as the records give it. Every
 * number goes to the Ledger, never onto a stop.
 *
 * Read only: projecting the stops advances no clock and writes no record.
 */
export type OpeningStopKey =
  "country" | "representatives" | "state" | "town" | "home" | "you";

export const OPENING_STOP_ORDER: readonly OpeningStopKey[] = [
  "country",
  "representatives",
  "state",
  "town",
  "home",
  "you",
];

export interface OpeningStopPerson extends OrientationPerson {
  /** True when this person carries a plaque at this stop. */
  readonly plaque: boolean;
  /**
   * Where the room seats them: the speaker at the rostrum's podium, or a
   * member of the body that meets there (Congress, a town council) in its
   * members' seats. Anyone else takes an open seat (the Vice President, on
   * the rostrum behind the podium).
   */
  readonly role: "speaker" | "member" | null;
}

/** The President's address the opening's subtitles carry. */
export type OpeningAddress = "inaugural" | "state-of-the-union";

export interface OpeningStop {
  readonly key: OpeningStopKey;
  /** The staged place the stop stands in, or null when none has a picture. */
  readonly place: string | null;
  /** Everyone present, plaque-bearing people first. */
  readonly people: readonly OpeningStopPerson[];
  /** Offices and chambers seat people at their furniture; homes do not. */
  readonly furniture: boolean;
}

export interface OpeningLedgerRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export interface OpeningStopsView {
  readonly address: OpeningAddress;
  readonly stops: readonly OpeningStop[];
  /** Every number the opening knows, closed by default behind the Ledger. */
  readonly ledger: readonly OpeningLedgerRow[];
  /** The home state's postal code, for the Ledger's population and voting. */
  readonly homeStateUsps: string | null;
}

function stateName(usps: string): string | null {
  return (US_STATE_NAMES as Readonly<Record<string, string>>)[usps] ?? null;
}

function present(
  people: readonly OrientationPerson[],
  plaque: (person: OrientationPerson) => boolean,
  role: (person: OrientationPerson) => OpeningStopPerson["role"] = () => null,
): OpeningStopPerson[] {
  const seen = new Set<EntityId>();
  const out: OpeningStopPerson[] = [];
  for (const person of people) {
    if (seen.has(person.personId)) continue;
    seen.add(person.personId);
    out.push({ ...person, plaque: plaque(person), role: role(person) });
  }
  return [
    ...out.filter((person) => person.plaque),
    ...out.filter((person) => !person.plaque),
  ];
}

function recordedPerson(
  world: World,
  personId: EntityId,
  title: string,
): OrientationPerson | null {
  const person = world.people[personId];
  if (!person) return null;
  return { personId, name: personName(person), title, party: null, facts: [] };
}

/** The two offices the country stop shows, by their recorded office keys. */
const COUNTRY_OFFICES: readonly string[] = [
  "us-president",
  "us-vice-president",
];

type Orientation = ReturnType<typeof projectWorldOrientation>;

/**
 * The inaugural in the year a President's term began, by the term's recorded
 * start; the State of the Union in any other year.
 */
function openingAddress(
  world: World,
  orientation: Orientation,
): OpeningAddress {
  const president = orientation.executive.find(
    (holder) => holder.officeKey === "us-president",
  );
  return president?.startedAt?.slice(0, 4) === world.currentDate.slice(0, 4)
    ? "inaugural"
    : "state-of-the-union";
}

/** The President and Vice President, as the orientation records them. */
function executivePeople(
  orientation: Orientation,
  view: OrientationView,
): readonly { officeKey: string; person: OrientationPerson }[] {
  const executive = view.steps.find((step) => step.key === "executive");
  return COUNTRY_OFFICES.flatMap((officeKey) => {
    const holder = orientation.executive.find(
      (entry) => entry.officeKey === officeKey,
    );
    const person = holder
      ? executive?.people.find((entry) => entry.personId === holder.personId)
      : undefined;
    return person ? [{ officeKey, person }] : [];
  });
}

/**
 * Congress as it sits in its chamber: the player's two senators and House
 * member, or the District's or a territory's member of the House, as the
 * home's recorded districts give them, then the rest of Congress, home
 * state first.
 */
function congressInChamber(
  world: World,
  personId: EntityId,
  view: OrientationView,
): {
  readonly yours: readonly OrientationPerson[];
  readonly all: readonly OrientationPerson[];
} {
  const roster = new Map(
    view.steps
      .flatMap((step) => step.chambers)
      .flatMap((chamber) => chamber.roster)
      .flatMap((row) => (row.person ? [[row.person.personId, row.person]] : []))
      .map(([id, person]) => [id as EntityId, person as OrientationPerson]),
  );
  const rows =
    projectGovernmentBrowser(world, personId).representedBy?.filter(
      (row) => row.key === "us-senate" || row.key === "us-house",
    ) ?? [];
  const yours = [
    ...rows.filter((row) => row.key === "us-senate"),
    ...rows.filter((row) => row.key === "us-house"),
  ].flatMap((row) =>
    row.holders.flatMap((holder) => {
      if (!holder.personId) return [];
      const known = roster.get(holder.personId);
      const person =
        known ?? recordedPerson(world, holder.personId, row.office);
      return person ? [person] : [];
    }),
  );
  const homeUsps = stateOfHome(world, personId);
  const others = view.steps
    .flatMap((step) => step.chambers)
    .flatMap((chamber) => chamberFloorPeople(chamber, { homeUsps }));
  return { yours, all: [...yours, ...others] };
}

/**
 * Where each person sits in the chamber during the State of the Union: the
 * President at the rostrum's podium, the members of Congress in the members'
 * seats, and the Vice President in an open seat on the rostrum behind.
 */
function chamberRole(
  executive: readonly { officeKey: string; person: OrientationPerson }[],
  congress: ReadonlySet<EntityId>,
): (person: OrientationPerson) => OpeningStopPerson["role"] {
  const president = executive.find(
    (entry) => entry.officeKey === "us-president",
  )?.person.personId;
  return (person) =>
    person.personId === president
      ? "speaker"
      : congress.has(person.personId)
        ? "member"
        : null;
}

/**
 * (1) The country: the President giving the address, with the Vice
 * President. The State of the Union is given from the House rostrum to
 * Congress in its seats; the inaugural, outside the Capitol.
 */
function countryStop(
  executive: readonly { officeKey: string; person: OrientationPerson }[],
  congress: ReturnType<typeof congressInChamber>,
  address: OpeningAddress,
): OpeningStop {
  const people = executive.map((entry) => entry.person);
  if (address !== "state-of-the-union")
    return {
      key: "country",
      place: "us-capitol-exterior",
      people: present(people, () => true),
      furniture: false,
    };
  const leaders = new Set(people.map((person) => person.personId));
  return {
    key: "country",
    place: "us-house-floor",
    people: present(
      [...people, ...congress.all],
      (person) => leaders.has(person.personId),
      chamberRole(
        executive,
        new Set(congress.all.map((person) => person.personId)),
      ),
    ),
    furniture: true,
  };
}

/**
 * (2) Who represents you: Congress in its chamber, with plaques on the
 * player's own members. During the State of the Union it is the same
 * moment as the country's cut, the President still at the rostrum. Congress
 * is introduced once, here.
 */
function representativesStop(
  executive: readonly { officeKey: string; person: OrientationPerson }[],
  congress: ReturnType<typeof congressInChamber>,
  address: OpeningAddress,
): OpeningStop {
  const yours = new Set(congress.yours.map((member) => member.personId));
  const chamber = address === "state-of-the-union";
  return {
    key: "representatives",
    place: "us-house-floor",
    people: present(
      chamber
        ? [...congress.all, ...executive.map((entry) => entry.person)]
        : congress.all,
      (person) => yours.has(person.personId),
      chamberRole(
        chamber ? executive : [],
        new Set(congress.all.map((person) => person.personId)),
      ),
    ),
    furniture: true,
  };
}

/**
 * (3) Your state: the governor at work, with your own lawmakers in the same
 * moment, in the governor's office.
 */
function stateStop(
  world: World,
  personId: EntityId,
  view: OrientationView,
): OpeningStop {
  const state = view.steps.find((step) => step.key === "state");
  return {
    key: "state",
    place: "governor-office",
    people: present(
      [...(state?.people ?? []), ...openingLegislaturePeople(world, personId)],
      () => true,
    ),
    furniture: true,
  };
}

/**
 * (4) Your town: its meeting room and the people seated in its government.
 * Only whoever runs it carries a plaque: the mayor, or the body's chair.
 */
function townStop(world: World, personId: EntityId): OpeningStop {
  const units = homeLocalGovernmentUnits(world, personId);
  const officers =
    [units.municipal, units.townships, units.counties]
      .map((group) =>
        group.flatMap((unit) => sittingLocalOfficers(world, unit)),
      )
      .find((group) => group.length > 0) ?? [];
  const head = localHeadOfGovernment(world, personId);
  const headTitle = head
    ? (localGoverningSeatFor(world, head)?.mayorTitle ??
      officers.find((officer) => officer.personId === head)?.seatLabel ??
      null)
    : null;
  const people = officers.flatMap((officer) => {
    const title =
      officer.personId === head && headTitle ? headTitle : officer.seatLabel;
    const person = recordedPerson(world, officer.personId, title);
    return person ? [person] : [];
  });
  return {
    key: "town",
    place: openingLocalChamber(world, personId),
    // The town's governing body sits at its own dais.
    people: present(
      people,
      (person) => person.personId === head && headTitle !== null,
      () => "member",
    ),
    furniture: true,
  };
}

/**
 * (5) Your home: the whole family on record and everyone who lives there,
 * in an everyday moment. Parents first, then the household, then family who
 * live elsewhere (siblings, a partner, children), each under the
 * relationship the records give.
 */
function homeStop(world: World, personId: EntityId): OpeningStop {
  const family = projectOpeningFamily(world, personId);
  const ids = [
    ...family.parents.filter((member) => !member.died),
    ...family.household.filter((member) => !member.died),
  ].map((member) => member.personId);
  for (const id of immediateFamilyOf(world, personId))
    if (!ids.includes(id)) ids.push(id);
  const people = ids.flatMap((id) => {
    if (id === personId) return [];
    const relationship =
      describePersonContext(world, personId, id)?.relationship ?? null;
    const person = relationship
      ? recordedPerson(world, id, relationship)
      : null;
    return person ? [person] : [];
  });
  const place =
    homePlacesForPerson(world, personId).find((name) =>
      middayBackdropUrl(name),
    ) ?? null;
  return {
    key: "home",
    place,
    people: present(people, () => true),
    furniture: false,
  };
}

/**
 * (6) You: where day one starts, the room the play screen opens in, with the
 * people the records put there. The room is first-person, so the player is
 * not drawn in it.
 */
function youStop(world: World, personId: EntityId): OpeningStop {
  const scene = resolveOpeningPlaySceneContext(world, personId);
  // As the play screen does: a moment at home, or one with no recorded
  // place, is pictured at home.
  const backdrop = backdropForLocation(
    world,
    personId,
    scene.purpose === "home" || scene.purpose === "unspecified"
      ? "home"
      : scene.locationKey,
  );
  const people = scene.presentPeople.flatMap((entry) => {
    if (entry.personId === personId) return [];
    const person = recordedPerson(
      world,
      entry.personId,
      describePersonContext(world, personId, entry.personId)?.relationship ??
        "",
    );
    return person ? [person] : [];
  });
  return {
    key: "you",
    place: backdrop?.place ?? null,
    people: present(people, () => false),
    furniture: false,
  };
}

/** A chamber's seats by party, then any vacant or unrecorded seat. */
function chamberCounts(chamber: OrientationChamber): string {
  const vacant = chamber.roster.filter(
    (row) => row.status === "vacancy",
  ).length;
  const unrecorded = chamber.roster.filter(
    (row) => row.status !== "member" && row.status !== "vacancy",
  ).length;
  return [
    ...chamber.parties
      .filter((party) => party.members > 0)
      .map((party) =>
        party.noParty || party.label === "Independent"
          ? `${party.members} ${party.members === 1 ? "independent" : "independents"}`
          : `${party.members} ${party.label}`,
      ),
    ...(vacant > 0 ? [`${vacant} vacant`] : []),
    ...(unrecorded > 0 ? [`${unrecorded} not recorded`] : []),
  ].join(" · ");
}

function percent(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

function ledgerRows(
  world: World,
  personId: EntityId,
  view: OrientationView,
): OpeningLedgerRow[] {
  const congress = view.steps
    .flatMap((step) => step.chambers)
    .map((chamber) => ({
      key: `congress:${chamber.chamberKey}`,
      label: chamber.name,
      value: chamberCounts(chamber),
    }));
  const legislature = projectOpeningLegislature(world, personId).chambers.map(
    (chamber) => ({
      key: `legislature:${chamber.label}`,
      label: chamber.label,
      value: chamber.value,
    }),
  );
  const home = world.people[personId]?.homeJurisdictionId;
  const start = home
    ? projectMacroConditions(world, home).startingConditions
    : null;
  const economy = start
    ? [
        {
          key: "unemployment",
          label: "Unemployment",
          value: percent(start.unemploymentPct),
        },
        {
          key: "prices",
          label: "Prices over a year",
          value: `${start.inflation12mPct >= 0 ? "+" : ""}${percent(start.inflation12mPct)}`,
        },
      ]
    : [];
  return [...congress, ...legislature, ...economy].filter(
    (row) => row.value.length > 0,
  );
}

export function projectOpeningStops(
  world: World,
  personId: EntityId,
): OpeningStopsView {
  const orientation = projectWorldOrientation(world, personId);
  const view = projectOrientationView(orientation, stateName);
  const address = openingAddress(world, orientation);
  const executive = executivePeople(orientation, view);
  const congress = congressInChamber(world, personId, view);
  return {
    address,
    stops: [
      countryStop(executive, congress, address),
      representativesStop(executive, congress, address),
      stateStop(world, personId, view),
      townStop(world, personId),
      homeStop(world, personId),
      youStop(world, personId),
    ],
    ledger: ledgerRows(world, personId, view),
    homeStateUsps: orientation.homeState?.stateUsps ?? null,
  };
}
