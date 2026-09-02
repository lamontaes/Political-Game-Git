/**
 * Census Government Finance and Employment Code Lists & Historical Definition Compatibility Mappings
 *
 * Grounded in:
 * - Census Government Finance Classification Manual
 * - Census Public Employment and Payroll Classification Manual
 */

export interface CensusItemCodeDefinition {
  readonly itemCode: string;
  readonly category:
    | "tax"
    | "intergovernmental_revenue"
    | "current_charge"
    | "miscellaneous_revenue"
    | "utility_revenue"
    | "liquor_store_revenue"
    | "insurance_trust_revenue"
    | "current_operation_expenditure"
    | "capital_outlay_expenditure"
    | "assistance_and_subsidies"
    | "interest_on_debt"
    | "insurance_benefits_expenditure"
    | "intergovernmental_expenditure"
    | "debt_outstanding"
    | "debt_issued"
    | "debt_retired"
    | "cash_and_securities";
  readonly title: string;
  readonly description: string;
}

export interface CensusFunctionCodeDefinition {
  readonly functionCode: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly isEducation: boolean;
  readonly isPublicSafety: boolean;
  readonly isInfrastructure: boolean;
  readonly isUtility: boolean;
  readonly isAdministration: boolean;
  readonly historicalBreaks?: readonly {
    readonly effectiveYear: number;
    readonly description: string;
  }[];
}

/**
 * Official Census Employment Function Codes
 */
export const CENSUS_EMPLOYMENT_FUNCTION_CODES: readonly CensusFunctionCodeDefinition[] =
  [
    {
      functionCode: "000",
      title: "Total All Functions",
      category: "total",
      description: "Total of all government functions combined",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "012",
      title: "Elementary and Secondary Education - Instructional",
      category: "education",
      description:
        "Teachers and instructional aides in elementary and secondary education",
      isEducation: true,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
      historicalBreaks: [
        {
          effectiveYear: 1993,
          description:
            "Separated from total elementary & secondary education category",
        },
      ],
    },
    {
      functionCode: "014",
      title: "Elementary and Secondary Education - Other",
      category: "education",
      description:
        "Non-instructional staff: administrators, clerical, maintenance, transportation, food service",
      isEducation: true,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "018",
      title: "Higher Education - Instructional",
      category: "education",
      description:
        "Instructional faculty and academic personnel in public colleges and universities",
      isEducation: true,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "019",
      title: "Higher Education - Other",
      category: "education",
      description:
        "Non-instructional personnel in public colleges and universities",
      isEducation: true,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "021",
      title: "Other Education",
      category: "education",
      description:
        "Vocational-technical, special education, and state supervisory education staff",
      isEducation: true,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "022",
      title: "Public Libraries",
      category: "libraries",
      description: "Public libraries and library systems personnel",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "024",
      title: "Fire Protection",
      category: "public_safety",
      description:
        "Firefighters, fire prevention, emergency medical technicians, and fire administration",
      isEducation: false,
      isPublicSafety: true,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "025",
      title: "Police Protection - Sworn Officers",
      category: "public_safety",
      description:
        "Sworn police officers with arrest powers, patrol, investigation, and law enforcement command",
      isEducation: false,
      isPublicSafety: true,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
      historicalBreaks: [
        {
          effectiveYear: 1993,
          description:
            "Separated sworn police officers (025) from other police staff (026)",
        },
      ],
    },
    {
      functionCode: "026",
      title: "Police Protection - Other",
      category: "public_safety",
      description:
        "Non-sworn civilian police personnel: dispatchers, records, forensics, clerical, and support",
      isEducation: false,
      isPublicSafety: true,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "028",
      title: "Correction",
      category: "public_safety",
      description:
        "Correctional institutions, jails, detention facilities, probation, and parole",
      isEducation: false,
      isPublicSafety: true,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "030",
      title: "Air Transportation",
      category: "infrastructure",
      description:
        "Airport operation, aviation security, airfield maintenance, and airport administration",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "040",
      title: "Water Transportation and Terminals",
      category: "infrastructure",
      description:
        "Public ports, docks, harbors, canals, ferries, and water terminals",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "044",
      title: "Public Welfare",
      category: "social_services",
      description:
        "Public assistance administration, child and family services, Medicaid administration, food stamps",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "050",
      title: "Health",
      category: "health",
      description:
        "Public health clinics, disease control, immunizations, environmental health, vital statistics",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "052",
      title: "Hospitals",
      category: "health",
      description:
        "Public general and specialized hospitals, municipal medical centers",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "055",
      title: "Highways and Streets",
      category: "infrastructure",
      description:
        "Construction, maintenance, paving, traffic engineering, bridges, and toll facilities",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "059",
      title: "Transit",
      category: "utility",
      description:
        "Public bus, subway, light rail, commuter rail, and mass transportation systems",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: true,
      isAdministration: false,
    },
    {
      functionCode: "060",
      title: "Sewerage",
      category: "infrastructure",
      description:
        "Sanitary sewer collection, wastewater treatment plants, storm drainage maintenance",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "061",
      title: "Solid Waste Management",
      category: "infrastructure",
      description:
        "Garbage collection, recycling programs, landfills, incinerators, street sweeping",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "062",
      title: "Water Supply",
      category: "utility",
      description:
        "Public drinking water purification, distribution pipelines, meters, reservoirs",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: true,
      isAdministration: false,
    },
    {
      functionCode: "063",
      title: "Electric Power",
      category: "utility",
      description:
        "Municipal and state electric generation, transmission, and retail power distribution",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: true,
      isAdministration: false,
    },
    {
      functionCode: "064",
      title: "Gas Supply",
      category: "utility",
      description:
        "Public natural gas storage, pipeline transmission, and retail distribution systems",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: true,
      isUtility: true,
      isAdministration: false,
    },
    {
      functionCode: "080",
      title: "Parks and Recreation",
      category: "recreation",
      description:
        "Public parks, playgrounds, recreation centers, golf courses, pools, forestry",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "089",
      title: "Housing and Community Development",
      category: "community_development",
      description:
        "Public housing authorities, urban renewal, code enforcement, planning, zoning, economic development",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "090",
      title: "Natural Resources",
      category: "natural_resources",
      description:
        "Agriculture, soil conservation, fish and wildlife, environmental protection, state forests, mineral resources",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
    {
      functionCode: "091",
      title: "Central Administration",
      category: "administration",
      description:
        "Chief executive (Governor, Mayor, City Manager), city council / legislature, election administration",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: true,
    },
    {
      functionCode: "092",
      title: "Financial Administration",
      category: "administration",
      description:
        "Tax assessment, tax collection, auditing, treasury, budgeting, accounting, purchasing",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: true,
    },
    {
      functionCode: "093",
      title: "Judicial and Legal",
      category: "administration",
      description:
        "State and local courts, prosecutors, public defenders, legal counsel, court clerks",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: true,
    },
    {
      functionCode: "094",
      title: "General Public Buildings",
      category: "administration",
      description:
        "Operation, maintenance, and custodial care of multipurpose government buildings",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: true,
    },
    {
      functionCode: "100",
      title: "All Other Functions",
      category: "other",
      description:
        "Unclassified, multipurpose, or minor government activities not covered elsewhere",
      isEducation: false,
      isPublicSafety: false,
      isInfrastructure: false,
      isUtility: false,
      isAdministration: false,
    },
  ];

const BY_FUNCTION_CODE = new Map<string, CensusFunctionCodeDefinition>(
  CENSUS_EMPLOYMENT_FUNCTION_CODES.map((f) => [f.functionCode, f]),
);

export function getFunctionDefinition(
  code: string,
): CensusFunctionCodeDefinition | undefined {
  return BY_FUNCTION_CODE.get(code.padStart(3, "0"));
}

/**
 * Historical Break & Compatibility Rules
 */
export interface FunctionComparisonRule {
  readonly isCompatible: boolean;
  readonly breakInSeries: boolean;
  readonly notes?: string;
}

export function checkHistoricalCompatibility(
  functionCode: string,
  year1: number,
  year2: number,
): FunctionComparisonRule {
  const code = functionCode.padStart(3, "0");
  const earlierYear = Math.min(year1, year2);
  const laterYear = Math.max(year1, year2);

  // 1993 Police Sworn vs Other Split
  if (
    (code === "025" || code === "026") &&
    earlierYear < 1993 &&
    laterYear >= 1993
  ) {
    return {
      isCompatible: false,
      breakInSeries: true,
      notes:
        "Police officers (025) and police other (026) were split in 1993; earlier years reported combined police",
    };
  }

  // 1993 Education Instruction vs Non-instruction Split
  if (
    (code === "012" || code === "014") &&
    earlierYear < 1993 &&
    laterYear >= 1993
  ) {
    return {
      isCompatible: false,
      breakInSeries: true,
      notes:
        "Elementary/Secondary instruction (012) and other (014) were split in 1993",
    };
  }

  // 1997 Reference Month Transition: October -> March
  if (earlierYear < 1997 && laterYear >= 1997) {
    return {
      isCompatible: true,
      breakInSeries: true,
      notes:
        "Series crossed 1997 reference month change (October survey changed to March survey)",
    };
  }

  return {
    isCompatible: true,
    breakInSeries: false,
  };
}
