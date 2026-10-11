export const PROCEDURE_PARAMETERS = {
  voteRoundingTolerance: {
    value: 1e-9,
    provenance: "TUNABLE",
    source: "legislature-rules.ts legacy ceiling tolerance",
    spread: [0, 1e-9],
    stopgapId: "SG-P14-legislatures-vote-tolerance",
  },
  committeeWrapGuard: {
    value: 2,
    provenance: "TUNABLE",
    source: "committee-assignment.ts maximum traversals of seating order",
    spread: [1, 2],
    stopgapId: "SG-P14-legislatures-committee-guard",
  },
  calendarSearchYears: {
    value: 4,
    provenance: "TUNABLE",
    source: "legislative-session-calendar.ts bounded recurrence search",
    spread: [1, 4],
    stopgapId: "SG-P14-legislatures-calendar-search",
  },
} as const;
