---
id: words-director-hindsight-rescore-slow
title: "The director's hindsight rescoring grows with the square of a person's history; the filing test runs over an hour"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Each time the director's ledger stores a moment, rescoreHindsight in src/director/ledger.ts rescores every moment of that pair, recomputes every counterpart's importance for each one, and each importance filters all of the person's moments for shared broad events. The cost grows with the square of a person's kept moments, times the people watched. In src/director/electoral-scenes.test.ts on Wild Rose, Wisconsin, seed 09ec6b8f91700937931796b4801731a9c6f5ce73, the filing test watches 1,576 residents (it watches each one until three can file) and runs to the April 2026 election: the first 30 days took 90.7 seconds on main and the next 30 took 192.6, and the test did not finish within an hour alone. A CPU profile of 45 days puts 66 percent of the time under rescoreHindsight. Computing each counterpart's importance once per rescore gives the same result, because the loop writes only hindsight and importance never reads it; the broad-event moments can be indexed per person; and the test can watch only the residents who can file.

**Rules.** Speed: never scan the whole world or history every day, use indexes or act on the day something changed, and no change may make a town's year more than 20 percent slower. One rule, all 56 places: the slowness shows in a drawn place where most residents cannot file, so the fix must hold for every place.

**Done when.** electoral-scenes.test.ts passes on Wild Rose, Wisconsin, seed 09ec6b8f91700937931796b4801731a9c6f5ce73 in under 15 minutes; a test in a played world (buildBenchWorld) on a drawn place and a seed nobody chose shows every moment's hindsight unchanged by the fix, by record id; and npm run speed:year is no slower.

**Files.** src/director/ledger.ts, src/director/electoral-scenes.test.ts

**Notes.** TODO
