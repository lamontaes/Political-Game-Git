import type { RuleSourceRef } from "../legislature-rules";
import type { ExecutiveAppointmentPost } from "./executive-appointment-posts";

/** Head appointment provisions in the named official editions, not a claim
 * that all 2026 amendments or every collateral qualification were researched.
 * These data rows never establish an incumbent or a vacancy. */
const DEPARTMENT_INVENTORY: RuleSourceRef = {
  authority: "statute",
  citation: "5 USC 101",
  sourceTitle: "United States Code, 2024 edition",
  sourceUrl:
    "https://www.govinfo.gov/content/pkg/USCODE-2024-title5/html/USCODE-2024-title5-partI-chap1-sec101.htm",
  retrievedAt: "2026-10-06",
  verification: "verified",
  note: "Lists the fifteen executive departments in this edition; it does not record their current heads.",
};

const HEAD_PROVISIONS = [
  {
    key: "state",
    specialQualification: "none",
    title: "Secretary of State",
    organizationName: "Department of State",
    source: {
      authority: "statute",
      citation: "22 USC 2651a(a)(2)",
      sourceTitle: "United States Code, 2024 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2024-title22/pdf/USCODE-2024-title22-chap38-sec2651.pdf",
      retrievedAt: "2026-10-06",
      verification: "partial",
      note: "Official indexed appointment text; the linked PDF includes the section preceding 2651a. Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "treasury",
    specialQualification: "none",
    title: "Secretary of the Treasury",
    organizationName: "Department of the Treasury",
    source: {
      authority: "statute",
      citation: "31 USC 301(b)",
      sourceTitle: "United States Code, 2024 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2024-title31/html/USCODE-2024-title31-subtitleI-chap3-subchapI-sec301.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Secretary, not the separately appointed Treasurer. Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "defense",
    specialQualification: "defense-civilian-service-history",
    title: "Secretary of Defense",
    organizationName: "Department of Defense",
    source: {
      authority: "statute",
      citation: "10 USC 113(a)",
      sourceTitle: "United States Code, 2024 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2024-title10/html/USCODE-2024-title10-subtitleA-partI-chap2-sec113.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Civilian life and seven/ten years since relief from regular commissioned active duty, depending on grade. Missing service history cannot establish eligibility. Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "justice",
    specialQualification: "none",
    title: "Attorney General",
    organizationName: "Department of Justice",
    source: {
      authority: "statute",
      citation: "28 USC 503",
      sourceTitle: "United States Code, 2024 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2024-title28/html/USCODE-2024-title28-partII-chap31-sec503.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "interior",
    specialQualification: "none",
    title: "Secretary of the Interior",
    organizationName: "Department of the Interior",
    source: {
      authority: "statute",
      citation: "43 USC 1451; Constitution Article II, Section 2, Clause 2",
      sourceTitle: "United States Code, 2022 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2022-title43/pdf/USCODE-2022-title43-chap31.pdf",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "The statute establishes the department head; the separate constitutional principal-officer appointment rule supplies Senate consent. Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "agriculture",
    specialQualification: "none",
    title: "Secretary of Agriculture",
    organizationName: "Department of Agriculture",
    source: {
      authority: "statute",
      citation: "7 USC 2202",
      sourceTitle: "United States Code, 2021 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2021-title7/pdf/USCODE-2021-title7-chap55.pdf",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "commerce",
    specialQualification: "none",
    title: "Secretary of Commerce",
    organizationName: "Department of Commerce",
    source: {
      authority: "statute",
      citation: "15 USC 1501",
      sourceTitle: "United States Code, 2022 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2022-title15/pdf/USCODE-2022-title15-chap40.pdf",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "labor",
    specialQualification: "none",
    title: "Secretary of Labor",
    organizationName: "Department of Labor",
    source: {
      authority: "statute",
      citation: "29 USC 551",
      sourceTitle: "United States Code, 2021 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2021-title29/pdf/USCODE-2021-title29-chap12.pdf",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "health-human-services",
    specialQualification: "none",
    title: "Secretary of Health and Human Services",
    organizationName: "Department of Health and Human Services",
    source: {
      authority: "statute",
      citation:
        "42 USC 3501, Reorganization Plan 1 of 1953, Section 1; 20 USC 3508",
      sourceTitle: "United States Code, 2022 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2022-title42/html/USCODE-2022-title42-chap43.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "The original HEW appointment provision is read together with its redesignation as HHS. Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "housing-urban-development",
    specialQualification: "none",
    title: "Secretary of Housing and Urban Development",
    organizationName: "Department of Housing and Urban Development",
    source: {
      authority: "statute",
      citation: "42 USC 3532(a)",
      sourceTitle: "United States Code, 2022 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2022-title42/html/USCODE-2022-title42-chap44.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "transportation",
    specialQualification: "none",
    title: "Secretary of Transportation",
    organizationName: "Department of Transportation",
    source: {
      authority: "statute",
      citation: "49 USC 102(b)",
      sourceTitle: "United States Code, 2024 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2024-title49/html/USCODE-2024-title49-subtitleI-chap1-sec102.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "energy",
    specialQualification: "none",
    title: "Secretary of Energy",
    organizationName: "Department of Energy",
    source: {
      authority: "statute",
      citation: "42 USC 7131",
      sourceTitle: "United States Code, 2022 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2022-title42/html/USCODE-2022-title42-chap84.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "education",
    specialQualification: "none",
    title: "Secretary of Education",
    organizationName: "Department of Education",
    source: {
      authority: "statute",
      citation: "20 USC 3411",
      sourceTitle: "United States Code, 2023 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2023-title20/html/USCODE-2023-title20-chap48.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "veterans-affairs",
    specialQualification: "none",
    title: "Secretary of Veterans Affairs",
    organizationName: "Department of Veterans Affairs",
    source: {
      authority: "statute",
      citation: "38 USC 303",
      sourceTitle: "United States Code, 2024 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2024-title38/html/USCODE-2024-title38-partI-chap3-sec303.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
  {
    key: "homeland-security",
    specialQualification: "none",
    title: "Secretary of Homeland Security",
    organizationName: "Department of Homeland Security",
    source: {
      authority: "statute",
      citation: "6 USC 112(a)(1)-(2)",
      sourceTitle: "United States Code, 2021 edition",
      sourceUrl:
        "https://www.govinfo.gov/content/pkg/USCODE-2021-title6/html/USCODE-2021-title6.htm",
      retrievedAt: "2026-10-06",
      verification: "verified",
      note: "Appointment provision only; absence of another qualification in this section is not proof that no other law imposes one.",
    },
  },
] as const;

export const FEDERAL_CABINET_POSTS: readonly ExecutiveAppointmentPost[] =
  HEAD_PROVISIONS.map((head) => ({
    officeKey: `us-cabinet-${head.key}`,
    title: head.title,
    organizationName: head.organizationName,
    appointerOfficeKey: "us-president",
    authorityOfficeKey: "us-federal-president",
    jurisdictionKey: "US",
    kind: "department-head",
    colleagueScope: "federal",
    specialQualification: head.specialQualification,
    seats: 1,
    termYears: null,
    termEndMonthDay: null,
    openingTermOffsetsYears: [],
    vacancyTerm: "new-term",
    confirmation: "senate",
    confirmationMajority: "members-voting",
    // A general citizenship requirement is not established by these head
    // sections. This is not an assertion about every collateral statute.
    citizenshipRequired: false,
    stateEmploymentBarred: false,
    samePartyLimit: null,
    sources: [DEPARTMENT_INVENTORY, head.source],
  }));
