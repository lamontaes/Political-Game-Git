/** Frozen numeric contracts. Supplied statutory and research tables remain caller facts. */
export const ELECTION_LEGACY_PARAMETERS = {
  "ballots.ts": {
    values: [0, 1, 2, 100],
    provenance: "SOURCED",
    source:
      "src/simulation/municipal-ballot-rules.ts:392; src/simulation/municipal-ballot-rules.ts:413; src/simulation/municipal-ballot-rules.ts:485",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "calendar.ts": {
    values: [0, 1, 2, 3],
    provenance: "SOURCED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "candidate-intake.ts": {
    values: [1],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/congress-candidates.ts:118; src/simulation/living-world/congress-candidates.ts:191; src/simulation/nationwide-world/state-legislature-candidates.ts:116",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "candidate-standing.ts": {
    values: [1],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/state-legislature-candidates.ts:178; src/simulation/nationwide-world/state-legislature-candidates.ts:379",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "chamber-plan.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/state-legislature-opening.ts:331; src/simulation/nationwide-world/state-legislature-opening.ts:418",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "chapter-rules.ts": {
    values: [2, 7, 60000, 86400000],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/party-chapters.ts:342; src/simulation/living-world/party-chapters.ts:369; src/simulation/living-world/party-chapters.ts:569; src/simulation/living-world/party-chapters.ts:854",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "congress-decision.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source: "src/simulation/living-world/congress-turnover.ts:429",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "congress-term.ts": {
    values: [0, 4],
    provenance: "SOURCED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "council-term-limits.ts": {
    values: [0, 31, 365.25, 86400000],
    provenance: "ESTIMATED",
    source: "src/simulation/living-world/local-council-term-limits.ts:112",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "county-calendar.ts": {
    values: [0, 1, 2, 4, 7, 10],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/county-election-calendar.ts:23; src/simulation/nationwide-world/county-election-calendar.ts:68; src/simulation/nationwide-world/county-election-calendar.ts:128",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "date-rules.ts": {
    values: [0, 1, 2, 4, 5, 6, 7, 12, 27, 120, 300],
    provenance: "SOURCED",
    source:
      "src/simulation/nominations/date-rules.ts:71; src/simulation/nominations/date-rules.ts:76; src/simulation/nominations/date-rules.ts:100; src/simulation/nominations/date-rules.ts:162",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "delegate-projection.ts": {
    values: [0, 0.03, 0.5, 1],
    provenance: "ESTIMATED",
    source:
      "src/simulation/living-world/house-delegates.ts:72; src/simulation/living-world/house-delegates.ts:460",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "district-population.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source: "src/districts/place-population-share.ts:18",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "electorate.ts": {
    values: [0, 0.6931471805599453, 0.7071067811865476, 1, 2, 60, 80, 700],
    provenance: "SOURCED",
    source:
      "src/simulation/statewide-electorate.ts:62; src/simulation/statewide-electorate.ts:90; src/simulation/statewide-electorate.ts:119; src/simulation/statewide-electorate.ts:154",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "executive-calendar.ts": {
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/state-executive-term-rules.ts:450; src/simulation/nationwide-world/state-executive-term-rules.ts:459; src/simulation/nationwide-world/state-executive-term-rules.ts:471; src/simulation/nationwide-world/state-executive-term-rules.ts:500; src/simulation/nationwide-world/state-executive-term-rules.ts:543",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "executive-law-calendar.ts": {
    values: [0, 1, 4, 40],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/executive-term-rules-in-world.ts:74; src/simulation/nationwide-world/executive-term-rules-in-world.ts:104; src/simulation/nationwide-world/executive-term-rules-in-world.ts:186; src/simulation/nationwide-world/executive-term-rules-in-world.ts:225",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "executive-term-limits.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/executive-term-limits.ts:179; src/simulation/nationwide-world/executive-term-limits.ts:210",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "governor-turnover.ts": {
    values: [0, 1, 4],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/state-executive-turnover-calendar.ts:68; src/simulation/nationwide-world/state-executive-turnover-calendar.ts:120; src/simulation/nationwide-world/state-executive-turnover-calendar.ts:140; src/simulation/nationwide-world/state-executive-turnover.ts:232",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "intake-and-calendars.ts": {
    values: [0, 1, 2, 4, 7, 8, 10],
    provenance: "SOURCED",
    source:
      "src/simulation/governing/senate-selection.ts:118; src/simulation/legislative-election-rules.ts:140; src/simulation/living-world/congress-turnover.ts:119; src/simulation/nominations/field-entry.ts:42",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "legislative-calendar.ts": {
    values: [0, 1, 2, 4, 2025, 2026, 2027],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/state-legislative-election-calendar.ts:141; src/simulation/nationwide-world/state-legislative-election-calendar.ts:205",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "legislative-term-limits.ts": {
    values: [0, 1, 31, 365.25, 86400000],
    provenance: "ESTIMATED",
    source:
      "src/simulation/living-world/local-council-term-limits.ts:41; src/simulation/nationwide-world/state-legislative-term-limits.ts:212; src/simulation/nationwide-world/state-legislative-term-limits.ts:226; src/simulation/nationwide-world/state-legislative-term-limits.ts:257",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "legislative-terms.ts": {
    values: [0, 1, 2, 4],
    provenance: "SOURCED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "local-calendar.ts": {
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11],
    provenance: "ESTIMATED",
    source:
      "src/simulation/living-world/local-elections.ts:215; src/simulation/living-world/local-elections.ts:225; src/simulation/living-world/local-elections.ts:236",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "local-seat.ts": {
    values: [0, 1, 4, 10],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/local-elections.ts:299; src/simulation/living-world/local-elections.ts:1536",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "measure-numbering.ts": {
    values: [0, 1, 2, 4, 10, 100, 365, 1789, 1975, 86400000],
    provenance: "ESTIMATED",
    source:
      "src/simulation/measure-numbering.ts:76; src/simulation/measure-numbering.ts:184; src/simulation/measure-numbering.ts:191; src/simulation/measure-numbering.ts:340",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "measure-periods.ts": {
    values: [0, 1, 2, 10, 86400000],
    provenance: "SOURCED",
    source:
      "src/simulation/measure-numbering.ts:108; src/simulation/measure-numbering.ts:175",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "modal-value.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source: "src/simulation/municipal-ballot-rules.ts:150",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "national-calendar.ts": {
    values: [0, 1, 2, 4, 6, 7, 8, 10, 11, 12],
    provenance: "SOURCED",
    source:
      "src/simulation/national-election-rules.ts:27; src/simulation/national-election-rules.ts:37; src/simulation/national-election-rules.ts:42; src/simulation/national-election-rules.ts:48",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "national-count.ts": {
    values: [0, 1, 2, 3],
    provenance: "SOURCED",
    source:
      "src/simulation/national-elections.ts:318; src/simulation/national-elections.ts:445",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "national-rules.ts": {
    values: [1, 2, 5, 720, 2028],
    provenance: "SOURCED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "nomination-plan.ts": {
    values: [0, 1, 2, 4, 7, 11, 120, 2026, 86400000],
    provenance: "ESTIMATED",
    source: "src/simulation/nominations/nomination-rules.ts:294",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "party-history.ts": {
    values: [0, 1, 2, 4, 5, 7, 12],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/party-evolution.ts:404; src/simulation/living-world/party-evolution.ts:1749; src/simulation/living-world/party-registry.ts:153; src/simulation/living-world/party-registry.ts:174",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "past-candidates.ts": {
    values: [0, 1, 2, 3, 4],
    provenance: "SOURCED",
    source: "src/simulation/nominations/candidate-pool.ts:47",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "petition-signatures.ts": {
    values: [1],
    provenance: "SOURCED",
    source: "src/simulation/recall.ts:1441",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "presidential-count.ts": {
    values: [0, 0.5, 1, 2, 6, 10, 100],
    provenance: "ESTIMATED",
    source: "src/simulation/nationwide-world/presidential-turnover.ts:893",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "presidential-terms.ts": {
    values: [0, 2, 4, 365],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/presidential-turnover.ts:234; src/simulation/nationwide-world/presidential-turnover.ts:373",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "primary.ts": {
    values: [0, 1, 2, 10, 500, 1000],
    provenance: "SOURCED",
    source:
      "src/simulation/nominations/party-nominations.ts:113; src/simulation/nominations/party-nominations.ts:126; src/simulation/nominations/party-nominations.ts:152; src/simulation/nominations/party-nominations.ts:158; src/simulation/nominations/party-nominations.ts:250",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "prospect-decision.ts": {
    values: [1, 2],
    provenance: "SOURCED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "recall-close.ts": {
    values: [0, 100],
    provenance: "SOURCED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "seat-and-candidate.ts": {
    values: [0, 1],
    provenance: "SOURCED",
    source:
      "src/simulation/living-world/local-elections.ts:278; src/simulation/nominations/candidate-pool.ts:77",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "self-starter.ts": {
    values: [0],
    provenance: "SOURCED",
    source: "src/simulation/nominations/field-entry.ts:59",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "state-filling.ts": {
    values: [0, 1, 4, 5, 8],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/state-legislature-turnover.ts:1134; src/simulation/nationwide-world/state-legislature-turnover.ts:1437",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "state-opening.ts": {
    values: [0, 0.000001, 0.5, 1, 2, 6, 10, 18, 45, 365],
    provenance: "ESTIMATED",
    source:
      "src/simulation/nationwide-world/state-legislature-opening.ts:465; src/simulation/nationwide-world/state-legislature-opening.ts:1102",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "state-wake.ts": {
    values: [0, 2, 4],
    provenance: "SOURCED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "territorial-turnover.ts": {
    values: [0, 1, 2, 3, 4, 200],
    provenance: "SOURCED",
    source: "src/simulation/living-world/statehood-seats.ts:80",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "town-calendar.ts": {
    values: [0, 1, 2, 4, 8, 10],
    provenance: "SOURCED",
    source:
      "src/simulation/nationwide-world/town-election-calendar.ts:53; src/simulation/nationwide-world/town-election-calendar.ts:67",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "turnover-phases.ts": {
    values: [0, 1, 2, 4],
    provenance: "ESTIMATED",
    source: "Frozen dependency closure; see source function ledger and README",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
  "vacancy.ts": {
    values: [0, 1, 2],
    provenance: "SOURCED",
    source: "src/simulation/nationwide-world/senate-vacancy-law.ts:105",
    spread: "Exact legacy values; all-56-place golden equivalence.",
  },
} as const;
