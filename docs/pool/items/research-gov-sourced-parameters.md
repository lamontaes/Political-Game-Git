---
id: research-gov-sourced-parameters
title: "Research: sourced parameters for justice law, officials and news habits"
area: gov
kind: research
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from gov-stopgap-justice-law-assumed-data, gov-stopgap-officials-assumed-data, gov-stopgap-parameters-uncalibrated-tunable"
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
checked: fable 2026-11-10
---

**What.** Source the numbers behind justice law, officials and news habits. Each row below is a registered stopgap whose replacement waits on sourced or estimated data. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/gov/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder, naming the pool item in the PR. The Oct 24 slice delivered newsOutletDelayDays (ESTIMATED, 1 day, spread 1 to 2 days), bribery ranges read from statute for 43 places, and the party of 158 unrecorded officeholders. Three things remain: newsMaxAgeDays (the engine reads it as a cutoff; bug people-news-newsMaxAgeDays-as-cause), newsStoriesPerContact (no convertible source) and bribery ranges for 13 places whose code sites refused the cloud fetch. Also open: 24 unrecorded seats (six vacancies absent from Ballotpedia's tables, two territory boards not read, 16 invented by a district-name mismatch).

- `SG-GOV-justice-bribery-grade` in src/core2/justice-law.ts: Bribery is sentenced on the place's lowest felony-assault range from the sentencing research, not on the place's own bribery statute. Replacement: Each place's bribery-of-a-public-official grade and range read into data/research/justice/sentencing-ranges-2026.json, read by offense key.
- `SG-OFFICIALS-unrecorded-party` in src/core2/modules/officials.ts: A holder whose party the roster doesn't record (a statewide executive such as an attorney general or treasurer, or a legislative seat with no roster row) sits in the party that carried the state in 2024; a lieutenant governor on the governor's ticket takes the governor's party. Replacement: Each statewide executive's real party from a public roster (Ballotpedia's partisan composition of state executive offices, or each state's own election results).
- `SG-P15-news-habits` in src/core2/data/news/parameters.json: How fast outlets reach people by how closely they follow politics, how long a story stays news, and how many stories pass at a contact; one generic local outlet stands for all. Replacement: Named local outlets with real audiences and each person's recorded media habits (Pew local news surveys), checked against how fast election results spread. (parameter rows: src/core2/data/news/parameters.json:newsOutletDelayDays, src/core2/data/news/parameters.json:newsMaxAgeDays, src/core2/data/news/parameters.json:newsStoriesPerContact)

**Cause.** Design: each stopgap row named below is still open in its family file under src/core2/data/stopgaps/ and waits on sourced data. The rule is AGENTS.md "Placeholders" (every shortcut registered, every number tagged SOURCED, ESTIMATED or TUNABLE), and the research is in docs/research/pool-feeder-oct20/research-gov-sourced-parameters.md.

**Fix.** Three rows remain: newsMaxAgeDays (wait on bug people-news-newsMaxAgeDays-as-cause), newsStoriesPerContact (no source found) and the bribery-of-a-public-official grade and range for the 13 places not yet read. An earlier cloud session could not reach those places' own code sites: read each statute from any page that carries its text (the legislature's site, or a public mirror of the code), cite the section and quote it, and where no page can be reached keep that place on the stopgap and list the pages tried in the pull request body.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** A second session reads the parameter tables for the bribery ranges for the 13 unread places and the news-habit rows and finds each SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation). In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) it sees the engine read each new value by record id, with where the town landed reported next to the real figure; the real figure is reported only and is not a pass mark. Each stopgap row this item takes is resolved in its family file under src/core2/data/stopgaps/ with the source named, or stays open with its replacement naming the research file, the estimate's source and spread, and the item that would close it. tests/guards/research-data-has-reader.test.ts and the tripwire and calibration-guard tests pass.

**Waits on.** people-news-newsMaxAgeDays-as-cause (one row).

**Files.** src/core2/data/news/parameters.json, src/core2/justice-law.ts, src/core2/modules/officials.ts, src/core2/data/parameters.json, src/core2/data/stopgaps/gov.json, src/core2/data/stopgaps/officials.json, src/core2/data/stopgaps/p15.json, data/research/gov/

**Notes.** Folded from: gov-stopgap-justice-law-assumed-data, gov-stopgap-officials-assumed-data, gov-stopgap-parameters-uncalibrated-tunable. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-gov-sourced-parameters.md (3 rows: 0 sourced, 3 estimated, 0 mechanic).

Looked at Oct 20 (claude, claude/political-game-pool-yucp92-x), nothing sourced. The three rows each need a per-place table the repository does not hold: the sentencing range for bribery of a public official in each of the 56 places (statute text), each statewide executive's party from a public roster, and Pew local-news habit data to calibrate outlet delay, story age and stories per contact. Each is dozens of separate public pages with citations, a researcher's job (.agents/skills/researcher/SKILL.md), not something to type from memory; none is a number that can be set without its source.

Oct 24, 2026: split. PR 5856 (item research-gov-bribery-sentences-holder-parties) delivers newsOutletDelayDays (ESTIMATED, 1 day, spread 1 to 2 days), bribery ranges read from statute for 43 places, and the party of 158 unrecorded officeholders. Still open here: newsMaxAgeDays (the engine reads it as a cutoff; bug people-news-newsMaxAgeDays-as-cause), newsStoriesPerContact (no convertible source) and bribery ranges for 13 places whose code sites refused the cloud fetch. Also open: 24 unrecorded seats (six vacancies absent from Ballotpedia's tables, two territory boards not read, 16 invented by a district-name mismatch). SG-P15-news-habits, SG-GOV-justice-bribery-grade and SG-OFFICIALS-unrecorded-party stay open.

Sent back 2026-10-23 from PR #5856 (branch claude/dreamy-tesla-bgi3ui-gov): The table leaves two parameter rows and all three stopgap-resolution rows unmet, and the year exercises neither new bribery nor unrecorded-party reader; bound the completed research slices while preserving the unidentified and unread work open; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sourced stopgap numbers to exact values; a number may stay an estimate and no player sees the added precision.
