/**
 * NAICS (North American Industry Classification System) Taxonomy and Validation
 *
 * Provides standardized sector, subsector, and summary codes for BEA and QCEW datasets.
 */

export interface NaicsSectorDefinition {
  code: string;
  title: string;
  supersector: "goods_producing" | "service_providing" | "total";
  description: string;
}

export const NAICS_SECTORS: Record<string, NaicsSectorDefinition> = {
  "10": {
    code: "10",
    title: "Total, all industries",
    supersector: "total",
    description: "Total covered employment and wages across all industries.",
  },
  "101": {
    code: "101",
    title: "Goods-producing",
    supersector: "goods_producing",
    description: "Natural resources, mining, construction, and manufacturing.",
  },
  "102": {
    code: "102",
    title: "Service-providing",
    supersector: "service_providing",
    description:
      "Trade, transportation, utilities, information, finance, services, and public administration.",
  },
  "11": {
    code: "11",
    title: "Agriculture, Forestry, Fishing and Hunting",
    supersector: "goods_producing",
    description:
      "Crop and animal production, forestry, logging, fishing, and agricultural support activities.",
  },
  "21": {
    code: "21",
    title: "Mining, Quarrying, and Oil and Gas Extraction",
    supersector: "goods_producing",
    description:
      "Oil and gas extraction, coal mining, metal ore mining, and nonmetallic mineral mining.",
  },
  "22": {
    code: "22",
    title: "Utilities",
    supersector: "service_providing",
    description:
      "Electric power generation/transmission, natural gas distribution, water/sewage systems.",
  },
  "23": {
    code: "23",
    title: "Construction",
    supersector: "goods_producing",
    description:
      "Construction of buildings, heavy and civil engineering construction, specialty trade contractors.",
  },
  "31-33": {
    code: "31-33",
    title: "Manufacturing",
    supersector: "goods_producing",
    description:
      "Transformation of materials, substances, or components into new products.",
  },
  "31": {
    code: "31",
    title: "Manufacturing (Food, Textile, Apparel)",
    supersector: "goods_producing",
    description:
      "Food, beverage, tobacco, textile, apparel, and leather product manufacturing.",
  },
  "32": {
    code: "32",
    title: "Manufacturing (Wood, Paper, Petroleum, Chemical, Plastics)",
    supersector: "goods_producing",
    description:
      "Wood, paper, printing, petroleum, chemical, plastics, and nonmetallic mineral manufacturing.",
  },
  "33": {
    code: "33",
    title: "Manufacturing (Metals, Machinery, Electronics, Transportation)",
    supersector: "goods_producing",
    description:
      "Primary metals, machinery, computer/electronic, electrical equipment, and transportation equipment.",
  },
  "42": {
    code: "42",
    title: "Wholesale Trade",
    supersector: "service_providing",
    description:
      "Wholesaling merchandise generally without transformation and rendering related services.",
  },
  "44-45": {
    code: "44-45",
    title: "Retail Trade",
    supersector: "service_providing",
    description:
      "Retailing merchandise generally without transformation and rendering related services.",
  },
  "44": {
    code: "44",
    title: "Retail Trade (Motor Vehicles, Building Materials, Food)",
    supersector: "service_providing",
    description:
      "Motor vehicles, furniture, electronics, building materials, food, beverage, health stores.",
  },
  "45": {
    code: "45",
    title: "Retail Trade (General Merchandise, Nonstore)",
    supersector: "service_providing",
    description:
      "Gasoline stations, clothing, general merchandise, e-commerce, and nonstore retailers.",
  },
  "48-49": {
    code: "48-49",
    title: "Transportation and Warehousing",
    supersector: "service_providing",
    description:
      "Air, rail, water, truck, transit, pipeline transportation, warehousing and storage.",
  },
  "48": {
    code: "48",
    title: "Transportation",
    supersector: "service_providing",
    description:
      "Air, rail, water, truck, transit, pipeline transportation, scenic transportation.",
  },
  "49": {
    code: "49",
    title: "Postal, Courier, Warehousing and Storage",
    supersector: "service_providing",
    description:
      "Postal service, couriers and messengers, warehousing and storage.",
  },
  "51": {
    code: "51",
    title: "Information",
    supersector: "service_providing",
    description:
      "Publishing, motion picture/sound recording, broadcasting, telecommunications, data processing.",
  },
  "52": {
    code: "52",
    title: "Finance and Insurance",
    supersector: "service_providing",
    description:
      "Monetary authorities, credit intermediation, securities/investments, insurance carriers, funds.",
  },
  "53": {
    code: "53",
    title: "Real Estate and Rental and Leasing",
    supersector: "service_providing",
    description:
      "Lessors of real estate, real estate agents/brokers, automotive/equipment rental.",
  },
  "54": {
    code: "54",
    title: "Professional, Scientific, and Technical Services",
    supersector: "service_providing",
    description:
      "Legal, accounting, architectural, engineering, computer systems, research, advertising.",
  },
  "55": {
    code: "55",
    title: "Management of Companies and Enterprises",
    supersector: "service_providing",
    description:
      "Holding securities/equity, managing companies and enterprises, strategic planning.",
  },
  "56": {
    code: "56",
    title:
      "Administrative and Support and Waste Management and Remediation Services",
    supersector: "service_providing",
    description:
      "Office administration, employment services, security, cleaning, waste management.",
  },
  "61": {
    code: "61",
    title: "Educational Services",
    supersector: "service_providing",
    description:
      "Elementary/secondary schools, colleges, universities, professional schools, training centers.",
  },
  "62": {
    code: "62",
    title: "Health Care and Social Assistance",
    supersector: "service_providing",
    description:
      "Ambulatory health care services, hospitals, nursing/residential care, social assistance.",
  },
  "71": {
    code: "71",
    title: "Arts, Entertainment, and Recreation",
    supersector: "service_providing",
    description:
      "Performing arts, spectator sports, museums, historical sites, amusement, gambling, recreation.",
  },
  "72": {
    code: "72",
    title: "Accommodation and Food Services",
    supersector: "service_providing",
    description: "Short-term lodging, food services, drinking places.",
  },
  "81": {
    code: "81",
    title: "Other Services (except Public Administration)",
    supersector: "service_providing",
    description:
      "Repair and maintenance, personal care, dry cleaning, religious/civic organizations.",
  },
  "92": {
    code: "92",
    title: "Public Administration",
    supersector: "service_providing",
    description:
      "Executive, legislative, public finance, justice, public order, and general government.",
  },
};

/**
 * Standard 3-digit subsectors commonly used in regional calibration.
 */
export const NAICS_SUBSECTORS: Record<
  string,
  { code: string; title: string; parentSector: string }
> = {
  "111": { code: "111", title: "Crop Production", parentSector: "11" },
  "112": {
    code: "112",
    title: "Animal Production and Aquaculture",
    parentSector: "11",
  },
  "211": { code: "211", title: "Oil and Gas Extraction", parentSector: "21" },
  "212": {
    code: "212",
    title: "Mining (except Oil and Gas)",
    parentSector: "21",
  },
  "213": {
    code: "213",
    title: "Support Activities for Mining",
    parentSector: "21",
  },
  "236": {
    code: "236",
    title: "Construction of Buildings",
    parentSector: "23",
  },
  "237": {
    code: "237",
    title: "Heavy and Civil Engineering Construction",
    parentSector: "23",
  },
  "238": {
    code: "238",
    title: "Specialty Trade Contractors",
    parentSector: "23",
  },
  "311": { code: "311", title: "Food Manufacturing", parentSector: "31-33" },
  "324": {
    code: "324",
    title: "Petroleum and Coal Products Manufacturing",
    parentSector: "31-33",
  },
  "325": {
    code: "325",
    title: "Chemical Manufacturing",
    parentSector: "31-33",
  },
  "331": {
    code: "331",
    title: "Primary Metal Manufacturing",
    parentSector: "31-33",
  },
  "332": {
    code: "332",
    title: "Fabricated Metal Product Manufacturing",
    parentSector: "31-33",
  },
  "333": {
    code: "333",
    title: "Machinery Manufacturing",
    parentSector: "31-33",
  },
  "334": {
    code: "334",
    title: "Computer and Electronic Product Manufacturing",
    parentSector: "31-33",
  },
  "336": {
    code: "336",
    title: "Transportation Equipment Manufacturing",
    parentSector: "31-33",
  },
  "484": { code: "484", title: "Truck Transportation", parentSector: "48-49" },
  "511": {
    code: "511",
    title: "Publishing Industries (except Internet)",
    parentSector: "51",
  },
  "518": {
    code: "518",
    title: "Computing Infrastructure Providers, Data Processing, Web Hosting",
    parentSector: "51",
  },
  "522": {
    code: "522",
    title: "Credit Intermediation and Related Activities",
    parentSector: "52",
  },
  "541": {
    code: "541",
    title: "Professional, Scientific, and Technical Services",
    parentSector: "54",
  },
  "611": { code: "611", title: "Educational Services", parentSector: "61" },
  "621": {
    code: "621",
    title: "Ambulatory Health Care Services",
    parentSector: "62",
  },
  "622": { code: "622", title: "Hospitals", parentSector: "62" },
  "623": {
    code: "623",
    title: "Nursing and Residential Care Facilities",
    parentSector: "62",
  },
  "711": {
    code: "711",
    title: "Performing Arts, Spectator Sports, and Related Industries",
    parentSector: "71",
  },
  "721": { code: "721", title: "Accommodation", parentSector: "72" },
  "722": {
    code: "722",
    title: "Food Services and Drinking Places",
    parentSector: "72",
  },
};

/**
 * Validates whether a NAICS code is recognized and syntactically sound.
 */
export function validateNaicsCode(code: string): {
  valid: boolean;
  reason?: string;
} {
  if (!code || typeof code !== "string") {
    return { valid: false, reason: "NAICS code must be a non-empty string" };
  }

  const trimmed = code.trim();

  // Check sector dictionary
  if (NAICS_SECTORS[trimmed]) {
    return { valid: true };
  }

  // Check subsector dictionary
  if (NAICS_SUBSECTORS[trimmed]) {
    return { valid: true };
  }

  // Regex checks for standard NAICS structure:
  // 2-digit: 11..92
  // 3-digit: 111..928
  // 4-digit: 1111..9281
  // 5-digit: 11111..92812
  // 6-digit: 111110..928120
  // Range codes: 31-33, 44-45, 48-49
  const isRange = /^(31-33|44-45|48-49)$/.test(trimmed);
  const isNumericCode = /^[1-9][0-9]{1,5}$/.test(trimmed);

  if (!isRange && !isNumericCode) {
    return { valid: false, reason: `Invalid NAICS code format: '${trimmed}'` };
  }

  return { valid: true };
}

/**
 * Resolves the 2-digit parent sector for any 2-digit, 3-digit, 4-digit, or 6-digit NAICS code.
 */
export function getSectorForNaics(code: string): string | null {
  const trimmed = code.trim();

  if (NAICS_SECTORS[trimmed]) {
    return trimmed;
  }

  if (NAICS_SUBSECTORS[trimmed]) {
    return NAICS_SUBSECTORS[trimmed].parentSector;
  }

  // Check prefix
  const prefix2 = trimmed.slice(0, 2);
  if (["31", "32", "33"].includes(prefix2)) return "31-33";
  if (["44", "45"].includes(prefix2)) return "44-45";
  if (["48", "49"].includes(prefix2)) return "48-49";

  if (NAICS_SECTORS[prefix2]) {
    return prefix2;
  }

  return null;
}

/**
 * Resolves whether a NAICS code belongs to Goods-producing or Service-providing.
 */
export function getSupersectorForNaics(
  code: string,
): "goods_producing" | "service_providing" | "total" {
  const trimmed = code.trim();
  if (trimmed === "10") return "total";
  if (trimmed === "101") return "goods_producing";
  if (trimmed === "102") return "service_providing";

  const sector = getSectorForNaics(trimmed);
  if (sector && NAICS_SECTORS[sector]) {
    return NAICS_SECTORS[sector].supersector;
  }

  return "service_providing";
}

/**
 * Gets a human-readable title for a NAICS code.
 */
export function getNaicsTitle(code: string): string {
  const trimmed = code.trim();
  if (NAICS_SECTORS[trimmed]) {
    return NAICS_SECTORS[trimmed].title;
  }
  if (NAICS_SUBSECTORS[trimmed]) {
    return NAICS_SUBSECTORS[trimmed].title;
  }
  return `NAICS ${trimmed}`;
}
