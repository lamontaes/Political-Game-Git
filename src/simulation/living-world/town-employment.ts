import {
  ensureLocalGovernmentOrganization,
  localGovernmentOrganizationKey,
  placeLocalGovernmentUnits,
} from "../nationwide-world/local-governments";
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
 *   outlets of each a town has are GAME ASSUMPTIONS, marked below, until a
 *   researched occupation-by-industry table replaces them. Labor matching
 *   reads active jobs, enrollment and primary care records; it does not draw
 *   unemployment or retirement from population shares.
 *
 * The rest of the town stays in the roster (`town-residents.ts`): a household
 * is given its jobs when it is written out, never before.
 */

import { jailTermOn } from "../justice/jail-terms";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { createOrganization, createWorkRelationships } from "../life";
import type { CreateWorkRelationshipInput } from "../life";
import {
  activeCareResponsibilitiesAt,
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  organizationClosingAt,
  organizationProfileAt,
} from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  countyGeoidsForPlace,
  countyGovernmentUnitsForPlace,
} from "../government-units";
import { drawCanonicalNameForGender } from "../people";
import { nameCorpusVersionForWorld } from "../place-name-corpus";
import { SeededRng } from "../rng";
import { decideTownStaffingFromBooks } from "./town-staffing-decision";
import { isSelectedDecision, recordDurableDecisionTrace } from "../decisions";
import { townBusinessHasRoomToHire } from "./town-business-books";
import type {
  EntityId,
  IsoDate,
  OccupationClassification,
  OrganizationClassification,
  ScheduleRigidity,
  WorkAuthority,
  WorkRelationshipKind,
  WorkRoleRecord,
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
  /** Its founder's family name, or a family of the town's. */
  readonly family: string;
  /** The county government's name, such as "Humphreys County". */
  readonly county: string;
  /** The street it stands on. */
  readonly street: string;
}

/**
 * GAME ASSUMPTION: streets a business may be named for, among the most
 * common street names in American towns. The game has no street map yet.
 */
const TOWN_STREETS = [
  "Main Street",
  "Oak Street",
  "Maple Avenue",
  "Pine Street",
  "Cedar Street",
  "Elm Street",
  "Park Avenue",
  "Washington Street",
  "Lake Street",
  "Hill Street",
  "Church Street",
  "Mill Street",
  "Depot Street",
  "Front Street",
  "Second Street",
  "Railroad Avenue",
] as const;

/**
 * Other names each kind of employer goes by, beside its own `name`: for
 * its founder or a family of the town, for its street or county, or a
 * plain trade name. One is chosen when the employer is written, so a town's
 * inn, bank and clinic do not all carry the town's name.
 */
const MORE_NAMES: Readonly<
  Record<string, readonly ((context: NameContext) => string)[]>
> = {
  farm: [
    ({ family }) => `${family} Farms`,
    ({ family }) => `${family} Brothers Farm`,
  ],
  quarry: [
    ({ county }) => `${county} Aggregates`,
    ({ family }) => `${family} Sand and Gravel`,
  ],
  utility: [
    ({ county }) => `${county} Rural Electric Cooperative`,
    ({ town }) => `${town} Municipal Utilities`,
  ],
  construction: [
    ({ family }) => `${family} Builders`,
    ({ county }) => `${county} Contracting`,
    ({ family }) => `${family} Roofing and Remodeling`,
  ],
  manufacturing: [
    ({ county }) => `${county} Machine Works`,
    ({ family }) => `${family} Tool and Die`,
    ({ family }) => `${family} Fabrication`,
  ],
  wholesale: [
    ({ county }) => `${county} Farm Supply`,
    ({ town }) => `${town} Feed and Grain`,
    ({ family }) => `${family} Distributing`,
  ],
  retail: [
    ({ family }) => `${family} Hardware`,
    ({ street }) => `${street} Market`,
    () => "Country Mercantile",
    ({ family }) => `${family}'s Grocery`,
  ],
  trucking: [
    ({ county }) => `${county} Freight`,
    ({ family }) => `${family} Transport`,
  ],
  information: [
    ({ county }) => `${county} Telephone Cooperative`,
    ({ county }) => `${county} Communications`,
  ],
  bank: [
    () => "Farmers and Merchants Bank",
    ({ town }) => `First State Bank of ${town}`,
    ({ county }) => `${county} Savings Bank`,
    () => "Citizens Bank",
    () => "Peoples Bank",
  ],
  insurance: [
    ({ street }) => `${street} Insurance`,
    ({ county }) => `${county} Insurance Services`,
  ],
  realty: [
    ({ family }) => `${family} Real Estate`,
    ({ county }) => `${county} Land and Homes`,
  ],
  professional: [
    ({ family }) => `${family} Law Office`,
    ({ family }) => `${family} Accounting`,
    ({ street }) => `${street} Tax Service`,
  ],
  "building-services": [
    ({ family }) => `${family} Cleaning`,
    () => "Hometown Janitorial",
  ],
  "private-school": [
    ({ county }) => `${county} Christian School`,
    ({ family }) => `${family} Academy`,
  ],
  hospital: [
    ({ county }) => `${county} Memorial Hospital`,
    ({ family }) => `${family} Memorial Hospital`,
  ],
  clinic: [
    ({ family }) => `${family} Family Medicine`,
    ({ street }) => `${street} Medical Clinic`,
    ({ county }) => `${county} Health Center`,
    () => "Family Care Clinic",
  ],
  "care-home": [
    ({ family }) => `${family} Manor`,
    ({ street }) => `${street} Care Center`,
    () => "Heritage Care Center",
  ],
  recreation: [
    ({ family }) => `${family}'s Bowling Lanes`,
    ({ street }) => `${street} Fitness`,
    () => "Hometown Fitness",
  ],
  restaurant: [
    ({ street }) => `${street} Diner`,
    ({ family }) => `${family}'s Cafe`,
    () => "Country Kitchen",
    ({ town }) => `${town} Family Restaurant`,
  ],
  inn: [
    ({ family }) => `The ${family} House`,
    ({ street }) => `${street} Inn`,
    ({ county }) => `${county} Motor Inn`,
    () => "Travelers Rest Motel",
  ],
  repair: [
    ({ street }) => `${street} Garage`,
    ({ town }) => `${town} Tire and Auto`,
  ],
  "personal-care": [
    ({ street }) => `${street} Barber Shop`,
    ({ family }) => `${family}'s Beauty Salon`,
  ],
};

/** The family name of each of the town's residents, in the world's order. */
function townFamilyNames(world: World, town: EntityId): readonly string[] {
  const names: string[] = [];
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (person?.homeJurisdictionId === town && person.familyName)
      names.push(person.familyName);
  }
  return names;
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
  /** A job in the recorded government itself, not a separately owned firm. */
  readonly governmentOffice?: "municipal" | "county";
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
    governmentOffice: "municipal",
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
    governmentOffice: "county",
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
 * MEASURED: median years with the current employer by age, wage and salary
 * workers, January 2026 (Bureau of Labor Statistics, Employee Tenure in
 * 2026, Table 1, released September 24, 2026). At the opening each worker
 * has held their job for the median of their age, never from before they
 * turned 18: the table's spread is not drawn.
 */
export const TOWN_MEDIAN_TENURE_BY_AGE: readonly (readonly [number, number])[] =
  [
    [20, 0.8],
    [25, 1.5],
    [35, 3.0],
    [45, 4.7],
    [55, 7.0],
    [65, 9.6],
    [Infinity, 9.9],
  ];

function medianTenureYears(age: number): number {
  return TOWN_MEDIAN_TENURE_BY_AGE.find(([below]) => age < below)![1];
}

/**
 * GAME ASSUMPTION: the share of each workplace's staff that works
 * part-time, under 35 hours a week. Food service, stores and recreation run
 * on part-time staff; offices, plants and public agencies mostly do not. An
 * employer hires part-time while its part-time staff are below this share,
 * and a resident whose life asks for fewer hours (a student, a parent of a
 * child under six, anyone 65 or older) works part-time wherever they work.
 * Nothing is drawn. The national share of about one worker in six is the
 * check.
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
/* Labor status from recorded circumstances                                   */
/* -------------------------------------------------------------------------- */

export type TownLaborStatus =
  "employed" | "student" | "retired" | "parent-at-home" | "looking-for-work";

export interface Resident {
  readonly personId: EntityId;
  readonly age: number;
  readonly enrolled: boolean;
  readonly parentOfYoungChild: boolean;
}

export function laborStatus(world: World, resident: Resident): TownLaborStatus {
  // A saved job takes precedence over enrollment or household composition.
  if (activeWorkRelationshipsAt(world, resident.personId).length > 0)
    return "employed";
  if (activeEducationEnrollmentsAt(world, resident.personId).length > 0)
    return "student";
  if (
    resident.parentOfYoungChild &&
    activeCareResponsibilitiesAt(world, resident.personId).some(
      ({ state }) => state.share === "primary",
    )
  )
    return "parent-at-home";
  // Here employed means eligible for the existing job-matching path, not a
  // claim that a job exists. The summary counts only actual active jobs and
  // reports an unmatched candidate as looking for work. Age alone is not a
  // retirement record, and a seed supplies no evidence of unemployment.
  return "employed";
}

/* -------------------------------------------------------------------------- */
/* Filling the town's jobs                                                    */
/* -------------------------------------------------------------------------- */

function yearsBefore(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) - years;
  const rest = date.slice(4);
  return makeIsoDate(`${year}${rest === "-02-29" ? "-02-28" : rest}`);
}

export function townOrganizationsOf(
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
 * recorded enrollment and care circumstances determine matching eligibility,
 * and a job written once is never written again. The player is never given one.
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
  /** The resident who opens it, whose family it may be named for. */
  founderPersonId: EntityId | null = null,
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
  // Named for its founder's family, or for the family of one of the town's
  // residents, so a family with more members in town is on more doors. A
  // town with no residents yet draws a family name for its place. No two of
  // the town's employers share a name.
  const founder = founderPersonId ? world.people[founderPersonId] : undefined;
  const residents = townFamilyNames(world, town);
  const taken = new Set(
    world.history.organizations
      .filter((row) =>
        row.stableKey.startsWith(
          `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`,
        ),
      )
      .map((row) => organizationProfileAt(world, row.id)?.name),
  );
  const styles = [workplace.name, ...(MORE_NAMES[workplace.key] ?? [])];
  const firstStyle = rng.fork("name-style").integer(0, styles.length);
  let name = "";
  for (let attempt = 0; attempt < styles.length * 4; attempt += 1) {
    const draw = rng.fork(`name:${attempt}`);
    const family =
      (attempt === 0 && founder?.familyName) ||
      (residents.length > 0
        ? residents[draw.fork("family").integer(0, residents.length)]!
        : drawCanonicalNameForGender(
            draw.fork("family"),
            "unstated",
            nameCorpusVersionForWorld(world, town),
          ).familyName);
    const context: NameContext = {
      town: townName,
      state: stateName,
      county: countyName ?? townName,
      family,
      street:
        TOWN_STREETS[draw.fork("street").integer(0, TOWN_STREETS.length)]!,
    };
    name = styles[(firstStyle + attempt) % styles.length]!(context);
    if (!taken.has(name)) break;
  }
  return createOrganization(world, {
    stableKey,
    formedAt,
    detailLevel: "lightweight",
    provenance: PROVENANCE,
    initialProfile: {
      name,
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
    /** Live book-backed hiring; opening/bootstrap callers retain their route. */
    readonly requireRecordedBooks?: boolean;
    /**
     * Hire everyone into this one employer instead (a business just opened):
     * the first who is old enough runs it, the rest take its other roles.
     */
    readonly into?: {
      readonly workplace: string;
      readonly organizationId: EntityId;
      /** Hire everyone into this one role (a funded position), when named. */
      readonly role?: string;
    };
  },
): World {
  const place = lifePlaceByJurisdictionId(town);
  // Nobody serving a jail term is hired: a job they held is on leave, so they
  // would otherwise count as out of work.
  open = open.filter((resident) => !jailTermOn(world, resident.personId));
  if (!place || open.length === 0) return world;
  const today = world.currentDate;
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}`;
  const round = options.round;
  const jobKey = (personId: EntityId) =>
    round === null
      ? `${prefix}:job:${personId}`
      : `${prefix}:job:${personId}:${round}`;

  // The county government the town mostly lies in, when it has one.
  const countyUnit = place.sourceGeoid
    ? countyGovernmentUnitsForPlace(place.sourceGeoid)[0]?.unit
    : undefined;
  const countyName = countyUnit ? countyDisplayName(countyUnit.name) : null;
  const weights = [...townWorkplaceWeights(town)].filter(([, w]) => w > 0);
  let next = world;
  const organizations = new Map<string, EntityId>();
  const outletsOf = new Map<string, readonly number[]>();
  // The town's jobs today, counting the hires made here: staff and
  // part-time staff at each employer, staff and roles by kind of workplace,
  // and the kinds of work each resident has done in town before.
  interface Census {
    readonly staff: Map<EntityId, number>;
    readonly partTime: Map<EntityId, number>;
    readonly byKind: Map<string, number>;
    readonly byRole: Map<string, number>;
    readonly pastKinds: Map<EntityId, Set<string>>;
    readonly kindOf: Map<EntityId, string>;
    total: number;
  }
  let census: Census | null = null;
  const counted = (): Census => {
    if (census) return census;
    const kindOf = new Map<EntityId, string>();
    for (const organization of next.history.organizations) {
      const match = /:employer:([a-z-]+):\d+$/.exec(organization.stableKey);
      if (match && organization.stableKey.startsWith(`${prefix}:`))
        kindOf.set(organization.id, match[1]!);
    }
    for (const workplace of TOWN_WORKPLACES)
      if (workplace.existing || workplace.governmentOffice)
        for (const id of existingOf(workplace))
          if (!kindOf.has(id)) kindOf.set(id, workplace.key);
    const orgOf = new Map<EntityId, EntityId>();
    const pastKinds = new Map<EntityId, Set<string>>();
    for (const row of next.history.workRelationships) {
      if (!row.stableKey.startsWith(`${prefix}:job:`) || !row.organizationId)
        continue;
      orgOf.set(row.id, row.organizationId);
      const kind = kindOf.get(row.organizationId);
      if (kind) {
        const kinds = pastKinds.get(row.personId) ?? new Set<string>();
        kinds.add(kind);
        pastKinds.set(row.personId, kinds);
      }
    }
    const latest = new Map<EntityId, string>();
    for (const row of next.history.workStatuses)
      if (orgOf.has(row.workRelationshipId) && row.effectiveAt <= today)
        latest.set(row.workRelationshipId, row.status);
    const roleOf = new Map<EntityId, WorkRoleRecord>();
    for (const row of next.history.workRoles)
      if (orgOf.has(row.workRelationshipId) && row.effectiveAt <= today)
        roleOf.set(row.workRelationshipId, row);
    census = {
      staff: new Map(),
      partTime: new Map(),
      byKind: new Map(),
      byRole: new Map(),
      pastKinds,
      kindOf,
      total: 0,
    };
    for (const [id, status] of latest) {
      if (status !== "active") continue;
      const role = roleOf.get(id);
      const hours = role?.timeDemand.expectedWeekly?.maximumHours;
      countHire(
        census,
        orgOf.get(id)!,
        role?.title ?? null,
        hours !== undefined && hours < FULL_TIME_HOURS[0],
      );
    }
    return census;
  };
  const countHire = (
    into: Census,
    organizationId: EntityId,
    title: string | null,
    partTime: boolean,
  ) => {
    into.staff.set(organizationId, (into.staff.get(organizationId) ?? 0) + 1);
    if (partTime)
      into.partTime.set(
        organizationId,
        (into.partTime.get(organizationId) ?? 0) + 1,
      );
    const kind = into.kindOf.get(organizationId);
    if (!kind) return;
    into.byKind.set(kind, (into.byKind.get(kind) ?? 0) + 1);
    if (title)
      into.byRole.set(
        `${kind}|${title}`,
        (into.byRole.get(`${kind}|${title}`) ?? 0) + 1,
      );
    into.total += 1;
  };
  const staffAt = (organizationId: EntityId): number =>
    counted().staff.get(organizationId) ?? 0;
  /**
   * The role a resident takes at a kind of workplace: of the roles they are
   * old enough for, the one furthest below its share of the kind's staff
   * in town, then by title. Nothing is drawn.
   */
  const roleFor = (
    workplace: Workplace,
    resident: Resident,
    roles: readonly Role[] = workplace.roles,
  ): Role | null => {
    const fits = roles.filter(
      (entry) => resident.age >= (entry.minAge ?? WORKING_AGE_MIN),
    );
    const total = fits.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) return null;
    const held = fits.reduce(
      (sum, entry) =>
        sum + (counted().byRole.get(`${workplace.key}|${entry.title}`) ?? 0),
      0,
    );
    const short = (entry: Role) =>
      (entry.weight / total) * (held + 1) -
      (counted().byRole.get(`${workplace.key}|${entry.title}`) ?? 0);
    return [...fits].sort(
      (a, b) => short(b) - short(a) || a.title.localeCompare(b.title),
    )[0]!;
  };
  const existing = new Map<string, readonly EntityId[]>();
  const existingOf = (workplace: Workplace) => {
    if (!workplace.existing && !workplace.governmentOffice) return [];
    let found = existing.get(workplace.key);
    if (!found) {
      // A closed congregation or school hires nobody.
      if (workplace.governmentOffice) {
        const governments = placeLocalGovernmentUnits(
          lifePlaceByJurisdictionId(town),
        );
        const units =
          workplace.governmentOffice === "county"
            ? governments.counties
            : governments.municipal.length > 0
              ? governments.municipal
              : governments.townships;
        // A place spanning governments does not silently assign a worker to
        // the first county or invent a municipality where none is recorded.
        if (units.length !== 1) return [];
        const unit = units[0]!;
        next = ensureLocalGovernmentOrganization(next, unit);
        const organization = next.history.organizations.find(
          (row) => row.stableKey === localGovernmentOrganizationKey(unit),
        );
        found =
          organization && !organizationClosingAt(next, organization.id)
            ? [organization.id]
            : [];
      } else {
        found = townOrganizationsOf(next, town, workplace.existing!).filter(
          (id) => !organizationClosingAt(next, id),
        );
      }
      existing.set(workplace.key, found);
    }
    return found;
  };

  /**
   * The employer a hire at `workplace`, outlet `slot`, works for, or null
   * when every employer of that kind in town has closed. An outlet that
   * closed is never written again; a business opened later is another outlet.
   */
  const employer = (workplace: Workplace): EntityId | null => {
    const already = existingOf(workplace);
    if (workplace.existing || workplace.governmentOffice)
      return already.length > 0
        ? [...already].sort(
            (a, b) => staffAt(a) - staffAt(b) || a.localeCompare(b),
          )[0]!
        : null;
    let outlets = outletsOf.get(workplace.key);
    if (!outlets) {
      outlets = townEmployerOutlets(next, town, workplace);
      outletsOf.set(workplace.key, outlets);
    }
    if (outlets.length === 0) return null;
    // Of the outlets whose books have room for one more, the one with the
    // fewest staff, then the lowest number; none has room, nobody is hired
    // there (`town-business-books.ts`).
    const books = next.townFinances?.businesses;
    let outlet: number | null = null;
    let fewest = Infinity;
    for (const candidate of outlets) {
      const key = `${prefix}:employer:${workplace.key}:${candidate}`;
      const id =
        organizations.get(key) ??
        createStableId("organization", `${next.id}:${key}`);
      if (staffAt(id) >= fewest) continue;
      const market = next.townFinances?.markets[`${town}:${workplace.key}`];
      const townAveragePay =
        market?.townPay !== undefined && market.townJobs > 0
          ? market.townPay / market.townJobs
          : 0;
      if (townBusinessHasRoomToHire(books?.[id], staffAt(id), townAveragePay)) {
        outlet = candidate;
        fewest = staffAt(id);
      }
    }
    if (outlet === null) return null;
    const stableKey = `${prefix}:employer:${workplace.key}:${outlet}`;
    const cached = organizations.get(stableKey);
    if (cached) return cached;
    next = writeTownEmployer(next, town, workplace, outlet, today);
    const id = createStableId("organization", `${next.id}:${stableKey}`);
    organizations.set(stableKey, id);
    return id;
  };

  const jobs: CreateWorkRelationshipInput[] = [];
  let openingDirectors: Set<EntityId> | null = null;
  const hire = (
    resident: Resident,
    workplace: Workplace,
    chosen: Role,
    at?: EntityId,
    civic = false,
  ) => {
    const organizationId = at ?? employer(workplace);
    if (!organizationId) return false;
    // Ordinary opening hires use the same eligible lead slot as a new
    // employer's explicit intake, after the actual outlet is known. A
    // town-wide role share cannot establish who directs each employer.
    if (round === null && !options.into && !civic) {
      const leads = workplace.roles.filter(
        (entry) => entry.authority === "directs-others",
      );
      if (leads.length > 0) {
        if (!openingDirectors) {
          const dead = new Set(
            next.history.personDeaths
              .filter((row) => row.diedAt <= today)
              .map((row) => row.personId),
          );
          openingDirectors = new Set([
            ...next.personOrder.flatMap((personId) =>
              dead.has(personId)
                ? []
                : activeWorkRelationshipsAt(next, personId).flatMap((job) =>
                    job.relationship.authority === "directs-others" &&
                    job.relationship.organizationId !== null
                      ? [job.relationship.organizationId]
                      : [],
                  ),
            ),
            ...jobs.flatMap((job) =>
              job.authority === "directs-others" && job.organizationId !== null
                ? [job.organizationId]
                : [],
            ),
          ]);
        }
        const lead = leads.find(
          (entry) => resident.age >= (entry.minAge ?? WORKING_AGE_MIN),
        );
        const selected =
          !openingDirectors.has(organizationId) && lead
            ? lead
            : roleFor(
                workplace,
                resident,
                workplace.roles.filter(
                  (entry) => entry.authority !== "directs-others",
                ),
              );
        if (!selected) return false;
        chosen = selected;
      }
    }
    const books = next.townFinances?.businesses[organizationId];
    if (options.requireRecordedBooks && !books) return false;
    if (round !== null && books) {
      const market = next.townFinances?.markets[`${town}:${books.kind}`];
      const averagePay =
        market?.townPay !== undefined && market.townJobs > 0
          ? market.townPay / market.townJobs
          : 0;
      const decision = decideTownStaffingFromBooks(
        next,
        organizationId,
        `${prefix}:review:${round}:hire:${organizationId}:${resident.personId}`,
        "hire",
        [{ key: `hire:${resident.personId}`, personId: resident.personId }],
        staffAt(organizationId),
        averagePay,
      );
      if (!decision) return false;
      next = recordDurableDecisionTrace(decision.world, decision.evaluation);
      if (
        !isSelectedDecision(decision.evaluation) ||
        decision.evaluation.selectedOptionKey !== `hire:${resident.personId}`
      )
        return false;
    }
    const person = next.people[resident.personId]!;
    const adultSince = yearsBefore(person.birthDate, -WORKING_AGE_MIN);
    const hired =
      round === null
        ? addDays(today, -Math.round(medianTenureYears(resident.age) * 365.25))
        : today;
    // A civic role and a job that directs others are never part-time.
    // Otherwise the hire works part-time when their own life asks for fewer
    // hours, or while the employer's part-time staff are below its share.
    const staff = staffAt(organizationId);
    const partTime =
      !civic &&
      chosen.authority !== "directs-others" &&
      (resident.enrolled ||
        resident.parentOfYoungChild ||
        resident.age >= 65 ||
        (counted().partTime.get(organizationId) ?? 0) <
          (TOWN_PART_TIME_SHARE[workplace.key] ?? TOWN_PART_TIME_DEFAULT) *
            (staff + 1) -
            0.5);
    counted().kindOf.set(organizationId, workplace.key);
    countHire(counted(), organizationId, chosen.title, partTime);
    if (chosen.authority === "directs-others")
      openingDirectors?.add(organizationId);
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
    const named = options.into.role
      ? workplace.roles.find((entry) => entry.title === options.into!.role)
      : undefined;
    if (named) {
      for (const resident of open)
        if (resident.age >= (named.minAge ?? WORKING_AGE_MIN))
          // A funded position is a full-time one.
          hire(resident, workplace, named, options.into.organizationId, true);
      return jobs.length === 0 ? next : createWorkRelationships(next, jobs);
    }
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
          : roleFor(
              workplace,
              resident,
              fits.filter((entry) => entry.authority !== "directs-others"),
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
  // A role a budget staffs (police officers, teachers) is filled by the
  // budget alone (`public-budgets/staffing.ts`), never by the town's mix.
  const budgetStaffed = new Set(
    (world.publicBudgets?.staffing ?? [])
      .filter((row) => row.town === town)
      .map((row) => `${row.workplace}|${row.role}`),
  );
  const held = heldTownRoles(next, prefix);
  for (const [key, title] of CIVIC_MINIMUM) {
    if (key === "county-clerk" && !countyName) continue;
    if (budgetStaffed.has(`${key}|${title}`)) continue;
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
      // Every employer of that kind in town has closed, or none has room:
      // the resident goes back to the pool and draws from the town's mix
      // instead.
      pool.push(resident);
      pool.sort(
        (a, b) => b.age - a.age || a.personId.localeCompare(b.personId),
      );
      break;
    }
  }

  // Everyone else by the town's own mix, nothing drawn. Each resident, the
  // oldest first, tries the kinds of work they have done in town before,
  // then the kinds furthest below their share of the town's jobs. A kind at
  // or above its share takes nobody more, and a business whose books have
  // no room hires nobody: a resident no kind takes stays out of work.
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);
  for (const resident of pool) {
    const census = counted();
    const short = (key: string, weight: number) =>
      (weight / totalWeight) * (census.total + 1) -
      (census.byKind.get(key) ?? 0);
    const past = census.pastKinds.get(resident.personId);
    const order = weights
      .map(([key, weight]) => [key, short(key, weight)] as const)
      .filter(([, gap]) => gap > 0)
      .sort(
        (a, b) =>
          Number(past?.has(b[0]) ?? false) - Number(past?.has(a[0]) ?? false) ||
          b[1] - a[1] ||
          a[0].localeCompare(b[0]),
      );
    for (const [key] of order) {
      const workplace = WORKPLACE.get(key);
      if (!workplace) continue;
      // A role a budget staffs is never offered here. A congregation or
      // school has one pastor or principal, hired above for each one in
      // town; the mix never adds a second.
      const chosen = roleFor(
        workplace,
        resident,
        workplace.roles.filter(
          (entry) =>
            !budgetStaffed.has(`${workplace.key}|${entry.title}`) &&
            !(workplace.existing && entry.authority === "directs-others"),
        ),
      );
      if (chosen && hire(resident, workplace, chosen)) break;
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
