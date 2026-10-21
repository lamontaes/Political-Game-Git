---
id: gov-legislative-district-results-2024
title: "Each state legislative district's own 2024 result as sourced data, replacing the state's vote at a typical margin"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr: #5360
blocked-on:
source: added with npm run pool -- add
---

**What.** A state legislative district the town does not vote in uses the state's whole vote at a typical margin (the legislativeSeatMargin parameter) because no district result is read. Add each state legislative district's own 2024 result as sourced research data and read it in racePlaces. Chambers with no recorded result for a district keep the estimate and say so, marked ESTIMATED with the state's figure. Territory legislatures read their own territory-wide result.

**Rules.** Estimate, never UNKNOWN: a district with no result starts from the state's vote and is marked as an estimate with its source. Research before building: the data checks the race and never decides one actor's outcome. One rule, all 56 places: the data file is keyed by district, with no place named in code.

**Done when.** A data file under data/research/elections lists each district's 2024 two-party result with its citation, racePlaces reads it, and in a one-year played world (buildBenchWorld, a drawn place, seed named) a district the town does not vote in is decided on its own result, shown by the district id in the race record. The test is a new case in src/core2/world-races.test.ts.

**Files.** data/research/elections, src/core2/modules/world-races.ts, src/core2/data/stopgaps.json

**Notes.** Split out of core-world-race-lean-candidates (L). Research data first (Codex's line), then the small read in racePlaces. Claude, Oct 20.

Sent back 2026-10-20 from PR #5352 (branch claude/tender-mendel-ijzjo8): merging main conflicts in src/core2/modules/world-races.ts; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5352 (branch claude/tender-mendel-ijzjo8): The PR changes research data, its compiler and the live legislative electorate/world-races readers, but its changed files contain no docs/release/changes declaration. Add an accurate patch declaration for the district-result behavior, naming the actual sourced coverage and fallback limits, then merge main and rerun changed-file checks.; finish on that branch, merge main into it first.
