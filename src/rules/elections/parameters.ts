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
  selfStarterFavoredShare: {
    value: 0.55,
    tag: "ESTIMATED",
    source:
      "Legacy nominations/field-entry.ts: NOMINATION_FIELD_PROFILE; district two-party share as field-recruitment gate",
    spread: [0.5, 0.6],
    stopgapId: "elections.self-starter-share-gate",
  },
  ordinancePaceDays: {
    value: 7,
    tag: "ESTIMATED",
    source:
      "Legacy measure-numbering.ts COUNCIL_ORDINANCE_ESTIMATE; designed one-ordinance-per-week pace",
    spread: [1, 30],
    stopgapId: "elections.ordinance-numbering-pace",
  },
  congressPeriodAnchor: {
    value: 1789,
    tag: "SOURCED",
    source: "U.S. Senate, The First Federal Congress, 1789-1791",
  },
} as const;
