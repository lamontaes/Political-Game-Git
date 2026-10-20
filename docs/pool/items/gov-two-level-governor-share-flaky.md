---
id: gov-two-level-governor-share-flaky
title: "two-level-elections.test.ts fails one run in five in a random place: the Governor's share is 0.153, over the 0.15 bound"
area: gov
kind: bug
priority: 2
size: S
status: blocked
claimed-by: claude/pool-governor-share
pr: #4861
blocked-on:
source: found in #4859, Oct 17
claimed-at: 2026-10-20T01:42:42.348Z
---

**What.** `src/core2/two-level-elections.test.ts` ("counted residents vote, challengers get real votes, and statewide results track the state") fails about one run in five in a random place because a statewide-executive race's Republican share sits more than 0.15 from the state's raw presidential split. The model is right: statewide executive races weigh the sitting executive's public standing (`STANDING_FAMILIES` in `src/core2/modules/voting.ts`), so the result moves toward the sitting executive's party. Keep the 0.15 bound and do not loosen it. Instead measure it from an expected share derived from the race's own records: the interval between the state's presidential split and the share the standing term predicts for the seat's sitting executive party (`contest.incumbentTermId`, its `TermRow.party`, as `candidateReasons` reads it). Assert that the governor's share lies within 0.15 of that interval, in every drawn place.

**Rules.** No dice: the expected share comes from the race's records (the term's party, the standing term, the state's split), never a roll or a fitted fixed number. Estimate, never UNKNOWN: the standing term's size is read from the voting engine, not copied into the test. One rule, all 56 places: the test draws a place and the failure message prints the place and the seed. Ask why: the failure message names the contest, the standing party and both ends of the interval. The merger rule bars loosening a test; this replaces the invariant with an equally strong one derived from the records.

**Done when.** The test passes in at least twenty drawn places from all 56 (place and seed named in the output) in one-year runs of the played world (buildBenchWorld, twoLevel opening), with the 0.15 bound kept and measured from the interval, including the Rhode Island Secretary of State case (gap 0.151 on the raw split) and states whose sitting governor is of the party that lost the presidential vote; proven by src/core2/two-level-elections.test.ts, and the PR body shows the measured gaps from the interval.

**Files.** src/core2/two-level-elections.test.ts, src/core2/modules/voting.ts

**Notes.** Seen on main with and without the ward residency change (#4859). The place and seed were not printed by the failing run; print them in the assertion message. Finish on branch claude/governor-share-flaky (PR #4861): merge main into it first, and do not keep its loosened <0.16 or <0.2 bound.
Oct 20 (pool feeder): spec written; the owner's Oct 20 ruling that vote swings stay small supports keeping 0.15; the CTO ruling is to measure from the standing-aware interval.

Measured Oct 19 (claude, nothing changed in the game or the test): the test cannot hold 0.15 against the raw split for the reason the PR gave, and 0.2 is looser than the model needs. One drawn place per state, seed probe-a, 48 states (the two-level opening, 2026-11-03 statewide races): 240 statewide-executive rows, largest gap between the Republican two-party share and the state's presidential split 0.151 (Rhode Island, Secretary of State), 95th percentile 0.131, 99th 0.145; only Rhode Island is over 0.15, by 0.001. The gaps are one-sided: in the bluest states the Republican share runs 0.12 to 0.15 below the presidential split (Delaware -0.131, Connecticut -0.116, Colorado -0.117, Massachusetts -0.145, Rhode Island -0.151). The cause is by design: statewide executive races weigh public standing (STANDING_FAMILIES in modules/voting.ts), and the state's sitting executive is a party that held the state. The repository's own corpus shows why no fixed bound on the presidential split is sound: in 10 of 50 states the sitting governor is from the party that lost the state's 2024 presidential vote (AZ, KS, KY, MI, NC, PA, WI Democratic; NH, VA, VT Republican), so the state's result can sit a presidential margin away by itself (Kentucky: 0.345 Democratic). Probe: a copy of this test looped over all states, deleted after the run.

Sent back 2026-10-19 from PR #4861 (branch claude/governor-share-flaky): Morning check: src/core2/two-level-elections.test.ts loosens the statewide-executive vote-share assertion from <0.15 to <0.2. The merger rules explicitly refuse tests that are loosened; fix the model or preserve an equally strong invariant; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4861 (branch claude/governor-share-flaky): Morning check on the Oct 20 updated head: src/core2/two-level-elections.test.ts still loosens the statewide-executive vote-share assertion from <0.15 to <0.16. The added measurements explain the proposed bound but do not preserve the existing invariant. The merger rule forbids loosening tests; fix the cause or replace the old assumption with an equally strong assertion derived from the candidate and electorate records.; finish on that branch, merge main into it first.
