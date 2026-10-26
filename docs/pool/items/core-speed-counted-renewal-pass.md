---
id: core-speed-counted-renewal-pass
title: "The counted births and deaths pass reads each household, not the whole town, for every death and cohort member"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6072
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The renewal engine's monthly counted pass (applyCountedFlows in src/core2/births-counted.ts) takes 9.6 of 264 profiled seconds of Long Hill, Connecticut's played year (seed m7b). For every death it filters the whole town's counted people to find the household that outlives them, and checks each person against the month's deaths with an array search. It groups people into death cohorts by copying the cohort's whole array for each member it adds, and it builds every household's view again at the month's end only for a record that is kept with bookkeeping on. Read each household's own people, keep the month's deaths in a set, append to the cohort, and build the end-of-month counts only when the record is kept.

**Rules.** No dice: who falls ill, dies and is born stays exactly the same, by record id. Bookkeeping is a debug switch: the month's counts record is built only when it is kept. Speed: no change makes a year slower, measured before and after on the same machine.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) the deep fingerprint of people, money, the counted population, the kept log and journal totals is identical before and after; a paired run of the same year (both checkouts in one process, months alternated) is faster by more than the A/A pair's noise, and applyCountedFlows' inclusive time in a CPU profile falls; the births-counted, counted deaths and counted illness tests pass. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/births-counted.ts

**Notes.** Filed Oct 24 by the speed lead from the by-module profile in core-speed-year-over-limit-dense-town. The renewal half of core-speed-alloc-counted-births-followers (in-pr against bundle #5076, whose births-counted change is seven lines); this item is the bounded version on its own branch.

Done when amended Oct 24 by the speed lead before the PR, from measurement: the 'at least half' target for applyCountedFlows was set before the profile was read. Most of what the old pass cost was garbage (a death cohort's array copied once per member added), which a CPU profile charges to the collector, not to the function; the year-level paired run is the acceptance that sees it.

Not shipped yet (speed lead, Oct 24): exact (deep fingerprints identical for Long Hill one year and Stanardsville three years), and `applyCountedFlows` falls from 10.5 to 8.5 s in a profile of a paired run, but two paired runs of Long Hill's year read 0.957 and 1.002, which is inside the method's noise of a few percent. By the order's rule (a fix that saves less than run-to-run noise is not shipped) the branch `claude/speed-counted-renewal` waits; it ships together with a further cut in the same pass (the per-member monthly hazard sum, which builds strings and calls `Math.pow` for each of about 40,000 counted people a month) once the pair clears the noise.

Ready Oct 25 (speed lead), not opened while the play-first freeze holds: branch `claude/speed-counted-renewal` at 710c472e9d on main 01f5cd4715. It adds the cut named above: each member's monthly chance is worked out once per age and income fifth (members of a cohort share sex and birth year), and a new illness reads its household from the month's index. Exact: deep fingerprints identical before and after (Long Hill, Connecticut, seed m7b, year one `3350c66a3805f1e8`; Stanardsville, Virginia, seed cc91f5444b53bd47, years one to three `176370fb6d3c2ba1`, `3ccb0a9002236aa5`, `4be9e9254da3aaf3`). Paired Long Hill year 114.5 to 106.9 s (0.933); a profiled pair 128.0 to 118.5 s (0.925), `applyCountedFlows` inclusive 5.32 to 3.06 s. Ten renewal test files pass; `counted-births-weight` fails on main too and is fixed on its own (`tests-counted-births-weight-red`). Before opening: merge main, since the open PRs #5757, #5788 and #5786 also change `births-counted.ts`.

Sent back 2026-10-25 from PR #6072 (branch claude/speed-counted-renewal, checked f8b7d1ff41): required counted-births-weight.test.ts lost its worker to an OOM kill, and line 73 generates fresh random bytes without recording the draw before play or honoring seed bindings, so the failed input cannot be matched on main. Record and replay the same independent input, then resolve the memory failure or reproduce it on exact main; never replace it with a passing draw or disable bookkeeping. Long Hill timing and deep fingerprints, three-year Stanardsville fingerprints, the CPU profile and eight passing required files are preserved. Two other failures match main exactly and have their own open bugs; this birth-weight failure remains unclassified, so no complete green gate is claimed. Finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #6072 (branch claude/speed-counted-renewal), corrective head 9cd0510a8d4474222ec1213cd04711cf10df357f: a normal merge of current main f3ffe15b57369f21de7ebf210a3d07535c320764 conflicts in src/core2/births-counted.ts. The replayable root/attempt draw and pre-play logging address the prior return; preserve them, the indexing optimization and main's current counted-pregnancy flows when resolving the conflict. The merger aborted without resolving code or pushing; no current local gate or performance pass is claimed. Finish on that branch, merge main into it first.

Merger 0, Oct 26: Sent back from PR #6072 at current merged-main head 1f046200f820: Long Hill m7b one-year paired advances are 136.892614 s main / 136.858994 s PR (0.02456% observed difference), below the measured A/A noise of 1.9876%. The A/A opening/year-end world and ledger fingerprints match, but main/PR was SIGKILLed during final hashing after both advances, so its equality proof is incomplete; current profile and Stanardsville three-year proof were not reached. No retiming or replacement input was used. The replay fix now logs Heath root 6caa430bbe8beeb2600e9413def52bb2 before failure and identical full drivers reproduce worker OOMs on exact main and PR; Waimea does too, with unchanged cohorts/bookkeeping/assertions. Baseline memory is filed separately. Static checks pass (pool 34 exact main); three renewal files pass and eight match main worker failures. Obtain complete current fingerprints and a saving beyond noise, or split the completed replay fix into a bounded PR; finish on claude/speed-counted-renewal, merge main into it first.
