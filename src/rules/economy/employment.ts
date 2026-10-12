/** Complete retained civic, workplace, role, tenure, part-time, capacity and employer-name selection with typed common writer requests. */
import { addDays, makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import {
  COUNTY_SECTOR_EMPLOYMENT,
  STATE_PUBLIC_EMPLOYMENT,
  TOWN_EMPLOYMENT_META,
} from "../../simulation/living-world/town-employment.generated";
import {
  localGovernmentOrganizationKey,
  placeLocalGovernmentUnits,
} from "../../simulation/nationwide-world/local-governments";
import type { ensureLocalGovernmentOrganization } from "../../simulation/nationwide-world/local-governments";
import { localInstitutionProvenance } from "../../simulation/local-institutions";
import type { localInstitutionsFor as nativeInstitutions } from "../../simulation/local-institutions";
import { townBusinessHasRoomToHire as bookHasRoom } from "./business-books";
import { IRS_TOWN_BUSINESS_BOOKS } from "../../simulation/living-world/town-business-books.generated";
function townBusinessHasRoomToHire(
  ...args: Parameters<typeof bookHasRoom> extends [unknown, ...infer R]
    ? R
    : never
) {
  return bookHasRoom({ rows: IRS_TOWN_BUSINESS_BOOKS }, ...args);
}
import type * as life from "../../simulation/life-queries";
import type {
  createOrganization,
  createWorkRelationships,
  CreateWorkRelationshipInput,
} from "../../simulation/life";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type {
  countyGeoidsForPlace as nativeCounty,
  countyGovernmentUnitsForPlace as nativeGovernment,
} from "../../simulation/government-units";
import type { jailTermOn as nativeJail } from "../../simulation/justice/jail-terms";
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
} from "../../simulation/types";
export interface EmploymentFacts {
  readonly id: EntityId;
  readonly currentDate: IsoDate;
  readonly records: World["history"];
  readonly people: World["people"];
  readonly personOrder: World["personOrder"];
  readonly townFinances: World["townFinances"];
  readonly publicBudgets: World["publicBudgets"];
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly counties: ReadonlyMap<string, ReturnType<typeof nativeCounty>>;
  readonly countyGovernments: ReadonlyMap<
    string,
    ReturnType<typeof nativeGovernment>
  >;
  readonly institutions: ReadonlyMap<
    EntityId,
    ReturnType<typeof nativeInstitutions>
  >;
  readonly profiles: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.organizationProfileAt>
  >;
  readonly closings: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.organizationClosingAt>
  >;
  readonly jail: ReadonlyMap<EntityId, ReturnType<typeof nativeJail>>;
  readonly positions: ReadonlyMap<string, readonly number[]>;
  readonly families: ReadonlyMap<string, string>;
}
export type EmploymentRequest =
  | {
      readonly kind: "createOrganization";
      readonly input: Parameters<typeof createOrganization>[1];
    }
  | {
      // STOPGAP: economy.employment-duplicate-round-key
      readonly kind: "createWorkRelationships";
      readonly input: Parameters<typeof createWorkRelationships>[1];
    }
  | {
      readonly kind: "ensureLocalGovernmentOrganization";
      readonly input: Parameters<typeof ensureLocalGovernmentOrganization>[1];
    };
export const employmentSourceKey = (...keys: unknown[]) => JSON.stringify(keys);
function receipt<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key)) throw Error("Missing employment raw receipt: " + key);
  return map.get(key)!;
}
function lifePlaceByJurisdictionId(facts: EmploymentFacts, id: EntityId) {
  return receipt(facts.places, id);
}
function countyGeoidsForPlace(facts: EmploymentFacts, id: string) {
  return receipt(facts.counties, id);
}
function countyGovernmentUnitsForPlace(facts: EmploymentFacts, id: string) {
  return receipt(facts.countyGovernments, id);
}
function localInstitutionsFor(facts: EmploymentFacts, id: EntityId) {
  return receipt(facts.institutions, id);
}
function organizationProfileAt(facts: EmploymentFacts, id: EntityId) {
  return receipt(facts.profiles, id);
}
function organizationClosingAt(facts: EmploymentFacts, id: EntityId) {
  return receipt(facts.closings, id);
}
function jailTermOn(facts: EmploymentFacts, id: EntityId) {
  return receipt(facts.jail, id);
}
function position(facts: EmploymentFacts, key: string, fork: string) {
  return receipt(facts.positions, employmentSourceKey(key, fork));
}
function familyReceipt(facts: EmploymentFacts, key: string, attempt: number) {
  return {
    familyName: receipt(facts.families, employmentSourceKey(key, attempt)),
  };
}
// STOPGAP: economy.employment-native-name-positions
function retainedInteger(
  values: readonly number[],
  minInclusive: number,
  maxExclusive: number,
) {
  if (
    !Number.isSafeInteger(minInclusive) ||
    !Number.isSafeInteger(maxExclusive) ||
    maxExclusive <= minInclusive
  )
    throw Error(
      "RNG integer bounds must be safe integers with max greater than min.",
    );
  const range = maxExclusive - minInclusive,
    UINT32_RANGE = 0x1_0000_0000;
  if (range > UINT32_RANGE)
    throw Error("RNG integer range must not exceed 2^32 values.");
  const acceptanceLimit = Math.floor(UINT32_RANGE / range) * range;
  let index = 0,
    value = values[index++];
  while (value !== undefined && value >= acceptanceLimit)
    value = values[index++];
  if (value === undefined)
    throw Error("Missing accepted upstream name position");
  return minInclusive + (value % range);
}
export const TOWN_EMPLOYMENT_VERSION = "town-employment-v1";
const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: TOWN_EMPLOYMENT_VERSION,
};
const ESTIMATED_EMPLOYER_NAME_PROVENANCE = {
  kind: "generated" as const,
  generatorKey: `${TOWN_EMPLOYMENT_VERSION}:estimated-local-name`,
};
export const WORKING_AGE_MIN = 18;
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
export type TownEmploymentBasis = "county" | "state" | "national";
export interface TownEmploymentMix {
  readonly basis: TownEmploymentBasis;
  readonly sectors: ReadonlyMap<Sector, number>;
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
export function townEmploymentMix(
  sourceFacts: EmploymentFacts,
  town: EntityId,
): TownEmploymentMix {
  const place = lifePlaceByJurisdictionId(sourceFacts, town);
  const geoid = place?.sourceGeoid ?? null;
  const stateFips = geoid?.slice(0, 2) ?? null;
  const sectors = new Map<Sector, number>();
  let basis: TownEmploymentBasis = "national";
  const parts = geoid ? countyGeoidsForPlace(sourceFacts, geoid) : [];
  const found = parts.filter((county) => counties().has(county));
  if (found.length > 0) {
    basis = "county";
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
  const cityIsState = row[3] === null && row[2] !== null;
  const stateGov = cityIsState ? 0 : row[2];
  const local = cityIsState ? row[2] : row[3];
  const publicTotal = (federal ?? 0) + (stateGov ?? 0) + (local ?? 0);
  const scale =
    total && total > publicTotal ? privateTotal / (total - publicTotal) : 0;
  const localGroups = new Map<LocalGroup, number>();
  const groupCells = (cityIsState ? nationalPublicRow() : row).slice(4);
  const groupSum = groupCells.reduce<number>((a, b) => a + (b ?? 0), 0);
  TOWN_EMPLOYMENT_META.localGroups.forEach((group, n) => {
    const value = groupCells[n];
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
    if (cells.some((cell) => cell === null)) continue;
    cells.forEach((cell, n) => (sums[n] = (sums[n] ?? 0) + cell!));
  }
  return (nationalRow = sums);
}
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
  readonly county: string;
}
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
    ({ county }) => `${county} Electric and Water`,
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
    ({ county }) => `${county} Feed and Grain`,
    ({ family }) => `${family} Distributing`,
  ],
  retail: [
    ({ family }) => `${family} Hardware`,
    ({ county }) => `${county} Market`,
    ({ county }) => `${county} Mercantile`,
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
    ({ family }) => `${family} Bank`,
    ({ county }) => `${county} Savings Bank`,
    ({ family }) => `${family} Savings and Loan`,
  ],
  insurance: [
    ({ family }) => `${family} Insurance`,
    ({ county }) => `${county} Insurance Services`,
  ],
  realty: [
    ({ family }) => `${family} Real Estate`,
    ({ county }) => `${county} Land and Homes`,
  ],
  professional: [
    ({ family }) => `${family} Law Office`,
    ({ family }) => `${family} Accounting`,
    ({ county }) => `${county} Tax Service`,
  ],
  "building-services": [
    ({ family }) => `${family} Cleaning`,
    ({ county }) => `${county} Cleaning Services`,
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
    ({ county }) => `${county} Medical Clinic`,
    ({ county }) => `${county} Health Center`,
    ({ family }) => `${family} Family Care Clinic`,
  ],
  "care-home": [
    ({ family }) => `${family} Manor`,
    ({ county }) => `${county} Care Center`,
    ({ family }) => `${family} Residential Care`,
  ],
  recreation: [
    ({ family }) => `${family}'s Bowling Lanes`,
    ({ family }) => `${family} Fitness`,
    ({ county }) => `${county} Fitness Center`,
  ],
  restaurant: [
    ({ county }) => `${county} Diner`,
    ({ family }) => `${family}'s Cafe`,
    ({ county }) => `${county} Kitchen`,
  ],
  inn: [
    ({ family }) => `The ${family} House`,
    ({ county }) => `${county} Inn`,
    ({ county }) => `${county} Motor Inn`,
    ({ family }) => `${family} Motel`,
  ],
  repair: [
    ({ county }) => `${county} Garage`,
    ({ family }) => `${family} Tire and Auto`,
  ],
  "personal-care": [
    ({ county }) => `${county} Barber Shop`,
    ({ family }) => `${family}'s Beauty Salon`,
  ],
};
function townFamilyNames(
  facts: EmploymentFacts,
  town: EntityId,
): readonly string[] {
  const names: string[] = [];
  for (const personId of facts.personOrder) {
    const person = facts.people[personId];
    if (person?.homeJurisdictionId === town && person.familyName)
      names.push(person.familyName);
  }
  return names;
}
export interface Workplace {
  readonly key: string;
  readonly classification: OrganizationClassification;
  readonly kind: WorkRelationshipKind;
  readonly name: (context: NameContext) => string;
  readonly outlets: number;
  readonly roles: readonly Role[];
  readonly existing?: OrganizationClassification;
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
    name: ({ county }) => `${county} Electric and Water`,
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
    name: ({ county }) => `${county} Telephone Cooperative`,
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
    name: ({ family }) => `${family} Community Bank`,
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
    name: ({ county }) => `${county} Business Services`,
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
    name: ({ family }) => `${family} Academy`,
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
    name: ({ family }) => `${family} Medical Center`,
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
    name: ({ family }) => `${family} Family Clinic`,
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
    name: ({ family }) => `${family} Care Home`,
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
    name: ({ family }) => `${family} Fitness and Recreation`,
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
    name: ({ family }) => `${family} Inn`,
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
export function sourcedTownInstitution(
  facts: EmploymentFacts,
  town: EntityId,
  key: string,
) {
  const institutions = localInstitutionsFor(facts, town);
  if (key === "bank") return institutions.banks[0];
  if (key === "hospital")
    return institutions.hospitals.find((row) => row.kind === "hospital");
  if (key === "clinic")
    return institutions.hospitals.find((row) => row.kind === "clinic");
  return undefined;
}
const FULL_TIME_HOURS = [35, 45] as const;
const PART_TIME_HOURS = [16, 29] as const;
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
  ["public-works", "Maintenance worker"],
  ["party-office", "Party office manager"],
  ["campaign-staff", "Campaign field organizer"],
  ["campaign-staff", "Campaign field organizer"],
  ["campaign-staff", "Campaign manager"],
];
export function townWorkplaceWeights(
  sourceFacts: EmploymentFacts,
  town: EntityId,
): ReadonlyMap<string, number> {
  const mix = townEmploymentMix(sourceFacts, town);
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
export interface Resident {
  readonly personId: EntityId;
  readonly age: number;
  readonly enrolled: boolean;
  readonly parentOfYoungChild: boolean;
}
function yearsBefore(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) - years;
  const rest = date.slice(4);
  return makeIsoDate(`${year}${rest === "-02-29" ? "-02-28" : rest}`);
}
export function townOrganizationsOf(
  facts: EmploymentFacts,
  town: EntityId,
  classification: OrganizationClassification,
): readonly EntityId[] {
  return facts.records.organizations
    .filter((organization) => {
      const profile = organizationProfileAt(facts, organization.id);
      return (
        profile?.classification === classification &&
        profile.locationJurisdictionId === town
      );
    })
    .map((organization) => organization.id);
}
export function townEmployerOutlets(
  facts: EmploymentFacts,
  town: EntityId,
  workplace: Workplace,
): readonly number[] {
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:`;
  const closed = new Set<number>();
  const later: number[] = [];
  for (const organization of facts.records.organizations) {
    if (!organization.stableKey.startsWith(stem)) continue;
    const outlet = Number(organization.stableKey.slice(stem.length));
    if (!Number.isInteger(outlet)) continue;
    if (organizationClosingAt(facts, organization.id)) closed.add(outlet);
    else if (outlet >= workplace.outlets) later.push(outlet);
  }
  const outlets: number[] = [];
  for (let outlet = 0; outlet < workplace.outlets; outlet += 1)
    if (!closed.has(outlet)) outlets.push(outlet);
  return [...outlets, ...later.sort((a, b) => a - b)];
}
export function* writeTownEmployer(
  facts: EmploymentFacts,
  town: EntityId,
  workplace: Workplace,
  outlet: number,
  formedAt: IsoDate,
  founderPersonId: EntityId | null = null,
): Generator<EmploymentRequest, EmploymentFacts, EmploymentFacts> {
  const stableKey = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:${outlet}`;
  const id = createStableId("organization", `${facts.id}:${stableKey}`);
  if (facts.records.organizations.some((row) => row.id === id)) return facts;
  const place = lifePlaceByJurisdictionId(facts, town);
  const [townName = "Town", stateName = ""] = (place?.displayName ?? "")
    .split(",")
    .map((part) => part.trim());
  const countyUnit = place?.sourceGeoid
    ? countyGovernmentUnitsForPlace(facts, place.sourceGeoid)[0]?.unit
    : undefined;
  const countyName = countyUnit ? countyDisplayName(countyUnit.name) : null;
  const institutions = localInstitutionsFor(facts, town);
  const institution =
    sourcedTownInstitution(facts, town, workplace.key) ??
    (workplace.key === "public-school"
      ? institutions.largeEmployers.find(
          (row) => row.kind === "school-district",
        )
      : undefined);
  if (
    (workplace.key === "bank" ||
      workplace.key === "hospital" ||
      workplace.key === "clinic") &&
    !institution
  )
    return facts;
  const founder = founderPersonId ? facts.people[founderPersonId] : undefined;
  const residents = townFamilyNames(facts, town);
  const taken = new Set(
    facts.records.organizations
      .filter((row) =>
        row.stableKey.startsWith(
          `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`,
        ),
      )
      .map((row) => organizationProfileAt(facts, row.id)?.name),
  );
  const styles = [workplace.name, ...(MORE_NAMES[workplace.key] ?? [])];
  const firstStyle = retainedInteger(
    position(facts, stableKey, "name-style"),
    0,
    styles.length,
  );
  let name = "";
  for (let attempt = 0; attempt < styles.length * 4; attempt += 1) {
    const family =
      (attempt === 0 && founder?.familyName) ||
      (residents.length > 0
        ? residents[
            retainedInteger(
              position(facts, stableKey, `name:${attempt}:family`),
              0,
              residents.length,
            )
          ]!
        : (countyName ?? familyReceipt(facts, stableKey, attempt).familyName));
    const context: NameContext = {
      town: townName,
      state: stateName,
      county: countyName ?? family,
      family,
    };
    name =
      institution?.name ??
      styles[(firstStyle + attempt) % styles.length]!(context);
    if (!taken.has(name)) break;
  }
  return yield {
    kind: "createOrganization",
    input: {
      stableKey,
      formedAt,
      detailLevel: "lightweight",
      provenance: institution
        ? localInstitutionProvenance(institution, formedAt)
        : ESTIMATED_EMPLOYER_NAME_PROVENANCE,
      initialProfile: {
        name,
        classification: workplace.classification,
        locationJurisdictionId: town,
      },
    },
  };
}
// STOPGAP: economy.employment-census-selection
export function* fillTownJobs(
  facts: EmploymentFacts,
  town: EntityId,
  open: readonly Resident[],
  options: {
    readonly round: string | null;
    readonly into?: {
      readonly workplace: string;
      readonly organizationId: EntityId;
      readonly role?: string;
    };
  },
): Generator<EmploymentRequest, EmploymentFacts, EmploymentFacts> {
  const place = lifePlaceByJurisdictionId(facts, town);
  open = open.filter((resident) => !jailTermOn(facts, resident.personId));
  if (!place || open.length === 0) return facts;
  const today = facts.currentDate;
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}`;
  const round = options.round;
  const jobKey = (personId: EntityId) =>
    round === null
      ? `${prefix}:job:${personId}`
      : `${prefix}:job:${personId}:${round}`;
  const countyUnit = place.sourceGeoid
    ? countyGovernmentUnitsForPlace(facts, place.sourceGeoid)[0]?.unit
    : undefined;
  const countyName = countyUnit ? countyDisplayName(countyUnit.name) : null;
  const weights = [...townWorkplaceWeights(facts, town)].filter(
    ([, w]) => w > 0,
  );
  let next = facts;
  const organizations = new Map<string, EntityId>();
  const outletsOf = new Map<string, readonly number[]>();
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
  const counted = function* (): Generator<
    EmploymentRequest,
    Census,
    EmploymentFacts
  > {
    if (census) return census;
    const kindOf = new Map<EntityId, string>();
    for (const organization of next.records.organizations) {
      const match = /:employer:([a-z-]+):\d+$/.exec(organization.stableKey);
      if (match && organization.stableKey.startsWith(`${prefix}:`))
        kindOf.set(organization.id, match[1]!);
    }
    for (const workplace of TOWN_WORKPLACES)
      if (workplace.existing || workplace.governmentOffice)
        for (const id of yield* existingOf(workplace))
          if (!kindOf.has(id)) kindOf.set(id, workplace.key);
    const orgOf = new Map<EntityId, EntityId>();
    const pastKinds = new Map<EntityId, Set<string>>();
    for (const row of next.records.workRelationships) {
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
    for (const row of next.records.workStatuses)
      if (orgOf.has(row.workRelationshipId) && row.effectiveAt <= today)
        latest.set(row.workRelationshipId, row.status);
    const roleOf = new Map<EntityId, WorkRoleRecord>();
    for (const row of next.records.workRoles)
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
  const staffAt = function* (
    organizationId: EntityId,
  ): Generator<EmploymentRequest, number, EmploymentFacts> {
    return (yield* counted()).staff.get(organizationId) ?? 0;
  };
  const roleFor = function* (
    workplace: Workplace,
    resident: Resident,
    roles: readonly Role[] = workplace.roles,
  ): Generator<EmploymentRequest, Role | null, EmploymentFacts> {
    const fits = roles.filter(
      (entry) => resident.age >= (entry.minAge ?? WORKING_AGE_MIN),
    );
    const total = fits.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) return null;
    const roleCensus = yield* counted();
    const held = fits.reduce(
      (sum, entry) =>
        sum + (roleCensus.byRole.get(`${workplace.key}|${entry.title}`) ?? 0),
      0,
    );
    const short = (entry: Role) => {
      const balance =
        (entry.weight / total) * (held + 1) -
        (roleCensus.byRole.get(`${workplace.key}|${entry.title}`) ?? 0);
      return balance;
    };
    return [...fits].sort(
      (a, b) => short(b) - short(a) || a.title.localeCompare(b.title),
    )[0]!;
  };
  const existing = new Map<string, readonly EntityId[]>();
  const existingOf = function* (
    workplace: Workplace,
  ): Generator<EmploymentRequest, readonly EntityId[], EmploymentFacts> {
    if (!workplace.existing && !workplace.governmentOffice) return [];
    let found = existing.get(workplace.key);
    if (!found) {
      if (workplace.governmentOffice) {
        const governments = placeLocalGovernmentUnits(
          lifePlaceByJurisdictionId(facts, town),
        );
        const units =
          workplace.governmentOffice === "county"
            ? governments.counties
            : governments.municipal.length > 0
              ? governments.municipal
              : governments.townships;
        if (units.length !== 1) return [];
        const unit = units[0]!;
        next = yield {
          kind: "ensureLocalGovernmentOrganization",
          input: unit,
        };
        const organization = next.records.organizations.find(
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
  const employer = function* (
    workplace: Workplace,
  ): Generator<EmploymentRequest, EntityId | null, EmploymentFacts> {
    if (
      (workplace.key === "bank" ||
        workplace.key === "hospital" ||
        workplace.key === "clinic") &&
      !sourcedTownInstitution(next, town, workplace.key)
    )
      return null;
    const already = yield* existingOf(workplace);
    if (workplace.existing || workplace.governmentOffice) {
      if (already.length === 0) return null;
      if (already.length === 1) return already[0]!;
      const existingCensus = yield* counted();
      return [...already].sort(
        (a, b) =>
          (existingCensus.staff.get(a) ?? 0) -
            (existingCensus.staff.get(b) ?? 0) || a.localeCompare(b),
      )[0]!;
    }
    let outlets = outletsOf.get(workplace.key);
    if (!outlets) {
      outlets = townEmployerOutlets(next, town, workplace);
      outletsOf.set(workplace.key, outlets);
    }
    if (outlets.length === 0) return null;
    const books = next.townFinances?.businesses;
    let outlet: number | null = null;
    let fewest = Infinity;
    for (const candidate of outlets) {
      const key = `${prefix}:employer:${workplace.key}:${candidate}`;
      const id =
        organizations.get(key) ??
        createStableId("organization", `${next.id}:${key}`);
      if ((yield* staffAt(id)) >= fewest) continue;
      const market = next.townFinances?.markets[`${town}:${workplace.key}`];
      const townAveragePay =
        market?.townPay !== undefined && market.townJobs > 0
          ? market.townPay / market.townJobs
          : 0;
      if (
        townBusinessHasRoomToHire(
          books?.[id],
          yield* staffAt(id),
          townAveragePay,
        )
      ) {
        outlet = candidate;
        fewest = yield* staffAt(id);
      }
    }
    if (outlet === null) return null;
    const stableKey = `${prefix}:employer:${workplace.key}:${outlet}`;
    const cached = organizations.get(stableKey);
    if (cached) return cached;
    next = yield* writeTownEmployer(next, town, workplace, outlet, today);
    const id = createStableId("organization", `${next.id}:${stableKey}`);
    organizations.set(stableKey, id);
    return id;
  };
  const jobs: CreateWorkRelationshipInput[] = [];
  const hire = function* (
    resident: Resident,
    workplace: Workplace,
    chosen: Role,
    at?: EntityId,
    civic = false,
  ): Generator<EmploymentRequest, boolean, EmploymentFacts> {
    const organizationId = at ?? (yield* employer(workplace));
    if (!organizationId) return false;
    const person = next.people[resident.personId]!;
    const adultSince = yearsBefore(person.birthDate, -WORKING_AGE_MIN);
    const hired =
      round === null
        ? addDays(today, -Math.round(medianTenureYears(resident.age) * 365.25))
        : today;
    const staff = yield* staffAt(organizationId);
    const partTime =
      !civic &&
      chosen.authority !== "directs-others" &&
      (resident.enrolled ||
        resident.parentOfYoungChild ||
        resident.age >= 65 ||
        ((yield* counted()).partTime.get(organizationId) ?? 0) <
          (TOWN_PART_TIME_SHARE[workplace.key] ?? TOWN_PART_TIME_DEFAULT) *
            (staff + 1) -
            0.5);
    (yield* counted()).kindOf.set(organizationId, workplace.key);
    countHire(yield* counted(), organizationId, chosen.title, partTime);
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
          yield* hire(
            resident,
            workplace,
            named,
            options.into.organizationId,
            true,
          );
      return jobs.length === 0
        ? next
        : yield {
            kind: "createWorkRelationships",
            input: jobs,
          };
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
          : yield* roleFor(
              workplace,
              resident,
              fits.filter((entry) => entry.authority !== "directs-others"),
            );
      if (!chosen) continue;
      if (chosen === lead) lead = undefined;
      yield* hire(resident, workplace, chosen, options.into.organizationId);
    }
    return jobs.length === 0
      ? next
      : yield {
          kind: "createWorkRelationships",
          input: jobs,
        };
  }
  const pool = [...open].sort(
    (a, b) => b.age - a.age || a.personId.localeCompare(b.personId),
  );
  const take = (minAge: number) => {
    const fits = pool.filter((resident) => resident.age >= minAge);
    if (fits.length === 0) return null;
    const pick = fits[Math.floor(fits.length / 2)]!;
    pool.splice(pool.indexOf(pick), 1);
    return pick;
  };
  const budgetStaffed = new Set(
    (facts.publicBudgets?.staffing ?? [])
      .filter((row) => row.town === town)
      .map((row) => `${row.workplace}|${row.role}`),
  );
  const held = heldTownRoles(next, prefix);
  for (const [key, title] of CIVIC_MINIMUM) {
    if (key === "county-clerk" && !countyName) continue;
    if (budgetStaffed.has(`${key}|${title}`)) continue;
    const workplace = WORKPLACE.get(key)!;
    const chosen = workplace.roles.find((entry) => entry.title === title)!;
    const organizationIds = yield* existingOf(workplace);
    for (let n = 0; n < Math.max(1, organizationIds.length); n += 1) {
      const at = organizationIds[n] ?? null;
      const heldKey = `${title}|${at ?? key}`;
      if ((held.get(heldKey) ?? 0) > 0) {
        held.set(heldKey, held.get(heldKey)! - 1);
        continue;
      }
      const resident = take(chosen.minAge ?? WORKING_AGE_MIN);
      if (!resident) break;
      if (yield* hire(resident, workplace, chosen, at ?? undefined, true))
        continue;
      pool.push(resident);
      pool.sort(
        (a, b) => b.age - a.age || a.personId.localeCompare(b.personId),
      );
      break;
    }
  }
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);
  for (const resident of pool) {
    const census = yield* counted();
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
      const chosen = yield* roleFor(
        workplace,
        resident,
        workplace.roles.filter(
          (entry) =>
            !budgetStaffed.has(`${workplace.key}|${entry.title}`) &&
            !(workplace.existing && entry.authority === "directs-others"),
        ),
      );
      if (chosen && (yield* hire(resident, workplace, chosen))) break;
    }
  }
  return jobs.length === 0
    ? next
    : yield {
        kind: "createWorkRelationships",
        input: jobs,
      };
}
// STOPGAP: economy.employment-history-frontier
function heldTownRoles(
  facts: EmploymentFacts,
  prefix: string,
): Map<string, number> {
  const workplaceOf = new Map<EntityId, string>();
  for (const organization of facts.records.organizations) {
    const match = organization.stableKey.match(/:employer:([a-z-]+):\d+$/);
    if (match && organization.stableKey.startsWith(prefix))
      workplaceOf.set(organization.id, match[1]!);
  }
  const counts = new Map<string, number>();
  const active = new Set<EntityId>();
  const latest = new Map<EntityId, string>();
  for (const row of facts.records.workStatuses)
    if (row.effectiveAt <= facts.currentDate)
      latest.set(row.workRelationshipId, row.status);
  for (const [id, status] of latest) if (status === "active") active.add(id);
  const relationships = new Map(
    facts.records.workRelationships.map((row) => [row.id, row]),
  );
  for (const role of facts.records.workRoles) {
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
