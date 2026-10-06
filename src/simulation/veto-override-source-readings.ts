import constitutionReadings from "../../data/research/laws/veto-override-readings-2026.json" with { type: "json" };
import type { VoteDenominator, VoteRounding } from "./legislature-rules";

/**
 * Veto override arithmetic read from each jurisdiction's own instruments.
 *
 * Nine were read on 2026-09-21 from an official constitutional, code or
 * legislature procedure source (below). The other thirty-eight states and
 * Puerto Rico were read from their constitutions on 2026-09-29 and live in
 * `data/research/laws/veto-override-readings-2026.json`, each with its quote.
 * A generated legislature takes its override bar from here
 * (`overrideThresholdFor`); a compiled pack is checked against it, so an edit
 * to a pack that drifts from the instrument fails a test rather than changing
 * the law quietly.
 *
 * `countedAgainst` is null where the instrument's own basis has no equivalent
 * in `VoteDenominator`. Tennessee's "membership entitled under the
 * constitution" is not the same as members elected. Rather than pick the
 * nearest one, the reading keeps the words the instrument used in
 * `readBasis` and declines to map. A null is a mapping this project has not
 * made, never a threshold nobody read.
 */
export interface VetoOverrideThresholdReading {
  readonly numerator: number;
  readonly denominatorParts: number;
  /** Explicit legal meaning when the recorded fraction alone is ambiguous. */
  readonly rounding?: VoteRounding;
  /** The basis in the instrument's own words. */
  readonly readBasis: string;
  /** The project's denominator, where the basis maps cleanly. */
  readonly countedAgainst: VoteDenominator | null;
}

export interface VetoOverrideActionReading {
  readonly operation: string;
  /** Which measures the threshold applies to. */
  readonly when: string;
  readonly thresholds: readonly VetoOverrideThresholdReading[];
}

export interface VetoOverrideSourceReading {
  readonly stateUsps: string;
  readonly name: string;
  readonly bodyMode: string;
  readonly researchStatus: string;
  readonly locator: string;
  readonly url: string;
  /** The instrument's own words, where the reading recorded them. */
  readonly quote?: string;
  readonly actions: readonly VetoOverrideActionReading[];
}

const FIRST_READINGS: readonly VetoOverrideSourceReading[] = [
  {
    stateUsps: "AK",
    name: "Alaska",
    bodyMode: "joint-legislature",
    researchStatus: "official-constitutional-text-scoped-read",
    locator: "Article II sections 12-18; Article III sections 25-27",
    url: "https://ltgov.alaska.gov/information/alaskas-constitution/",
    actions: [
      {
        operation: "override-whole-bill",
        when: "ordinary-nonrevenue-nonappropriation-bill",
        thresholds: [
          {
            numerator: 2,
            denominatorParts: 3,
            readBasis: "legislature-membership",
            countedAgainst: "joint-total-membership",
          },
        ],
      },
      {
        operation: "override-whole-or-item-veto-or-reduction",
        when: "revenue-bill-or-appropriation-bill-or-item",
        thresholds: [
          {
            numerator: 3,
            denominatorParts: 4,
            readBasis: "legislature-membership",
            countedAgainst: "joint-total-membership",
          },
        ],
      },
    ],
  },
  {
    stateUsps: "DC",
    name: "District of Columbia",
    bodyMode: "single-council",
    researchStatus: "official-code-text-scoped-read",
    locator: "section 1-204.04(e)-(f)",
    url: "https://code.dccouncil.gov/us/dc/council/code/sections/1-204.04",
    actions: [
      {
        operation: "override-act-or-budget-item-or-provision",
        when: "",
        thresholds: [
          {
            numerator: 2,
            denominatorParts: 3,
            readBasis: "members-present-and-voting",
            countedAgainst: null,
          },
        ],
      },
    ],
  },
  {
    stateUsps: "IL",
    name: "Illinois",
    bodyMode: "each-chamber-separately",
    researchStatus: "official-text-indexed-excerpt",
    locator: "Article IV section 9(c)-(d)",
    url: "https://www.ilga.gov/commission/lrb/con4.htm",
    actions: [
      {
        operation: "override-whole-or-item-veto",
        when: "",
        thresholds: [
          {
            numerator: 3,
            denominatorParts: 5,
            readBasis: "members-elected",
            countedAgainst: "members-elected",
          },
        ],
      },
      {
        operation: "restore-reduced-appropriation-item",
        when: "",
        thresholds: [
          {
            numerator: 1,
            denominatorParts: 2,
            readBasis: "members-elected",
            countedAgainst: "members-elected",
          },
        ],
      },
    ],
  },
  {
    stateUsps: "MD",
    name: "Maryland",
    bodyMode: "each-chamber-separately",
    researchStatus: "official-constitutional-text-scoped-read",
    locator: "Article II section 17(a)-(g)",
    url: "https://msa.maryland.gov/msa/mdmanual/43const/html/02art2.html",
    actions: [
      {
        operation:
          "override-ordinary-whole-veto-or-nonbudget-appropriation-item-veto",
        when: "",
        thresholds: [
          {
            numerator: 3,
            denominatorParts: 5,
            readBasis: "members-elected",
            countedAgainst: "members-elected",
          },
        ],
      },
      {
        operation: "override-budget-executive-item-veto",
        when: "",
        thresholds: [
          {
            numerator: 3,
            denominatorParts: 5,
            readBasis: "source-membership-for-each-house",
            countedAgainst: null,
          },
        ],
      },
    ],
  },
  {
    stateUsps: "NE",
    name: "Nebraska",
    bodyMode: "single-chamber",
    researchStatus: "official-constitutional-text-scoped-read",
    locator: "Article IV section 15",
    url: "https://nebraskalegislature.gov/laws/articles.php?article=IV-15",
    actions: [
      {
        operation: "override-whole-or-item-veto-or-reduction",
        when: "",
        thresholds: [
          {
            numerator: 3,
            denominatorParts: 5,
            readBasis: "members-elected",
            countedAgainst: "members-elected",
          },
        ],
      },
    ],
  },
  {
    stateUsps: "NC",
    name: "North Carolina",
    bodyMode: "each-chamber-separately",
    researchStatus: "official-constitutional-text-scoped-read",
    locator: "Article II sections 11 and 22",
    url: "https://www.ncleg.gov/Laws/Constitution/Article2",
    actions: [
      {
        operation: "override-veto",
        when: "",
        thresholds: [
          {
            numerator: 3,
            denominatorParts: 5,
            readBasis: "members-present-and-voting",
            countedAgainst: null,
          },
        ],
      },
    ],
  },
  {
    stateUsps: "TN",
    name: "Tennessee",
    bodyMode: "each-chamber-separately",
    researchStatus: "official-legislature-procedure-guide",
    locator:
      "General Bills: Signed by Governor; membership explained in Third Consideration",
    url: "https://wapp.capitol.tn.gov/apps/Information/About/BillToLaw",
    actions: [
      {
        operation:
          "override-whole-veto-or-restore-disapproved-or-reduced-appropriation",
        when: "",
        thresholds: [
          {
            numerator: 1,
            denominatorParts: 2,
            readBasis: "membership-entitled-under-constitution",
            countedAgainst: null,
          },
        ],
      },
    ],
  },
  {
    stateUsps: "VA",
    name: "Virginia",
    bodyMode: "each-chamber-separately",
    researchStatus: "official-constitutional-text-scoped-read",
    locator: "Article V section 6(b)-(d)",
    url: "https://law.lis.virginia.gov/constitution/article5/section6/",
    actions: [
      {
        operation: "override-whole-or-item-veto",
        when: "",
        thresholds: [
          {
            numerator: 2,
            denominatorParts: 3,
            readBasis: "members-present",
            countedAgainst: "members-present",
          },
          {
            numerator: 1,
            denominatorParts: 2,
            readBasis: "members-elected",
            countedAgainst: "members-elected",
          },
        ],
      },
      {
        operation: "accept-entire-specific-severable-governor-recommendation",
        when: "",
        thresholds: [
          {
            numerator: 1,
            denominatorParts: 2,
            readBasis: "members-present",
            countedAgainst: null,
          },
        ],
      },
    ],
  },
  {
    stateUsps: "WV",
    name: "West Virginia",
    bodyMode: "each-chamber-separately",
    researchStatus: "official-constitutional-text-scoped-read",
    locator: "Article VII sections 8-10,14-15; Article VI section 51(11)",
    url: "https://www.wvlegislature.gov/WVCODE/WV_CON.cfm",
    actions: [
      {
        operation: "override-ordinary-nonappropriation-bill",
        when: "",
        thresholds: [
          {
            numerator: 1,
            denominatorParts: 2,
            readBasis: "members-elected",
            countedAgainst: "members-elected",
          },
        ],
      },
      {
        operation:
          "override-budget-or-supplementary-appropriation-or-item-or-reduction",
        when: "",
        thresholds: [
          {
            numerator: 2,
            denominatorParts: 3,
            readBasis: "members-elected",
            countedAgainst: "members-elected",
          },
        ],
      },
    ],
  },
];

interface ConstitutionReadingRow {
  readonly usps: string;
  readonly name: string;
  readonly numerator: number;
  readonly denominatorParts: number;
  readonly rounding?: VoteRounding;
  readonly readBasis: string;
  readonly countedAgainst: VoteDenominator;
  readonly locator: string;
  readonly url: string;
  readonly quote: string;
  readonly researchStatus: string;
}

/** The ordinary override each constitution states, one bar in each chamber. */
const CONSTITUTION_READINGS: readonly VetoOverrideSourceReading[] = (
  constitutionReadings.readings as readonly ConstitutionReadingRow[]
).map((row) => ({
  stateUsps: row.usps,
  name: row.name,
  bodyMode: "each-chamber-separately",
  researchStatus: row.researchStatus,
  locator: row.locator,
  url: row.url,
  quote: row.quote,
  actions: [
    {
      operation: "override-whole-veto",
      when: "",
      thresholds: [
        {
          numerator: row.numerator,
          denominatorParts: row.denominatorParts,
          ...(row.rounding === undefined ? {} : { rounding: row.rounding }),
          readBasis: row.readBasis,
          countedAgainst: row.countedAgainst,
        },
      ],
    },
  ],
}));

export const VETO_OVERRIDE_SOURCE_READINGS: readonly VetoOverrideSourceReading[] =
  [...FIRST_READINGS, ...CONSTITUTION_READINGS];

export function vetoOverrideReadingFor(
  stateUsps: string,
): VetoOverrideSourceReading | null {
  return (
    VETO_OVERRIDE_SOURCE_READINGS.find(
      (reading) => reading.stateUsps === stateUsps,
    ) ?? null
  );
}
