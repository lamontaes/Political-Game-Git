/**
 * The jobs of the player's town.
 *
 * Before this, a Lexington opening wrote 88 working-age residents and 17 of
 * them had a job: the market's clerks, a few teachers and whoever the press
 * already employed. Everyone else the player met was an adult with nowhere to
 * be.
 *
 * Now every working-age resident the world has written out is given a place in
 * the town's labor force, once, the first time the town's jobs are filled:
 * most hold a recorded job (a work relationship and a role with a title, an
 * occupation, a workplace and weekly hours); a few are students, retired, at
 * home with small children, or looking for work. Nobody the player meets as a
 * clerk, a pastor or a nurse is a clerk, pastor or nurse only in a sentence.
 *
 * What is sourced and what is not:
 *
 * - The mix of industries is the town's own county's, from the Census 2023
 *   County Business Patterns (private employers), blended across the counties
 *   a town spans by land area. Public employment is the home state's, from the
 *   BLS May 2025 state ownership research estimates, scaled against the
 *   state's total employment. Both come from the regional data in #701
 *   (`town-employment.generated.ts`).
 * - Which workplaces and job titles stand for each industry, how many
 *   outlets of each a town has, and the shares of students, retirees, parents
 *   at home and job seekers are GAME ASSUMPTIONS, marked below, until a
 *   researched occupation-by-industry table replaces them.
 *
 * The rest of the town stays in the roster (`town-residents.ts`): a household
 * is given its jobs when it is written out, never before.
 */

import { ageOnDate, makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { createOrganization, createWorkRelationships } from "../life";
import type { CreateWorkRelationshipInput } from "../life";
import { organizationClosingAt, organizationProfileAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  countyGeoidsForPlace,
  countyGovernmentUnitsForPlace,
} from "../government-units";
import { drawCanonicalNameForGender } from "../people";
import { nameCorpusVersionForWorld } from "../place-name-corpus";
import { SeededRng } from "../rng";
import type {
  EntityId,
  IsoDate,
  OccupationClassification,
  OrganizationClassification,
  ScheduleRigidity,
  WorkAuthority,
  WorkRelationshipKind,
  World,
} from "../types";
import {
  COUNTY_SECTOR_EMPLOYMENT,
  STATE_PUBLIC_EMPLOYMENT,
  TOWN_EMPLOYMENT_META,
} from "./town-employment.generated";

export const TOWN_EMPLOYMENT_VERSION = "town-employment-v1";

const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: TOWN_EMPLOYMENT_VERSION,
};

/** The youngest and oldest ages the town's jobs are filled for. */
export const WORKING_AGE_MIN = 18;
export const WORKING_AGE_MAX = 66;

/* -------------------------------------------------------------------------- */
/* Sourced mix                                                                */
/* -------------------------------------------------------------------------- */

type Sector = (typeof TOWN_EMPLOYMENT_META.sectors)[number];
type LocalGroup = (typeof TOWN_EMPLOYMENT_META.localGroups)[number];

let countyTable: ReadonlyMap<string, readonly (number | null)[]> | null = null;
let stateTable: ReadonlyMap<string, readonly (number | null)[]> | null = null;

const parseCells = (cells: string) =>
  cells.split(",").map((value) => (value === "" ? null : Number(value)));

function counties() {
  if (countyTable) return countyTable;
  const map = new Map<string, readonly (number | null)[]>();
  for (const row of COUNTY_SECTOR_EMPLOYMENT.split(";")) {
    const colon = row.indexOf(":");
    map.set(row.slice(0, colon), parseCells(row.slice(colon + 1)));
  }
  return (countyTable = map);
}

function states() {
  if (stateTable) return stateTable;
  const map = new Map<string, readonly (number | null)[]>();
  for (const row of STATE_PUBLIC_EMPLOYMENT.split(";")) {
    const colon = row.indexOf(":");
    map.set(row.slice(0, colon), parseCells(row.slice(colon + 1)));
  }
  return (stateTable = map);
}

/** Where a town's industry mix was read from. */
export type TownEmploymentBasis = "county" | "state" | "national";

export interface TownEmploymentMix {
  readonly basis: TownEmploymentBasis;
  /** Private employment by two-digit sector; a withheld cell counts nothing. */
  readonly sectors: ReadonlyMap<Sector, number>;
  /** Public employment on the same scale as `sectors`. */
  readonly federal: number;
  readonly state: number;
  readonly local: ReadonlyMap<LocalGroup, number>;
}

function addSectors(
  into: Map<Sector, number>,
  cells: readonly (number | null)[],
  weight: number,
) {
  TOWN_EMPLOYMENT_META.sectors.forEach((sector, n) => {
    const value = cells[n];
    if (value !== null && value !== undefined)
      into.set(sector, (into.get(sector) ?? 0) + value * weight);
  });
}

/**
 * The town's employment mix: private sectors from its counties, public
 * employment from its state. Pure, and cheap after the first call.
 */
export function townEmploymentMix(town: EntityId): TownEmploymentMix {
  const place = lifePlaceByJurisdictionId(town);
  const geoid = place?.sourceGeoid ?? null;
  const stateFips = geoid?.slice(0, 2) ?? null;
  const sectors = new Map<Sector, number>();
  let basis: TownEmploymentBasis = "national";
  const parts = geoid ? countyGeoidsForPlace(geoid) : [];
  const found = parts.filter((county) => counties().has(county));
  if (found.length > 0) {
    basis = "county";
    // Each county the town lies in, evenly: the index lists counties largest
    // share first but a county's size is not its share of the town's jobs.
    for (const county of found)
      addSectors(sectors, counties().get(county)!, 1 / found.length);
  } else if (stateFips) {
    for (const [county, cells] of counties())
      if (county.startsWith(stateFips)) addSectors(sectors, cells, 1);
    if (sectors.size > 0) basis = "state";
  }
  if (sectors.size === 0)
    for (const cells of counties().values()) addSectors(sectors, cells, 1);

  const privateTotal = [...sectors.values()].reduce((a, b) => a + b, 0);
  const row = (stateFips && states().get(stateFips)) || nationalPublicRow();
  const [total, federal] = row;
  // The District of Columbia publishes no local government: its city
  // government is counted as state government. There the state figure is the
  // local one, split as local government is nationally.
  const cityIsState = row[3] === null && row[2] !== null;
  const stateGov = cityIsState ? 0 : row[2];
  const local = cityIsState ? row[2] : row[3];
  const publicTotal = (federal ?? 0) + (stateGov ?? 0) + (local ?? 0);
  // Public jobs stand to the county's private jobs as they do in the state.
  const scale =
    total && total > publicTotal ? privateTotal / (total - publicTotal) : 0;
  const localGroups = new Map<LocalGroup, number>();
  const groupCells = (cityIsState ? nationalPublicRow() : row).slice(4);
  const groupSum = groupCells.reduce<number>((a, b) => a + (b ?? 0), 0);
  TOWN_EMPLOYMENT_META.localGroups.forEach((group, n) => {
    const value = groupCells[n];
    // Local government's groups share its whole total, so the ones BLS
    // withheld do not shrink it.
    if (value !== null && value !== undefined && groupSum > 0)
      localGroups.set(group, ((local ?? 0) * scale * value) / groupSum);
  });
  return {
    basis,
    sectors,
    federal: (federal ?? 0) * scale,
    state: (stateGov ?? 0) * scale,
    local: localGroups,
  };
}

let nationalRow: readonly (number | null)[] | null = null;
function nationalPublicRow(): readonly (number | null)[] {
  if (nationalRow) return nationalRow;
  const sums: number[] = [];
  for (const cells of states().values()) {
    // Only states that publish every figure, so the sums stay comparable.
    if (cells.some((cell) => cell === null)) continue;
    cells.forEach((cell, n) => (sums[n] = (sums[n] ?? 0) + cell!));
  }
  return (nationalRow = sums);
}

/* -------------------------------------------------------------------------- */
/* Workplaces and roles (GAME ASSUMPTION)                                      */
/* -------------------------------------------------------------------------- */

export interface Role {
  readonly title: string;
  readonly occupation: OccupationClassification;
  readonly weight: number;
  readonly authority?: WorkAuthority;
  readonly minAge?: number;
  readonly hours?: readonly [number, number];
  readonly rigidity?: ScheduleRigidity;
}

interface NameContext {
  readonly town: string;
  readonly state: string;
  readonly family: string;
  /** The county government's name, such as "Humphreys County". */
  readonly county: string;
}

export interface Workplace {
  readonly key: string;
  readonly classification: OrganizationClassification;
  readonly kind: WorkRelationshipKind;
  /** Named for the town, or for the family that runs it. */
  readonly name: (context: NameContext) => string;
  /** GAME ASSUMPTION: how many separate employers of this kind a town has. */
  readonly outlets: number;
  readonly roles: readonly Role[];
  /** Hire into the town's existing organizations of this kind instead. */
  readonly existing?: OrganizationClassification;
}

const role = (
  title: string,
  occupation: OccupationClassification,
  weight: number,
  extra: Omit<Role, "title" | "occupation" | "weight"> = {},
): Role => ({ title, occupation, weight, ...extra });

const LEAD = { authority: "directs-others" as const, minAge: 28 };

export const TOWN_WORKPLACES: readonly Workplace[] = [
  {
    key: "farm",
    classification: "enterprise:agriculture",
    kind: "employment:agriculture",
    name: ({ family }) => `${family} Family Farm`,
    outlets: 2,
    roles: [
      role("Farmworker", "occupation:farmworker", 5, { rigidity: "mixed" }),
      role("Farm manager", "occupation:farm-manager", 1, LEAD),
    ],
  },
  {
    key: "quarry",
    classification: "enterprise:mining",
    kind: "employment:mining",
    name: ({ family }) => `${family} Stone and Gravel`,
    outlets: 1,
    roles: [
      role("Equipment operator", "trade:equipment-operator", 3),
      role("Quarry laborer", "occupation:extraction-laborer", 2),
    ],
  },
  {
    key: "utility",
    classification: "enterprise:utility",
    kind: "employment:utility",
    name: ({ town }) => `${town} Electric and Water`,
    outlets: 1,
    roles: [
      role("Line worker", "trade:line-worker", 3),
      role("Customer service representative", "occupation:customer-service", 2),
    ],
  },
  {
    key: "construction",
    classification: "enterprise:construction",
    kind: "employment:construction",
    name: ({ family }) => `${family} Construction`,
    outlets: 3,
    roles: [
      role("Carpenter", "trade:carpenter", 3),
      role("Electrician", "trade:electrician", 2),
      role("Construction laborer", "occupation:construction-laborer", 3),
      role("Project manager", "profession:construction-manager", 1, LEAD),
    ],
  },
  {
    key: "manufacturing",
    classification: "enterprise:manufacturing",
    kind: "employment:manufacturing",
    name: ({ family }) => `${family} Manufacturing`,
    outlets: 2,
    roles: [
      role("Production worker", "occupation:production-worker", 6),
      role("Machinist", "trade:machinist", 2),
      role("Shift supervisor", "occupation:production-supervisor", 1, LEAD),
    ],
  },
  {
    key: "wholesale",
    classification: "enterprise:wholesale",
    kind: "employment:wholesale",
    name: ({ family }) => `${family} Supply Company`,
    outlets: 1,
    roles: [
      role("Warehouse worker", "occupation:warehouse-worker", 3),
      role("Sales representative", "occupation:sales-representative", 2),
    ],
  },
  {
    key: "retail",
    classification: "enterprise:retail",
    kind: "employment:retail",
    name: ({ family }) => `${family}'s General Store`,
    outlets: 3,
    roles: [
      role("Cashier", "occupation:cashier", 4),
      role("Sales associate", "occupation:retail-sales", 4),
      role("Stocker", "occupation:stocker", 2),
      role("Store manager", "occupation:retail-manager", 1, LEAD),
    ],
  },
  {
    key: "trucking",
    classification: "enterprise:transportation",
    kind: "employment:transportation",
    name: ({ family }) => `${family} Trucking`,
    outlets: 2,
    roles: [
      role("Truck driver", "occupation:truck-driver", 4, {
        rigidity: "mixed",
      }),
      role("Dispatcher", "occupation:dispatcher", 1),
    ],
  },
  {
    key: "information",
    classification: "enterprise:telecommunications",
    kind: "employment:information",
    name: ({ town }) => `${town} Telephone and Internet`,
    outlets: 1,
    roles: [
      role("Installation technician", "trade:telecom-technician", 2),
      role("Customer service representative", "occupation:customer-service", 2),
    ],
  },
  {
    key: "bank",
    classification: "enterprise:banking",
    kind: "employment:finance",
    name: ({ town }) => `${town} Community Bank`,
    outlets: 1,
    roles: [
      role("Bank teller", "occupation:bank-teller", 3),
      role("Loan officer", "profession:loan-officer", 2),
      role("Branch manager", "profession:financial-manager", 1, LEAD),
    ],
  },
  {
    key: "insurance",
    classification: "enterprise:insurance",
    kind: "employment:finance",
    name: ({ family }) => `${family} Insurance Agency`,
    outlets: 1,
    roles: [
      role("Insurance agent", "profession:insurance-agent", 2),
      role("Office clerk", "occupation:office-clerk", 1),
    ],
  },
  {
    key: "realty",
    classification: "enterprise:real-estate",
    kind: "employment:real-estate",
    name: ({ family }) => `${family} Realty`,
    outlets: 1,
    roles: [
      role("Real estate agent", "profession:real-estate-agent", 2),
      role("Property manager", "profession:property-manager", 1),
    ],
  },
  {
    key: "professional",
    classification: "enterprise:professional-services",
    kind: "employment:professional-services",
    name: ({ family }) => `${family} and Associates`,
    outlets: 2,
    roles: [
      role("Accountant", "profession:accountant", 2, { minAge: 22 }),
      role("Attorney", "profession:lawyer", 1, { minAge: 25 }),
      role("Paralegal", "profession:legal-assistant", 1),
      role("Engineer", "profession:engineer", 1, { minAge: 22 }),
    ],
  },
  {
    key: "regional-office",
    classification: "enterprise:corporate-office",
    kind: "employment:corporate-office",
    name: ({ town }) => `${town} Regional Office`,
    outlets: 1,
    roles: [
      role("Office manager", "occupation:office-manager", 1),
      role("Business analyst", "profession:business-analyst", 2, {
        minAge: 22,
      }),
    ],
  },
  {
    key: "building-services",
    classification: "enterprise:building-services",
    kind: "employment:building-services",
    name: ({ family }) => `${family} Building Services`,
    outlets: 1,
    roles: [
      role("Janitor", "occupation:janitor", 3, { rigidity: "mixed" }),
      role("Landscaper", "occupation:landscaper", 2),
      role("Security guard", "occupation:security-guard", 1),
    ],
  },
  {
    key: "private-school",
    classification: "service:private-school",
    kind: "employment:education",
    name: ({ town }) => `${town} Academy`,
    outlets: 1,
    roles: [
      role("Teacher", "profession:teacher", 3, { minAge: 22 }),
      role("Teacher's aide", "occupation:teacher-assistant", 1),
    ],
  },
  {
    key: "hospital",
    classification: "service:hospital",
    kind: "employment:health-care",
    name: ({ town }) => `${town} Regional Hospital`,
    outlets: 1,
    roles: [
      role("Registered nurse", "profession:registered-nurse", 4, {
        minAge: 21,
        rigidity: "rigid",
      }),
      role("Nursing assistant", "occupation:nursing-assistant", 3),
      role("Physician", "profession:physician", 1, { minAge: 30 }),
      role("Medical records clerk", "occupation:medical-records", 1),
    ],
  },
  {
    key: "clinic",
    classification: "service:clinic",
    kind: "employment:health-care",
    name: ({ town }) => `${town} Family Clinic`,
    outlets: 1,
    roles: [
      role("Nurse", "profession:registered-nurse", 2, { minAge: 21 }),
      role("Medical assistant", "occupation:medical-assistant", 2),
      role("Receptionist", "occupation:receptionist", 1),
    ],
  },
  {
    key: "care-home",
    classification: "service:nursing-home",
    kind: "employment:health-care",
    name: ({ town }) => `${town} Nursing and Rehabilitation`,
    outlets: 1,
    roles: [
      role("Home health aide", "occupation:home-health-aide", 3),
      role("Licensed practical nurse", "profession:practical-nurse", 1, {
        minAge: 21,
      }),
    ],
  },
  {
    key: "recreation",
    classification: "enterprise:recreation",
    kind: "employment:recreation",
    name: ({ town }) => `${town} Fitness and Recreation`,
    outlets: 1,
    roles: [
      role("Recreation attendant", "occupation:recreation-attendant", 2),
      role("Fitness trainer", "occupation:fitness-trainer", 1),
    ],
  },
  {
    key: "restaurant",
    classification: "enterprise:food-service",
    kind: "employment:food-service",
    name: ({ family }) => `${family}'s Kitchen`,
    outlets: 3,
    roles: [
      role("Cook", "occupation:cook", 3, { rigidity: "mixed" }),
      role("Server", "service:food-server", 4, { rigidity: "mixed" }),
      role("Dishwasher", "occupation:dishwasher", 1),
      role("Restaurant manager", "occupation:food-service-manager", 1, LEAD),
    ],
  },
  {
    key: "inn",
    classification: "enterprise:lodging",
    kind: "employment:lodging",
    name: ({ town }) => `${town} Inn`,
    outlets: 1,
    roles: [
      role("Front desk clerk", "occupation:hotel-clerk", 2),
      role("Housekeeper", "occupation:housekeeper", 2),
    ],
  },
  {
    key: "repair",
    classification: "enterprise:repair",
    kind: "employment:repair",
    name: ({ family }) => `${family} Auto Service`,
    outlets: 1,
    roles: [role("Mechanic", "trade:automotive-mechanic", 3)],
  },
  {
    key: "personal-care",
    classification: "enterprise:personal-services",
    kind: "employment:personal-services",
    name: ({ family }) => `${family}'s Salon and Barbershop`,
    outlets: 1,
    roles: [
      role("Hairstylist", "service:hairstylist", 2),
      role("Barber", "service:barber", 1),
    ],
  },
  // Civic workplaces. Religious, civic and labor organizations are part of
  // "other services" (NAICS 813) in County Business Patterns.
  {
    key: "congregation",
    classification: "community:congregation",
    kind: "employment:religious",
    name: ({ town }) => `${town} Community Church`,
    outlets: 1,
    existing: "community:congregation",
    roles: [
      role("Pastor", "profession:clergy", 1, { ...LEAD, minAge: 30 }),
      role("Church office secretary", "occupation:office-clerk", 1),
    ],
  },
  {
    key: "organizing",
    classification: "community:organizing-nonprofit",
    kind: "employment:nonprofit",
    name: ({ town }) => `${town} Neighbors United`,
    outlets: 1,
    roles: [role("Community organizer", "profession:community-organizer", 1)],
  },
  {
    key: "union",
    classification: "membership:labor-union",
    kind: "employment:labor-union",
    name: ({ town }) => `${town} Area Workers Union Local`,
    outlets: 1,
    roles: [
      role("Union representative", "profession:union-representative", 1, {
        minAge: 25,
      }),
    ],
  },
  {
    key: "party-office",
    classification: "membership:party-chapter",
    kind: "employment:party-staff",
    name: ({ town }) => `${town} Party Office`,
    outlets: 1,
    existing: "membership:party-chapter",
    roles: [
      role("Party office manager", "occupation:office-manager", 1),
      role("Party field organizer", "profession:political-organizer", 1),
    ],
  },
  {
    key: "campaign-staff",
    classification: "enterprise:political-consulting",
    kind: "employment:campaign-staff",
    name: ({ town }) => `${town} Campaign Works`,
    outlets: 1,
    roles: [
      role("Campaign field organizer", "profession:political-organizer", 2, {
        rigidity: "flexible",
      }),
      role("Campaign manager", "profession:campaign-manager", 1, {
        ...LEAD,
        minAge: 26,
        rigidity: "flexible",
      }),
    ],
  },
  // Public employers.
  {
    key: "public-school",
    classification: "service:school",
    kind: "employment:education",
    name: ({ town }) => `${town} Public Schools`,
    outlets: 1,
    existing: "service:school",
    roles: [
      role("Teacher", "profession:teacher", 6, { minAge: 22 }),
      role("Teacher's aide", "occupation:teacher-assistant", 2),
      role("Principal", "profession:school-principal", 0, {
        ...LEAD,
        minAge: 32,
      }),
    ],
  },
  {
    key: "city-hall",
    classification: "sector:local-government-office",
    kind: "employment:public-service",
    name: ({ town }) => `${town} City Hall`,
    outlets: 1,
    roles: [
      role("City clerk", "profession:municipal-clerk", 0, { minAge: 25 }),
      role("City planner", "profession:urban-planner", 0, { minAge: 24 }),
      role("Office assistant", "occupation:office-clerk", 3),
      role("Budget analyst", "profession:budget-analyst", 1, { minAge: 22 }),
    ],
  },
  {
    // The clerk who keeps the county's records and takes filings. Only a
    // town inside a county with a county government has one.
    key: "county-clerk",
    classification: "sector:local-government-office",
    kind: "employment:public-service",
    name: ({ county }) => `${county} Clerk's Office`,
    outlets: 1,
    roles: [
      role("County clerk", "profession:county-clerk", 0, { minAge: 30 }),
      role("Deputy county clerk", "occupation:office-clerk", 0),
    ],
  },
  {
    key: "police",
    classification: "service:police",
    kind: "employment:public-safety",
    name: ({ town }) => `${town} Police Department`,
    outlets: 1,
    roles: [
      role("Police officer", "profession:police-officer", 5, {
        minAge: 21,
        rigidity: "rigid",
      }),
      role("Emergency dispatcher", "occupation:dispatcher", 1),
    ],
  },
  {
    key: "fire",
    classification: "service:fire",
    kind: "employment:public-safety",
    name: ({ town }) => `${town} Fire Department`,
    outlets: 1,
    roles: [
      role("Firefighter", "profession:firefighter", 1, { rigidity: "rigid" }),
    ],
  },
  {
    key: "public-works",
    classification: "sector:local-government-office",
    kind: "employment:public-service",
    name: ({ town }) => `${town} Public Works Department`,
    outlets: 1,
    roles: [
      role("Maintenance worker", "trade:maintenance-worker", 3),
      role("Equipment operator", "trade:equipment-operator", 1),
      role("Bus driver", "occupation:bus-driver", 2),
    ],
  },
  {
    key: "public-health",
    classification: "service:public-health",
    kind: "employment:public-service",
    name: ({ town }) => `${town} Health Department`,
    outlets: 1,
    roles: [
      role("Public health nurse", "profession:registered-nurse", 2, {
        minAge: 21,
      }),
      role("Caseworker", "profession:social-worker", 2, { minAge: 22 }),
    ],
  },
  {
    key: "state-office",
    classification: "sector:state-government-office",
    kind: "employment:public-service",
    name: ({ town, state }) => `${state} State Offices in ${town}`,
    outlets: 1,
    roles: [
      role("State caseworker", "profession:social-worker", 2, { minAge: 22 }),
      role("Office clerk", "occupation:office-clerk", 2),
      role("Highway maintenance worker", "trade:maintenance-worker", 2),
    ],
  },
  {
    key: "post-office",
    classification: "sector:federal-government-office",
    kind: "employment:public-service",
    name: ({ town }) => `${town} Post Office`,
    outlets: 1,
    roles: [
      role("Mail carrier", "occupation:mail-carrier", 3),
      role("Postal clerk", "occupation:postal-clerk", 1),
    ],
  },
];

const WORKPLACE = new Map(TOWN_WORKPLACES.map((place) => [place.key, place]));

const FULL_TIME_HOURS = [35, 45] as const;
const PART_TIME_HOURS = [16, 29] as const;

/**
 * GAME ASSUMPTION: the chance a new hire at each workplace works part-time,
 * under 35 hours a week. Food service, stores and recreation run on
 * part-time staff; offices, plants and public agencies mostly do not. Jobs
 * written before this draw (a household's own job, civic roles) stay
 * full-time, so a town's share sits below the national one of about one
 * worker in six until those are drawn too.
 */
export const TOWN_PART_TIME_SHARE: Readonly<Record<string, number>> = {
  restaurant: 0.45,
  retail: 0.35,
  recreation: 0.5,
  "personal-care": 0.3,
  inn: 0.3,
  "building-services": 0.25,
  "care-home": 0.25,
  "private-school": 0.15,
  "public-school": 0.08,
  congregation: 0.3,
  farm: 0.15,
  hospital: 0.15,
  clinic: 0.2,
  "campaign-staff": 0.2,
  organizing: 0.2,
};
export const TOWN_PART_TIME_DEFAULT = 0.08;

/**
 * A county government's listed name as people say it: "COUNTY OF HUMPHREYS"
 * is "Humphreys County", "PARISH OF ORLEANS" is "Orleans Parish".
 */
export function countyDisplayName(listed: string): string {
  const title = (text: string) =>
    text
      .toLowerCase()
      .split(" ")
      .map((word) =>
        word === "and" || word === "of"
          ? word
          : word.replace(/(^|-)([a-z])/g, (found) => found.toUpperCase()),
      )
      .join(" ");
  const match = /^(.+?) OF (.+)$/.exec(listed.trim());
  return match ? `${title(match[2]!)} ${title(match[1]!)}` : title(listed);
}

/** The town workplace an employer was written from, and the role held. */
export function townWorkplaceFor(
  organizationStableKey: string,
  classification: string | null,
): Workplace | null {
  const employer = /:employer:([a-z-]+):\d+$/.exec(organizationStableKey);
  if (employer) return WORKPLACE.get(employer[1]!) ?? null;
  return (
    TOWN_WORKPLACES.find(
      (workplace) =>
        workplace.existing && workplace.existing === classification,
    ) ?? null
  );
}

/** GAME ASSUMPTION: which workplaces stand for each sector, and in what shares. */
const SECTOR_WORKPLACES: Readonly<
  Record<Sector, readonly (readonly [string, number])[]>
> = {
  "11": [["farm", 1]],
  "21": [["quarry", 1]],
  "22": [["utility", 1]],
  "23": [["construction", 1]],
  "31": [["manufacturing", 1]],
  "42": [["wholesale", 1]],
  "44": [["retail", 1]],
  "48": [["trucking", 1]],
  "51": [["information", 1]],
  "52": [
    ["bank", 2],
    ["insurance", 1],
  ],
  "53": [["realty", 1]],
  "54": [["professional", 1]],
  "55": [["regional-office", 1]],
  "56": [["building-services", 1]],
  "61": [["private-school", 1]],
  "62": [
    ["hospital", 4],
    ["clinic", 3],
    ["care-home", 2],
  ],
  "71": [["recreation", 1]],
  "72": [
    ["restaurant", 6],
    ["inn", 1],
  ],
  "81": [
    ["repair", 3],
    ["personal-care", 2],
    ["congregation", 2],
    ["organizing", 1],
    ["union", 1],
    ["party-office", 1],
    ["campaign-staff", 1],
  ],
};

/** GAME ASSUMPTION: which local workplaces each major group works in. */
const LOCAL_GROUP_WORKPLACES: Readonly<
  Record<LocalGroup, readonly (readonly [string, number])[]>
> = {
  "11": [
    ["city-hall", 1],
    ["public-school", 1],
  ],
  "13": [["city-hall", 1]],
  "21": [["public-health", 1]],
  "25": [["public-school", 1]],
  "29": [["public-health", 1]],
  "31": [["public-health", 1]],
  "33": [
    ["police", 3],
    ["fire", 2],
  ],
  "37": [
    ["public-works", 1],
    ["public-school", 1],
  ],
  "43": [["city-hall", 1]],
  "47": [["public-works", 1]],
  "49": [["public-works", 1]],
  "53": [["public-works", 1]],
};

/**
 * Roles every seated town has someone in, whatever the draw: the people a
 * player's political life runs through. One per listed workplace; a workplace
 * hired into its existing organizations (schools, congregations, party
 * chapters) gets one per organization.
 */
const CIVIC_MINIMUM: readonly (readonly [string, string])[] = [
  ["city-hall", "City clerk"],
  ["county-clerk", "County clerk"],
  ["city-hall", "City planner"],
  ["public-school", "Principal"],
  ["public-school", "Teacher"],
  ["congregation", "Pastor"],
  ["organizing", "Community organizer"],
  ["union", "Union representative"],
  ["hospital", "Registered nurse"],
  ["clinic", "Nurse"],
  ["police", "Police officer"],
  ["fire", "Firefighter"],
  ["party-office", "Party office manager"],
  ["campaign-staff", "Campaign field organizer"],
  ["campaign-staff", "Campaign field organizer"],
  ["campaign-staff", "Campaign manager"],
];

/** Every workplace's share of the town's jobs, from the sourced mix. */
export function townWorkplaceWeights(
  town: EntityId,
): ReadonlyMap<string, number> {
  const mix = townEmploymentMix(town);
  const weights = new Map<string, number>();
  const spread = (
    amount: number,
    places: readonly (readonly [string, number])[],
  ) => {
    const sum = places.reduce((total, [, share]) => total + share, 0);
    for (const [key, share] of places)
      weights.set(key, (weights.get(key) ?? 0) + (amount * share) / sum);
  };
  for (const [sector, amount] of mix.sectors)
    spread(amount, SECTOR_WORKPLACES[sector]);
  for (const [group, amount] of mix.local)
    spread(amount, LOCAL_GROUP_WORKPLACES[group]);
  spread(mix.state, [["state-office", 1]]);
  spread(mix.federal, [["post-office", 1]]);
  return weights;
}

/* -------------------------------------------------------------------------- */
/* Labor status (GAME ASSUMPTION)                                              */
/* -------------------------------------------------------------------------- */

/**
 * GAME ASSUMPTION pending a researched labor-force table by age and household:
 * the shares of working-age residents who are not working. A student is 18 to
 * 24 and enrolled; retirement is from 62; a parent at home has a partner and a
 * child under six.
 */
const NOT_WORKING = {
  studentWithoutJob: 0.6,
  retiredFrom62: 0.35,
  parentAtHome: 0.15,
  lookingForWork: 0.04,
} as const;

export type TownLaborStatus =
  "employed" | "student" | "retired" | "parent-at-home" | "looking-for-work";

export interface Resident {
  readonly personId: EntityId;
  readonly age: number;
  readonly enrolled: boolean;
  readonly parentOfYoungChild: boolean;
}

export function laborStatus(world: World, resident: Resident): TownLaborStatus {
  const rng = new SeededRng(world.seed).fork(
    `${TOWN_EMPLOYMENT_VERSION}:status:${resident.personId}`,
  );
  const draw = rng.next();
  if (resident.enrolled && resident.age <= 24)
    return draw < NOT_WORKING.studentWithoutJob ? "student" : "employed";
  if (resident.age >= 62 && draw < NOT_WORKING.retiredFrom62) return "retired";
  if (resident.parentOfYoungChild && draw < NOT_WORKING.parentAtHome)
    return "parent-at-home";
  return rng.fork("looking").next() < NOT_WORKING.lookingForWork
    ? "looking-for-work"
    : "employed";
}

/* -------------------------------------------------------------------------- */
/* Filling the town's jobs                                                    */
/* -------------------------------------------------------------------------- */

function yearsBefore(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) - years;
  const rest = date.slice(4);
  return makeIsoDate(`${year}${rest === "-02-29" ? "-02-28" : rest}`);
}

function townOrganizationsOf(
  world: World,
  town: EntityId,
  classification: OrganizationClassification,
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

/** The town's written working-age residents, with what their status needs. */
export function townResidents(
  world: World,
  town: EntityId,
): readonly Resident[] {
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const enrolled = new Set(
    world.history.educationEnrollments.map((row) => row.personId),
  );
  const householdOf = new Map<EntityId, EntityId[]>();
  for (const membership of world.history.householdMemberships) {
    const list = householdOf.get(membership.householdId) ?? [];
    list.push(membership.personId);
    householdOf.set(membership.householdId, list);
  }
  const youngChildHouseholds = new Set<EntityId>();
  const partnered = new Set(
    world.history.partnerships.flatMap((row) => row.personIds),
  );
  const householdsOf = new Map<EntityId, EntityId[]>();
  for (const [household, members] of householdOf)
    for (const member of members) {
      const person = world.people[member];
      if (person && ageOnDate(person.birthDate, world.currentDate) < 6)
        youngChildHouseholds.add(household);
      const list = householdsOf.get(member) ?? [];
      list.push(household);
      householdsOf.set(member, list);
    }
  const residents: Resident[] = [];
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person || person.homeJurisdictionId !== town || dead.has(personId))
      continue;
    const age = ageOnDate(person.birthDate, world.currentDate);
    if (age < WORKING_AGE_MIN || age > WORKING_AGE_MAX) continue;
    residents.push({
      personId,
      age,
      enrolled: enrolled.has(personId),
      parentOfYoungChild:
        partnered.has(personId) &&
        (householdsOf.get(personId) ?? []).some((household) =>
          youngChildHouseholds.has(household),
        ),
    });
  }
  return residents;
}

function pickWeighted<T>(
  rng: SeededRng,
  entries: readonly (readonly [T, number])[],
): T | null {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return null;
  let point = rng.next() * total;
  for (const [value, weight] of entries) {
    point -= weight;
    if (point < 0) return value;
  }
  return entries.at(-1)![0];
}

export interface TownEmploymentSummary {
  readonly workingAge: number;
  readonly employed: number;
  readonly byStatus: Readonly<Record<TownLaborStatus, number>>;
}

/** Everyone with a job whose latest status today is active. */
export function activeWorkers(world: World): ReadonlySet<EntityId> {
  const personOf = new Map(
    world.history.workRelationships.map((row) => [row.id, row.personId]),
  );
  // A relationship's latest status decides whether it is active now.
  const latest = new Map<EntityId, string>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= world.currentDate)
      latest.set(row.workRelationshipId, row.status);
  const working = new Set<EntityId>();
  for (const [relationshipId, status] of latest)
    if (status === "active") working.add(personOf.get(relationshipId)!);
  return working;
}

/**
 * Fill the town's jobs for every working-age resident written out who has no
 * job and whose place in the labor force has not been decided. Idempotent:
 * a resident is decided by a pure draw from the world seed and their id, and
 * a job written once is never written again. The player is never given one.
 */
export function ensureTownEmployment(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
): World {
  const working = new Set(
    world.history.workRelationships.map((row) => row.personId),
  );
  const open = townResidents(world, town).filter(
    (resident) =>
      resident.personId !== playerPersonId &&
      !working.has(resident.personId) &&
      laborStatus(world, resident) === "employed",
  );
  return fillTownJobs(world, town, open, { round: null });
}

/**
 * The outlets of one workplace a town can hire into today: each of its
 * first `outlets` that has not closed (written the first time somebody is
 * hired there), and each business of that kind opened later that is still
 * open. Outlet numbers are the last part of the employer's stable key.
 */
export function townEmployerOutlets(
  world: World,
  town: EntityId,
  workplace: Workplace,
): readonly number[] {
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:`;
  const closed = new Set<number>();
  const later: number[] = [];
  for (const organization of world.history.organizations) {
    if (!organization.stableKey.startsWith(stem)) continue;
    const outlet = Number(organization.stableKey.slice(stem.length));
    if (!Number.isInteger(outlet)) continue;
    if (organizationClosingAt(world, organization.id)) closed.add(outlet);
    else if (outlet >= workplace.outlets) later.push(outlet);
  }
  const outlets: number[] = [];
  for (let outlet = 0; outlet < workplace.outlets; outlet += 1)
    if (!closed.has(outlet)) outlets.push(outlet);
  return [...outlets, ...later.sort((a, b) => a - b)];
}

/**
 * Write one of the town's employers, outlet `outlet` of `workplace`, named
 * for the town or for the family that runs it. Writing one already written
 * changes nothing.
 */
export function writeTownEmployer(
  world: World,
  town: EntityId,
  workplace: Workplace,
  outlet: number,
  formedAt: IsoDate,
): World {
  const stableKey = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:${outlet}`;
  const id = createStableId("organization", `${world.id}:${stableKey}`);
  if (world.history.organizations.some((row) => row.id === id)) return world;
  const place = lifePlaceByJurisdictionId(town);
  const [townName = "Town", stateName = ""] = (place?.displayName ?? "")
    .split(",")
    .map((part) => part.trim());
  const countyUnit = place?.sourceGeoid
    ? countyGovernmentUnitsForPlace(place.sourceGeoid)[0]?.unit
    : undefined;
  const countyName = countyUnit ? countyDisplayName(countyUnit.name) : null;
  const rng = new SeededRng(world.seed).fork(stableKey);
  return createOrganization(world, {
    stableKey,
    formedAt,
    detailLevel: "lightweight",
    provenance: PROVENANCE,
    initialProfile: {
      name: workplace.name({
        town: townName,
        state: stateName,
        county: countyName ?? townName,
        family: drawCanonicalNameForGender(
          rng.fork("family"),
          "unstated",
          nameCorpusVersionForWorld(world, town),
        ).familyName,
      }),
      classification: workplace.classification,
      locationJurisdictionId: town,
    },
  });
}

/**
 * Hire these residents into the town's jobs: any civic role nobody holds
 * today first, then by the town's own mix. At the opening (`round` null) a
 * hire is backdated as if they had held the job for years; a later round
 * hires on the day it runs, keyed by the round so one person can be hired
 * again after leaving a job.
 */
export function fillTownJobs(
  world: World,
  town: EntityId,
  open: readonly Resident[],
  options: {
    readonly round: string | null;
    /**
     * Hire everyone into this one employer instead (a business just opened):
     * the first who is old enough runs it, the rest take its other roles.
     */
    readonly into?: {
      readonly workplace: string;
      readonly organizationId: EntityId;
    };
  },
): World {
  const place = lifePlaceByJurisdictionId(town);
  if (!place || open.length === 0) return world;
  const today = world.currentDate;
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}`;
  const round = options.round;
  const jobKey = (personId: EntityId) =>
    round === null
      ? `${prefix}:job:${personId}`
      : `${prefix}:job:${personId}:${round}`;
  const drawKey = (kind: string, personId: EntityId) =>
    round === null
      ? `${prefix}:${kind}:${personId}`
      : `${prefix}:${kind}:${personId}:${round}`;

  // The county government the town mostly lies in, when it has one.
  const countyUnit = place.sourceGeoid
    ? countyGovernmentUnitsForPlace(place.sourceGeoid)[0]?.unit
    : undefined;
  const countyName = countyUnit ? countyDisplayName(countyUnit.name) : null;
  const weights = [...townWorkplaceWeights(town)].filter(([, w]) => w > 0);
  let next = world;
  const organizations = new Map<string, EntityId>();
  const outletsOf = new Map<string, readonly number[]>();
  const existing = new Map<string, readonly EntityId[]>();
  const existingOf = (workplace: Workplace) => {
    if (!workplace.existing) return [];
    let found = existing.get(workplace.key);
    if (!found) {
      // A closed congregation or school hires nobody.
      found = townOrganizationsOf(next, town, workplace.existing).filter(
        (id) => !organizationClosingAt(next, id),
      );
      existing.set(workplace.key, found);
    }
    return found;
  };

  /**
   * The employer a hire at `workplace`, outlet `slot`, works for, or null
   * when every employer of that kind in town has closed. An outlet that
   * closed is never written again; a business opened later is another outlet.
   */
  const employer = (workplace: Workplace, slot: number): EntityId | null => {
    const already = existingOf(workplace);
    if (workplace.existing)
      return already.length > 0 ? already[slot % already.length]! : null;
    let outlets = outletsOf.get(workplace.key);
    if (!outlets) {
      outlets = townEmployerOutlets(next, town, workplace);
      outletsOf.set(workplace.key, outlets);
    }
    if (outlets.length === 0) return null;
    const outlet = outlets[slot % outlets.length]!;
    const stableKey = `${prefix}:employer:${workplace.key}:${outlet}`;
    const cached = organizations.get(stableKey);
    if (cached) return cached;
    next = writeTownEmployer(next, town, workplace, outlet, today);
    const id = createStableId("organization", `${next.id}:${stableKey}`);
    organizations.set(stableKey, id);
    return id;
  };

  const jobs: CreateWorkRelationshipInput[] = [];
  const hire = (
    resident: Resident,
    workplace: Workplace,
    chosen: Role,
    at?: EntityId,
    civic = false,
  ) => {
    const rng = new SeededRng(next.seed).fork(
      drawKey("hire", resident.personId),
    );
    const organizationId =
      at ?? employer(workplace, rng.fork("outlet").integer(0, 1_000));
    if (!organizationId) return false;
    const person = next.people[resident.personId]!;
    const adultSince = yearsBefore(person.birthDate, -WORKING_AGE_MIN);
    const tenure =
      round === null
        ? rng
            .fork("tenure")
            .integer(0, Math.min(20, resident.age - WORKING_AGE_MIN) + 1)
        : 0;
    const hired = yearsBefore(today, tenure);
    // Some jobs are part-time; a civic role and a job that directs others
    // never are.
    const partTime =
      !civic &&
      chosen.authority !== "directs-others" &&
      rng.fork("part-time").next() <
        (TOWN_PART_TIME_SHARE[workplace.key] ?? TOWN_PART_TIME_DEFAULT);
    const [minimumHours, maximumHours] =
      chosen.hours ?? (partTime ? PART_TIME_HOURS : FULL_TIME_HOURS);
    jobs.push({
      stableKey: jobKey(resident.personId),
      personId: resident.personId,
      organizationId,
      startedAt: hired < adultSince ? adultSince : hired,
      kind: workplace.kind,
      compensation: "paid",
      authority: chosen.authority ?? "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: PROVENANCE,
      initialRole: {
        title: chosen.title,
        occupationClassification: chosen.occupation,
        locationJurisdictionId: town,
        timeDemand: {
          expectedWeekly: { minimumHours, maximumHours },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: chosen.rigidity ?? "rigid",
          interruptibility: "limited",
          locationJurisdictionId: town,
        },
      },
    });
    return true;
  };

  if (options.into) {
    const workplace = WORKPLACE.get(options.into.workplace);
    if (!workplace) return next;
    let lead = workplace.roles.find(
      (entry) => entry.authority === "directs-others",
    );
    for (const resident of open) {
      const fits = workplace.roles.filter(
        (entry) => resident.age >= (entry.minAge ?? WORKING_AGE_MIN),
      );
      const chosen =
        lead && fits.includes(lead)
          ? lead
          : pickWeighted(
              new SeededRng(next.seed).fork(drawKey("role", resident.personId)),
              fits
                .filter((entry) => entry.authority !== "directs-others")
                .map((entry) => [entry, entry.weight] as const),
            );
      if (!chosen) continue;
      if (chosen === lead) lead = undefined;
      hire(resident, workplace, chosen, options.into.organizationId);
    }
    return jobs.length === 0 ? next : createWorkRelationships(next, jobs);
  }

  // Civic roles nobody in town holds today come first, so a town always has
  // its clerk, its pastors and its principals.
  const pool = [...open].sort(
    (a, b) => b.age - a.age || a.personId.localeCompare(b.personId),
  );
  const take = (minAge: number) => {
    // From the middle of the pool: civic roles are not all held by the oldest.
    const fits = pool.filter((resident) => resident.age >= minAge);
    if (fits.length === 0) return null;
    const pick = fits[Math.floor(fits.length / 2)]!;
    pool.splice(pool.indexOf(pick), 1);
    return pick;
  };
  const held = heldTownRoles(next, prefix);
  for (const [key, title] of CIVIC_MINIMUM) {
    if (key === "county-clerk" && !countyName) continue;
    const workplace = WORKPLACE.get(key)!;
    const chosen = workplace.roles.find((entry) => entry.title === title)!;
    const organizationIds = existingOf(workplace);
    // One per existing organization (each school its principal), else one.
    for (let n = 0; n < Math.max(1, organizationIds.length); n += 1) {
      const at = organizationIds[n] ?? null;
      const heldKey = `${title}|${at ?? key}`;
      if ((held.get(heldKey) ?? 0) > 0) {
        held.set(heldKey, held.get(heldKey)! - 1);
        continue;
      }
      const resident = take(chosen.minAge ?? WORKING_AGE_MIN);
      if (!resident) break;
      if (hire(resident, workplace, chosen, at ?? undefined, true)) continue;
      // Every employer of that kind in town has closed: the resident goes
      // back to the pool and draws from the town's mix instead.
      pool.push(resident);
      pool.sort(
        (a, b) => b.age - a.age || a.personId.localeCompare(b.personId),
      );
      break;
    }
  }

  // Everyone else by the town's own mix.
  // A workplace whose every employer in town has closed hires nobody, and
  // the resident draws again.
  for (const resident of pool) {
    const rng = new SeededRng(next.seed).fork(
      drawKey("workplace", resident.personId),
    );
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const draw = attempt === 0 ? rng : rng.fork(`again:${attempt}`);
      const key = pickWeighted(draw.fork("workplace"), weights);
      const workplace = key ? WORKPLACE.get(key) : undefined;
      if (!workplace) break;
      const chosen = pickWeighted(
        draw.fork("role"),
        workplace.roles
          .filter((entry) => resident.age >= (entry.minAge ?? WORKING_AGE_MIN))
          .map((entry) => [entry, entry.weight] as const),
      );
      if (!chosen || hire(resident, workplace, chosen)) break;
    }
  }
  return jobs.length === 0 ? next : createWorkRelationships(next, jobs);
}

/**
 * The town's civic roles held today, counted by title and by the existing
 * organization (a school, a congregation) or the workplace they are held at.
 */
function heldTownRoles(world: World, prefix: string): Map<string, number> {
  const workplaceOf = new Map<EntityId, string>();
  for (const organization of world.history.organizations) {
    const match = organization.stableKey.match(/:employer:([a-z-]+):\d+$/);
    if (match && organization.stableKey.startsWith(prefix))
      workplaceOf.set(organization.id, match[1]!);
  }
  const counts = new Map<string, number>();
  const active = new Set<EntityId>();
  const latest = new Map<EntityId, string>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= world.currentDate)
      latest.set(row.workRelationshipId, row.status);
  for (const [id, status] of latest) if (status === "active") active.add(id);
  const relationships = new Map(
    world.history.workRelationships.map((row) => [row.id, row]),
  );
  for (const role of world.history.workRoles) {
    if (
      !role.stableKey.startsWith(prefix) ||
      !active.has(role.workRelationshipId)
    )
      continue;
    const organizationId = relationships.get(
      role.workRelationshipId,
    )?.organizationId;
    if (!organizationId) continue;
    const key = `${role.title}|${workplaceOf.get(organizationId) ?? organizationId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** The town's working-age residents by labor status, for a report or test. */
export function describeTownEmployment(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null = null,
  /** People holding a public office, which is a job without a work record. */
  inOffice: ReadonlySet<EntityId> = new Set(),
): TownEmploymentSummary {
  const byStatus: Record<TownLaborStatus, number> = {
    employed: 0,
    student: 0,
    retired: 0,
    "parent-at-home": 0,
    "looking-for-work": 0,
  };
  const working = activeWorkers(world);
  let workingAge = 0;
  let employed = 0;
  for (const resident of townResidents(world, town)) {
    if (resident.personId === playerPersonId) continue;
    workingAge += 1;
    if (working.has(resident.personId) || inOffice.has(resident.personId)) {
      employed += 1;
      byStatus.employed += 1;
    } else {
      const status = laborStatus(world, resident);
      byStatus[status === "employed" ? "looking-for-work" : status] += 1;
    }
  }
  return { workingAge, employed, byStatus };
}
