---
id: gov-outside-county-lean-research
title: "Each county's 2024 presidential vote in data, so another county's board leans as its people do"
area: gov
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
after: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results
blocked-on:
source: split from gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results by the cause finder, Nov 11, 2026
claimed-at:
lead: nation
standard: 2
model: sonnet
effort: medium
root: rc1-world-outside-town
---

**What.** Add each county's 2024 presidential two-party vote (Republican share of the Republican and Democratic votes) to data, for every county or county-equivalent in all 56 places. Where a place has no county presidential count (the five territories, and D.C. as one unit), record the place's own reading, ESTIMATED with its source. Then make `seatLean` in `src/core2/modules/officials.ts` read it for a county board seat outside the player's town, in place of the state's vote. Feeds: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

**Cause.** Found in code: `seatLean` in `src/core2/modules/officials.ts` (line 299) has a branch for state legislative districts and House districts but none for a county seat, so it falls back to the state's 2024 presidential vote (line 348). No file under `data/research/elections` holds a county presidential result, and no code reads one. Once part 1 seats other counties' boards, every one of them would lean exactly as the state does.

**Fix.** Fetch the 2024 county presidential returns (MIT Election Data and Science Lab county returns, or each state's certified canvass), and write `data/research/elections/county-president-2024.json` (new), keyed by the county's GEOID as `countyRows()` in `src/core2/place-lookup.ts` keys it: Republican votes, Democratic votes, the source URL and the fetch date, each SOURCED. Follow `researcher`. In `seatLean`, for a seat whose office kind is `county-board` and whose seat does not cover the town, return `2 * (republican / (republican + democratic) + swing) - 1` with the source `2024 presidential vote in the county`, the same form as the district branch. Then resolve the lean stopgap part 1 registers.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research before building: every number cites the canvass or the dataset it was fetched from. One rule, all 56 places: the file covers every county-equivalent, and the code names none of them. Estimate, never UNKNOWN: a territory without a county count reads its own place-wide result, marked ESTIMATED with its source.

**Done when.** A second session plays a year in a drawn place (named with its seed) and sees two outside county boards of the same state whose members' leans differ, each citing `2024 presidential vote in the county`, by seat record id. `src/core2/officials.test.ts` checks a county seat's lean against its row in the file.

**Waits on.** gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results, which seats the boards.

**Files.** data/research/elections/county-president-2024.json (new), src/core2/modules/officials.ts, src/core2/place-lookup.ts, src/core2/officials.test.ts
