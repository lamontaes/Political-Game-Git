---
id: gov-standins-elections
title: "Elections, offices, campaigns and recalls stand-ins replaced or relabeled as sourced estimates"
area: gov
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-fs11vb
pr: #5160
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:24:55.481Z
---

**What.** The election and office stopgaps in stopgaps.json are replaced with data read from the law or relabeled as sourced estimates, one at a time. This pass takes SG-GOV-term-end-estimate for the states whose governor start clause is already read in official text (AK, DE, FL, HI, LA, ME, VA, WA). Their weekday rules go into data/elections/term-starts.json, and termStartAfter reads them. The remaining open rows (seller stand-ins, recall bars, filing fallbacks) stay in the pool for later passes.

**Rules.** "An effect is a read, not a record": a term's end date is read by the office engine when it seats a governor and by every later election date. "One rule, all 56 places": no state is named in logic, the rows live in data and the test draws its place.

**Done when.** In a played world from buildBenchWorld in a drawn place, the governor's term in AK and FL ends on the state's own clause, by term record id, and a state with no row keeps the data default. The test is src/core2/elections-law.test.ts.

**Files.** src/core2/elections-calendar.ts, src/core2/data/elections/term-starts.json, src/core2/data/stopgaps.json

**Notes.** Partial: SG-GOV-term-end-estimate stays open for the other states. Claimed by claude/political-game-pool-fs11vb.
