/** Retained town business selection/peer entry-gap and local catalog/ordinal selection closures. Separately owned life closing/profile receipts are dated at the public boundary. */
import type {
  World,
  EntityId,
  OrganizationClassification,
  OccupationClassification,
  Organization,
  WorkStatusRecord,
  WorkRelationshipKind,
  WorkAuthority,
  ScheduleRigidity,
} from "../../simulation/types";
import type {
  organizationClosingAt as nativeClosing,
  organizationProfileAt as nativeProfile,
} from "../../simulation/life-queries";
import { TOWN_EMPLOYMENT_VERSION } from "./labor-readings";
export interface BusinessReadingFacts {
  readonly currentDate: World["currentDate"];
  readonly people: World["people"];
  readonly records: Pick<
    World["history"],
    "organizations" | "personDeaths" | "workStatuses" | "workRelationships"
  >;
  readonly closings: ReadonlyMap<EntityId, ReturnType<typeof nativeClosing>>;
  readonly profiles: ReadonlyMap<EntityId, ReturnType<typeof nativeProfile>>;
}
function organizationClosingAt(facts: BusinessReadingFacts, id: EntityId) {
  if (!facts.closings.has(id))
    throw Error("Missing life closing receipt: " + id);
  return facts.closings.get(id) ?? null;
}
function organizationProfileAt(facts: BusinessReadingFacts, id: EntityId) {
  if (!facts.profiles.has(id))
    throw Error("Missing life profile receipt: " + id);
  return facts.profiles.get(id) ?? null;
}
// STOPGAP: economy.business-readings-history-peer-frontier
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
export const TOWN_BUSINESS_WORKPLACES: ReadonlySet<string> = new Set([
  "farm",
  "quarry",
  "construction",
  "manufacturing",
  "wholesale",
  "retail",
  "trucking",
  "information",
  "insurance",
  "realty",
  "professional",
  "building-services",
  "private-school",
  "clinic",
  "care-home",
  "recreation",
  "restaurant",
  "inn",
  "repair",
  "personal-care",
]);
export interface TownBusiness {
  readonly organizationId: EntityId;
  readonly workplace: Workplace;
  readonly outlet: number;
  readonly name: string;
  readonly jobs: readonly {
    readonly relationshipId: EntityId;
    readonly personId: EntityId;
    readonly status: WorkStatusRecord;
    readonly directsOthers: boolean;
  }[];
}
const WORKPLACE_BY_KEY = new Map(
  TOWN_WORKPLACES.map((workplace) => [workplace.key, workplace]),
);
export function townBusinesses(
  facts: BusinessReadingFacts,
  town: EntityId,
): readonly TownBusiness[] {
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`;
  const found = new Map<
    EntityId,
    {
      workplace: Workplace;
      outlet: number;
      stableKey: string;
    }
  >();
  for (const organization of facts.records.organizations) {
    if (!organization.stableKey.startsWith(stem)) continue;
    const [key, outlet] = organization.stableKey.slice(stem.length).split(":");
    const workplace = key ? WORKPLACE_BY_KEY.get(key) : undefined;
    if (!workplace || !TOWN_BUSINESS_WORKPLACES.has(workplace.key)) continue;
    if (organizationClosingAt(facts, organization.id)) continue;
    found.set(organization.id, {
      workplace,
      outlet: Number(outlet),
      stableKey: organization.stableKey,
    });
  }
  if (found.size === 0) return [];
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of facts.records.workStatuses)
    if (status.effectiveAt <= facts.currentDate)
      latest.set(status.workRelationshipId, status);
  const jobs = new Map<EntityId, TownBusiness["jobs"][number][]>();
  for (const relationship of facts.records.workRelationships) {
    if (!relationship.organizationId || !found.has(relationship.organizationId))
      continue;
    const status = latest.get(relationship.id);
    if (status?.status !== "active") continue;
    const list = jobs.get(relationship.organizationId) ?? [];
    list.push({
      relationshipId: relationship.id,
      personId: relationship.personId,
      status,
      directsOthers: relationship.authority === "directs-others",
    });
    jobs.set(relationship.organizationId, list);
  }
  return [...found]
    .sort(([, a], [, b]) => a.stableKey.localeCompare(b.stableKey))
    .map(([organizationId, entry]) => ({
      organizationId,
      workplace: entry.workplace,
      outlet: entry.outlet,
      name: organizationProfileAt(facts, organizationId)?.name ?? "",
      jobs: jobs.get(organizationId) ?? [],
    }));
}
export function townBusinessEntryGaps(
  facts: BusinessReadingFacts,
  town: EntityId,
): Map<string, number> {
  const deaths = new Set(
    facts.records.personDeaths
      .filter((row) => row.diedAt <= facts.currentDate)
      .map((row) => row.personId),
  );
  const residents = new Map<EntityId, number>();
  for (const person of Object.values(facts.people)) {
    if (person.birthDate > facts.currentDate || deaths.has(person.id)) continue;
    residents.set(
      person.homeJurisdictionId,
      (residents.get(person.homeJurisdictionId) ?? 0) + 1,
    );
  }
  const counts = new Map<EntityId, Map<string, number>>();
  for (const place of residents.keys()) {
    const kinds = new Map<string, number>();
    for (const business of townBusinesses(facts, place)) {
      const organization = facts.records.organizations.find(
        (row) => row.id === business.organizationId,
      );
      if (!organization || organization.formedAt > facts.currentDate) continue;
      kinds.set(
        business.workplace.key,
        (kinds.get(business.workplace.key) ?? 0) + 1,
      );
    }
    counts.set(place, kinds);
  }
  const peers = new Map<string, number[]>();
  for (const [place, kinds] of counts) {
    if (place === town) continue;
    for (const [kind, businesses] of kinds) {
      const values = peers.get(kind) ?? [];
      values.push(residents.get(place)! / businesses);
      peers.set(kind, values);
    }
  }
  const gaps = new Map<string, number>();
  for (const [kind, ratios] of peers) {
    const mean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    gaps.set(
      kind,
      (residents.get(town) ?? 0) / mean - (counts.get(town)?.get(kind) ?? 0),
    );
  }
  return gaps;
}
export interface LocalBusinessKind {
  readonly key: string;
  readonly name: (familyName: string) => string;
  readonly classification: OrganizationClassification;
  readonly ownerTitle: string;
  readonly workerTitle: string;
  readonly workerOccupation: OccupationClassification;
  readonly workers: number;
}
export const LOCAL_BUSINESS_KINDS: readonly LocalBusinessKind[] = [
  {
    key: "grocery",
    name: (family) => `${family}'s Market`,
    classification: "enterprise:retail",
    ownerTitle: "Owner",
    workerTitle: "Cashier",
    workerOccupation: "occupation:cashier",
    workers: 3,
  },
  {
    key: "hardware",
    name: (family) => `${family} Hardware`,
    classification: "enterprise:retail",
    ownerTitle: "Owner",
    workerTitle: "Sales clerk",
    workerOccupation: "occupation:retail-sales",
    workers: 2,
  },
  {
    key: "diner",
    name: (family) => `${family}'s Diner`,
    classification: "enterprise:food-service",
    ownerTitle: "Owner",
    workerTitle: "Server",
    workerOccupation: "service:food-server",
    workers: 3,
  },
  {
    key: "auto-repair",
    name: (family) => `${family} Auto Repair`,
    classification: "enterprise:repair",
    ownerTitle: "Owner and mechanic",
    workerTitle: "Mechanic",
    workerOccupation: "trade:automotive-mechanic",
    workers: 2,
  },
  {
    key: "law-office",
    name: (family) => `${family} Law Office`,
    classification: "enterprise:legal-services",
    ownerTitle: "Attorney",
    workerTitle: "Legal assistant",
    workerOccupation: "profession:legal-assistant",
    workers: 1,
  },
  {
    key: "accounting",
    name: (family) => `${family} Accounting`,
    classification: "enterprise:professional-services",
    ownerTitle: "Accountant",
    workerTitle: "Bookkeeper",
    workerOccupation: "profession:bookkeeper",
    workers: 1,
  },
  {
    key: "construction",
    name: (family) => `${family} Construction`,
    classification: "enterprise:construction",
    ownerTitle: "Owner and contractor",
    workerTitle: "Carpenter",
    workerOccupation: "trade:carpenter",
    workers: 4,
  },
  {
    key: "salon",
    name: (family) => `${family}'s Hair Salon`,
    classification: "enterprise:personal-services",
    ownerTitle: "Owner and stylist",
    workerTitle: "Stylist",
    workerOccupation: "service:hairstylist",
    workers: 2,
  },
];
export function localBusinessesIn(
  facts: BusinessReadingFacts,
  jurisdictionId: EntityId,
): readonly {
  organization: Organization;
  kind: LocalBusinessKind;
}[] {
  const prefix = `local-business:${jurisdictionId}:`;
  const found: {
    organization: Organization;
    kind: LocalBusinessKind;
    order: number;
    index: number;
  }[] = [];
  for (const record of facts.records.organizations) {
    if (!record.stableKey.startsWith(prefix)) continue;
    const [kindKey, ordinal, ...extra] = record.stableKey
      .slice(prefix.length)
      .split(":");
    const order = LOCAL_BUSINESS_KINDS.findIndex(
      (kind) => kind.key === kindKey,
    );
    if (order < 0 || extra.length > 0) continue;
    found.push({
      organization: record,
      kind: LOCAL_BUSINESS_KINDS[order]!,
      order,
      index: ordinal === undefined ? 0 : Number(ordinal) - 1,
    });
  }
  return found
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ organization, kind }) => ({ organization, kind }));
}
