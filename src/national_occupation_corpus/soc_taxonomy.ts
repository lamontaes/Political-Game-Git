import type {
  SocCode,
  SocMajorGroupCode,
  SocMinorGroupCode,
  SocBroadGroupCode,
  SocTaxonomyRecord,
} from "./types.js";

/**
 * Official 2018 Standard Occupational Classification (SOC) Major Groups (23 Total Groups)
 * Source: U.S. Bureau of Labor Statistics (BLS) / Office of Management and Budget (OMB)
 * URL: https://www.bls.gov/soc/2018/major_groups.htm
 */
export const SOC_MAJOR_GROUPS: Readonly<Record<string, string>> = {
  "11-0000": "Management Occupations",
  "13-0000": "Business and Financial Operations Occupations",
  "15-0000": "Computer and Mathematical Occupations",
  "17-0000": "Architecture and Engineering Occupations",
  "19-0000": "Life, Physical, and Social Science Occupations",
  "21-0000": "Community and Social Service Occupations",
  "23-0000": "Legal Occupations",
  "25-0000": "Educational Instruction and Library Occupations",
  "27-0000": "Arts, Design, Entertainment, Sports, and Media Occupations",
  "29-0000": "Healthcare Practitioners and Technical Occupations",
  "31-0000": "Healthcare Support Occupations",
  "33-0000": "Protective Service Occupations",
  "35-0000": "Food Preparation and Serving Related Occupations",
  "37-0000": "Building and Grounds Cleaning and Maintenance Occupations",
  "39-0000": "Personal Care and Service Occupations",
  "41-0000": "Sales and Related Occupations",
  "43-0000": "Office and Administrative Support Occupations",
  "45-0000": "Farming, Fishing, and Forestry Occupations",
  "47-0000": "Construction and Extraction Occupations",
  "49-0000": "Installation, Maintenance, and Repair Occupations",
  "51-0000": "Production Occupations",
  "53-0000": "Transportation and Material Moving Occupations",
  "55-0000": "Military Specific Occupations",
};

export function deriveSocMajorGroup(socCode: SocCode): SocMajorGroupCode {
  const prefix = socCode.substring(0, 2);
  return `${prefix}-0000`;
}

export function deriveSocMinorGroup(socCode: SocCode): SocMinorGroupCode {
  const major = socCode.substring(0, 2);
  const minorChar = socCode.substring(3, 4);
  return `${major}-${minorChar}000`;
}

export function deriveSocBroadGroup(socCode: SocCode): SocBroadGroupCode {
  const firstFive = socCode.substring(0, 6);
  return `${firstFive}0`;
}

export function deriveOccupationFamily(
  socMajorGroup: SocMajorGroupCode,
): string {
  const title = SOC_MAJOR_GROUPS[socMajorGroup];
  if (!title) return "Other Services";
  return title.replace(" Occupations", "").replace(" and ", " & ");
}

export const KNOWN_SOC_TAXONOMY: Readonly<Record<SocCode, SocTaxonomyRecord>> =
  {
    "11-1021": {
      socCode: "11-1021",
      socMajorGroup: "11-0000",
      socMinorGroup: "11-1000",
      socBroadGroup: "11-1020",
      title: "General and Operations Managers",
      description:
        "Plan, direct, or coordinate the operations of public or private sector organizations.",
      derivedOccupationFamily: deriveOccupationFamily("11-0000"),
      isOfficialSocRecord: true,
    },
    "13-2011": {
      socCode: "13-2011",
      socMajorGroup: "13-0000",
      socMinorGroup: "13-2000",
      socBroadGroup: "13-2010",
      title: "Accountants and Auditors",
      description:
        "Examine, analyze, and prepare financial records and statements for entities.",
      derivedOccupationFamily: deriveOccupationFamily("13-0000"),
      isOfficialSocRecord: true,
    },
    "15-1252": {
      socCode: "15-1252",
      socMajorGroup: "15-0000",
      socMinorGroup: "15-1200",
      socBroadGroup: "15-1250",
      title: "Software Developers",
      description:
        "Research, design, and develop computer software applications or systems.",
      derivedOccupationFamily: deriveOccupationFamily("15-0000"),
      isOfficialSocRecord: true,
    },
    "17-2051": {
      socCode: "17-2051",
      socMajorGroup: "17-0000",
      socMinorGroup: "17-2000",
      socBroadGroup: "17-2050",
      title: "Civil Engineers",
      description:
        "Perform engineering duties in planning, designing, and overseeing construction of infrastructure.",
      derivedOccupationFamily: deriveOccupationFamily("17-0000"),
      isOfficialSocRecord: true,
    },
    "23-1011": {
      socCode: "23-1011",
      socMajorGroup: "23-0000",
      socMinorGroup: "23-1000",
      socBroadGroup: "23-1010",
      title: "Lawyers",
      description:
        "Represent clients in criminal and civil legal proceedings, draw up legal documents, and manage legal business.",
      derivedOccupationFamily: deriveOccupationFamily("23-0000"),
      isOfficialSocRecord: true,
    },
    "25-2021": {
      socCode: "25-2021",
      socMajorGroup: "25-0000",
      socMinorGroup: "25-2000",
      socBroadGroup: "25-2020",
      title: "Elementary School Teachers, Except Special Education",
      description:
        "Teach academic and social skills to students in public or private elementary schools.",
      derivedOccupationFamily: deriveOccupationFamily("25-0000"),
      isOfficialSocRecord: true,
    },
    "27-2021": {
      socCode: "27-2021",
      socMajorGroup: "27-0000",
      socMinorGroup: "27-2000",
      socBroadGroup: "27-2020",
      title: "Athletes and Sports Competitors",
      description:
        "Participate in competitive athletic events to entertain audiences or compete professionally.",
      derivedOccupationFamily: deriveOccupationFamily("27-0000"),
      isOfficialSocRecord: true,
    },
    "29-1141": {
      socCode: "29-1141",
      socMajorGroup: "29-0000",
      socMinorGroup: "29-1100",
      socBroadGroup: "29-1140",
      title: "Registered Nurses",
      description:
        "Assess patient health problems and needs, develop and implement nursing care plans.",
      derivedOccupationFamily: deriveOccupationFamily("29-0000"),
      isOfficialSocRecord: true,
    },
    "33-3051": {
      socCode: "33-3051",
      socMajorGroup: "33-0000",
      socMinorGroup: "33-3000",
      socBroadGroup: "33-3050",
      title: "Police and Sheriff's Patrol Officers",
      description:
        "Maintain order and law enforcement within assigned jurisdictions.",
      derivedOccupationFamily: deriveOccupationFamily("33-0000"),
      isOfficialSocRecord: true,
    },
    "41-2031": {
      socCode: "41-2031",
      socMajorGroup: "41-0000",
      socMinorGroup: "41-2000",
      socBroadGroup: "41-2030",
      title: "Retail Salespersons",
      description:
        "Sell merchandise, such as furniture, motor vehicles, appliances, or apparel in a retail setting.",
      derivedOccupationFamily: deriveOccupationFamily("41-0000"),
      isOfficialSocRecord: true,
    },
    "47-2061": {
      socCode: "47-2061",
      socMajorGroup: "47-0000",
      socMinorGroup: "47-2000",
      socBroadGroup: "47-2060",
      title: "Construction Laborers",
      description:
        "Perform tasks involving physical labor at construction sites.",
      derivedOccupationFamily: deriveOccupationFamily("47-0000"),
      isOfficialSocRecord: true,
    },
    "53-3032": {
      socCode: "53-3032",
      socMajorGroup: "53-0000",
      socMinorGroup: "53-3000",
      socBroadGroup: "53-3030",
      title: "Heavy and Tractor-Trailer Truck Drivers",
      description:
        "Drive a tractor-trailer combination or a truck with a capacity of at least 26,001 pounds GVW.",
      derivedOccupationFamily: deriveOccupationFamily("53-0000"),
      isOfficialSocRecord: true,
    },
    "55-1011": {
      socCode: "55-1011",
      socMajorGroup: "55-0000",
      socMinorGroup: "55-1000",
      socBroadGroup: "55-1010",
      title: "Air Crew Officers",
      description:
        "Perform in-flight duties to ensure successful completion of military aviation missions.",
      derivedOccupationFamily: deriveOccupationFamily("55-0000"),
      isOfficialSocRecord: true,
    },
  };

export function getSocTaxonomyRecord(socCode: SocCode): SocTaxonomyRecord {
  const existing = KNOWN_SOC_TAXONOMY[socCode];
  if (existing) {
    return existing;
  }
  const majorGroup = deriveSocMajorGroup(socCode);
  const majorTitle = SOC_MAJOR_GROUPS[majorGroup] ?? "General Occupation";
  return {
    socCode,
    socMajorGroup: majorGroup,
    socMinorGroup: deriveSocMinorGroup(socCode),
    socBroadGroup: deriveSocBroadGroup(socCode),
    title: `Occupational Role ${socCode}`,
    description: `Standard occupational category under ${majorTitle}.`,
    derivedOccupationFamily: deriveOccupationFamily(majorGroup),
    isOfficialSocRecord: true,
  };
}
