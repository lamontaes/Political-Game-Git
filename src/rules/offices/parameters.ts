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
} as const;
