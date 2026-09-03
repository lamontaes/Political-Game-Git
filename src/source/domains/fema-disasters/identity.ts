/**
 * The permanent fraud oracles.
 *
 * Each entry is a fact this substrate checked against the live OpenFEMA API,
 * and each corresponds to something PR #66 asserted that was not true. They are
 * tests rather than notes because the failure mode they guard against — a
 * plausible-looking declaration attached to a real disaster number — is
 * invisible to every check that only asks whether a corpus is self-consistent.
 */

export interface FemaFraudOracle {
  readonly disasterNumber: number;
  readonly expectedDeclarationString: string;
  readonly expectedState: string;
  readonly rejectedClaim: string;
}

export const FEMA_FRAUD_ORACLES: readonly FemaFraudOracle[] = [
  {
    disasterNumber: 3591,
    expectedDeclarationString: "EM-3591-CA",
    expectedState: "CA",
    rejectedClaim:
      'PR #66 published disaster 3591 as "EM-3591-TX", a statewide "BORDER EMERGENCY". FEMA has never declared a border emergency; 3591 is the January 2023 California severe winter storms, flooding and mudslides.',
  },
  {
    disasterNumber: 4765,
    expectedDeclarationString: "DR-4765-RI",
    expectedState: "RI",
    rejectedClaim:
      'PR #66 published disaster 4765 as "DR-4765-TX" in Harris County. 4765 is Rhode Island; the authentic Texas May 2024 severe storms declaration is 4781.',
  },
  {
    disasterNumber: 5480,
    expectedDeclarationString: "FM-5480-MT",
    expectedState: "MT",
    rejectedClaim:
      'PR #66 published disaster 5480 as "FM-5480-CA", the "HEAD FIRE" in Siskiyou County. 5480 is the Montana River Road East Fire; California had no fire management assistance declarations in FY2023.',
  },
  {
    disasterNumber: 4830,
    expectedDeclarationString: "DR-4830-GA",
    expectedState: "GA",
    rejectedClaim:
      'PR #66 published disaster 4830 as "DR-4830-NC", Hurricane Helene in Buncombe County. 4830 is Georgia.',
  },
  {
    disasterNumber: 4827,
    expectedDeclarationString: "DR-4827-NC",
    expectedState: "NC",
    rejectedClaim:
      "The authentic North Carolina Helene declaration is 4827, titled TROPICAL STORM HELENE, which #66 displaced with a fabricated 4830-NC.",
  },
];

/**
 * The designated area #66 replaced with a tribe from another state.
 *
 * The Cherokee Nation is in Oklahoma. The federally recognised tribe designated
 * under the North Carolina Helene declaration is the Eastern Band of Cherokee
 * Indians — and the same declaration separately designates a North Carolina
 * county called Cherokee, so an area-type rule that matches on the word alone
 * gets both of them wrong.
 */
export const EASTERN_BAND_DESIGNATED_AREA = "Eastern Band of Cherokee Indians";
export const CHEROKEE_COUNTY_DESIGNATED_AREA = "Cherokee (County)";
export const SUBSTITUTED_TRIBAL_AREA = "Cherokee Nation";

/** Provider values #66 rewrote by hand, checked here against the live records. */
export const FEMA_FIELD_ORACLES: readonly {
  readonly disasterNumber: number;
  readonly field: "incidentType" | "declarationTitle" | "iaProgramDeclared" | "incidentEndDate";
  readonly expected: string | boolean;
  readonly rejectedClaim: string;
}[] = [
  {
    disasterNumber: 4586,
    field: "incidentType",
    expected: "Severe Ice Storm",
    rejectedClaim: 'PR #66 rewrote the 2021 Texas incident type to "Winter Storm".',
  },
  {
    disasterNumber: 4586,
    field: "incidentEndDate",
    expected: "2021-02-21T00:00:00.000Z",
    rejectedClaim: 'PR #66 extended the 2021 Texas incident end date to "2021-03-05".',
  },
  {
    disasterNumber: 4724,
    field: "declarationTitle",
    expected: "WILDFIRES AND HIGH WINDS",
    rejectedClaim: 'PR #66 shortened the Maui declaration title to "WILDFIRES".',
  },
  ...([4085, 4332, 4586, 4673, 4724] as const).map((disasterNumber) => ({
    disasterNumber,
    field: "iaProgramDeclared" as const,
    expected: false,
    rejectedClaim:
      "PR #66 coerced the legacy pre-2003 Individual Assistance flag from false to true on eight real declarations, conflating it with the modern Individuals and Households Program. OpenFEMA publishes it false on every one of these.",
  })),
];
