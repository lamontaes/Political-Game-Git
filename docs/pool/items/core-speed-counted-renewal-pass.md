---
id: core-speed-counted-renewal-pass
title: "The counted births and deaths pass reads each household, not the whole town, for every death and cohort member"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The renewal engine's monthly counted pass (applyCountedFlows in src/core2/births-counted.ts) takes 9.6 of 264 profiled seconds of Long Hill, Connecticut's played year (seed m7b). For every death it filters the whole town's counted people to find the household that outlives them, and checks each person against the month's deaths with an array search. It groups people into death cohorts by copying the cohort's whole array for each member it adds, and it builds every household's view again at the month's end only for a record that is kept with bookkeeping on. Read each household's own people, keep the month's deaths in a set, append to the cohort, and build the end-of-month counts only when the record is kept.

**Rules.** No dice: who falls ill, dies and is born stays exactly the same, by record id. Bookkeeping is a debug switch: the month's counts record is built only when it is kept. Speed: no change makes a year slower, measured before and after on the same machine.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) the deep fingerprint of people, money, the counted population, the kept log and journal totals is identical before and after; applyCountedFlows' inclusive time in a CPU profile falls by at least half; the births-counted, counted deaths and counted illness tests pass.

**Files.** src/core2/births-counted.ts

**Notes.** Filed Oct 24 by the speed lead from the by-module profile in core-speed-year-over-limit-dense-town. The renewal half of core-speed-alloc-counted-births-followers (in-pr against bundle #5076, whose births-counted change is seven lines); this item is the bounded version on its own branch.
