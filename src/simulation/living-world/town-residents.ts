/**
 * Everyone who lives in the player's town, and the few of them written out.
 *
 * Before this, a new game's town held only the player's own household: its
 * market, schools and club had nobody in them, and nobody could be met through
 * work, school or worship.
 *
 * The owner's rules (research handoff "READ FIRST", 2026-09-22; thread
 * direction 2026-09-23): the Census estimate is a reference, never shown as a
 * live count; a town's people follow its real size, not a fixed number; they
 * should be there in a light form, with detail only when it matters. That is
 * decision D-005 (progressive materialization) applied to a whole town:
 *
 * 1. The TOWN ROSTER is procedural. Household `h` of the town is a pure
 *    function of the world seed, the town and `h`: its shape, and its members'
 *    ages. Nothing is stored for it. There are as many households as the
 *    town's size calls for, so Reno has about 113,000 and Rugby about 1,000.
 * 2. Each town ORGANIZATION (market, school, congregation) fills its places
 *    from those households, by the same pure function (`townRosterPlace`).
 * 3. A household is MATERIALIZED, written into the world through the ordinary
 *    person and household writers, only when somebody in it is needed: today,
 *    the people who staff the town's employers, the first members of its
 *    congregations, and the player's nearest neighbors.
 *    `materializeTownHousehold` is the one way in; a household written once is
 *    the same people forever after.
 *
 * Every share and count below is a marked PLACEHOLDER pending the research
 * questions named beside it, except the employment share, which is BLS's.
 */

import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { ageOnDate, makeIsoDate } from "../dates";
import { birthCohortGivenName } from "../given-name-cohorts";
import { createStableId } from "../ids";
import {
  createEducationEnrollment,
  createHousehold,
  createOrganization,
  createOrganizationParticipation,
  createPartnership,
  createWorkRelationship,
  recordHouseholdLocation,
  recordKinship,
  startHouseholdMembership,
} from "../life";
import type { CreateWorkRelationshipInput } from "../life";
import { organizationProfileAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import { placePopulation } from "../nationwide-world/place-population";
import { drawCanonicalNamedIdentity } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type {
  EducationProgramKind,
  EntityId,
  IsoDate,
  OccupationClassification,
  WorkAuthority,
  WorkRelationshipKind,
  World,
} from "../types";
import { assertWorldIntegrity, withWorldIntegrityDeferred } from "../world";

export const TOWN_RESIDENTS_VERSION = "town-residents-v1";

const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: TOWN_RESIDENTS_VERSION,
};

/**
 * PLACEHOLDER: the size used for a place the Census estimates do not cover
 * (a census-designated place, or one not matched). Never shown to the player.
 */
export const UNKNOWN_TOWN_POPULATION = 1_000;

type HouseholdShape =
  | "alone"
  | "couple"
  | "couple-with-children"
  | "parent-with-children"
  | "housemates";

/**
 * PLACEHOLDER pending `town-household-composition`: the share of households of
 * each shape, and the age bands in `townHouseholdSkeleton`. Not read from any
 * source.
 */
const HOUSEHOLD_SHAPES: readonly (readonly [HouseholdShape, number])[] = [
  ["alone", 0.28],
  ["couple", 0.3],
  ["couple-with-children", 0.2],
  ["parent-with-children", 0.1],
  ["housemates", 0.12],
];

/** How many people a household of each shape holds on average. */
const MEAN_MEMBERS: Readonly<Record<HouseholdShape, number>> = {
  alone: 1,
  couple: 2,
  // One to three children.
  "couple-with-children": 4,
  "parent-with-children": 3,
  housemates: 2,
};

/**
 * People per household, from the shapes above, so the town's homes hold its
 * population. PLACEHOLDER with them, pending `town-household-composition`.
 */
export const PEOPLE_PER_HOUSEHOLD = HOUSEHOLD_SHAPES.reduce(
  (sum, [shape, share]) => sum + share * MEAN_MEMBERS[shape],
  0,
);

/**
 * BLS Current Population Survey, 2025 annual average: 59.7% of the civilian
 * population aged 16 and over was employed (Table 57, research handoff
 * "ordinary adult year national source intake"). It sizes the town's workforce
 * as a cohort; it is never one person's chance.
 */
export const EMPLOYED_SHARE_16_PLUS = 0.597;

/**
 * PLACEHOLDER pending `town-congregations`: how many congregations a town has,
 * what they are, how many belong, and how many are written out at the start.
 * One congregation per 1,500 residents (at least one; at most four written as
 * organizations), 45% of households belonging, and eight member households of
 * each written out.
 */
const RESIDENTS_PER_CONGREGATION = 1_500;
const MAX_CONGREGATIONS = 4;
const CONGREGATION_HOUSEHOLD_SHARE = 0.45;
const CONGREGATION_HOUSEHOLDS_WRITTEN = 8;
const CONGREGATION_NAMES: readonly ((town: string) => string)[] = [
  (town) => `First Community Church of ${town}`,
  (town) => `${town} Community Fellowship`,
  (town) => `Grace Chapel of ${town}`,
  (town) => `${town} Friends Meeting`,
];

/** PLACEHOLDER: residents each kind of town employer is staffed with. */
const STAFF_PER_EMPLOYER: Readonly<Record<string, number>> = {
  "enterprise:retail": 4,
  "service:school": 3,
};

/** PLACEHOLDER: the player's nearest neighbors, written out at the start. */
export const NEIGHBOR_HOUSEHOLDS = 6;

const EMPLOYER_ROLES: Readonly<
  Record<
    string,
    {
      readonly title: string;
      readonly occupation: OccupationClassification;
      readonly kind: WorkRelationshipKind;
      readonly authority: WorkAuthority;
    }
  >
> = {
  "enterprise:retail": {
    title: "Store clerk",
    occupation: "profession:retail-sales",
    kind: "employment:retail",
    // Staff on the floor, not the store's managers.
    authority: "directed",
  },
  "service:school": {
    title: "Teacher",
    occupation: "profession:teacher",
    kind: "employment:education",
    authority: "directed",
  },
};

interface SkeletonMember {
  readonly age: number;
  readonly role: "adult" | "child";
}

/** One household of the town, before anyone in it is written out. */
export interface TownHouseholdSkeleton {
  readonly index: number;
  readonly shape: HouseholdShape;
  /** Ages on the day the world began, adults first. */
  readonly members: readonly SkeletonMember[];
}

/** What the world holds about a town's size. */
export interface TownRoster {
  readonly town: EntityId;
  /** The Census reference, or null when the estimates do not cover it. */
  readonly referencePopulation: number | null;
  /** The size the town's people are generated from. */
  readonly population: number;
  readonly households: number;
}

/** The player's town, when the player lives in a town the world can seat. */
export function playerTown(world: World, personId: EntityId): EntityId | null {
  const home = world.people[personId]?.homeJurisdictionId;
  if (!home) return null;
  // A territory town (kind "territory-place", from the territories lane) is
  // seated the same way; it has no Census figure, so it takes the marked
  // placeholder size.
  const kind: string | undefined = world.jurisdictions[home]?.kind;
  return kind === "census-place" || kind === "territory-place" ? home : null;
}

/**
 * The town's size and household count. PLACEHOLDER: the owner decided the
 * world starts from the Census figure with realistic drift, but no drift
 * amount is set, so none is applied yet.
 */
export function townRoster(town: EntityId): TownRoster {
  const place = lifePlaceByJurisdictionId(town);
  const reference = place?.sourceGeoid
    ? placePopulation(place.sourceGeoid)
    : null;
  const population = reference ?? UNKNOWN_TOWN_POPULATION;
  return {
    town,
    referencePopulation: reference,
    population,
    households: Math.ceil(population / PEOPLE_PER_HOUSEHOLD),
  };
}

function householdKey(town: EntityId, index: number): string {
  return `${TOWN_RESIDENTS_VERSION}:${town}:household:${index}`;
}

function householdRng(world: World, town: EntityId, index: number) {
  return new SeededRng(world.seed).fork(householdKey(town, index));
}

function pickShape(rng: SeededRng): HouseholdShape {
  let point = rng.next();
  for (const [shape, share] of HOUSEHOLD_SHAPES) {
    point -= share;
    if (point < 0) return shape;
  }
  return HOUSEHOLD_SHAPES.at(-1)![0];
}

/** Household `index` of the town: its shape and its members' ages. Cheap. */
export function townHouseholdSkeleton(
  world: World,
  town: EntityId,
  index: number,
): TownHouseholdSkeleton {
  const rng = householdRng(world, town, index);
  const shape = pickShape(rng.fork("shape"));
  const members: SkeletonMember[] = [];
  const adult = (n: number, min: number, max: number) => {
    const age = rng.fork(`age:${n}`).integer(min, max + 1);
    members.push({ age, role: "adult" });
    return age;
  };
  if (shape === "alone") adult(0, 20, 88);
  else if (shape === "housemates") {
    adult(0, 19, 40);
    adult(1, 19, 40);
  } else {
    const head = shape === "couple" ? adult(0, 22, 85) : adult(0, 26, 52);
    if (shape !== "parent-with-children")
      adult(1, Math.max(19, head - 6), Math.min(90, head + 6));
    if (shape === "couple-with-children" || shape === "parent-with-children") {
      const children = rng.fork("children").integer(1, 4);
      const youngest = Math.max(0, head - 45);
      for (let c = 0; c < children; c += 1)
        members.push({
          age: rng
            .fork(`child-age:${c}`)
            .integer(youngest, Math.min(17, head - 20) + 1),
          role: "child",
        });
    }
  }
  return { index, shape, members };
}

/** The stable key of member `member` of household `index`. */
export function townResidentKey(
  town: EntityId,
  index: number,
  member: number,
): string {
  return `${householdKey(town, index)}:person:${member}`;
}

/** The person id member `member` of household `index` has once written out. */
export function townResidentId(
  world: World,
  town: EntityId,
  index: number,
  member: number,
): EntityId {
  return characterHistoryContextPersonId(
    world,
    townResidentKey(town, index, member),
  );
}

export function townHouseholdMaterialized(
  world: World,
  town: EntityId,
  index: number,
): boolean {
  return !!world.people[townResidentId(world, town, index, 0)];
}

function birthDateForAge(rng: SeededRng, today: IsoDate, age: number): IsoDate {
  const month = String(rng.integer(1, 13)).padStart(2, "0");
  const day = String(rng.integer(1, 29)).padStart(2, "0");
  const year = Number(today.slice(0, 4)) - age;
  const candidate = makeIsoDate(`${year}-${month}-${day}`);
  // Before this year's birthday they are still a year younger.
  return ageOnDate(candidate, today) === age
    ? candidate
    : makeIsoDate(`${year - 1}-${month}-${day}`);
}

/** Who household `index` would be written out as: names and birthdays. Pure. */
export function townHouseholdPeople(
  world: World,
  town: EntityId,
  index: number,
): readonly CharacterHistoryContextPersonInput[] {
  return namedMembers(world, town, townHouseholdSkeleton(world, town, index));
}

function namedMembers(
  world: World,
  town: EntityId,
  skeleton: TownHouseholdSkeleton,
): readonly CharacterHistoryContextPersonInput[] {
  const rng = householdRng(world, town, skeleton.index);
  let familyName: string | null = null;
  return skeleton.members.map((member, n) => {
    const personRng = rng.fork(`person:${n}`);
    const stableKey = townResidentKey(town, skeleton.index, n);
    const named = drawCanonicalNamedIdentity(
      personRng.fork("name"),
      generatePersonIdentity(personRng.fork("identity")),
    );
    // Skeleton ages are ages on the day the world began, so a household
    // written years into a save has the same birthdays as one written on day
    // one (`materializeTownHousehold`).
    const birthDate = birthDateForAge(
      personRng.fork("birth"),
      world.startedAt,
      member.age,
    );
    // Housemates keep their own names; a family shares the first adult's.
    const surname =
      skeleton.shape === "housemates" || familyName === null
        ? named.familyName
        : familyName;
    if (familyName === null) familyName = surname;
    return {
      stableKey,
      givenName: birthCohortGivenName(world.seed, stableKey, {
        givenName: named.givenName,
        familyName: surname,
        birthDate,
        gender: named.identity.gender,
      }),
      familyName: surname,
      identity: named.identity,
      birthDate,
      homeJurisdictionId: town,
    };
  });
}

/**
 * Write household `index` of the town into the world: its people, its home,
 * and who they are to each other. A household already written is returned
 * unchanged, so the same person is never written twice.
 */
export function materializeTownHousehold(
  world: World,
  town: EntityId,
  index: number,
): World {
  if (townHouseholdMaterialized(world, town, index)) return world;
  const skeleton = townHouseholdSkeleton(world, town, index);
  const inputs = namedMembers(world, town, skeleton);
  let next = createCharacterHistoryContextPeople(world, inputs);
  const today = next.currentDate;
  const key = householdKey(town, index);
  const ids = inputs.map((input) =>
    characterHistoryContextPersonId(next, input.stableKey),
  );
  const written = withWorldIntegrityDeferred(() => {
    next = createHousehold(next, {
      stableKey: key,
      formedAt: today,
      label: `${inputs[0]!.familyName} household`,
      provenance: PROVENANCE,
    });
    const householdId = createStableId("household", `${next.id}:${key}`);
    next = recordHouseholdLocation(next, {
      stableKey: `${key}:location`,
      householdId,
      effectiveAt: today,
      jurisdictionId: town,
      label: lifePlaceByJurisdictionId(town)?.displayName ?? "Home",
      kind: "residence:home",
      provenance: PROVENANCE,
      supersedesLocationId: null,
    });
    skeleton.members.forEach((member, n) => {
      next = startHouseholdMembership(next, {
        stableKey: `${key}:membership:${n}`,
        personId: ids[n]!,
        householdId,
        startedAt: today,
        residenceRole: "primary",
        kind:
          member.role === "child"
            ? "resident:child"
            : skeleton.shape === "housemates"
              ? "resident:roommate"
              : n === 1
                ? "resident:spouse"
                : "resident:member",
        provenance: PROVENANCE,
      });
    });
    const adults = skeleton.members
      .map((member, n) => ({ ...member, n }))
      .filter((member) => member.role === "adult");
    if (
      skeleton.shape === "couple" ||
      skeleton.shape === "couple-with-children"
    ) {
      // PLACEHOLDER pending `town-household-composition`: every couple is
      // recorded as married, from the younger partner's twenty-fourth year.
      const younger = Math.min(adults[0]!.age, adults[1]!.age);
      next = createPartnership(next, {
        stableKey: `${key}:partnership`,
        personIds: [ids[0]!, ids[1]!],
        startedAt: yearsBefore(today, Math.max(0, younger - 24)),
        kind: "legal:marriage",
        provenance: PROVENANCE,
      });
    }
    skeleton.members.forEach((member, c) => {
      if (member.role !== "child") return;
      for (const parent of adults)
        next = recordKinship(next, {
          stableKey: `${key}:kinship:${c}:${parent.n}`,
          personIds: [ids[c]!, ids[parent.n]!],
          establishedAt: inputs[c]!.birthDate,
          kind: "lineal:parent-child",
          provenance: PROVENANCE,
        });
    });
    return next;
  });
  // A no-op inside `ensureTownResidents`, which checks once at its end.
  assertWorldIntegrity(written);
  return written;
}

/**
 * Place `slot` of an organization's roster: a household and member of the
 * town whose age fits, drawn from the whole town by a pure function. Null for
 * a town with nobody who fits after a bounded search.
 */
export function townRosterPlace(
  world: World,
  town: EntityId,
  organizationKey: string,
  slot: number,
  fits: (member: SkeletonMember) => boolean,
  taken: ReadonlySet<string> = new Set(),
): { readonly household: number; readonly member: number } | null {
  const { households } = townRoster(town);
  if (households === 0) return null;
  const rng = new SeededRng(world.seed).fork(
    `${TOWN_RESIDENTS_VERSION}:${town}:roster:${organizationKey}:${slot}`,
  );
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const household = rng.integer(0, households);
    const members = townHouseholdSkeleton(world, town, household).members;
    const member = members.findIndex(
      (candidate, m) => fits(candidate) && !taken.has(`${household}:${m}`),
    );
    if (member >= 0) return { household, member };
  }
  return null;
}

/** Town organizations of one classification, in the order the world made them. */
function townOrganizations(
  world: World,
  town: EntityId,
  classification: string,
): readonly EntityId[] {
  return world.history.organizations
    .filter((organization) => {
      const profile = organizationProfileAt(world, organization.id);
      return (
        profile?.classification === classification &&
        profile.locationJurisdictionId === town
      );
    })
    .map((organization) => organization.id);
}

function workTimeDemand(
  town: EntityId,
): CreateWorkRelationshipInput["initialRole"]["timeDemand"] {
  return {
    expectedWeekly: { minimumHours: 20, maximumHours: 40 },
    attention: "moderate",
    concurrency: "partly-concurrent",
    scheduleRigidity: "mixed",
    interruptibility: "limited",
    locationJurisdictionId: town,
  };
}

const workingAge = (member: SkeletonMember) =>
  member.role === "adult" && member.age >= 18 && member.age <= 66;

/** How many congregations the town has, of which the first few are written. */
export function townCongregationCount(population: number): number {
  return Math.max(1, Math.round(population / RESIDENTS_PER_CONGREGATION));
}

/**
 * Seat the player's town once: its employers staffed, its congregations
 * founded with their first member households, and the player's nearest
 * neighbors written out. Everybody else stays in the roster. A world whose
 * town is already seated, or whose player lives outside a town, is unchanged.
 */
export function ensureTownResidents(
  world: World,
  playerPersonId: EntityId,
): World {
  // Hundreds of writes; the world is checked once, whole, at the end.
  const next = withWorldIntegrityDeferred(() =>
    seatTownResidents(world, playerPersonId),
  );
  assertWorldIntegrity(next);
  return next;
}

function seatTownResidents(world: World, playerPersonId: EntityId): World {
  const town = playerTown(world, playerPersonId);
  if (!town) return world;
  const prefix = `${TOWN_RESIDENTS_VERSION}:${town}`;
  if (
    world.history.organizations.some((organization) =>
      organization.stableKey.startsWith(`${prefix}:congregation:`),
    )
  )
    return world;
  const roster = townRoster(town);
  if (roster.households === 0) return world;
  const townName =
    lifePlaceByJurisdictionId(town)?.displayName.split(",")[0]!.trim() ??
    "Town";
  const today = world.currentDate;
  const taken = new Set<string>();
  let next = world;

  const seat = (
    organizationKey: string,
    slot: number,
    fits: (member: SkeletonMember) => boolean,
  ) => {
    const found = townRosterPlace(
      next,
      town,
      organizationKey,
      slot,
      fits,
      taken,
    );
    if (!found) return null;
    taken.add(`${found.household}:${found.member}`);
    next = materializeTownHousehold(next, town, found.household);
    return {
      ...found,
      personId: townResidentId(next, town, found.household, found.member),
    };
  };

  // The player's nearest neighbors.
  for (let n = 0; n < Math.min(NEIGHBOR_HOUSEHOLDS, roster.households); n += 1)
    seat("neighbors", n, () => true);

  // Staff for the town's employers.
  for (const [classification, staff] of Object.entries(STAFF_PER_EMPLOYER)) {
    const role = EMPLOYER_ROLES[classification]!;
    for (const organizationId of townOrganizations(
      next,
      town,
      classification,
    )) {
      for (let s = 0; s < staff; s += 1) {
        const worker = seat(organizationId, s, workingAge);
        if (!worker) break;
        next = createWorkRelationship(next, {
          stableKey: `${townResidentKey(town, worker.household, worker.member)}:work`,
          personId: worker.personId,
          organizationId,
          startedAt: today,
          kind: role.kind,
          compensation: "paid",
          authority: role.authority,
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance: PROVENANCE,
          initialRole: {
            title: role.title,
            occupationClassification: role.occupation,
            locationJurisdictionId: town,
            timeDemand: workTimeDemand(town),
          },
        });
      }
    }
  }

  // Congregations, each with its first member households.
  const congregations = Math.min(
    MAX_CONGREGATIONS,
    townCongregationCount(roster.population),
  );
  for (let c = 0; c < congregations; c += 1) {
    const stableKey = `${prefix}:congregation:${c}`;
    next = createOrganization(next, {
      stableKey,
      formedAt: today,
      provenance: PROVENANCE,
      initialProfile: {
        name: CONGREGATION_NAMES[c]!(townName),
        classification: "community:congregation",
        locationJurisdictionId: town,
      },
    });
    const organizationId = createStableId(
      "organization",
      `${next.id}:${stableKey}`,
    );
    for (let h = 0; h < CONGREGATION_HOUSEHOLDS_WRITTEN; h += 1) {
      const found = seat(stableKey, h, (member) => member.role === "adult");
      if (!found) break;
      const members = townHouseholdSkeleton(
        next,
        town,
        found.household,
      ).members;
      members.forEach((_, m) => {
        taken.add(`${found.household}:${m}`);
        next = createOrganizationParticipation(next, {
          stableKey: `${townResidentKey(town, found.household, m)}:congregation`,
          personId: townResidentId(next, town, found.household, m),
          organizationId,
          startedAt: today,
          kind: "membership:congregation",
          roleKind: "member:congregant",
          context: null,
          provenance: PROVENANCE,
        });
      });
    }
  }

  // Children of the written households go to the town's schools.
  return enrollWrittenChildren(next, town);
}

const SCHOOL_AGES: Readonly<Record<string, readonly [number, number]>> = {
  "schooling:elementary": [5, 10],
  "schooling:middle": [11, 13],
  "schooling:secondary": [14, 17],
  "schooling:general": [5, 17],
};

/** The program a town school teaches, read from who already attended it. */
function schoolProgram(world: World, schoolId: EntityId): string | null {
  const kinds = new Set(
    world.history.educationEnrollments
      .filter((enrollment) => enrollment.organizationId === schoolId)
      .map((enrollment) => enrollment.programKind),
  );
  return kinds.size === 1 ? [...kinds][0]! : null;
}

function enrollWrittenChildren(world: World, town: EntityId): World {
  const schools = townOrganizations(world, town, "service:school")
    .map((id) => ({ id, program: schoolProgram(world, id) }))
    .filter(
      (school): school is { id: EntityId; program: string } =>
        school.program !== null && school.program in SCHOOL_AGES,
    );
  const prefix = `${TOWN_RESIDENTS_VERSION}:${town}:household:`;
  const written = new Set(
    world.history.households
      .filter((household) => household.stableKey.startsWith(prefix))
      .map((household) => household.id),
  );
  const enrolled = new Set(
    world.history.educationEnrollments.map((enrollment) => enrollment.personId),
  );
  let next = world;
  for (const membership of world.history.householdMemberships) {
    if (!written.has(membership.householdId)) continue;
    const person = next.people[membership.personId];
    if (!person || enrolled.has(person.id)) continue;
    const age = ageOnDate(person.birthDate, next.currentDate);
    const school = schools.find(({ program }) => {
      const [min, max] = SCHOOL_AGES[program]!;
      return age >= min && age <= max;
    });
    if (!school) continue;
    next = createEducationEnrollment(next, {
      stableKey: `${membership.stableKey}:school`,
      personId: person.id,
      organizationId: school.id,
      startedAt: next.currentDate,
      programKind: school.program as EducationProgramKind,
      contextKind: "stage:school",
      provenance: PROVENANCE,
    });
  }
  return next;
}

/**
 * The town's people as the world knows them, for a report. Roster figures are
 * estimated from an even sample of households, not from a stored list;
 * `written` counts the people actually in the world.
 */
export function describeTownResidents(
  world: World,
  town: EntityId,
  sample = 2_000,
) {
  const roster = townRoster(town);
  const n = Math.min(sample, roster.households);
  let people = 0;
  let children = 0;
  let adults16 = 0;
  for (let i = 0; i < n; i += 1) {
    const index = Math.floor((i * roster.households) / n);
    for (const member of townHouseholdSkeleton(world, town, index).members) {
      people += 1;
      if (member.role === "child" && member.age >= 5) children += 1;
      if (member.age >= 16) adults16 += 1;
    }
  }
  const scale = n === 0 ? 0 : roster.households / n;
  const prefix = `${TOWN_RESIDENTS_VERSION}:${town}:household:`;
  const written = new Set(
    world.history.households
      .filter((household) => household.stableKey.startsWith(prefix))
      .map((household) => household.id),
  );
  return {
    roster,
    writtenHouseholds: written.size,
    writtenPeople: world.history.householdMemberships.filter((membership) =>
      written.has(membership.householdId),
    ).length,
    estimated: {
      people: Math.round(people * scale),
      schoolAgeChildren: Math.round(children * scale),
      workers: Math.round(adults16 * scale * EMPLOYED_SHARE_16_PLUS),
      congregants: Math.round(people * scale * CONGREGATION_HOUSEHOLD_SHARE),
      congregations: townCongregationCount(roster.population),
    },
  };
}

function yearsBefore(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) - years;
  const rest = date.slice(4);
  return makeIsoDate(`${year}${rest === "-02-29" ? "-02-28" : rest}`);
}
