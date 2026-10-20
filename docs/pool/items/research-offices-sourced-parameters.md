---
id: research-offices-sourced-parameters
title: "Research: sourced parameters for offices and statewide parties"
area: office
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/research-offices
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from office-stopgap-offices-estimated-calendar, office-stopgap-offices-state-assumed-data"
claimed-at: 2026-10-20T02:19:01.637Z
---

**What.** Source the numbers behind offices and statewide parties. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 2 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/office/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-GOV-term-end-estimate` in src/core2/modules/offices.ts: The end of each term in progress at the opening for state and local offices: the seats of a body take turns over the years in one term that the office's calendar (the county schedule or the state's municipal election law) holds elections, and each term ends on the start day after its seat's election; where a state's own start rule isn't read, January 1. Replacement: Each state's governor start rule (FIXER stand-in figures: AK, HI, FL, DE, LA, VA, ME and the rest), county bodies from county-election-schedule-by-state.json (concurrent or staggered), and municipal timing from the 92O baselines.
- `SG-GOV-statewide-parties-unverified` in src/core2/offices-state.ts: 60 of 261 statewide executive offices (superintendents, insurance, labor and land commissioners, commissions and boards, D.C. Replacement: Every row checked against Ballotpedia's partisan composition pages or the state's own records.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/modules/offices.ts, src/core2/offices-state.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/office/

**Notes.** Folded from: office-stopgap-offices-estimated-calendar, office-stopgap-offices-state-assumed-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
