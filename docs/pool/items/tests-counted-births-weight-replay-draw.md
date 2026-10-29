---
id: tests-counted-births-weight-replay-draw
title: "Record and replay the birth-weight test draw before playing its world"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/speed-counted-renewal
pr: #6072
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T05:31:04.601Z
---

**What.** src/core2/counted-births-weight.test.ts:73 draws fresh crypto bytes inside each attempt and ignores the usual seed bindings. During local review of PR #6072 at f8b7d1ff41951522df88bae7cc2adccdac5daa66 its worker was OOM-killed after 84.70 seconds, before returning a test result or printing its input draw. The unrecorded input cannot be replayed on exact main, so this failure remains unclassified and no baseline equivalence is claimed.

**Rules.** One rule, all 56 places: preserve an independent root and every original cohort rather than selecting a passing place. No vacuous tests: retain the full simulation, six-attempt bound, bookkeeping and positive expected and booked birth and death assertions while making failed input reproducible.

**Done when.** The original full birth-weight test accepts a replayable independent root or recorded draw sequence and prints each place and seed before building or playing. The same recorded input can be rerun on main and the PR, without replacing a failed draw, reducing the cohort, disabling bookkeeping or weakening its positive assertions. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/counted-births-weight.test.ts

**Notes.** TODO

Sent back 2026-10-26 from PR #6072 (branch claude/speed-counted-renewal), corrective head 9cd0510a8d4474222ec1213cd04711cf10df357f: a normal merge of current main f3ffe15b57369f21de7ebf210a3d07535c320764 conflicts in src/core2/births-counted.ts. The replayable root/attempt draw and pre-play logging address the prior return; preserve them, the indexing optimization and main's current counted-pregnancy flows when resolving the conflict. The merger aborted without resolving code or pushing; no current local gate or performance pass is claimed. Finish on that branch, merge main into it first.

Merger 0, Oct 26: Sent back from PR #6072 at current merged-main head 1f046200f820: Long Hill m7b one-year paired advances are 136.892614 s main / 136.858994 s PR (0.02456% observed difference), below the measured A/A noise of 1.9876%. The A/A opening/year-end world and ledger fingerprints match, but main/PR was SIGKILLed during final hashing after both advances, so its equality proof is incomplete; current profile and Stanardsville three-year proof were not reached. No retiming or replacement input was used. The replay fix now logs Heath root 6caa430bbe8beeb2600e9413def52bb2 before failure and identical full drivers reproduce worker OOMs on exact main and PR; Waimea does too, with unchanged cohorts/bookkeeping/assertions. Baseline memory is filed separately. Static checks pass (pool 34 exact main); three renewal files pass and eight match main worker failures. Obtain complete current fingerprints and a saving beyond noise, or split the completed replay fix into a bounded PR; finish on claude/speed-counted-renewal, merge main into it first.

Oct 29 (CTO): set done; PR #6072 merged (the done flip failed while branch protection refused the flip job's push).
