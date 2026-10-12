/** Legal constants and retained assumptions; numeric conversions keep their exact units. */
export const OFFICES_PARAMETERS = {
  filingOpeningMonth: {
    value: 7,
    tag: "ESTIMATED",
    source:
      "Legacy nominations/field-entry.ts:30; common preceding-year opening bound",
    spread: [1, 12],
    stopgapId: "SG-P14-offices-filing-opening",
  },
  filingOpeningDay: {
    value: 1,
    tag: "ESTIMATED",
    source: "Legacy nominations/field-entry.ts:30",
    spread: [1, 31],
    stopgapId: "SG-P14-offices-filing-opening",
  },
  votingAge: {
    value: 18,
    tag: "SOURCED",
    source: "U.S. Constitution, Amendment XXVI, section 1",
  },
  electorResidenceDays: {
    value: 30,
    tag: "ESTIMATED",
    source:
      "Legacy office-qualification-rules.ts:490; original source note cites a single jurisdiction statute",
    spread: [0, 30],
    stopgapId: "SG-P14-offices-elector-residence",
  },
  signatureRoundingTolerance: {
    value: 1e-9,
    tag: "TUNABLE",
    source: "Legacy municipal-election-rules.ts:399 floating-point tolerance",
    spread: [0, 1e-9],
    stopgapId: "SG-P14-offices-signature-tolerance",
  },
  wardPopulationDeviation: {
    value: 0.1,
    tag: "ESTIMATED",
    source:
      "Legacy town-wards.ts DEVIATION; equal-population deviation proxy over household positions",
    spread: [0, 0.1],
    stopgapId: "offices.ward-household-population-proxy",
  },
  salaryWeeksPerYear: {
    value: 52,
    tag: "ESTIMATED",
    source: "Legacy office-salary.ts weekly annualization",
    spread: [50, 53],
    stopgapId: "offices.salary-calendar",
  },
  salaryDaysPerServiceYear: {
    value: 365.25,
    tag: "ESTIMATED",
    source: "Legacy office-salary.ts tenure average",
    spread: [365, 366],
    stopgapId: "offices.salary-calendar",
  },
  salaryMinimumReferences: {
    value: 4,
    tag: "TUNABLE",
    source: "Legacy office-pay.ts minimum donor count",
    spread: [2, 10],
    stopgapId: "offices.salary-reference-estimate",
  },
  salaryRoundingDollars: {
    value: 100,
    tag: "ESTIMATED",
    source: "Legacy office-pay.ts rounding quantum",
    spread: [1, 100],
    stopgapId: "offices.salary-reference-estimate",
  },
  maximumTermSearchYears: {
    value: 16,
    tag: "TUNABLE",
    source: "Legacy state-executive-term-rules.ts backward search bound",
    spread: [8, 32],
    stopgapId: "offices.term-search-guard",
  },
  wardRankOffset: {
    value: 0.5,
    tag: "TUNABLE",
    source: "Legacy town-wards.ts midpoint rank",
    spread: [0, 1],
    stopgapId: "offices.ward-size-rank",
  },
  fnvOffsetBasis: {
    value: 2166136261,
    tag: "SOURCED",
    source:
      "Legacy candidate-petitions.ts FNV-1a 32-bit offset basis; IETF FNV algorithm",
  },
  fnvPrime: {
    value: 16777619,
    tag: "SOURCED",
    source:
      "Legacy candidate-petitions.ts FNV-1a 32-bit prime; IETF FNV algorithm",
  },
  minimumWardSeats: {
    value: 2,
    tag: "TUNABLE",
    source: "Legacy town-wards.ts minimum seat count",
    spread: [2, 5],
    stopgapId: "offices.ward-size-rank",
  },
  minimumCouncilSizeForWards: {
    value: 3,
    tag: "TUNABLE",
    source: "Legacy town-wards.ts council composition guard",
    spread: [2, 5],
    stopgapId: "offices.ward-size-rank",
  },
} as const;
