/** Legacy values, preserved rather than recalibrated during the lift. */
export const ELECTION_PARAMETERS = {
  runoffPullFloor: {
    value: 1,
    provenance: "TUNABLE",
    source: "party-nominations.ts runoff weight floor on recorded permille",
    spread: [0, 1],
    stopgapId: "SG-P14-elections-runoff-pull",
  },
  termSearchYears: {
    value: 16,
    provenance: "TUNABLE",
    source: "state-executive-term-rules.ts regularTermWindowOn search guard",
    spread: [1, 16],
    stopgapId: "SG-P14-elections-term-search",
  },
  firstNationalCycle: {
    value: 2024,
    provenance: "SOURCED",
    source: "NARA 2020-census allocation covers 2024 and 2028",
    spread: [2024, 2024],
  },
  consecutiveGapDays: {
    value: 90,
    provenance: "ESTIMATED",
    source: "executive-term-limits.ts placeholder, not law",
    spread: [0, 365],
    stopgapId: "SG-P14-elections-consecutive-gap",
  },
  yearDays: {
    value: 365.25,
    provenance: "ESTIMATED",
    source: "executive-term-limits.ts lookback conversion",
    spread: [365, 366],
    stopgapId: "SG-P14-elections-year-days",
  },
  nominationPull: {
    value: { incumbent: 1.5, partyBacked: 1.25, other: 1 },
    provenance: "ESTIMATED",
    source:
      "party-nominations.ts game standing estimate v2; no empirical calibration",
    spread: [1, 1.5],
    stopgapId: "SG-P14-elections-primary-pull",
  },
  missingPartyShare: {
    value: 0.5,
    provenance: "ESTIMATED",
    source: "party-nominations.ts missing share fallback",
    spread: [0, 1],
    stopgapId: "SG-P14-elections-primary-share",
  },
  partyShareFloor: {
    value: 0.01,
    provenance: "TUNABLE",
    source: "party-nominations.ts positive pull floor",
    spread: [0, 0.01],
    stopgapId: "SG-P14-elections-primary-share-floor",
  },
} as const;
