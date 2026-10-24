---
id: gov-offices-office-seated-before-it-exists
title: "Offices: an office that starts after the opening is seated at the opening"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/office-before-it-exists
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:56:01.343Z
---

**What.** stateOffices in src/core2/offices-state.ts seats a holder in every executive office data/research/offices/state-offices.json lists, including a lieutenant governor's office whose research row says it is first elected in 2026 and takes office in January 2027 (a 2022 constitutional amendment created it). The game opens on January 20, 2025, so a person holds an office that does not yet exist, takes the governor's party through the ticket rule in unrecordedParty, and can act in the line of succession two years early. Found by research-gov-sourced-parameters while reading which holders the rosters leave unrecorded.

**Rules.** Wire to the world: an office exists in play only from the date its law creates it, read from the research row as data (a first-term start date) for all 56 places, never a state named in logic, and no holder or vacancy record exists before that date.

**Done when.** In buildBenchWorld for a drawn place whose research lists an office starting after the opening, and in a test in src/core2/offices-state.test.ts over all 56 places, no term or official record exists for that office before its first-term start date, and the office is filled by its first election, named by record id.

**Files.** src/core2/offices-state.ts, data/research/offices/state-offices.json, src/core2/modules/officials.ts

**Notes.** TODO
