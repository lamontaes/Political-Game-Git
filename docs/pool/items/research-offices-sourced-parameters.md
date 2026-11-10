---
id: research-offices-sourced-parameters
title: "Research: sourced parameters for offices and statewide parties"
area: office
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from office-stopgap-offices-estimated-calendar, office-stopgap-offices-state-assumed-data"
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
---

**What.** Source the numbers behind office term starts. Each row below is a registered stopgap whose replacement waits on sourced or estimated data. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/offices/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder, naming the pool item in the PR. The statewide-parties row is resolved (the live-page check of 60 statewide parties was delivered) and is left out of the list below. Governors' and legislators' term-start rows for all 56 places were delivered; eight governor rows and ten legislature rows stay ESTIMATED because the start day is not read from the text. What remains is SG-GOV-term-end-estimate for town offices and county offices with no county calendar row, which start on the table's default of January 1 because their start day is each charter's or the state's municipal law's. Bug gov-officeholder-parties-opening-date records that the rosters hold October 2026 holders, not those of January 20, 2025. `termEnd` in src/core2/modules/offices.ts reads the office's own election calendar first, so first count which offices still reach the January 1 fallback in a played world across drawn places.

- `SG-GOV-term-end-estimate` in src/core2/modules/offices.ts: The end of each term in progress at the opening for state and local offices: the seats of a body take turns over the years in one term that the office's calendar (the county schedule or the state's municipal election law) holds elections, and each term ends on the start day after its seat's election; where a state's own start rule isn't read, January 1. Replacement: Each state's governor start rule (FIXER stand-in figures: AK, HI, FL, DE, LA, VA, ME and the rest), county bodies from county-election-schedule-by-state.json (concurrent or staggered), and municipal timing from the 92O baselines.

**Cause.** Design: each stopgap row named below is still open in its family file under src/core2/data/stopgaps/ and waits on sourced data. The rule is AGENTS.md "Placeholders" (every shortcut registered, every number tagged SOURCED, ESTIMATED or TUNABLE), and the research is in docs/research/core-parameter-sources-2026-10-12.md.

**Fix.** Count the offices that still reach the January 1 fallback in `termEnd` in a played world across drawn places, then source the start rules for those: town and county offices with no calendar row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** A second session reads the parameter tables for the start rules of town and county offices that reach the January 1 default and finds each SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation). In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) it sees the engine read each new value by record id, with where the town landed reported next to the real figure; the real figure is reported only and is not a pass mark. Each stopgap row this item takes is resolved in its family file under src/core2/data/stopgaps/ with the source named, or stays open with its replacement naming the research file, the estimate's source and spread, and the item that would close it. tests/guards/research-data-has-reader.test.ts and the tripwire and calibration-guard tests pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/offices-state.ts, src/core2/data/parameters.json, src/core2/data/stopgaps/gov.json, data/research/office/ (new)

**Notes.** Folded from: office-stopgap-offices-estimated-calendar, office-stopgap-offices-state-assumed-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read. Claim released Oct 23: branch gone.

Looked at Oct 20 (claude/political-game-pool-b6g0dl), not built. SG-GOV-term-end-estimate is mostly replaced already: `termEnd` in src/core2/modules/offices.ts reads the office's own election calendar (`electionInYear`, `staggeredSeatElection`, `termStartAfter`) first, and only falls back to the office's `termStarts` (default 01-01) where no calendar row exists, so what is left to source is which offices still reach that fallback, found by counting them in a played world across drawn places, before any state's start rule is researched. SG-GOV-statewide-parties-unverified is 60 rows to check one by one against Ballotpedia or state records, which needs an agent with page access for each state; a web search summary is not enough to resolve a row.

Oct 24, 2026: split. PR 5859 (item research-offices-term-starts-statewide-parties) delivers governors' and legislators' term-start rows for all 56 places and the live-page check of 60 statewide parties, which resolves SG-GOV-statewide-parties-unverified. Still open here: SG-GOV-term-end-estimate for town offices and county offices with no county calendar row, which start on the table's default of January 1 because their start day is each charter's or the state's municipal law's. Eight governor rows and ten legislature rows stay ESTIMATED because the start day is not read from the text. Bug gov-officeholder-parties-opening-date records that the rosters hold October 2026 holders, not those of January 20, 2025.

Deferred Oct 25: nothing on screen reads it yet.
