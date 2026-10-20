---
id: research-gov-sourced-parameters
title: "Research: sourced parameters for justice law, officials and news habits"
area: gov
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from gov-stopgap-justice-law-assumed-data, gov-stopgap-officials-assumed-data, gov-stopgap-parameters-uncalibrated-tunable"
---

**What.** Source the numbers behind justice law, officials and news habits. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 3 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/gov/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-GOV-justice-bribery-grade` in src/core2/justice-law.ts: Bribery is sentenced on the place's lowest felony-assault range from the sentencing research, not on the place's own bribery statute. Replacement: Each place's bribery-of-a-public-official grade and range read into data/research/justice/sentencing-ranges-2026.json, read by offense key.
- `SG-OFFICIALS-unrecorded-party` in src/core2/modules/officials.ts: A holder whose party the roster doesn't record (a statewide executive such as an attorney general or treasurer, or a legislative seat with no roster row) sits in the party that carried the state in 2024; a lieutenant governor on the governor's ticket takes the governor's party. Replacement: Each statewide executive's real party from a public roster (Ballotpedia's partisan composition of state executive offices, or each state's own election results).
- `SG-P15-news-habits` in src/core2/data/news/parameters.json: How fast outlets reach people by how closely they follow politics, how long a story stays news, and how many stories pass at a contact; one generic local outlet stands for all. Replacement: Named local outlets with real audiences and each person's recorded media habits (Pew local news surveys), checked against how fast election results spread. (parameter rows: src/core2/data/news/parameters.json:newsOutletDelayDays, src/core2/data/news/parameters.json:newsMaxAgeDays, src/core2/data/news/parameters.json:newsStoriesPerContact)

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/data/news/parameters.json, src/core2/justice-law.ts, src/core2/modules/officials.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/gov/

**Notes.** Folded from: gov-stopgap-justice-law-assumed-data, gov-stopgap-officials-assumed-data, gov-stopgap-parameters-uncalibrated-tunable. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Looked at Oct 20 (claude, claude/political-game-pool-yucp92-x), nothing sourced. The three rows each need a per-place table the repository does not hold: the sentencing range for bribery of a public official in each of the 56 places (statute text), each statewide executive's party from a public roster, and Pew local-news habit data to calibrate outlet delay, story age and stories per contact. Each is dozens of separate public pages with citations, a researcher's job (.agents/skills/researcher/SKILL.md), not something to type from memory; none is a number that can be set without its source.
