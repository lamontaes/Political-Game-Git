import {
  programConfigurations,
  programVariant,
} from "../simulation/legislation-program-families";
import type { DraftOption } from "./legislation-docket";

/** Subject headings from the owner's Legislative Content Menus proposal. */
export const LEGISLATION_CONTENT_SUBJECTS = [
  { key: "infrastructure", label: "Infrastructure" },
  { key: "healthcare", label: "Healthcare" },
  { key: "education", label: "Education" },
  { key: "taxes-public-finance", label: "Taxes & Public Finance" },
  {
    key: "assistance-social-insurance",
    label: "Assistance & Social Insurance",
  },
  { key: "housing-land-use", label: "Housing & Land Use" },
  { key: "labor-employment", label: "Labor & Employment" },
  {
    key: "business-economic-development",
    label: "Business & Economic Development",
  },
  { key: "energy-environment", label: "Energy & Environment" },
  { key: "justice-public-safety", label: "Justice & Public Safety" },
  { key: "government-democracy", label: "Government & Democracy" },
  {
    key: "rights-family-consumer",
    label: "Rights, Family & Consumer Protection",
  },
  {
    key: "science-technology-communications",
    label: "Science, Technology & Communications",
  },
  { key: "agriculture-food", label: "Agriculture & Food" },
  { key: "parks-culture-community", label: "Parks, Culture & Community Life" },
  { key: "immigration-citizenship", label: "Immigration & Citizenship" },
  { key: "defense-veterans", label: "Defense & Veterans" },
  { key: "foreign-affairs-trade", label: "Foreign Affairs & Trade" },
] as const;

/** These are navigation groups, never bill actions or statutory sections. */
export const LEGISLATION_CONTENT_GROUPS = [
  { key: "current-rules-and-programs", label: "Current Rules and Programs" },
  { key: "coverage-and-eligibility", label: "Coverage and Eligibility" },
  { key: "benefit-rate-or-standard", label: "Benefit, Rate or Standard" },
  { key: "funding-and-revenue", label: "Funding and Revenue" },
  { key: "administration-and-delivery", label: "Administration and Delivery" },
  { key: "enforcement-and-appeals", label: "Enforcement and Appeals" },
  { key: "reporting-and-review", label: "Reporting and Review" },
  { key: "timing-and-transition", label: "Timing & Transition" },
  { key: "amendment-and-repeal", label: "Amendment & Repeal" },
] as const;

export type LegislationContentSubjectKey =
  (typeof LEGISLATION_CONTENT_SUBJECTS)[number]["key"];
export type LegislationContentGroup =
  (typeof LEGISLATION_CONTENT_GROUPS)[number];

export interface LegislationContentTopicSegment {
  readonly key: string;
  readonly label: string;
}

export interface LegislationContentLocation {
  readonly subjectKey: LegislationContentSubjectKey;
  readonly subjectLabel: string;
  readonly topicPath: readonly LegislationContentTopicSegment[];
}

export interface LegislationContentEntry {
  /** The sole selectable option for this existing family/configuration pair. */
  readonly option: DraftOption;
  readonly primaryTopicPath: readonly LegislationContentTopicSegment[];
  readonly crossLinks: readonly LegislationContentLocation[];
  readonly sharedGroups: readonly LegislationContentGroup[];
}

export interface LegislationContentLink {
  readonly familyKey: string;
  readonly variantKey: string;
  readonly label: string;
  /** A link resolves to the primary entry; it is not another draft option. */
  readonly primaryLocation: LegislationContentLocation;
  readonly topicPath: readonly LegislationContentTopicSegment[];
}

export interface LegislationContentSubject {
  readonly key: LegislationContentSubjectKey;
  readonly label: string;
  readonly entries: readonly LegislationContentEntry[];
  readonly links: readonly LegislationContentLink[];
}

interface LocationSpec {
  readonly subjectKey: LegislationContentSubjectKey;
  readonly topics: readonly string[];
}

interface PlacementSpec {
  readonly primary: LocationSpec;
  readonly crossLinks?: readonly LocationSpec[];
}

const at = (
  subjectKey: LegislationContentSubjectKey,
  ...topics: string[]
): LocationSpec => ({ subjectKey, topics });

/**
 * One explicit primary home per supported bank configuration. A secondary home
 * points to that same entry; subject words never create a new law or effect.
 */
const PLACEMENTS: Readonly<Record<string, PlacementSpec>> = {
  "transit-access/enrollment-fare-relief": {
    primary: at(
      "infrastructure",
      "Transportation",
      "Public Transit",
      "Fare Relief",
    ),
    crossLinks: [
      at(
        "assistance-social-insurance",
        "Public Assistance",
        "Transportation Access",
      ),
    ],
  },
  "transit-access/unserved-county-formula": {
    primary: at(
      "infrastructure",
      "Transportation",
      "Public Transit",
      "Service Coverage",
    ),
  },
  "bridge-maintenance/worst-first-condition": {
    primary: at(
      "infrastructure",
      "Transportation",
      "Roads & Bridges",
      "Repair Priorities",
    ),
  },
  "bridge-maintenance/preventive-cycle": {
    primary: at(
      "infrastructure",
      "Transportation",
      "Roads & Bridges",
      "Preventive Maintenance",
    ),
  },
  "broadband-access/unserved-buildout": {
    primary: at("infrastructure", "Digital Infrastructure", "Broadband Access"),
    crossLinks: [
      at(
        "science-technology-communications",
        "Broadband & Telecommunications",
        "Buildout",
      ),
    ],
  },
  "broadband-access/adoption-support": {
    primary: at("infrastructure", "Digital Infrastructure", "Broadband Access"),
    crossLinks: [
      at(
        "science-technology-communications",
        "Broadband & Telecommunications",
        "Household Adoption",
      ),
    ],
  },
  "water-service-lines/inventory-and-plan": {
    primary: at(
      "infrastructure",
      "Water and Wastewater",
      "Service Lines",
      "Inventory and Planning",
    ),
  },
  "water-service-lines/funded-replacement": {
    primary: at(
      "infrastructure",
      "Water and Wastewater",
      "Service Lines",
      "Replacement",
    ),
  },
  "appropriations/single-programme": {
    primary: at(
      "taxes-public-finance",
      "Budgets and Appropriations",
      "Program Appropriations",
    ),
  },
  "appropriations/supplemental": {
    primary: at(
      "taxes-public-finance",
      "Budgets and Appropriations",
      "Supplemental Appropriations",
    ),
  },
  "appropriations/conditional-match": {
    primary: at(
      "taxes-public-finance",
      "Grants and Transfers",
      "Local Matching Funds",
    ),
  },
  "appropriations/transit-staged-service-v1": {
    primary: at(
      "infrastructure",
      "Transportation",
      "Public Transit",
      "Service Funding",
    ),
    crossLinks: [
      at(
        "taxes-public-finance",
        "Budgets and Appropriations",
        "Transit Appropriations",
      ),
    ],
  },
  "appropriations/federal-passenger-rail-v1": {
    primary: at("infrastructure", "Transportation", "Rail", "Passenger Rail"),
    crossLinks: [
      at(
        "taxes-public-finance",
        "Budgets and Appropriations",
        "Rail Appropriations",
      ),
    ],
  },
  "appropriations/local-fix-it-first-v1": {
    primary: at(
      "infrastructure",
      "Transportation",
      "Roads & Bridges",
      "Maintenance Funding",
    ),
    crossLinks: [
      at(
        "taxes-public-finance",
        "Budgets and Appropriations",
        "Road Appropriations",
      ),
    ],
  },
  "appropriations/transit-staged-service-v2": {
    primary: at(
      "infrastructure",
      "Transportation",
      "Public Transit",
      "Service Funding",
    ),
    crossLinks: [
      at(
        "taxes-public-finance",
        "Budgets and Appropriations",
        "Transit Appropriations",
      ),
    ],
  },
  "program-sunset/terminate-on-date": {
    primary: at(
      "government-democracy",
      "Public Administration",
      "Existing Authority Changes",
      "Sunset",
    ),
  },
  "program-sunset/extend-authority": {
    primary: at(
      "government-democracy",
      "Public Administration",
      "Existing Authority Changes",
      "Extension",
    ),
  },
  "program-sunset/repeal-outright": {
    primary: at(
      "government-democracy",
      "Public Administration",
      "Existing Authority Changes",
      "Repeal",
    ),
  },
  "service-charges/flat-permit-fee": {
    primary: at(
      "taxes-public-finance",
      "Fees and Charges",
      "Building Permit Fees",
    ),
    crossLinks: [at("housing-land-use", "Building Permits", "Permit Fees")],
  },
  "service-charges/dedicated-surcharge": {
    primary: at(
      "taxes-public-finance",
      "Fees and Charges",
      "Vehicle Registration Surcharges",
    ),
    crossLinks: [
      at(
        "infrastructure",
        "Transportation",
        "Roads & Bridges",
        "Dedicated Charges",
      ),
    ],
  },
  "assistance-eligibility/raise-income-limit": {
    primary: at(
      "assistance-social-insurance",
      "A Selected Program",
      "Eligibility",
    ),
  },
  "assistance-eligibility/add-household-category": {
    primary: at(
      "assistance-social-insurance",
      "A Selected Program",
      "Eligibility",
    ),
  },
  "assistance-eligibility/index-to-published-limit": {
    primary: at(
      "assistance-social-insurance",
      "A Selected Program",
      "Eligibility",
    ),
  },
  "agency-reporting/annual-legislative-report": {
    primary: at(
      "government-democracy",
      "Agencies and Public Employment",
      "Reports and Audits",
    ),
  },
  "agency-reporting/independent-audit": {
    primary: at(
      "government-democracy",
      "Agencies and Public Employment",
      "Reports and Audits",
    ),
  },
  "agency-reporting/published-performance-measures": {
    primary: at(
      "government-democracy",
      "Agencies and Public Employment",
      "Performance Measures",
    ),
  },
  "public-workforce/authorize-positions": {
    primary: at(
      "government-democracy",
      "Agencies and Public Employment",
      "Public Staffing",
    ),
    crossLinks: [
      at("labor-employment", "Public Employment", "Authorized Posts"),
    ],
  },
  "public-workforce/classification-standard": {
    primary: at(
      "government-democracy",
      "Agencies and Public Employment",
      "Hiring Standards",
    ),
    crossLinks: [
      at("labor-employment", "Public Employment", "Hiring Standards"),
    ],
  },
  "public-workforce/fee-supported-posts": {
    primary: at(
      "government-democracy",
      "Agencies and Public Employment",
      "Public Staffing",
    ),
    crossLinks: [
      at("labor-employment", "Public Employment", "Authorized Posts"),
    ],
  },
  "disaster-recovery/designated-area-grants": {
    primary: at(
      "justice-public-safety",
      "Emergency Management and Disaster Recovery",
      "Recovery Grants",
    ),
  },
  "disaster-recovery/post-designation-waiver": {
    primary: at(
      "justice-public-safety",
      "Emergency Management and Disaster Recovery",
      "Post-Disaster Requirements",
    ),
  },
  "utility-resilience/hardening-grants": {
    primary: at("energy-environment", "Utility Regulation", "Resilience"),
  },
  "utility-resilience/restoration-standard": {
    primary: at(
      "energy-environment",
      "Utility Regulation",
      "Service Restoration",
    ),
  },
  "critical-infrastructure/operator-assistance-fund": {
    primary: at(
      "infrastructure",
      "Infrastructure Resilience",
      "Operator Assistance",
    ),
    crossLinks: [
      at(
        "justice-public-safety",
        "Emergency Management and Disaster Recovery",
        "Continuity",
      ),
    ],
  },
  "critical-infrastructure/continuity-planning-duty": {
    primary: at(
      "infrastructure",
      "Infrastructure Resilience",
      "Continuity Planning",
    ),
    crossLinks: [
      at(
        "justice-public-safety",
        "Emergency Management and Disaster Recovery",
        "Continuity",
      ),
    ],
  },
  "education-facilities/school-repair-authorization": {
    primary: at("education", "School Facilities", "Repair"),
  },
  "education-facilities/school-condition-inventory": {
    primary: at("education", "School Facilities", "Condition Inventory"),
  },
  "health-service-capacity/service-availability-publication": {
    primary: at("healthcare", "Health Care Delivery", "Service Capacity"),
  },
  "health-service-capacity/service-change-referral-plan": {
    primary: at("healthcare", "Health Care Delivery", "Service Referrals"),
  },
  "environmental-monitoring/monitoring-record-disclosure": {
    primary: at(
      "energy-environment",
      "Environmental Protection",
      "Monitoring Records",
    ),
  },
  "environmental-monitoring/monitoring-gap-response": {
    primary: at(
      "energy-environment",
      "Environmental Protection",
      "Monitoring Gaps",
    ),
  },
  "procurement-disclosure/award-reasons-publication": {
    primary: at("government-democracy", "Procurement", "Contract Awards"),
  },
  "procurement-disclosure/emergency-procurement-review": {
    primary: at("government-democracy", "Procurement", "Emergency Review"),
  },
  "social-service-access/application-access-duty": {
    primary: at(
      "assistance-social-insurance",
      "A Selected Program",
      "Applications and Renewals",
    ),
  },
  "agricultural-conservation/conservation-practice-authorization": {
    primary: at("agriculture-food", "Farm Support", "Conservation Practices"),
    crossLinks: [
      at("energy-environment", "Environmental Protection", "Soil Conservation"),
    ],
  },
  "veteran-transition-referrals/transition-referral-duty": {
    primary: at(
      "defense-veterans",
      "Transition and Survivor Services",
      "Referrals",
    ),
  },
};

const subjectByKey = new Map(
  LEGISLATION_CONTENT_SUBJECTS.map((subject) => [subject.key, subject]),
);

function topicPath(
  labels: readonly string[],
): readonly LegislationContentTopicSegment[] {
  return labels.map((label) => ({
    key: label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    label,
  }));
}

function location(spec: LocationSpec): LegislationContentLocation {
  const subject = subjectByKey.get(spec.subjectKey);
  if (!subject)
    throw new Error(`Unknown legislation subject ${spec.subjectKey}.`);
  return {
    subjectKey: subject.key,
    subjectLabel: subject.label,
    topicPath: topicPath(spec.topics),
  };
}

function sharedGroups(option: DraftOption): readonly LegislationContentGroup[] {
  const { variant } = programVariant(option.familyKey, option.variantKey);
  const dimensions = new Set(variant.clauses.map((clause) => clause.dimension));
  const keys = new Set<string>();
  if (option.requiresAuthority) keys.add("current-rules-and-programs");
  if (dimensions.has("eligibility-scope")) keys.add("coverage-and-eligibility");
  if (
    option.instrument === "regulatory-requirement" ||
    option.instrument === "revenue-measure"
  )
    keys.add("benefit-rate-or-standard");
  if (dimensions.has("funding-cap") || dimensions.has("revenue"))
    keys.add("funding-and-revenue");
  if (
    option.instrument === "programme-authorization" ||
    option.instrument === "regulatory-requirement" ||
    option.instrument === "position-authorization"
  )
    keys.add("administration-and-delivery");
  if (dimensions.has("oversight")) keys.add("reporting-and-review");
  if (dimensions.has("timing")) keys.add("timing-and-transition");
  if (
    option.instrument === "eligibility-amendment" ||
    option.instrument === "sunset-repeal"
  )
    keys.add("amendment-and-repeal");
  return LEGISLATION_CONTENT_GROUPS.filter((group) => keys.has(group.key));
}

/** Read-only navigation over the options this scenario already permits. */
export function legislationContentCatalog(
  options: readonly DraftOption[],
): readonly LegislationContentSubject[] {
  const configurations = new Set(
    programConfigurations().map(
      ({ familyKey, variantKey }) => `${familyKey}/${variantKey}`,
    ),
  );
  for (const key of configurations) {
    if (!PLACEMENTS[key])
      throw new Error(`No legislation content placement for ${key}.`);
  }
  for (const key of Object.keys(PLACEMENTS)) {
    if (!configurations.has(key))
      throw new Error(`Stale legislation content placement ${key}.`);
  }

  const entries = new Map<
    LegislationContentSubjectKey,
    LegislationContentEntry[]
  >();
  const links = new Map<
    LegislationContentSubjectKey,
    LegislationContentLink[]
  >();
  const seen = new Set<string>();
  for (const option of options) {
    const key = `${option.familyKey}/${option.variantKey}`;
    if (!configurations.has(key))
      throw new Error(`Unknown draft option ${key}.`);
    if (seen.has(key)) throw new Error(`Repeated draft option ${key}.`);
    seen.add(key);
    const placement = PLACEMENTS[key];
    if (!placement)
      throw new Error(`No legislation content placement for ${key}.`);
    const primaryLocation = location(placement.primary);
    const crossLinks = (placement.crossLinks ?? []).map(location);
    const entry: LegislationContentEntry = {
      option,
      primaryTopicPath: primaryLocation.topicPath,
      crossLinks,
      sharedGroups: sharedGroups(option),
    };
    entries.set(primaryLocation.subjectKey, [
      ...(entries.get(primaryLocation.subjectKey) ?? []),
      entry,
    ]);
    for (const crossLink of crossLinks) {
      if (crossLink.subjectKey === primaryLocation.subjectKey) {
        throw new Error(`Same-subject cross-link for ${key}.`);
      }
      links.set(crossLink.subjectKey, [
        ...(links.get(crossLink.subjectKey) ?? []),
        {
          familyKey: option.familyKey,
          variantKey: option.variantKey,
          label: option.variantLabel,
          primaryLocation,
          topicPath: crossLink.topicPath,
        },
      ]);
    }
  }

  return LEGISLATION_CONTENT_SUBJECTS.filter(
    (subject) =>
      (entries.get(subject.key)?.length ?? 0) > 0 ||
      (links.get(subject.key)?.length ?? 0) > 0,
  ).map((subject) => ({
    ...subject,
    entries: entries.get(subject.key) ?? [],
    links: links.get(subject.key) ?? [],
  }));
}
