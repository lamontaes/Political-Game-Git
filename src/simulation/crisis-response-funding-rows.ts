/**
 * Crisis-response (988) funding rows for the standing crisis-response
 * spending authority, one row for each of the 56 places, as data only.
 *
 * Team 6 owns the appropriation path (`recordProgramAppropriation` and its
 * adapter); these rows are what it reads. Nothing here records anything, and
 * no row decides what any person or body does: a row says what money a
 * place's government actually had for its 988 crisis line, and the path
 * turns that into a saved appropriation.
 *
 * Two sources, kept apart because they measure different money:
 *
 * - `federal`: SAMHSA, "Cooperative Agreements for States and Territories to
 *   Improve Local 988 Capacity," NOFO SM-22-015, Appendix M (FY 2022). The
 *   maximum award each state and territory could receive. Base: FY 2021 routed
 *   Lifeline calls. Eleven places with fewer than 4,283 calls get a flat
 *   $250,000. The other 45 get their call share of the remaining $102,250,000.
 *   Unit: US dollars for the whole project period. Availability: project start
 *   04/30/2022, two-year project period. The 56 awards sum to exactly
 *   $105,000,000. https://www.samhsa.gov/sites/default/files/grants/pdf/sm-22-015.pdf
 *   (SHA-256 a24e90b534fef1dadd2320464957a0b2067c61da37b592e9663cb53857c33486).
 * - `state`: Vibrant Emotional Health, "Report on State Appropriations for the
 *   988 Suicide & Crisis Lifeline, Based on the 2025 Legislative Session." Each
 *   state's own appropriation and its total 988 funding for the stated fiscal
 *   period, from all sources, quoted as published. Fiscal years begin July 1 in
 *   every state the report covers.
 *   https://publicpolicy.vibrant.org/wp-content/uploads/2026/06/2025-988-state-funding-and-appropriations-report.pdf
 *   (SHA-256 588149c7bdacb6b7f05318f10ed508671976345e656c7348146758ce0fa6c9a6).
 *   Places the report does not cover, or covers without a total, say so in
 *   `unreported` or a null total. They are never filled with a guess here; an
 *   estimate, when a screen needs one, is the reader's to mark.
 */

export const CRISIS_FUNDING_FEDERAL_SOURCE = {
  publisher: "Substance Abuse and Mental Health Services Administration",
  title:
    "Cooperative Agreements for States and Territories to Improve Local 988 Capacity (SM-22-015), Appendix M",
  url: "https://www.samhsa.gov/sites/default/files/grants/pdf/sm-22-015.pdf",
  sha256: "a24e90b534fef1dadd2320464957a0b2067c61da37b592e9663cb53857c33486",
  unit: "USD for the whole project period",
  base: "FY 2021 routed Lifeline calls; $250,000 flat below 4,283 calls",
  availableFrom: "2022-04-30",
  projectPeriodYears: 2,
  totalMinorUnits: 10_500_000_000,
} as const;

export const CRISIS_FUNDING_STATE_SOURCE = {
  publisher: "Vibrant Emotional Health",
  title:
    "Report on State Appropriations for the 988 Suicide & Crisis Lifeline, Based on the 2025 Legislative Session",
  url: "https://publicpolicy.vibrant.org/wp-content/uploads/2026/06/2025-988-state-funding-and-appropriations-report.pdf",
  sha256: "588149c7bdacb6b7f05318f10ed508671976345e656c7348146758ce0fa6c9a6",
  unit: "USD for the stated fiscal period, all sources",
  fiscalYearBegins: "July 1",
} as const;

export interface CrisisFundingRow {
  /** The place, as ISO 3166-2 (`US-XX`); the government is that place's own. */
  readonly placeKey: string;
  readonly placeName: string;
  readonly federal: {
    readonly awardMinorUnits: number;
    readonly basis: "base-award" | "call-share";
    readonly routedCallsFy2021: number | null;
    readonly callShareLabel: string | null;
  };
  readonly state:
    | {
        readonly budgetCycle: string;
        /** The report's appropriation line, quoted. */
        readonly appropriationLabel: string | null;
        readonly totalFundingMinorUnits: number | null;
        readonly totalFundingPeriod: string | null;
        readonly summary: string | null;
      }
    | { readonly unreported: string };
}

export const CRISIS_FUNDING_ROWS: readonly CrisisFundingRow[] = [
  {
    placeKey: "US-AK",
    placeName: "Alaska",
    federal: {
      awardMinorUnits: 41246700,
      basis: "call-share",
      routedCallsFy2021: 7469,
      callShareLabel: "0.4034%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $750,000",
      totalFundingMinorUnits: 280000000,
      totalFundingPeriod: "FY26",
      summary:
        "Alaska, 988 is primarily funded by SAMHSA grants, other federal grants, state general funds, and other state sources.",
    },
  },
  {
    placeKey: "US-AL",
    placeName: "Alabama",
    federal: {
      awardMinorUnits: 142682200,
      basis: "call-share",
      routedCallsFy2021: 25837,
      callShareLabel: "1.3954%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel:
        "FY25-26 State Appropriation: $3.5 million for FY 25 and $4.0 million for FY26",
      totalFundingMinorUnits: 750000000,
      totalFundingPeriod: "FY25-26",
      summary: "Alabama, 988 is primarily funded by state general funds.",
    },
  },
  {
    placeKey: "US-AR",
    placeName: "Arkansas",
    federal: {
      awardMinorUnits: 81532700,
      basis: "call-share",
      routedCallsFy2021: 14764,
      callShareLabel: "0.7974%",
    },
    state: {
      budgetCycle: "Annual/Biennial",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: 156000000,
      totalFundingPeriod: "FY26",
      summary: "Arkansas, 988 is primarily funded by SAMHSA grants.",
    },
  },
  {
    placeKey: "US-AS",
    placeName: "American Samoa",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 17,
      callShareLabel: null,
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-AZ",
    placeName: "Arizona",
    federal: {
      awardMinorUnits: 195366100,
      basis: "call-share",
      routedCallsFy2021: 35377,
      callShareLabel: "1.9107%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: 500000000,
      totalFundingPeriod: "FY26",
      summary:
        "Arizona, 988 is funded by a mix of SAMHSA grants and other federal grants such as Medicaid.",
    },
  },
  {
    placeKey: "US-CA",
    placeName: "California",
    federal: {
      awardMinorUnits: 1448813500,
      basis: "call-share",
      routedCallsFy2021: 262352,
      callShareLabel: "14.1693%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $30 million",
      totalFundingMinorUnits: 3072000000,
      totalFundingPeriod: "FY26",
      summary:
        "California, 988 is primarily funded by state general funds, SAMHSA grants, and a $0.08 telecom fee.",
    },
  },
  {
    placeKey: "US-CO",
    placeName: "Colorado",
    federal: {
      awardMinorUnits: 246271600,
      basis: "call-share",
      routedCallsFy2021: 44595,
      callShareLabel: "2.4085%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $12.58 million",
      totalFundingMinorUnits: 2585000000,
      totalFundingPeriod: "FY26",
      summary:
        "Colorado, 988 is funded by SAMHSA grants, state general funds, and a 988 Telecom Fee which decreased from $0.14 to $0.07 in 2025 generating $9.21 million.",
    },
  },
  {
    placeKey: "US-CT",
    placeName: "Connecticut",
    federal: {
      awardMinorUnits: 95664600,
      basis: "call-share",
      routedCallsFy2021: 17323,
      callShareLabel: "0.9356%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $3.99 million",
      totalFundingMinorUnits: 659000000,
      totalFundingPeriod: "FY26-27",
      summary:
        "Connecticut, 988 is primarily funded by SAMHSA grants, other federal grants, and state general funds.",
    },
  },
  {
    placeKey: "US-DC",
    placeName: "District of Columbia",
    federal: {
      awardMinorUnits: 38270300,
      basis: "call-share",
      routedCallsFy2021: 6930,
      callShareLabel: "0.3743%",
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-DE",
    placeName: "Delaware",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 4246,
      callShareLabel: null,
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: 919000000,
      totalFundingPeriod: "FY26",
      summary:
        "Delaware, 988 is primarily funded by a $0.60 988 Telecom Fee which in FY24 generated $9.21 million.",
    },
  },
  {
    placeKey: "US-FL",
    placeName: "Florida",
    federal: {
      awardMinorUnits: 528438800,
      basis: "call-share",
      routedCallsFy2021: 95690,
      callShareLabel: "5.1681%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: 2266000000,
      totalFundingPeriod: "FY26",
      summary:
        "Florida, 988 is primarily funded by SAMHSA grants, other federal grants, and state general funds.",
    },
  },
  {
    placeKey: "US-GA",
    placeName: "Georgia",
    federal: {
      awardMinorUnits: 292792300,
      basis: "call-share",
      routedCallsFy2021: 53019,
      callShareLabel: "2.8635%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $18.4 million",
      totalFundingMinorUnits: 27310000000,
      totalFundingPeriod: "FY26",
      summary:
        "Georgia, 988 is primarily funded by state general funds, with $18.4 million directed to the Georgia Crisis & Access Line.",
    },
  },
  {
    placeKey: "US-GU",
    placeName: "Guam",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 360,
      callShareLabel: null,
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-HI",
    placeName: "Hawaii",
    federal: {
      awardMinorUnits: 49094200,
      basis: "call-share",
      routedCallsFy2021: 8890,
      callShareLabel: "0.4801%",
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-IA",
    placeName: "Iowa",
    federal: {
      awardMinorUnits: 93290000,
      basis: "call-share",
      routedCallsFy2021: 16893,
      callShareLabel: "0.9124%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: 407000000,
      totalFundingPeriod: "FY26",
      summary:
        "Iowa, 988 is primarily funded by other state sources as the state does not have a dedicated 988 fund account.",
    },
  },
  {
    placeKey: "US-ID",
    placeName: "Idaho",
    federal: {
      awardMinorUnits: 64203500,
      basis: "call-share",
      routedCallsFy2021: 11626,
      callShareLabel: "0.6279%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $3.34 million",
      totalFundingMinorUnits: 334000000,
      totalFundingPeriod: "FY25",
      summary:
        "Idaho, 988 is primarily funded by state general funds, but also receive funding from other private sources that are not tracked publicly.",
    },
  },
  {
    placeKey: "US-IL",
    placeName: "Illinois",
    federal: {
      awardMinorUnits: 449683800,
      basis: "call-share",
      routedCallsFy2021: 81429,
      callShareLabel: "4.3979%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $50 million",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "Illinois, 988 is primarily funded by state general funds and a new 988 Telecom Fee which increases the tax on telecom services by 1.65%.",
    },
  },
  {
    placeKey: "US-IN",
    placeName: "Indiana",
    federal: {
      awardMinorUnits: 201634000,
      basis: "call-share",
      routedCallsFy2021: 36512,
      callShareLabel: "1.9720%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $50 million",
      totalFundingMinorUnits: 5000000000,
      totalFundingPeriod: "FY26-27",
      summary: "Indiana, 988 is primarily funded by state general funds.",
    },
  },
  {
    placeKey: "US-KS",
    placeName: "Kansas",
    federal: {
      awardMinorUnits: 93593700,
      basis: "call-share",
      routedCallsFy2021: 16948,
      callShareLabel: "0.9153%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $10 million",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "Kansas, 988 is primarily funded by a mix of SAMHSA grants and a recurring state general fund appropriation of $10 million.",
    },
  },
  {
    placeKey: "US-KY",
    placeName: "Kentucky",
    federal: {
      awardMinorUnits: 116340500,
      basis: "call-share",
      routedCallsFy2021: 21067,
      callShareLabel: "1.1378%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY25-26 State Appropriation: $8.51 million",
      totalFundingMinorUnits: 851000000,
      totalFundingPeriod: "FY25-26",
      summary: "Kentucky, 988 is primarily funded by state general funds.",
    },
  },
  {
    placeKey: "US-LA",
    placeName: "Louisiana",
    federal: {
      awardMinorUnits: 135293400,
      basis: "call-share",
      routedCallsFy2021: 24499,
      callShareLabel: "1.3232%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: 442000000,
      totalFundingPeriod: "FY26",
      summary:
        "Louisiana, 988 is primarily funded by SAMHSA grants and other federal grants.",
    },
  },
  {
    placeKey: "US-MA",
    placeName: "Massachusetts",
    federal: {
      awardMinorUnits: 256311300,
      basis: "call-share",
      routedCallsFy2021: 46413,
      callShareLabel: "2.5067%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $7.5 million",
      totalFundingMinorUnits: 1170000000,
      totalFundingPeriod: "FY26",
      summary:
        "Massachusetts, 988 is primarily funded by SAMHSA grants and state general funds.",
    },
  },
  {
    placeKey: "US-MD",
    placeName: "Maryland",
    federal: {
      awardMinorUnits: 197298900,
      basis: "call-share",
      routedCallsFy2021: 35727,
      callShareLabel: "1.9296%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY25-26 State Appropriation: None specified",
      totalFundingMinorUnits: 851000000,
      totalFundingPeriod: "FY25-26",
      summary:
        "Maryland, 988 is primarily funded by a $0.25 988 Telecom Fee which was established in 2024.",
    },
  },
  {
    placeKey: "US-ME",
    placeName: "Maine",
    federal: {
      awardMinorUnits: 26899600,
      basis: "call-share",
      routedCallsFy2021: 4871,
      callShareLabel: "0.2631%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $2.84 million",
      totalFundingMinorUnits: 442000000,
      totalFundingPeriod: "FY25-26",
      summary:
        "Maine, 988 is primarily funded by SAMHSA grants, other federal grants, and state general funds.",
    },
  },
  {
    placeKey: "US-MI",
    placeName: "Michigan",
    federal: {
      awardMinorUnits: 335082900,
      basis: "call-share",
      routedCallsFy2021: 60677,
      callShareLabel: "3.2771%",
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-MN",
    placeName: "Minnesota",
    federal: {
      awardMinorUnits: 184553200,
      basis: "call-share",
      routedCallsFy2021: 33419,
      callShareLabel: "1.8049%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: None specified",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary: "Minnesota, 988 is primarily funded by a $0.12 988 Telecom Fee.",
    },
  },
  {
    placeKey: "US-MO",
    placeName: "Missouri",
    federal: {
      awardMinorUnits: 185066800,
      basis: "call-share",
      routedCallsFy2021: 33512,
      callShareLabel: "1.8099%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY25-26 State Appropriation: $3.85 million",
      totalFundingMinorUnits: 1926000000,
      totalFundingPeriod: "FY26",
      summary:
        "Missouri, 988 is primarily funded by state general funds, SAMHSA grants, and other state sources.",
    },
  },
  {
    placeKey: "US-MP",
    placeName: "Northern Mariana Islands",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 87,
      callShareLabel: null,
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-MS",
    placeName: "Mississippi",
    federal: {
      awardMinorUnits: 69322700,
      basis: "call-share",
      routedCallsFy2021: 12553,
      callShareLabel: "0.6780%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $1.68 million",
      totalFundingMinorUnits: 391000000,
      totalFundingPeriod: "FY26",
      summary:
        "Mississippi, 988 is primarily funded by SAMHSA grants and state general funds.",
    },
  },
  {
    placeKey: "US-MT",
    placeName: "Montana",
    federal: {
      awardMinorUnits: 39209100,
      basis: "call-share",
      routedCallsFy2021: 7100,
      callShareLabel: "0.3835%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $200,000",
      totalFundingMinorUnits: 147000000,
      totalFundingPeriod: "FY26-27",
      summary:
        "Montana, 988 is primarily funded by SAMHSA grants, other federal grants, and state general funds.",
    },
  },
  {
    placeKey: "US-NC",
    placeName: "North Carolina",
    federal: {
      awardMinorUnits: 325297200,
      basis: "call-share",
      routedCallsFy2021: 58905,
      callShareLabel: "3.1814%",
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-ND",
    placeName: "North Dakota",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 3820,
      callShareLabel: null,
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $2.54 million",
      totalFundingMinorUnits: 254000000,
      totalFundingPeriod: "FY26-27",
      summary: "North Dakota, 988 is primarily funded by state general funds.",
    },
  },
  {
    placeKey: "US-NE",
    placeName: "Nebraska",
    federal: {
      awardMinorUnits: 63209400,
      basis: "call-share",
      routedCallsFy2021: 11446,
      callShareLabel: "0.6182%",
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-NH",
    placeName: "New Hampshire",
    federal: {
      awardMinorUnits: 33830200,
      basis: "call-share",
      routedCallsFy2021: 6126,
      callShareLabel: "0.3309%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $6.12 million",
      totalFundingMinorUnits: 741000000,
      totalFundingPeriod: "FY26-27",
      summary:
        "New Hampshire, 988 is primarily funded by SAMHSA grants, other federal grants, and state general funds.",
    },
  },
  {
    placeKey: "US-NJ",
    placeName: "New Jersey",
    federal: {
      awardMinorUnits: 252169500,
      basis: "call-share",
      routedCallsFy2021: 45663,
      callShareLabel: "2.4662%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $28.8 million",
      totalFundingMinorUnits: 2880000000,
      totalFundingPeriod: "FY26",
      summary: "New Jersey, 988 is primarily funded by state general funds.",
    },
  },
  {
    placeKey: "US-NM",
    placeName: "New Mexico",
    federal: {
      awardMinorUnits: 88678700,
      basis: "call-share",
      routedCallsFy2021: 16058,
      callShareLabel: "0.8673%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $9.5 million",
      totalFundingMinorUnits: 950000000,
      totalFundingPeriod: "FY26",
      summary: "New Mexico, 988 is primarily funded by state general funds.",
    },
  },
  {
    placeKey: "US-NV",
    placeName: "Nevada",
    federal: {
      awardMinorUnits: 106919200,
      basis: "call-share",
      routedCallsFy2021: 19361,
      callShareLabel: "1.0457%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY25 State Appropriation: None specified",
      totalFundingMinorUnits: 2439000000,
      totalFundingPeriod: "FY25",
      summary:
        "Nevada, 988 is primarily funded by a $0.35 988 Telecom Fee which generates $15 million on average.",
    },
  },
  {
    placeKey: "US-NY",
    placeName: "New York",
    federal: {
      awardMinorUnits: 728046000,
      basis: "call-share",
      routedCallsFy2021: 131835,
      callShareLabel: "7.1203%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $60 million",
      totalFundingMinorUnits: 6000000000,
      totalFundingPeriod: "FY26",
      summary: "New York, 988 is primarily funded by state general funds.",
    },
  },
  {
    placeKey: "US-OH",
    placeName: "Ohio",
    federal: {
      awardMinorUnits: 331509900,
      basis: "call-share",
      routedCallsFy2021: 60030,
      callShareLabel: "3.2422%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $48.5 million",
      totalFundingMinorUnits: 4850000000,
      totalFundingPeriod: "FY26-27",
      summary:
        "Ohio, 988 is primarily funded by state general funds with $25.5 million appropriated in FY26 and $23 million apprpriated in FY27.",
    },
  },
  {
    placeKey: "US-OK",
    placeName: "Oklahoma",
    federal: {
      awardMinorUnits: 104798600,
      basis: "call-share",
      routedCallsFy2021: 18977,
      callShareLabel: "1.0249%",
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-OR",
    placeName: "Oregon",
    federal: {
      awardMinorUnits: 211486000,
      basis: "call-share",
      routedCallsFy2021: 38296,
      callShareLabel: "2.0683%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY25-27 State Appropriation: None specified",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "Oregon, 988 is primarily funded by a $0.40 988 Telecom Fee which is expected to generate $58 million over the FY25-27 biennium.",
    },
  },
  {
    placeKey: "US-PA",
    placeName: "Pennsylvania",
    federal: {
      awardMinorUnits: 318786200,
      basis: "call-share",
      routedCallsFy2021: 57726,
      callShareLabel: "3.1177%",
    },
    state: {
      unreported:
        "Funded primarily by SAMHSA grants; the report gives FY26 total funding as unknown.",
    },
  },
  {
    placeKey: "US-PR",
    placeName: "Puerto Rico",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 2113,
      callShareLabel: null,
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-RI",
    placeName: "Rhode Island",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 4283,
      callShareLabel: null,
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary: "Rhode Island, 988 is primarily funded by other federal grants.",
    },
  },
  {
    placeKey: "US-SC",
    placeName: "South Carolina",
    federal: {
      awardMinorUnits: 139081700,
      basis: "call-share",
      routedCallsFy2021: 25185,
      callShareLabel: "1.3602%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $3.3 million",
      totalFundingMinorUnits: 610000000,
      totalFundingPeriod: "FY26",
      summary:
        "South Carolina, 988 is primarily funded by SAMHSA grants and state general funds.",
    },
  },
  {
    placeKey: "US-SD",
    placeName: "South Dakota",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 3696,
      callShareLabel: null,
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $1.46 million",
      totalFundingMinorUnits: 146000000,
      totalFundingPeriod: "FY26",
      summary:
        "South Dakota, 988 is primarily funded by other federal grants and state general funds.",
    },
  },
  {
    placeKey: "US-TN",
    placeName: "Tennessee",
    federal: {
      awardMinorUnits: 168814300,
      basis: "call-share",
      routedCallsFy2021: 30569,
      callShareLabel: "1.6510%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "Tennessee, 988 is primarily funded by SAMHSA grants and other federal grants, including a recurring 5% Community Mental Health Services Block Grant set aside.",
    },
  },
  {
    placeKey: "US-TX",
    placeName: "Texas",
    federal: {
      awardMinorUnits: 836787700,
      basis: "call-share",
      routedCallsFy2021: 151526,
      callShareLabel: "8.1837%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: None specified",
      totalFundingMinorUnits: 1088000000,
      totalFundingPeriod: "FY26-27",
      summary: "Texas, 988 is primarily funded by SAMHSA grants.",
    },
  },
  {
    placeKey: "US-UT",
    placeName: "Utah",
    federal: {
      awardMinorUnits: 140926200,
      basis: "call-share",
      routedCallsFy2021: 25519,
      callShareLabel: "1.3783%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: $9.76 million",
      totalFundingMinorUnits: 1213000000,
      totalFundingPeriod: "FY26",
      summary:
        "Utah, 988 is primarily funded by state general funds and other federal grants.",
    },
  },
  {
    placeKey: "US-VA",
    placeName: "Virginia",
    federal: {
      awardMinorUnits: 264351900,
      basis: "call-share",
      routedCallsFy2021: 47869,
      callShareLabel: "2.5853%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY25-26 State Appropriation: $2.1 million",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "Virginia, 988 is primarily funded by state general funds and a 988 telecom fee of $0.12 on postpaid wireless and $0.08 on prepaid wireless which generated $12.4 million in 2024.",
    },
  },
  {
    placeKey: "US-VI",
    placeName: "U.S. Virgin Islands",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 303,
      callShareLabel: null,
    },
    state: {
      unreported:
        "Not in the 2025 report (Vibrant could not verify Hawaii, Michigan, Nebraska, North Carolina or Oklahoma; territories and D.C. are not covered).",
    },
  },
  {
    placeKey: "US-VT",
    placeName: "Vermont",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 3027,
      callShareLabel: null,
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "Vermont, 988 is primarily funded by a $0.72 Telecom Fee that is used to fund several programs including 911.",
    },
  },
  {
    placeKey: "US-WA",
    placeName: "Washington",
    federal: {
      awardMinorUnits: 267472100,
      basis: "call-share",
      routedCallsFy2021: 48434,
      callShareLabel: "2.6159%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY25-27 State Appropriation: $130 million",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "Washington, 988 is primarily funded by a $0.40 988 Telecom Fee which is expected to generate $46.9 million in FY25.",
    },
  },
  {
    placeKey: "US-WI",
    placeName: "Wisconsin",
    federal: {
      awardMinorUnits: 178765700,
      basis: "call-share",
      routedCallsFy2021: 32371,
      callShareLabel: "1.7483%",
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY26-27 State Appropriation: $7 million",
      totalFundingMinorUnits: 1050000000,
      totalFundingPeriod: "FY26-27",
      summary:
        "Wisconsin, 988 is primarily funded by state general funds, other federal grants and SAMHSA grants.",
    },
  },
  {
    placeKey: "US-WV",
    placeName: "West Virginia",
    federal: {
      awardMinorUnits: 56113100,
      basis: "call-share",
      routedCallsFy2021: 10161,
      callShareLabel: "0.5488%",
    },
    state: {
      budgetCycle: "Annual",
      appropriationLabel: "FY26 State Appropriation: None specified",
      totalFundingMinorUnits: null,
      totalFundingPeriod: null,
      summary:
        "West Virginia, 988 is primarily funded by SAMHSA grants and other federal grants.",
    },
  },
  {
    placeKey: "US-WY",
    placeName: "Wyoming",
    federal: {
      awardMinorUnits: 25000000,
      basis: "base-award",
      routedCallsFy2021: 2882,
      callShareLabel: null,
    },
    state: {
      budgetCycle: "Biennial",
      appropriationLabel: "FY25 State Appropriation: $1.74 million*",
      totalFundingMinorUnits: 174000000,
      totalFundingPeriod: "FY25",
      summary: "Wyoming, 988 is primarily funded by state general funds.",
    },
  },
];
