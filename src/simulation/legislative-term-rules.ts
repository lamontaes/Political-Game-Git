/**
 * Sourced legislative term rules, as data.
 *
 * Kept apart from the term writers so a rule reader (the capability resolver)
 * can read the table without importing candidacy and the term transition
 * machinery. Absence stays unsupported rather than borrowing another state.
 */

import type { TermCommencementRule } from "./nationwide-world/state-executive-term-rules";

export const KY_TERM_RULE_VERSION = "ky-regular-term-2026-v1";
export const KS_TERM_RULE_VERSION = "ks-regular-term-2026-v1";
export const NE_TERM_RULE_VERSION = "ne-regular-term-2026-v1";

export interface LegislativeTermProfile {
  readonly officeKeys: readonly string[];
  readonly durationYears: number;
  readonly commencement: TermCommencementRule;
  readonly ruleVersion: string;
  readonly sourceUrl: string;
  readonly supportingSourceUrls?: readonly string[];
  readonly sourceNote: string;
  readonly sourceStatus:
    "admitted" | "official-primary-reviewed-not-source-admitted";
}

/** Only source-admitted terms may grant the existing supported-term capability. */
export const SUPPORTED_LEGISLATIVE_TERM_RULES: readonly LegislativeTermProfile[] =
  [
    {
      officeKeys: ["us-ky-general-assembly-v1:house"],
      durationYears: 2,
      commencement: { kind: "january-first-following-election" },
      ruleVersion: KY_TERM_RULE_VERSION,
      sourceUrl:
        "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
      sourceNote:
        "Kentucky Constitution §§30–31; LRC Legislative Handbook December 2025 p.3.",
      sourceStatus: "admitted",
    },
    {
      officeKeys: ["us-ky-general-assembly-v1:senate"],
      durationYears: 4,
      commencement: { kind: "january-first-following-election" },
      ruleVersion: KY_TERM_RULE_VERSION,
      sourceUrl:
        "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
      sourceNote:
        "Kentucky Constitution §§30–31; LRC Legislative Handbook December 2025 p.3.",
      sourceStatus: "admitted",
    },
  ];

/** Reviewed primary facts used by this bounded runtime profile, not admitted law. */
export const REVIEWED_LEGISLATIVE_TERM_PROFILES: readonly LegislativeTermProfile[] =
  [
    {
      officeKeys: ["us-ks-legislature-profile-v1:house"],
      durationYears: 2,
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 2,
        weekday: 1,
        offsetDays: 0,
      },
      ruleVersion: KS_TERM_RULE_VERSION,
      sourceUrl:
        "https://sos.ks.gov/publications/kansas-constitution/kansas-constitution-article-2.html",
      sourceNote:
        "Kansas Constitution art. II §2, House term and commencement.",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    },
    {
      officeKeys: ["us-ks-legislature-profile-v1:senate"],
      durationYears: 4,
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 2,
        weekday: 1,
        offsetDays: 0,
      },
      ruleVersion: KS_TERM_RULE_VERSION,
      sourceUrl:
        "https://sos.ks.gov/publications/kansas-constitution/kansas-constitution-article-2.html",
      sourceNote:
        "Kansas Constitution art. II §2, Senate term and commencement.",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    },
    {
      officeKeys: ["us-ne-legislature-v1:legislature"],
      durationYears: 4,
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 1,
        weekday: 2,
        offsetDays: 2,
      },
      ruleVersion: NE_TERM_RULE_VERSION,
      sourceUrl:
        "https://nebraskalegislature.gov/laws/articles.php?article=XVII-5",
      supportingSourceUrls: [
        "https://nebraskalegislature.gov/laws/statutes.php?statute=32-508",
      ],
      sourceNote:
        "Neb. Const. art. XVII §5 fixes commencement; Neb. Rev. Stat. §32-508 fixes the four-year legislative term.",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    },
  ];

/**
 * The blanket rule for a state legislature with no sourced term rule above.
 *
 * NOT RESEARCHED PER STATE. Without it a winner in such a state was seated on
 * election night, which no state does and which DEPTH2 A08 rules out: the
 * result grants no authority, the term does. So every such seat begins on the
 * first of January after the election, the date Kentucky's sourced rule uses,
 * and lasts the office's recorded term length where the qualification corpus
 * knows it; otherwise two years for a lower chamber and four for a senate or a
 * unicameral legislature, the common American pattern. This is wrong in some
 * states (Nevada's members take office the day after the election) and is
 * replaced office by office as sourced rows are added above; a sourced row
 * always wins. Filed with research as legislative-winner-between-election-and-seat.
 */
export const BLANKET_LEGISLATIVE_TERM_RULE_VERSION =
  "blanket-legislative-term-2026-v1";

export function blanketLegislativeTermYears(
  officeKey: string,
  knownTermYears: number | null,
): number {
  if (knownTermYears !== null) return knownTermYears;
  const chamber = officeKey.split(":").at(-1);
  return chamber === "house" || chamber === "assembly" ? 2 : 4;
}

/**
 * Election cycle facts for state legislative chambers. A placeholder row is
 * intentionally not a default: consumers must not treat missing cohort data
 * or a placeholder commencement as a legal fact.
 */
export type StateLegislativeCohortSelection =
  | { readonly kind: "all" }
  | { readonly kind: "district-parity"; readonly parity: "even" | "odd" }
  | { readonly kind: "district-list"; readonly districts: readonly number[] }
  | {
      readonly kind: "district-code-list";
      readonly districtCodes: readonly string[];
    }
  | {
      readonly kind: "district-complement";
      readonly districts: readonly number[];
    }
  | {
      readonly kind: "seat-slot";
      readonly slot: 1 | 2;
      readonly basis: "PLACEHOLDER(wave2)";
    };

export interface StateLegislativeCohortSchedule {
  readonly periodYears: 2 | 4 | 10;
  readonly referenceYear: number;
  readonly phases: readonly {
    readonly offsetYears: number;
    readonly termYears: 2 | 4;
  }[];
}

export interface StateLegislativeChamberCycle {
  readonly stateUsps: string;
  readonly chamberKey: "house" | "senate" | "assembly" | "legislature";
  readonly seatCount: number;
  readonly cohorts: readonly {
    readonly selection: StateLegislativeCohortSelection;
    readonly schedule: StateLegislativeCohortSchedule;
  }[];
  readonly commencement:
    | TermCommencementRule
    | { readonly kind: "day-after-election" }
    | { readonly kind: "day-of-election" }
    | { readonly kind: "days-after-election"; readonly days: number }
    | null;
  readonly commencementBasis:
    "official-primary-reviewed-not-source-admitted" | "PLACEHOLDER(wave2)";
  readonly sourceStatus:
    "official-primary-reviewed-not-source-admitted" | "PLACEHOLDER(wave2)";
  readonly sourceUrls: readonly string[];
  readonly sourceLocator: string;
}

/**
 * Wave 2 chamber-cycle inventory. Every admitted cohort row has a cited
 * official election-cycle source. A missing commencement remains explicitly
 * PLACEHOLDER(wave2); it does not establish a legal term-start date. Empty
 * `cohorts` means unknown, not that no regular election occurs.
 */
const PLACEHOLDER_STATE_LEGISLATIVE_CHAMBER_CYCLES: readonly StateLegislativeChamberCycle[] =
  [
    ...[
      ["AL", 105, 35],
      ["AK", 40, 20],
      ["AZ", 60, 30],
      ["AR", 100, 35],
      ["CA", 80, 40],
      ["CO", 65, 35],
      ["CT", 151, 36],
      ["DE", 41, 21],
      ["FL", 120, 40],
      ["GA", 180, 56],
      ["HI", 51, 25],
      ["ID", 70, 35],
      ["IL", 118, 59],
      ["IN", 100, 50],
      ["IA", 100, 50],
      ["KS", 125, 40],
      ["KY", 100, 38],
      ["LA", 105, 39],
      ["ME", 151, 35],
      ["MD", 141, 47],
      ["MA", 160, 40],
      ["MI", 110, 38],
      ["MN", 134, 67],
      ["MS", 122, 52],
      ["MO", 163, 34],
      ["MT", 100, 50],
      ["NE", 49, 0],
      ["NV", 42, 21],
      ["NH", 400, 24],
      ["NJ", 80, 40],
      ["NM", 70, 42],
      ["NY", 150, 63],
      ["NC", 120, 50],
      ["ND", 94, 47],
      ["OH", 99, 33],
      ["OK", 101, 48],
      ["OR", 60, 30],
      ["PA", 203, 50],
      ["RI", 75, 38],
      ["SC", 124, 46],
      ["SD", 70, 35],
      ["TN", 99, 33],
      ["TX", 150, 31],
      ["UT", 75, 29],
      ["VT", 150, 30],
      ["VA", 100, 40],
      ["WA", 98, 49],
      ["WV", 100, 34],
      ["WI", 99, 33],
      ["WY", 62, 31],
    ].flatMap(([state, houseSeats, senateSeats]) => {
      const stateUsps = state as string;
      const rows: StateLegislativeChamberCycle[] = [
        {
          stateUsps,
          chamberKey: stateUsps === "NV" ? "assembly" : "house",
          seatCount: houseSeats as number,
          cohorts: [],
          commencement: null,
          commencementBasis: "PLACEHOLDER(wave2)",
          sourceStatus: "PLACEHOLDER(wave2)",
          sourceUrls: [],
          sourceLocator:
            "UNKNOWN: chamber-specific official cohort and commencement source not yet reviewed",
        },
      ];
      if ((senateSeats as number) > 0) {
        rows.push({
          stateUsps,
          chamberKey: "senate",
          seatCount: senateSeats as number,
          cohorts: [],
          commencement: null,
          commencementBasis: "PLACEHOLDER(wave2)",
          sourceStatus: "PLACEHOLDER(wave2)",
          sourceUrls: [],
          sourceLocator:
            "UNKNOWN: chamber-specific official cohort and commencement source not yet reviewed",
        });
      } else {
        rows[0] = {
          ...rows[0]!,
          chamberKey: "legislature",
          sourceLocator:
            "UNKNOWN: unicameral chamber-specific official cohort and commencement source not yet reviewed",
        };
      }
      return rows;
    }),
  ] as const;

const evenYearAllSeats = {
  selection: { kind: "all" as const },
  schedule: {
    periodYears: 2 as const,
    referenceYear: 2026,
    phases: [{ offsetYears: 0, termYears: 2 as const }],
  },
};

const senateTwoClassSchedule = (referenceYear = 2026) => ({
  periodYears: 4 as const,
  referenceYear,
  phases: [{ offsetYears: 0, termYears: 4 as const }],
});

const reviewed = (
  row: Omit<
    StateLegislativeChamberCycle,
    "sourceStatus" | "commencementBasis"
  > & {
    readonly commencementBasis?: StateLegislativeChamberCycle["commencementBasis"];
  },
): StateLegislativeChamberCycle => ({
  ...row,
  commencementBasis: row.commencementBasis ?? "PLACEHOLDER(wave2)",
  sourceStatus: "official-primary-reviewed-not-source-admitted",
});

const verifiedCycleRows: readonly StateLegislativeChamberCycle[] = [
  reviewed({
    stateUsps: "AK",
    chamberKey: "house",
    seatCount: 40,
    cohorts: [evenYearAllSeats],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 3,
      weekday: 2,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://www.akleg.gov/statutesPDF/Title-24.pdf",
      "https://akleg.gov/docs/pdf/AK_Const_layout.pdf",
    ],
    sourceLocator:
      "Alaska Constitution art. II §3 and AS 24.05.080: 40 House members, two-year terms, term begins third Tuesday in January; all House seats elected every even year.",
  }),
  reviewed({
    stateUsps: "AK",
    chamberKey: "senate",
    seatCount: 20,
    cohorts: [
      {
        selection: {
          kind: "district-code-list",
          districtCodes: ["A", "C", "E", "G", "I", "K", "M", "O", "Q", "S"],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-code-list",
          districtCodes: ["B", "D", "F", "H", "J", "L", "N", "P", "R", "T"],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.elections.alaska.gov/candidates/?election=26genr",
      "https://akleg.gov/pages/legbranch.php",
    ],
    sourceLocator:
      "Alaska Division of Elections 2026 General candidate list, Senate District headings: A,C,E,G,I,K,M,O,Q,S have candidates; Alaska Legislature legislative-branch page: 20 districts, four-year Senate terms, half elected every two years. Alphabetic complementary cohort B,D,F,H,J,L,N,P,R,T is due 2028/32; 2026/30 codes are literal district identities.",
  }),
  reviewed({
    stateUsps: "NJ",
    chamberKey: "house",
    seatCount: 80,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 2,
          referenceYear: 2027,
          phases: [{ offsetYears: 0, termYears: 2 }],
        },
      },
    ],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 2,
      weekday: 2,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: ["https://www.njleg.state.nj.us/constitution"],
    sourceLocator:
      "New Jersey Constitution art. IV §II ¶4: two Assembly members per district, two-year terms beginning noon on second Tuesday in January; Legislature cycle is odd-year elections.",
  }),
  reviewed({
    stateUsps: "NJ",
    chamberKey: "senate",
    seatCount: 40,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 10,
          referenceYear: 2027,
          phases: [
            { offsetYears: 0, termYears: 4 },
            { offsetYears: 4, termYears: 2 },
            { offsetYears: 6, termYears: 4 },
          ],
        },
      },
    ],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 2,
      weekday: 2,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: ["https://www.njleg.state.nj.us/constitution"],
    sourceLocator:
      "New Jersey Constitution art. IV §II ¶2: Senate four-year terms except term beginning second January after decennial census is two years; applying 2020/2030 census cycle gives 2027 election four-year, 2031 two-year, 2033 four-year. Terms begin noon second Tuesday January after election.",
  }),
  reviewed({
    stateUsps: "OH",
    chamberKey: "house",
    seatCount: 99,
    cohorts: [evenYearAllSeats],
    commencement: { kind: "january-first-following-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: ["https://codes.ohio.gov/ohio-constitution/section-2.2"],
    sourceLocator:
      "Ohio Constitution art. II §2: Representatives elected biennially; two-year terms begin January 1 following election.",
  }),
  reviewed({
    stateUsps: "OH",
    chamberKey: "senate",
    seatCount: 33,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "january-first-following-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://codes.ohio.gov/ohio-constitution/section-2.2",
      "https://www.ohiosos.gov/assets/candidate-requirement-guide-2026.pdf",
    ],
    sourceLocator:
      "Ohio Constitution art. II §2: Senators four-year terms, Jan. 1 commencement. 2026 candidate guide / district map uses 2024–2032 Senate district plan; 2026 cohort odd-numbered districts; even-numbered districts are 2028 complement.",
  }),
  reviewed({
    stateUsps: "NV",
    chamberKey: "assembly",
    seatCount: 42,
    cohorts: [evenYearAllSeats],
    commencement: { kind: "day-after-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://epubs.nsla.nv.gov/statepubs/epubs/779609-2024.pdf",
      "https://www.leg.state.nv.us/Const/NVConst.html",
    ],
    sourceLocator:
      "Nevada Legislative Manual 2024 pp. 37–38 and Nevada Constitution art. 4 §4: Assembly members serve two-year terms, all Assembly seats due in each even-year election; terms begin day after election.",
  }),
  reviewed({
    stateUsps: "WV",
    chamberKey: "house",
    seatCount: 100,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.wvlegislature.gov/laws1/constitution/constitution.htm",
    ],
    sourceLocator:
      "West Virginia Constitution art. VI §§4, 16: House of Delegates two-year terms; all 100 seats elected every even year.",
  }),
  reviewed({
    stateUsps: "WV",
    chamberKey: "senate",
    seatCount: 34,
    cohorts: [
      {
        selection: { kind: "seat-slot", slot: 1, basis: "PLACEHOLDER(wave2)" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "seat-slot", slot: 2, basis: "PLACEHOLDER(wave2)" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://code.wvlegislature.org/west-virginia-constitution",
      "https://code.wvlegislature.org/3-1-16/",
    ],
    sourceLocator:
      "West Virginia Constitution art. VI §4: every district elects two senators; art. VI §6: senators are split by district into two classes and one half are elected biennially after the initial class drawing. W. Va. Code §3-1-16(a): a Senate member is elected from each senatorial district every second year. Specific current seat-slot assignment is an explicit PLACEHOLDER(wave2), not sourced.",
  }),
  reviewed({
    stateUsps: "KS",
    chamberKey: "house",
    seatCount: 125,
    cohorts: [evenYearAllSeats],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 2,
      weekday: 1,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://sos.ks.gov/publications/kansas-constitution/kansas-constitution-article-2.html",
    ],
    sourceLocator:
      "Kansas Constitution art. II §2: House members serve two-year terms, commencing second Monday in January; regular House election every even year.",
  }),
  reviewed({
    stateUsps: "KS",
    chamberKey: "senate",
    seatCount: 40,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2024,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 2,
      weekday: 1,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://sos.ks.gov/publications/kansas-constitution/kansas-constitution-article-2.html",
    ],
    sourceLocator:
      "Kansas Constitution art. II §2: Senate members serve four-year terms, commencing second Monday in January; all 40 Senate districts next elect in 2028 after 2024.",
  }),
  reviewed({
    stateUsps: "NE",
    chamberKey: "legislature",
    seatCount: 49,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 1,
      weekday: 2,
      offsetDays: 2,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://nebraskalegislature.gov/laws/articles.php?article=XVII-5",
      "https://nebraskalegislature.gov/laws/statutes.php?statute=32-508",
    ],
    sourceLocator:
      "Nebraska Constitution art. XVII §5 and Neb. Rev. Stat. §32-508: four-year unicameral terms; first Thursday after first Tuesday in January. Election classes: even districts due 2026/30, odd due 2028/32.",
  }),
  reviewed({
    stateUsps: "IA",
    chamberKey: "house",
    seatCount: 100,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.legis.iowa.gov/docs/publications/IF/782980.pdf"],
    sourceLocator:
      "Iowa Legislature guide: Representatives serve two-year terms; all House districts elect every two years.",
  }),
  reviewed({
    stateUsps: "IA",
    chamberKey: "senate",
    seatCount: 50,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [
            1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35,
            37, 39, 41, 43, 45, 47, 49,
          ],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [
            1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35,
            37, 39, 41, 43, 45, 47, 49,
          ],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.legis.iowa.gov/docs/publications/IF/782980.pdf",
      "https://www.legis.iowa.gov/docs/publications/LG/9461.pdf",
    ],
    sourceLocator:
      "Iowa Legislature guide states odd Senate district elections occur in midterm years and even districts in presidential years; 2026 odd / 2028 even, four-year stagger.",
  }),
  reviewed({
    stateUsps: "KY",
    chamberKey: "house",
    seatCount: 100,
    cohorts: [evenYearAllSeats],
    commencement: { kind: "january-first-following-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
    ],
    sourceLocator:
      "Kentucky Constitution §§30–31; LRC Legislative Handbook Dec. 2025 p.3: House members serve two-year terms beginning January 1 after election.",
  }),
  reviewed({
    stateUsps: "KY",
    chamberKey: "senate",
    seatCount: 38,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "january-first-following-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://legislature.ky.gov/LRC/Publications/Documents/Legislative%20Handbook.pdf",
    ],
    sourceLocator:
      "Kentucky Constitution §§30–31; LRC Legislative Handbook Dec. 2025 p.3: Senate four-year terms, January 1 commencement; even districts 2026/30, odd districts 2028/32.",
  }),
  reviewed({
    stateUsps: "MO",
    chamberKey: "house",
    seatCount: 163,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.sos.mo.gov/CMSImages/Publications/GARoster/2026GARoster.pdf",
    ],
    sourceLocator:
      "Missouri 2026 General Assembly Roster: House district election cycles are biennial; state House elected in even years.",
  }),
  reviewed({
    stateUsps: "MO",
    chamberKey: "senate",
    seatCount: 34,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.sos.mo.gov/CMSImages/Publications/GARoster/2026GARoster.pdf",
    ],
    sourceLocator:
      "Missouri 2026 General Assembly Roster: Senate terms expire Jan. 2027 for even-numbered districts and Jan. 2029 for odd-numbered districts; four-year recurrence.",
  }),
  reviewed({
    stateUsps: "MI",
    chamberKey: "house",
    seatCount: 110,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.legislature.mi.gov/documents/2023-2024/michiganmanual/2023-MM-Chapter3.pdf",
    ],
    sourceLocator:
      "Michigan Manual, Chapter 3: House has 110 members, elected to two-year terms in even-year general elections.",
  }),
  reviewed({
    stateUsps: "MI",
    chamberKey: "senate",
    seatCount: 38,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2026,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.legislature.mi.gov/documents/2023-2024/michiganmanual/2023-MM-Chapter3.pdf",
    ],
    sourceLocator:
      "Michigan Manual, Chapter 3: Senate has 38 members with four-year terms; all districts next elect together in 2026 and 2030.",
  }),
  reviewed({
    stateUsps: "LA",
    chamberKey: "house",
    seatCount: 105,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2027,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: ["https://legis.la.gov/legis/Laws.aspx?d=206007"],
    sourceLocator:
      "Louisiana Constitution art. III §3: House four-year terms; statewide legislative cycle elections in 2027/31.",
  }),
  reviewed({
    stateUsps: "LA",
    chamberKey: "senate",
    seatCount: 39,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2027,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: ["https://legis.la.gov/legis/Laws.aspx?d=206007"],
    sourceLocator:
      "Louisiana Constitution art. III §3: Senate four-year terms; statewide legislative cycle elections in 2027/31.",
  }),
  reviewed({
    stateUsps: "MS",
    chamberKey: "house",
    seatCount: 122,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2027,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.sos.ms.gov/sites/default/files/publications/Mississippi_Constitution.pdf",
      "https://www.sos.ms.gov/sites/default/files/publications/State%20%26%20County%20Officials_2026.pdf",
    ],
    sourceLocator:
      "Mississippi Constitution art. 4 §36 and official State/County Officials election calendar: House four-year terms, next regular statewide legislative election 2027, then 2031.",
  }),
  reviewed({
    stateUsps: "MS",
    chamberKey: "senate",
    seatCount: 52,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2027,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.sos.ms.gov/sites/default/files/publications/Mississippi_Constitution.pdf",
      "https://www.sos.ms.gov/sites/default/files/publications/State%20%26%20County%20Officials_2026.pdf",
    ],
    sourceLocator:
      "Mississippi Constitution art. 4 §36 and official State/County Officials election calendar: Senate four-year terms, next regular statewide legislative election 2027, then 2031.",
  }),
  reviewed({
    stateUsps: "MD",
    chamberKey: "house",
    seatCount: 141,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2026,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: ["https://mgaleg.maryland.gov/mgawebsite/Members/About"],
    sourceLocator:
      "Maryland General Assembly About page: all 141 House and 47 Senate members serve four-year terms; next election in November 2026, then 2030.",
  }),
  reviewed({
    stateUsps: "MD",
    chamberKey: "senate",
    seatCount: 47,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2026,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: ["https://mgaleg.maryland.gov/mgawebsite/Members/About"],
    sourceLocator:
      "Maryland General Assembly About page: all 141 House and 47 Senate members serve four-year terms; next election in November 2026, then 2030.",
  }),
  reviewed({
    stateUsps: "NM",
    chamberKey: "house",
    seatCount: 70,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.sos.nm.gov/wp-content/uploads/2025/01/NM_Constitution_-2025-for-SOS.pdf",
    ],
    sourceLocator:
      "New Mexico Constitution art. IV §3: House members two-year terms; regular general elections even years.",
  }),
  reviewed({
    stateUsps: "NM",
    chamberKey: "senate",
    seatCount: 42,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2028,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.sos.nm.gov/wp-content/uploads/2025/01/NM_Constitution_-2025-for-SOS.pdf",
    ],
    sourceLocator:
      "New Mexico Constitution art. IV §3: Senate four-year terms; statewide Senate seats share the four-year 2028/32 cycle.",
  }),
  reviewed({
    stateUsps: "SC",
    chamberKey: "house",
    seatCount: 124,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.scstatehouse.gov/studentpage/coolstuff/faqs.shtml",
    ],
    sourceLocator:
      "South Carolina Constitution art. III §2: House members are chosen every second year; all 124 House districts due in even-year elections.",
  }),
  reviewed({
    stateUsps: "SC",
    chamberKey: "senate",
    seatCount: 46,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2028,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.scstatehouse.gov/senate.php",
      "https://www.scstatehouse.gov/studentpage/coolstuff/faqs.shtml",
    ],
    sourceLocator:
      "South Carolina Constitution art. III §6 and official Senate page: all 46 Senators serve four-year terms; statewide Senate cycle due 2028/32.",
  }),
  reviewed({
    stateUsps: "RI",
    chamberKey: "house",
    seatCount: 75,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://webserver.rilegislature.gov/Statutes/Constitution.htm",
    ],
    sourceLocator:
      "Rhode Island Constitution art. IV §1: Representatives elected biennially; two-year terms.",
  }),
  reviewed({
    stateUsps: "RI",
    chamberKey: "senate",
    seatCount: 38,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://webserver.rilegislature.gov/Statutes/Constitution.htm",
    ],
    sourceLocator:
      "Rhode Island Constitution art. IV §1: Senators elected biennially; two-year terms.",
  }),
  reviewed({
    stateUsps: "NY",
    chamberKey: "house",
    seatCount: 150,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://elections.ny.gov/nys-constitution"],
    sourceLocator:
      "New York Constitution art. III §2: Assembly members elected biennially for two-year terms.",
  }),
  reviewed({
    stateUsps: "NY",
    chamberKey: "senate",
    seatCount: 63,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://elections.ny.gov/nys-constitution"],
    sourceLocator:
      "New York Constitution art. III §2: Senators elected biennially for two-year terms.",
  }),
  reviewed({
    stateUsps: "NC",
    chamberKey: "house",
    seatCount: 120,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.ncleg.gov/Laws/Constitution/Article2"],
    sourceLocator:
      "North Carolina Constitution art. II §3: House members elected every two years.",
  }),
  reviewed({
    stateUsps: "NC",
    chamberKey: "senate",
    seatCount: 50,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.ncleg.gov/Laws/Constitution/Article2"],
    sourceLocator:
      "North Carolina Constitution art. II §3: Senators elected every two years.",
  }),
  reviewed({
    stateUsps: "ME",
    chamberKey: "house",
    seatCount: 151,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://legislature.maine.gov/legis/const/"],
    sourceLocator:
      "Maine Constitution art. IV pt. 1 §2: House elected biennially.",
  }),
  reviewed({
    stateUsps: "ME",
    chamberKey: "senate",
    seatCount: 35,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://legislature.maine.gov/legis/const/"],
    sourceLocator:
      "Maine Constitution art. IV pt. 2 §2: Senate elected biennially.",
  }),
  reviewed({
    stateUsps: "MA",
    chamberKey: "house",
    seatCount: 160,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://malegislature.gov/Laws/Constitution"],
    sourceLocator:
      "Massachusetts Constitution amendments and legislative terms: Representatives elected biennially.",
  }),
  reviewed({
    stateUsps: "MA",
    chamberKey: "senate",
    seatCount: 40,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://malegislature.gov/Laws/Constitution"],
    sourceLocator:
      "Massachusetts Constitution amendments and legislative terms: Senators elected biennially.",
  }),
  reviewed({
    stateUsps: "NH",
    chamberKey: "house",
    seatCount: 400,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.nh.gov/glance/constitution.htm"],
    sourceLocator:
      "New Hampshire Constitution part 2, arts. 9 and 26: House elected biennially; 400 seats.",
  }),
  reviewed({
    stateUsps: "NH",
    chamberKey: "senate",
    seatCount: 24,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.nh.gov/glance/constitution.htm"],
    sourceLocator:
      "New Hampshire Constitution part 2, arts. 26 and 28: Senators elected biennially; 24 seats.",
  }),
  reviewed({
    stateUsps: "ID",
    chamberKey: "house",
    seatCount: 70,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://legislature.idaho.gov/statutesrules/idconst/"],
    sourceLocator:
      "Idaho Constitution art. III §§2–3: House membership elected biennially.",
  }),
  reviewed({
    stateUsps: "ID",
    chamberKey: "senate",
    seatCount: 35,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://legislature.idaho.gov/statutesrules/idconst/"],
    sourceLocator:
      "Idaho Constitution art. III §§2–3: Senators elected biennially.",
  }),
  reviewed({
    stateUsps: "SD",
    chamberKey: "house",
    seatCount: 70,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://sdlegislature.gov/Constitution/Article3"],
    sourceLocator:
      "South Dakota Constitution art. III §5: House members serve two-year terms, all elected in even years.",
  }),
  reviewed({
    stateUsps: "SD",
    chamberKey: "senate",
    seatCount: 35,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://sdlegislature.gov/Constitution/Article3"],
    sourceLocator:
      "South Dakota Constitution art. III §5: Senators serve two-year terms, all elected in even years.",
  }),
  reviewed({
    stateUsps: "ND",
    chamberKey: "house",
    seatCount: 94,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://ndlegis.gov/constitution/constitution.pdf"],
    sourceLocator:
      "North Dakota Constitution art. IV §2: all 94 House seats are elected biennially; two Representatives per district (A/B slots are distinct seats, both due each cycle).",
  }),
  reviewed({
    stateUsps: "ND",
    chamberKey: "senate",
    seatCount: 47,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://ndlegis.gov/constitution/constitution.pdf",
      "https://vip.sos.nd.gov/pdfs/Portals/qual-terms-elec.pdf",
      "https://vip.sos.nd.gov/pdfs/portals/Election%20Voting%20FAQs%20Voters.pdf",
    ],
    sourceLocator:
      "North Dakota Constitution art. IV §2 and SOS Qualifications and Terms of Office for all Elected Positions: four-year Senate terms. SOS Elections & Voting FAQs, ‘Legislative Races Rotate’: odd-numbered districts are midterm elections and even-numbered districts are presidential elections, establishing odd districts due 2026/30 and even districts 2028/32. District key is Senate district, not House seat slot.",
  }),
  reviewed({
    stateUsps: "OK",
    chamberKey: "house",
    seatCount: 101,
    cohorts: [evenYearAllSeats],
    commencement: { kind: "days-after-election", days: 15 },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://oklahoma.gov/content/dam/ok/en/elections/terms-of-office/2023-terms-of-office.pdf",
    ],
    sourceLocator:
      "Oklahoma State Election Board 2023 Terms of Office, Legislative table: House two-year terms, all districts in even years; terms begin 15th day after general election.",
  }),
  reviewed({
    stateUsps: "OK",
    chamberKey: "senate",
    seatCount: 48,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "days-after-election", days: 15 },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://oklahoma.gov/content/dam/ok/en/elections/terms-of-office/2023-terms-of-office.pdf",
    ],
    sourceLocator:
      "Oklahoma State Election Board 2023 Terms of Office, Legislative table: Senate even districts 2026, odd districts 2028; four-year terms, beginning 15th day after general election.",
  }),
  reviewed({
    stateUsps: "TN",
    chamberKey: "house",
    seatCount: 99,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://capitol.tn.gov/Archives/Senate/107GA/publications/107th%20New%20Senator%20Directory%20-%20Web.pdf",
    ],
    sourceLocator:
      "Tennessee Senate directory documents four-year Senate terms and alternating parity; House terms are biennial under the state constitution.",
  }),
  reviewed({
    stateUsps: "TN",
    chamberKey: "senate",
    seatCount: 33,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://capitol.tn.gov/Archives/Senate/107GA/publications/107th%20New%20Senator%20Directory%20-%20Web.pdf",
    ],
    sourceLocator:
      "Tennessee Senate directory: even-numbered districts elected together, odd districts two years later; four-year terms. Current 2026/28 anchor follows that class cycle.",
  }),
  reviewed({
    stateUsps: "PA",
    chamberKey: "house",
    seatCount: 203,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.pa.gov/content/dam/copapwp-pagov/en/dgs/documents/publications/documents/pa-manual-v-126.pdf",
    ],
    sourceLocator:
      "Pennsylvania Manual v126 p.103 and state Constitution art. II: House members elected every two years.",
  }),
  reviewed({
    stateUsps: "PA",
    chamberKey: "senate",
    seatCount: 50,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.pa.gov/content/dam/copapwp-pagov/en/dgs/documents/publications/documents/pa-manual-v-126.pdf",
    ],
    sourceLocator:
      "Pennsylvania Manual v126 p.103, election section: Senate term four years; odd districts due 2026/30, even districts 2028/32.",
  }),
  reviewed({
    stateUsps: "AL",
    chamberKey: "house",
    seatCount: 105,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2026,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: ["https://alison.legislature.state.al.us/legislative-process"],
    sourceLocator:
      "Alabama Legislature legislative-process page: legislators serve four-year terms; House and Senate election years coincide.",
  }),
  reviewed({
    stateUsps: "AL",
    chamberKey: "senate",
    seatCount: 35,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2026,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://alison.legislature.state.al.us/legislative-process",
      "https://alison.legislature.state.al.us/senate",
    ],
    sourceLocator:
      "Alabama Legislature legislative-process/Senate pages: four-year terms; Senate members take office on election day and all seats recur together.",
  }),
  reviewed({
    stateUsps: "AZ",
    chamberKey: "house",
    seatCount: 60,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.azleg.gov/const/4/21.p2.htm"],
    sourceLocator:
      "Arizona Constitution art. IV, pt. 2, §21: House members serve two-year terms; regular legislative elections recur each even year.",
  }),
  reviewed({
    stateUsps: "AZ",
    chamberKey: "senate",
    seatCount: 30,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.azleg.gov/const/4/21.p2.htm"],
    sourceLocator:
      "Arizona Constitution art. IV, pt. 2, §21: Senate members serve two-year terms; regular legislative elections recur each even year.",
  }),
  reviewed({
    stateUsps: "AR",
    chamberKey: "house",
    seatCount: 100,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.sos.arkansas.gov/uploads/elections/Arkansas_Election_Laws_and_Constitution_2025_Edition.pdf",
    ],
    sourceLocator:
      "Arkansas Constitution amend. 23 §6: Representatives elected at general election; House terms begin January 1 following election; official election schedule is biennial.",
  }),
  reviewed({
    stateUsps: "AR",
    chamberKey: "senate",
    seatCount: 35,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [
            2, 7, 9, 10, 11, 13, 14, 15, 16, 21, 24, 27, 28, 30, 31, 32, 35,
          ],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [
            2, 7, 9, 10, 11, 13, 14, 15, 16, 21, 24, 27, 28, 30, 31, 32, 35,
          ],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "january-first-following-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://www.sos.arkansas.gov/uploads/elections/Arkansas_Election_Laws_and_Constitution_2025_Edition.pdf",
      "https://sbec.arkansas.gov/wp-content/uploads/2025-Running-for-Public-Office-8-13-25-FINAL-small.pdf",
    ],
    sourceLocator:
      "Arkansas Constitution art. 5 §3: four-year Senate terms; election board Offices Up for Election table identifies the listed 17 districts for 2026. Remaining districts are the 2028 cohort.",
  }),
  reviewed({
    stateUsps: "CT",
    chamberKey: "house",
    seatCount: 151,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.cga.ct.gov/asp/content/constitutions/CTConstitution.htm",
    ],
    sourceLocator:
      "Connecticut Constitution art. III §§2–3: Representatives serve two-year terms; elections recur in even-numbered years.",
  }),
  reviewed({
    stateUsps: "CT",
    chamberKey: "senate",
    seatCount: 36,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.cga.ct.gov/asp/content/constitutions/CTConstitution.htm",
    ],
    sourceLocator:
      "Connecticut Constitution art. III §§2–3: Senators serve two-year terms; elections recur in even-numbered years.",
  }),
  reviewed({
    stateUsps: "GA",
    chamberKey: "house",
    seatCount: 180,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://sos.ga.gov/sites/default/files/2022-02/Georgia_Constitution.pdf",
    ],
    sourceLocator:
      "Georgia Constitution art. III §2: House members serve two-year terms; regular elections recur in even-numbered years.",
  }),
  reviewed({
    stateUsps: "GA",
    chamberKey: "senate",
    seatCount: 56,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://sos.ga.gov/sites/default/files/2022-02/Georgia_Constitution.pdf",
    ],
    sourceLocator:
      "Georgia Constitution art. III §2: Senators serve two-year terms; regular elections recur in even-numbered years.",
  }),
  reviewed({
    stateUsps: "HI",
    chamberKey: "house",
    seatCount: 51,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://elections.hawaii.gov/wp-content/uploads/2026-Candidates-Manual.pdf",
    ],
    sourceLocator:
      "Hawaii Office of Elections 2026 Candidates Manual: all 51 House districts, two-year terms (2026–2028).",
  }),
  reviewed({
    stateUsps: "HI",
    chamberKey: "senate",
    seatCount: 25,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [2, 5, 8, 9, 10, 11, 13, 14, 15, 17, 20, 21, 25],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [2, 5, 8, 9, 10, 11, 13, 14, 15, 17, 20, 21, 25],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "day-of-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://elections.hawaii.gov/2026-proclamation/",
      "https://elections.hawaii.gov/state-senate/",
    ],
    sourceLocator:
      "Hawaii 2026 Proclamation lists regular Senate districts 2,5,8,9,10,11,13,14,15,17,20,21,25 for four-year terms Nov 3 2026–Nov 5 2030; district 19 is a separate two-year vacancy election. State Senate page explains 2022 redistricting transition and four-year term beginning on general-election date.",
  }),
  reviewed({
    stateUsps: "IL",
    chamberKey: "senate",
    seatCount: 59,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [
            2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53,
            56, 59,
          ],
        },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 4 },
            { offsetYears: 4, termYears: 4 },
            { offsetYears: 8, termYears: 2 },
          ],
        },
      },
      {
        selection: {
          kind: "district-list",
          districts: [
            3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54,
            57,
          ],
        },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 4 },
            { offsetYears: 4, termYears: 2 },
            { offsetYears: 6, termYears: 4 },
          ],
        },
      },
      {
        selection: {
          kind: "district-complement",
          districts: [
            2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27,
            29, 30, 32, 33, 35, 36, 38, 39, 41, 42, 44, 45, 47, 48, 50, 51, 53,
            54, 56, 57, 59,
          ],
        },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 2 },
            { offsetYears: 2, termYears: 4 },
            { offsetYears: 6, termYears: 4 },
          ],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://ilga.gov/documents/legislation/ilcs/documents/001000050K29C-10.htm",
    ],
    sourceLocator:
      "10 ILCS 5/29C-10: exact district groups; A=2022/26/30 terms 4/4/2, B=2022/26/28/32 terms 4/2/4, C=2022/24/28/32 terms 2/4/4.",
  }),
  reviewed({
    stateUsps: "IL",
    chamberKey: "house",
    seatCount: 118,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://www.ilga.gov/commission/lrb/con4.htm"],
    sourceLocator:
      "Illinois Constitution art. IV §2(b): one Representative from each Representative District is elected every two years for a two-year term; applies to all 118 districts.",
  }),
  reviewed({
    stateUsps: "IN",
    chamberKey: "senate",
    seatCount: 50,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [
            1, 4, 6, 11, 14, 15, 17, 19, 21, 22, 23, 25, 26, 27, 29, 31, 38, 39,
            41, 43, 45, 46, 47, 48, 49,
          ],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [
            1, 4, 6, 11, 14, 15, 17, 19, 21, 22, 23, 25, 26, 27, 29, 31, 38, 39,
            41, 43, 45, 46, 47, 48, 49,
          ],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "day-after-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://iga.in.gov/information",
      "https://www.in.gov/sos/elections/candidate-information/",
      "https://www.in.gov/dA/916c64d0f5/Primary-Candidate-List-3.25.26.xlsx?language_id=1",
    ],
    sourceLocator:
      "Indiana Constitution art. 4 §3 as quoted by the General Assembly: Senators four-year terms, Representatives two-year terms, beginning day after general election; 2026 Primary Candidate List XLSX (snapshot 2026-03-25): distinct OFFICE='STATE SENATOR' DISTRICT values, corroborated by official 2026 Election Calendar Brochure showing 25 of 50 seats. Cohort repeats in 2030; complement due 2028.",
  }),
  reviewed({
    stateUsps: "IN",
    chamberKey: "house",
    seatCount: 100,
    cohorts: [evenYearAllSeats],
    commencement: { kind: "day-after-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://www.in.gov/sos/elections/files/2026-Election-Calendar-Election-Administrators-Edition-Revised-March-2026.pdf",
      "https://iga.in.gov/information",
    ],
    sourceLocator:
      "Indiana Election Division 2026 Election Calendar: all 100 House seats on the 2026 ballot. Indiana Constitution art. 4 §3 as quoted by the General Assembly: Representatives serve two-year terms beginning the day after the general election; all seats recur every even year.",
  }),
  reviewed({
    stateUsps: "MT",
    chamberKey: "senate",
    seatCount: 50,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [
            1, 4, 6, 8, 9, 10, 11, 12, 14, 18, 19, 22, 23, 25, 28, 29, 31, 32,
            34, 41, 42, 43, 48, 49, 50,
          ],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [
            1, 4, 6, 8, 9, 10, 11, 12, 14, 18, 19, 22, 23, 25, 28, 29, 31, 32,
            34, 41, 42, 43, 48, 49, 50,
          ],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://sosmt.gov/elections/filing/",
      "https://leg.mt.gov/content/Districting/2020/Legislative/2024-holdover-senators.pdf",
    ],
    sourceLocator:
      "Montana SOS election filing page for 2024–2032 districts and official 2024 holdover Senate table; listed 25-district cohort due 2026/30, complement due 2028/32. Four-year term.",
  }),
  reviewed({
    stateUsps: "MT",
    chamberKey: "house",
    seatCount: 100,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://leg.mt.gov/content/Publications/research/2013-legislator-handbook.pdf",
    ],
    sourceLocator:
      "Montana Legislature 2013 Legislator Handbook, ‘Election of Members’: the entire House is elected every two years; general election occurs in every even-numbered year. The handbook states representatives serve two-year terms.",
  }),
  reviewed({
    stateUsps: "NV",
    chamberKey: "senate",
    seatCount: 21,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [2, 8, 9, 10, 12, 13, 14, 16, 17, 20, 21],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [2, 8, 9, 10, 12, 13, 14, 16, 17, 20, 21],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "day-after-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://epubs.nsla.nv.gov/statepubs/epubs/779609-2024.pdf",
      "https://www.leg.state.nv.us/Const/NVConst.html",
    ],
    sourceLocator:
      "Nevada Legislative Manual 2024 pp. 37–38 gives Senate district election cohorts; Nevada Constitution art. 4 §4 gives four-year terms and term commencement on day after election.",
  }),
  reviewed({
    stateUsps: "OR",
    chamberKey: "house",
    seatCount: 60,
    cohorts: [evenYearAllSeats],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 2,
      weekday: 1,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://www.oregonlegislature.gov/citizen_engagement/Pages/Legislative-Body.aspx",
      "https://www.oregonlegislature.gov/bills_laws/ors/orcons.html",
    ],
    sourceLocator:
      "Oregon Legislative Body guide: 60 House members serve two-year terms. Oregon Constitution art. IV §4: term begins second Monday in January following election.",
  }),
  reviewed({
    stateUsps: "OR",
    chamberKey: "senate",
    seatCount: 30,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [3, 4, 6, 7, 8, 10, 11, 13, 15, 16, 17, 19, 20, 24, 26],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [3, 4, 6, 7, 8, 10, 11, 13, 15, 16, 17, 19, 20, 24, 26],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 2,
      weekday: 1,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://www.oregonlegislature.gov/citizen_engagement/Pages/Legislative-Body.aspx",
      "https://www.oregonlegislature.gov/bills_laws/ors/orcons.html",
      "https://sos.oregon.gov/elections/Documents/open-offices.pdf",
    ],
    sourceLocator:
      "Oregon Legislative Body guide: 30 Senate members serve four-year terms. Oregon Constitution art. IV §4: term begins second Monday January. Oregon SOS Open Offices for 2026 Primary lists exact Senate district cohort 3,4,6,7,8,10,11,13,15,16,17,19,20,24,26; complement due 2028.",
  }),
  reviewed({
    stateUsps: "WA",
    chamberKey: "house",
    seatCount: 98,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://leg.wa.gov/about-the-legislature/house-of-representatives/",
    ],
    sourceLocator:
      "Washington House official information: 98 representatives elected to two-year terms in even-numbered years.",
  }),
  reviewed({
    stateUsps: "WA",
    chamberKey: "senate",
    seatCount: 49,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [
            6, 7, 8, 13, 15, 21, 26, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 42,
            43, 44, 45, 46, 47, 48,
          ],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [
            6, 7, 8, 13, 15, 21, 26, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 42,
            43, 44, 45, 46, 47, 48,
          ],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://leg.wa.gov/about-the-legislature/senate/administration/term-expirations/",
      "https://leg.wa.gov/about-the-legislature/senate/",
    ],
    sourceLocator:
      "Washington Senate official term-expiration table: exact 24 districts whose terms expire Jan. 11, 2027 (2026 election); complement's term expires Jan. 9, 2029 (2028). Four-year terms, half elected every two years.",
  }),
  reviewed({
    stateUsps: "CA",
    chamberKey: "house",
    seatCount: 80,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CONS&sectionNum=2.&article=IV",
    ],
    sourceLocator:
      "California Constitution art. IV §2(a), two-year Assembly term; Senate FAQ confirms its biennial cadence, but Assembly cohort rows not separately cited here.",
  }),
  reviewed({
    stateUsps: "CA",
    chamberKey: "senate",
    seatCount: 40,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.senate.ca.gov/citizens-guide/faqs",
      "https://sdmg.senate.ca.gov/committeehome/prior-districts-archive/2023-2024-senate-districts-redistricting-transitional-session",
    ],
    sourceLocator:
      "Senate FAQ: four-year terms; odd districts presidential-year, even districts constitutional-officer-year (2026/30). Senate Office of Demographics: even new-map districts in 2022, odd new-map districts in 2024.",
  }),
  reviewed({
    stateUsps: "CO",
    chamberKey: "house",
    seatCount: 65,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://content.leg.colorado.gov/agencies/senate/colorado-general-assembly-overview",
    ],
    sourceLocator:
      "Colorado General Assembly overview: Representatives elected to two-year terms; regular general elections are even years.",
  }),
  reviewed({
    stateUsps: "CO",
    chamberKey: "senate",
    seatCount: 35,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [
            1, 3, 4, 7, 8, 9, 11, 15, 20, 22, 24, 25, 27, 30, 32, 34, 35,
          ],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [
            1, 3, 4, 7, 8, 9, 11, 15, 20, 22, 24, 25, 27, 30, 32, 34, 35,
          ],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://content.leg.colorado.gov/sites/default/files/2026-senate-term-limits-updated-0326-accessible.pdf",
      "https://content.leg.colorado.gov/agencies/senate/colorado-general-assembly-overview",
    ],
    sourceLocator:
      "2026 Senate term-limit roster, table lines 7–41: explicit next-election year by district; lines 52–54 identify 2026 vacancy half-terms in districts 17, 21, 29, and 31. The regular 2026 list excludes those four; 2028 is the complement.",
  }),
  reviewed({
    stateUsps: "DE",
    chamberKey: "house",
    seatCount: 41,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: ["https://legis.delaware.gov/SessionLaws/Chapter?id=41318"],
    sourceLocator:
      "2021 Delaware redistricting act, House district provisions and §806 context; House members are elected biennially.",
  }),
  reviewed({
    stateUsps: "DE",
    chamberKey: "senate",
    seatCount: 21,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [1, 5, 7, 8, 9, 12, 13, 14, 15, 19, 20],
        },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 4 },
            { offsetYears: 4, termYears: 4 },
            { offsetYears: 8, termYears: 2 },
          ],
        },
      },
      {
        selection: {
          kind: "district-list",
          districts: [2, 3, 4, 6, 10, 11, 16, 17, 18, 21],
        },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 2 },
            { offsetYears: 2, termYears: 4 },
            { offsetYears: 6, termYears: 4 },
          ],
        },
      },
    ],
    commencement: null,
    sourceUrls: ["https://legis.delaware.gov/SessionLaws/Chapter?id=41318"],
    sourceLocator:
      "2021 Delaware redistricting act §806(a)–(b): exact district groups; odd-numbered group listed in subsection (a) has 2022/26 four-year and 2030 two-year terms; subsection (b) has 2022 two-year then 2024/28 four-year terms.",
  }),
  reviewed({
    stateUsps: "FL",
    chamberKey: "house",
    seatCount: 120,
    cohorts: [evenYearAllSeats],
    commencement: { kind: "day-of-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&Search_String=art&SubMenu=1&URL=0100-0199/0100/Sections/0100.041.html&mode=View+Statutes",
    ],
    sourceLocator:
      "Florida Statutes §100.041(1): House two-year terms, even-numbered years; legislative member's term begins upon election.",
  }),
  reviewed({
    stateUsps: "FL",
    chamberKey: "senate",
    seatCount: 40,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: { kind: "day-of-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&Search_String=art&SubMenu=1&URL=0100-0199/0100/Sections/0100.041.html&mode=View+Statutes",
    ],
    sourceLocator:
      "Florida Statutes §100.041(1): four-year terms; odd districts in years divisible by four (2028), even districts in other even years (2026/30); member term begins upon election.",
  }),
  reviewed({
    stateUsps: "TX",
    chamberKey: "house",
    seatCount: 150,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.sos.texas.gov/elections/candidates/guide/2026/offices2026.shtml",
    ],
    sourceLocator:
      "Texas Secretary of State 2026 Offices Up for Election: all 150 House districts; biennial even-year cycle.",
  }),
  reviewed({
    stateUsps: "TX",
    chamberKey: "senate",
    seatCount: 31,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [1, 2, 3, 4, 5, 9, 11, 13, 18, 19, 21, 22, 24, 26, 28, 31],
        },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 4 },
            { offsetYears: 4, termYears: 4 },
            { offsetYears: 8, termYears: 2 },
          ],
        },
      },
      {
        selection: {
          kind: "district-complement",
          districts: [1, 2, 3, 4, 5, 9, 11, 13, 18, 19, 21, 22, 24, 26, 28, 31],
        },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 2 },
            { offsetYears: 2, termYears: 4 },
            { offsetYears: 6, termYears: 4 },
          ],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.sos.texas.gov/elections/candidates/guide/2026/offices2026.shtml",
      "https://redistricting.capitol.texas.gov/reqs",
    ],
    sourceLocator:
      "Texas SOS 2026 guide: 2026/30 district list; 2028 is its complement. Texas redistricting legal requirements: post-2022 cohort phase terms 4/4/2 vs 2/4/4.",
  }),
  reviewed({
    stateUsps: "UT",
    chamberKey: "house",
    seatCount: 75,
    cohorts: [evenYearAllSeats],
    commencement: { kind: "january-first-following-election" },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://le.utah.gov/xcode/Articlevi/UC_AVI_S3_1800010118000101.pdf",
    ],
    sourceLocator:
      "Utah Constitution art. VI §3: House term commencement January 1 following election; House biennial terms.",
  }),
  reviewed({
    stateUsps: "UT",
    chamberKey: "senate",
    seatCount: 29,
    cohorts: [
      {
        selection: {
          kind: "district-list",
          districts: [1, 5, 6, 7, 9, 11, 12, 13, 14, 18, 19, 20, 21, 23, 28],
        },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: {
          kind: "district-complement",
          districts: [1, 5, 6, 7, 9, 11, 12, 13, 14, 18, 19, 20, 21, 23, 28],
        },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://le.utah.gov/xcode/Title36/Chapter1/C36-1-S102_2025032420250507.pdf",
    ],
    sourceLocator:
      "Utah Code §36-1-102 and state Senate official election cohort list: 2026/30 districts; 2028 complement. Senate commencement unresolved.",
  }),
  reviewed({
    stateUsps: "VT",
    chamberKey: "house",
    seatCount: 150,
    cohorts: [evenYearAllSeats],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 1,
      weekday: 1,
      offsetDays: 2,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://legislature.vermont.gov/statutes/constitution-of-the-state-of-vermont/",
    ],
    sourceLocator:
      "Vermont Constitution ch. II §46: two-year terms and terms begin Wednesday after first Monday in January.",
  }),
  reviewed({
    stateUsps: "VT",
    chamberKey: "senate",
    seatCount: 30,
    cohorts: [evenYearAllSeats],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 1,
      weekday: 1,
      offsetDays: 2,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://legislature.vermont.gov/statutes/constitution-of-the-state-of-vermont/",
    ],
    sourceLocator:
      "Vermont Constitution ch. II §46: Senate members serve two-year terms and begin Wednesday after first Monday in January; commencement weekday form needs consumer representation review.",
  }),
  reviewed({
    stateUsps: "WI",
    chamberKey: "house",
    seatCount: 99,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.wicourts.gov/courts/supreme/origact/docs/23ap1399_1222opinion.pdf",
      "https://county.milwaukee.gov/EN/County-Clerk/Election-Commission",
    ],
    sourceLocator:
      "Wisconsin Constitution art. IV §4: Assembly members chosen biennially in even-numbered years. The Wisconsin Supreme Court's 2023 redistricting opinion quotes and applies the constitution's legislative election structure; Milwaukee County Election Commission lists 2026 Assembly elections.",
  }),
  reviewed({
    stateUsps: "WI",
    chamberKey: "senate",
    seatCount: 33,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.wicourts.gov/courts/supreme/origact/docs/23ap1399_1222opinion.pdf",
      "https://county.milwaukee.gov/EN/County-Clerk/Election-Commission",
    ],
    sourceLocator:
      "Wisconsin Constitution art. IV §5: Senate districts are numbered in sequence and senators are chosen alternately from odd and even districts for four-year terms. Milwaukee County Election Commission lists Senate districts 3/5/7 for 2026 and 4/6/8 for 2028, establishing current odd/even phase; other districts follow the constitutional alternating classes.",
  }),
  reviewed({
    stateUsps: "MN",
    chamberKey: "house",
    seatCount: 134,
    cohorts: [evenYearAllSeats],
    commencement: null,
    sourceUrls: [
      "https://www.sos.mn.gov/about-minnesota/minnesota-government/the-minnesota-legislature/",
      "https://www.sos.mn.gov/media/s1ppejaa/2021-redistricting-guide.pdf",
    ],
    sourceLocator:
      "Minnesota SOS Legislature page: representatives serve two years. SOS 2021 Redistricting Guide: House and Senate seats are all up after redistricting; House district election recurrence is biennial.",
  }),
  reviewed({
    stateUsps: "MN",
    chamberKey: "senate",
    seatCount: 67,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 10,
          referenceYear: 2022,
          phases: [
            { offsetYears: 0, termYears: 4 },
            { offsetYears: 4, termYears: 4 },
            { offsetYears: 8, termYears: 2 },
          ],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.sos.mn.gov/election-administration-campaigns/become-a-candidate/filing-for-state-legislative-offices/",
      "https://www.senate.mn/members?id=district",
    ],
    sourceLocator:
      "Minnesota SOS Filing for State Legislative Offices: 67 Senate districts, Senate districts are on ballot in years ending 0, 2, and 6. Official Minnesota Senate district roster reports all 67 senators last elected in 2022 for four-year terms; therefore all due 2026 (four years), 2030 (two-year redistricting term), and 2032/36 recurring four-year elections.",
  }),
  reviewed({
    stateUsps: "VA",
    chamberKey: "house",
    seatCount: 100,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 2,
          referenceYear: 2027,
          phases: [{ offsetYears: 0, termYears: 2 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.elections.virginia.gov/media/boardpapers/calendar/Five_year_election_day_calendar_2025_2029.pdf",
    ],
    sourceLocator:
      "Virginia election calendar: House elections in odd-numbered years; therefore no House regular election 2026/28/30.",
  }),
  reviewed({
    stateUsps: "VA",
    chamberKey: "senate",
    seatCount: 40,
    cohorts: [
      {
        selection: { kind: "all" },
        schedule: {
          periodYears: 4,
          referenceYear: 2027,
          phases: [{ offsetYears: 0, termYears: 4 }],
        },
      },
    ],
    commencement: null,
    sourceUrls: [
      "https://www.elections.virginia.gov/media/boardpapers/calendar/Five_year_election_day_calendar_2025_2029.pdf",
    ],
    sourceLocator:
      "Virginia election calendar gives next Senate cycle in 2027; 4-year term cohort. No Senate regular election 2026/28/30.",
  }),
  reviewed({
    stateUsps: "WY",
    chamberKey: "house",
    seatCount: 62,
    cohorts: [evenYearAllSeats],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 1,
      weekday: 1,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://wyoleg.gov/NXT/gateway.dll/Statutes/2021%20Constitution/2/6?f=templates&fn=document-frameset.htm",
    ],
    sourceLocator:
      "Wyoming Constitution art. 3 §2: House two-year terms, first Monday January following election.",
  }),
  reviewed({
    stateUsps: "WY",
    chamberKey: "senate",
    seatCount: 31,
    cohorts: [
      {
        selection: { kind: "district-parity", parity: "odd" },
        schedule: senateTwoClassSchedule(),
      },
      {
        selection: { kind: "district-parity", parity: "even" },
        schedule: senateTwoClassSchedule(2028),
      },
    ],
    commencement: {
      kind: "january-weekday-following-election",
      ordinal: 1,
      weekday: 1,
      offsetDays: 0,
    },
    commencementBasis: "official-primary-reviewed-not-source-admitted",
    sourceUrls: [
      "https://sos.wyo.gov/Media/2026/SoS_Release_2026-05-14-PM.pdf",
      "https://wyoleg.gov/NXT/gateway.dll/Statutes/2021%20Constitution/2/6?f=templates&fn=document-frameset.htm",
    ],
    sourceLocator:
      "Wyoming SOS 2026 candidate notice explicitly states odd-numbered Senate districts regular due 2026; Constitution art. 3 §2 establishes four-year Senate terms and first-Monday-January commencement. Even districts are complement due 2028.",
  }),
];

const reviewedKeys = new Set(
  verifiedCycleRows.map(
    ({ stateUsps, chamberKey }) => `${stateUsps}:${chamberKey}`,
  ),
);

export const STATE_LEGISLATIVE_CHAMBER_CYCLES: readonly StateLegislativeChamberCycle[] =
  [
    ...PLACEHOLDER_STATE_LEGISLATIVE_CHAMBER_CYCLES.filter(
      ({ stateUsps, chamberKey }) =>
        !reviewedKeys.has(`${stateUsps}:${chamberKey}`),
    ),
    ...verifiedCycleRows,
  ];
