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
claimed-at:
---

**What.** Apply the sourced rows in docs/research/pool-feeder-oct20/research-gov-sourced-parameters.md to the parameter table(s) and data files for sourced parameters for justice law, officials and news habits. Each row already carries a value, a low and high spread, a tag (SOURCED or ESTIMATED) and a citation, so the builder enters them, adds a reader for each research file, and resolves these stopgap rows in src/core2/data/stopgaps.json: SG-GOV-justice-bribery-grade, SG-OFFICIALS-unrecorded-party, SG-P15-news-habits. Rows tagged mechanic name a change the area's builder makes to read the sourced inputs; build the simplest version and register what remains.

Rows:

- `SG-GOV-justice-bribery-grade` in src/core2/justice-law.ts: Bribery is sentenced on the place's lowest felony-assault range from the sentencing research, not on the place's own bribery statute. Replacement: Each place's bribery-of-a-public-official grade and range read into data/research/justice/sentencing-ranges-2026.json, read by offense key.
- `SG-OFFICIALS-unrecorded-party` in src/core2/modules/officials.ts: A holder whose party the roster doesn't record (a statewide executive such as an attorney general or treasurer, or a legislative seat with no roster row) sits in the party that carried the state in 2024; a lieutenant governor on the governor's ticket takes the governor's party. Replacement: Each statewide executive's real party from a public roster ...
- `SG-P15-news-habits` in src/core2/data/news/parameters.json: How fast outlets reach people by how closely they follow politics, how long a story stays news, and how many stories pass at a contact; one generic local outlet stands for all. Replacement: Named local outlets with real audiences and each person's recorded media habits (Pew local news surveys), checked against how fast election results spread. (parameter ...

**Rules.** Research before building: the sourced figures calibrate the totals the proof reports and never decide what one person does. Estimate, never UNKNOWN: any value without a measure keeps its ESTIMATED tag, source and spread. One rule, all 56 places: place values live in data keyed by place code, never named in logic, and the proof draws a random place. No dice: no seeded roll or fixed percentage picks an actor's outcome; causes and records do.

**Done when.** Each row is SOURCED or ESTIMATED in its parameter table with a citation and a spread, the stopgap rows above are resolved in src/core2/data/stopgaps.json (or kept with a reason), the research-data reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports each band and where the town landed against it.

**Files.** src/core2/data/news/parameters.json, src/core2/justice-law.ts, src/core2/modules/officials.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/gov/

**Notes.** Folded from: gov-stopgap-justice-law-assumed-data, gov-stopgap-officials-assumed-data, gov-stopgap-parameters-uncalibrated-tunable. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-gov-sourced-parameters.md (3 rows: 0 sourced, 3 estimated, 0 mechanic).

Looked at Oct 20 (claude, claude/political-game-pool-yucp92-x), nothing sourced. The three rows each need a per-place table the repository does not hold: the sentencing range for bribery of a public official in each of the 56 places (statute text), each statewide executive's party from a public roster, and Pew local-news habit data to calibrate outlet delay, story age and stories per contact. Each is dozens of separate public pages with citations, a researcher's job (.agents/skills/researcher/SKILL.md), not something to type from memory; none is a number that can be set without its source.
