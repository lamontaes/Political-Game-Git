---
id: core-speed-counted-renewal-pass
title: "The counted births and deaths pass reads each household, not the whole town, for every death and cohort member"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/speed-counted-renewal
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T01:41:53.134Z
---

**What.** The renewal engine's monthly counted pass (applyCountedFlows in src/core2/births-counted.ts) takes 9.6 of 264 profiled seconds of Long Hill, Connecticut's played year (seed m7b). For every death it filters the whole town's counted people to find the household that outlives them, and checks each person against the month's deaths with an array search. It groups people into death cohorts by copying the cohort's whole array for each member it adds, and it builds every household's view again at the month's end only for a record that is kept with bookkeeping on. Read each household's own people, keep the month's deaths in a set, append to the cohort, and build the end-of-month counts only when the record is kept.

**Rules.** No dice: who falls ill, dies and is born stays exactly the same, by record id. Bookkeeping is a debug switch: the month's counts record is built only when it is kept. Speed: no change makes a year slower, measured before and after on the same machine.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) the deep fingerprint of people, money, the counted population, the kept log and journal totals is identical before and after; a paired run of the same year (both checkouts in one process, months alternated) is faster by more than the A/A pair's noise, and applyCountedFlows' inclusive time in a CPU profile falls; the births-counted, counted deaths and counted illness tests pass.

**Files.** src/core2/births-counted.ts

**Notes.** Filed Oct 24 by the speed lead from the by-module profile in core-speed-year-over-limit-dense-town. The renewal half of core-speed-alloc-counted-births-followers (in-pr against bundle #5076, whose births-counted change is seven lines); this item is the bounded version on its own branch.

Done when amended Oct 24 by the speed lead before the PR, from measurement: the 'at least half' target for applyCountedFlows was set before the profile was read. Most of what the old pass cost was garbage (a death cohort's array copied once per member added), which a CPU profile charges to the collector, not to the function; the year-level paired run is the acceptance that sees it.

Not shipped yet (speed lead, Oct 24): exact (deep fingerprints identical for Long Hill one year and Stanardsville three years), and `applyCountedFlows` falls from 10.5 to 8.5 s in a profile of a paired run, but two paired runs of Long Hill's year read 0.957 and 1.002, which is inside the method's noise of a few percent. By the order's rule (a fix that saves less than run-to-run noise is not shipped) the branch `claude/speed-counted-renewal` waits; it ships together with a further cut in the same pass (the per-member monthly hazard sum, which builds strings and calls `Math.pow` for each of about 40,000 counted people a month) once the pair clears the noise.
