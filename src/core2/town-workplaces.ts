/**
 * The town's workplaces, the roles in each, and the tables that shape them:
 * tenure by age, the part-time share, and which workplace an employer was
 * written from. Moved from the old engine's town-employment so the opening
 * reads them without the old world type. The workplaces and shares are GAME
 * ASSUMPTIONS unless a table says MEASURED.
 */

import type {
  OccupationClassification,
  OrganizationClassification,
  ScheduleRigidity,
  WorkAuthority,
  WorkRelationshipKind,
} from "../simulation/types";

export interface Role {
  readonly title: string;
  readonly occupation: OccupationClassification;
  readonly weight: number;
  readonly authority?: WorkAuthority;
  readonly minAge?: number;
  readonly hours?: readonly [number, number];
  readonly rigidity?: ScheduleRigidity;
}

export interface Workplace {
  readonly key: string;
  readonly classification: OrganizationClassification;
  readonly kind: WorkRelationshipKind;
  /**
   * GAME ASSUMPTION: how many separate employers of this kind a town has.
   * For a workplace the county's establishment rates stand for it is only
   * the fallback; `workplaceOutlets` (town-employment.ts) reads the rest.
   */
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
    outlets: 1,
    roles: [role("Mechanic", "trade:automotive-mechanic", 3)],
  },
  {
    key: "personal-care",
    classification: "enterprise:personal-services",
    kind: "employment:personal-services",
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
    outlets: 1,
    roles: [role("Community organizer", "profession:community-organizer", 1)],
  },
  {
    key: "union",
    classification: "membership:labor-union",
    kind: "employment:labor-union",
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
    outlets: 1,
    roles: [
      role("Firefighter", "profession:firefighter", 1, { rigidity: "rigid" }),
    ],
  },
  {
    key: "public-works",
    classification: "sector:local-government-office",
    kind: "employment:public-service",
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
    outlets: 1,
    roles: [
      role("Mail carrier", "occupation:mail-carrier", 3),
      role("Postal clerk", "occupation:postal-clerk", 1),
    ],
  },
];

export const TOWN_WORKPLACE_BY_KEY = new Map(
  TOWN_WORKPLACES.map((place) => [place.key, place]),
);

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

/** The town workplace an employer was written from, and the role held. */
export function townWorkplaceFor(
  organizationStableKey: string,
  classification: string | null,
): Workplace | null {
  const employer = /:employer:([a-z-]+):\d+$/.exec(organizationStableKey);
  if (employer) return TOWN_WORKPLACE_BY_KEY.get(employer[1]!) ?? null;
  return (
    TOWN_WORKPLACES.find(
      (workplace) =>
        workplace.existing && workplace.existing === classification,
    ) ?? null
  );
}
