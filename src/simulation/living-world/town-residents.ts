/**
 * The player's town gets residents: households in homes, children in its
 * schools, workers at its employers, and members in its congregations.
 *
 * Before this, a new game's town held only the player's own household. Every
 * other person in the world was a member of Congress, an executive, a chapter
 * organizer or a reporter, and the town's market, schools and club had nobody
 * in them, so no one could be met through work, school or worship.
 *
 * How many people are seated follows the owner's decision of 2026-09-22 (the
 * research handoff's "READ FIRST" note): the Census estimate is a reference,
 * not the world's live count, and the world's own people and events move the
 * population from there. So the town's size (`place-population.ts`) is kept
 * behind the scenes, and a bounded working set of households is written here
 * as ordinary lightweight people (decision D-005, progressive materialization).
 * They carry only identity, a home, and the ties below; detail comes later,
 * when somebody meets them. The set is not the town: most of its people are
 * never written down, and no screen counts these records as its population.
 *
 * Every share and count below is a marked PLACEHOLDER pending the research
 * questions named beside it, except the employment share, which is BLS's.
 * Where a figure is unknown the step writes nothing rather than guessing:
 * a resident with no work record has an employer the game does not hold,
 * not no job.
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
 * PLACEHOLDER (engineering bound, not research): the most households written
 * for one town. Every person costs each later save and every scheduled
 * transition, so the working set is capped; a town smaller than the cap gets
 * about one household per 2.5 residents.
 */
export const MAX_SEATED_HOUSEHOLDS = 40;
/** PLACEHOLDER: households seated when the town's size is unknown. */
export const UNKNOWN_SIZE_HOUSEHOLDS = 12;
/** PLACEHOLDER pending `town-household-composition`: people per household. */
const PEOPLE_PER_HOUSEHOLD = 2.5;

type HouseholdShape =
  | "alone"
  | "couple"
  | "couple-with-children"
  | "parent-with-children"
  | "housemates";

/**
 * PLACEHOLDER pending `town-household-composition`: the share of households of
 * each shape. Not read from any source; replace with the Census Bureau's
 * household-type table once filed research returns.
 */
const HOUSEHOLD_SHAPES: readonly (readonly [HouseholdShape, number])[] = [
  ["alone", 0.28],
  ["couple", 0.3],
  ["couple-with-children", 0.2],
  ["parent-with-children", 0.1],
  ["housemates", 0.12],
];

/**
 * BLS Current Population Survey, 2025 annual average: 59.7% of the civilian
 * population aged 16 and over was employed (Table 57, research handoff
 * "ordinary adult year national source intake"). Applied to the seated adults
 * as a cohort, never as one person's chance.
 */
export const EMPLOYED_SHARE_16_PLUS = 0.597;

/**
 * PLACEHOLDER pending `town-congregations`: how many congregations a town has,
 * what they are, and what share of households belongs to one. Two generically
 * named congregations and 45% of households until then.
 */
const CONGREGATION_NAMES = [
  (town: string) => `First Community Church of ${town}`,
  (town: string) => `${town} Community Fellowship`,
] as const;
const CONGREGATION_HOUSEHOLD_SHARE = 0.45;

/** PLACEHOLDER: how many residents each kind of town employer is staffed with. */
const STAFF_PER_EMPLOYER: Readonly<Record<string, number>> = {
  "enterprise:retail": 4,
  "service:school": 3,
};

const EMPLOYER_ROLES: Readonly<
  Record<
    string,
    {
      readonly title: string;
      readonly occupation: string;
      readonly kind: string;
    }
  >
> = {
  "enterprise:retail": {
    title: "Store clerk",
    occupation: "profession:retail-sales",
    kind: "employment:retail",
  },
  "service:school": {
    title: "Teacher",
    occupation: "profession:teacher",
    kind: "employment:education",
  },
};

interface SeatedPerson {
  readonly input: CharacterHistoryContextPersonInput;
  readonly age: number;
  readonly role: "adult" | "child";
}

interface SeatedHousehold {
  readonly key: string;
  readonly shape: HouseholdShape;
  readonly people: readonly SeatedPerson[];
}

/** The player's town, when the player lives in a town the world can seat. */
function seatedTown(world: World, playerPersonId: EntityId): EntityId | null {
  const home = world.people[playerPersonId]?.homeJurisdictionId;
  if (!home) return null;
  return world.jurisdictions[home]?.kind === "census-place" ? home : null;
}

/** How many households to write for the town. */
export function seatedHouseholdCount(population: number | null): number {
  if (population === null) return UNKNOWN_SIZE_HOUSEHOLDS;
  return Math.max(
    0,
    Math.min(
      MAX_SEATED_HOUSEHOLDS,
      Math.ceil(population / PEOPLE_PER_HOUSEHOLD),
    ),
  );
}

function pickShape(rng: SeededRng): HouseholdShape {
  let point = rng.next();
  for (const [shape, share] of HOUSEHOLD_SHAPES) {
    point -= share;
    if (point < 0) return shape;
  }
  return HOUSEHOLD_SHAPES.at(-1)![0];
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

function drawPerson(
  world: World,
  rng: SeededRng,
  stableKey: string,
  town: EntityId,
  age: number,
  familyName: string | null,
): CharacterHistoryContextPersonInput {
  const named = drawCanonicalNamedIdentity(
    rng.fork("name"),
    generatePersonIdentity(rng.fork("identity")),
  );
  const birthDate = birthDateForAge(rng.fork("birth"), world.currentDate, age);
  const surname = familyName ?? named.familyName;
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
}

/** PLACEHOLDER pending `town-household-composition`: ages by role. */
function planHousehold(
  world: World,
  rng: SeededRng,
  key: string,
  town: EntityId,
): SeatedHousehold {
  const shape = pickShape(rng.fork("shape"));
  const people: SeatedPerson[] = [];
  const adult = (
    n: number,
    min: number,
    max: number,
    family: string | null,
  ) => {
    const age = rng.fork(`age:${n}`).integer(min, max + 1);
    const input = drawPerson(
      world,
      rng.fork(`person:${n}`),
      `${key}:person:${n}`,
      town,
      age,
      family,
    );
    people.push({ input, age, role: "adult" });
    return input;
  };
  if (shape === "alone") adult(0, 20, 88, null);
  else if (shape === "housemates") {
    adult(0, 19, 40, null);
    adult(1, 19, 40, null);
  } else {
    const parentAges: readonly [number, number] =
      shape === "couple" ? [22, 85] : [26, 52];
    const head = adult(0, parentAges[0], parentAges[1], null);
    if (shape !== "parent-with-children") {
      const headAge = people[0]!.age;
      adult(
        1,
        Math.max(19, headAge - 6),
        Math.min(90, headAge + 6),
        head.familyName,
      );
    }
    if (shape === "couple-with-children" || shape === "parent-with-children") {
      const children = rng.fork("children").integer(1, 4);
      const youngest = Math.max(0, people[0]!.age - 45);
      for (let c = 0; c < children; c += 1) {
        const age = rng
          .fork(`child-age:${c}`)
          .integer(youngest, Math.min(17, people[0]!.age - 20) + 1);
        people.push({
          input: drawPerson(
            world,
            rng.fork(`child:${c}`),
            `${key}:child:${c}`,
            town,
            age,
            head.familyName,
          ),
          age,
          role: "child",
        });
      }
    }
  }
  return { key, shape, people };
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

/** The program a town school teaches, read from who already attended it. */
function schoolProgram(world: World, schoolId: EntityId): string | null {
  const kinds = new Set(
    world.history.educationEnrollments
      .filter((enrollment) => enrollment.organizationId === schoolId)
      .map((enrollment) => enrollment.programKind),
  );
  return kinds.size === 1 ? [...kinds][0]! : null;
}

const SCHOOL_AGES: Readonly<Record<string, readonly [number, number]>> = {
  "schooling:elementary": [5, 10],
  "schooling:middle": [11, 13],
  "schooling:secondary": [14, 17],
  "schooling:general": [5, 17],
};

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

/**
 * Seat the player's town once. A world whose town already has seated
 * residents, or whose player lives outside a town, is returned unchanged.
 */
export function ensureTownResidents(
  world: World,
  playerPersonId: EntityId,
): World {
  const town = seatedTown(world, playerPersonId);
  if (!town) return world;
  const prefix = `${TOWN_RESIDENTS_VERSION}:${town}`;
  if (
    world.history.households.some((household) =>
      household.stableKey.startsWith(`${prefix}:`),
    )
  )
    return world;
  const place = lifePlaceByJurisdictionId(town);
  const population = place?.sourceGeoid
    ? placePopulation(place.sourceGeoid)
    : null;
  const count = seatedHouseholdCount(population);
  if (count === 0) return world;

  const rng = new SeededRng(world.seed).fork(prefix);
  const households = Array.from({ length: count }, (_, index) =>
    planHousehold(
      world,
      rng.fork(`household:${index}`),
      `${prefix}:household:${index}`,
      town,
    ),
  );
  const today = world.currentDate;
  const townName = place?.displayName.split(",")[0]!.trim() ?? "Town";

  let next = createCharacterHistoryContextPeople(
    world,
    households.flatMap((household) =>
      household.people.map((person) => person.input),
    ),
  );
  const idOf = (person: SeatedPerson) =>
    characterHistoryContextPersonId(next, person.input.stableKey);

  next = withWorldIntegrityDeferred(() => {
    let w = next;
    // Homes, and who each person is to the others in it.
    for (const household of households) {
      w = createHousehold(w, {
        stableKey: household.key,
        formedAt: today,
        label: `${household.people[0]!.input.familyName} household`,
        provenance: PROVENANCE,
      });
      const householdId = createStableId(
        "household",
        `${w.id}:${household.key}`,
      );
      w = recordHouseholdLocation(w, {
        stableKey: `${household.key}:location`,
        householdId,
        effectiveAt: today,
        jurisdictionId: town,
        label: place?.displayName ?? townName,
        kind: "residence:home",
        provenance: PROVENANCE,
        supersedesLocationId: null,
      });
      const adults = household.people.filter((p) => p.role === "adult");
      const children = household.people.filter((p) => p.role === "child");
      household.people.forEach((person, n) => {
        w = startHouseholdMembership(w, {
          stableKey: `${household.key}:membership:${n}`,
          personId: idOf(person),
          householdId,
          startedAt: today,
          residenceRole: "primary",
          kind:
            person.role === "child"
              ? "resident:child"
              : household.shape === "housemates"
                ? "resident:roommate"
                : n === 1
                  ? "resident:spouse"
                  : "resident:member",
          provenance: PROVENANCE,
        });
      });
      if (
        household.shape === "couple" ||
        household.shape === "couple-with-children"
      ) {
        // PLACEHOLDER pending `town-household-composition`: every couple is
        // recorded as married, from the younger partner's twenty-fourth year.
        const younger = Math.min(adults[0]!.age, adults[1]!.age);
        w = createPartnership(w, {
          stableKey: `${household.key}:partnership`,
          personIds: [idOf(adults[0]!), idOf(adults[1]!)],
          startedAt: addYears(today, -Math.max(0, younger - 24)),
          kind: "legal:marriage",
          provenance: PROVENANCE,
        });
      }
      for (const [c, child] of children.entries()) {
        for (const [a, parent] of adults.entries()) {
          w = recordKinship(w, {
            stableKey: `${household.key}:kinship:${c}:${a}`,
            personIds: [idOf(child), idOf(parent)],
            establishedAt: child.input.birthDate,
            kind: "lineal:parent-child",
            provenance: PROVENANCE,
          });
        }
      }
    }

    // Children in the town's schools, by the ages each school teaches.
    const schools = townOrganizations(w, town, "service:school")
      .map((id) => ({ id, program: schoolProgram(w, id) }))
      .filter(
        (school): school is { id: EntityId; program: string } =>
          school.program !== null && school.program in SCHOOL_AGES,
      );
    for (const household of households) {
      for (const person of household.people) {
        if (person.role !== "child") continue;
        const age = ageOnDate(person.input.birthDate, today);
        const school = schools.find(({ program }) => {
          const [min, max] = SCHOOL_AGES[program]!;
          return age >= min && age <= max;
        });
        if (!school) continue;
        w = createEducationEnrollment(w, {
          stableKey: `${person.input.stableKey}:school`,
          personId: idOf(person),
          organizationId: school.id,
          startedAt: today,
          programKind: school.program as EducationProgramKind,
          contextKind: "stage:school",
          provenance: PROVENANCE,
        });
      }
    }

    // Workers at the town's employers, from the employed share of adults.
    const workingAge = households
      .flatMap((household) => household.people)
      .filter((person) => {
        const age = ageOnDate(person.input.birthDate, today);
        return age >= 18 && age <= 66;
      });
    const adults16 = households
      .flatMap((household) => household.people)
      .filter((person) => ageOnDate(person.input.birthDate, today) >= 16);
    const employed = Math.min(
      workingAge.length,
      Math.round(adults16.length * EMPLOYED_SHARE_16_PLUS),
    );
    const order = rng.fork("workers");
    const workers = workingAge
      .map((person) => ({ person, draw: order.next() }))
      .sort((a, b) => a.draw - b.draw)
      .slice(0, employed)
      .map(({ person }) => person);
    let cursor = 0;
    for (const classification of Object.keys(STAFF_PER_EMPLOYER)) {
      const role = EMPLOYER_ROLES[classification]!;
      for (const organizationId of townOrganizations(w, town, classification)) {
        for (let s = 0; s < STAFF_PER_EMPLOYER[classification]!; s += 1) {
          const worker = workers[cursor];
          if (!worker) break;
          cursor += 1;
          w = createWorkRelationship(w, {
            stableKey: `${worker.input.stableKey}:work`,
            personId: idOf(worker),
            organizationId,
            startedAt: today,
            kind: role.kind as WorkRelationshipKind,
            compensation: "paid",
            authority: "directs-others",
            dependency: "dependent",
            economicRisk: "organization-borne",
            provenance: PROVENANCE,
            initialRole: {
              title: role.title,
              occupationClassification:
                role.occupation as OccupationClassification,
              locationJurisdictionId: town,
              timeDemand: workTimeDemand(town),
            },
          });
        }
      }
    }

    // Congregations, and the households that belong to one.
    const congregations = CONGREGATION_NAMES.map((name, index) => {
      const stableKey = `${prefix}:congregation:${index}`;
      w = createOrganization(w, {
        stableKey,
        formedAt: today,
        provenance: PROVENANCE,
        initialProfile: {
          name: name(townName),
          classification: "community:congregation",
          locationJurisdictionId: town,
        },
      });
      return createStableId("organization", `${w.id}:${stableKey}`);
    });
    const faith = rng.fork("congregations");
    for (const household of households) {
      const draw = faith.fork(household.key);
      if (draw.next() >= CONGREGATION_HOUSEHOLD_SHARE) continue;
      const congregation =
        congregations[draw.integer(0, congregations.length)]!;
      for (const person of household.people) {
        w = createOrganizationParticipation(w, {
          stableKey: `${person.input.stableKey}:congregation`,
          personId: idOf(person),
          organizationId: congregation,
          startedAt: today,
          kind: "membership:congregation",
          roleKind: "member:congregant",
          context: null,
          provenance: PROVENANCE,
        });
      }
    }
    return w;
  });
  assertWorldIntegrity(next);
  return next;
}

function addYears(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) + years;
  const rest = date.slice(4);
  return makeIsoDate(`${year}${rest === "-02-29" ? "-02-28" : rest}`);
}
