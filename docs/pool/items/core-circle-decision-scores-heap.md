---
id: core-circle-decision-scores-heap
title: "A played year in St. Johnsbury, Vermont ends at 1,900 to 2,050 MB because 6,690 circle decisions keep every option's score and reason terms"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-circle-heap
pr: #5957
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T15:30:56.380Z
---

**What.** M0-13's 'memory at the end stays under 2000 MB' is the only assertion that fails in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4): golden-path-year on PR 5919's head 2cb06900b4 held 2,049 MB, and clean main 8a0497ab01 held 1,899 MB on Node 22 here (CI imports the engine at 399 MiB against 306 MiB here, so main sits at the edge on CI). The retained heap after the year is 1,870 MiB, and 626 MiB of it is the durable log's person.acted rows that still carry decision.scores: 6,690 rows of focus (circle) people from the last 30 days (circleDecisionDetailDays, src/core2/decision-detail.ts condenseCircleDecisions) holding 1,121,970 score rows (about 168 offers each, from scoreOffers in src/core2/choice.ts:282 called by activate in src/core2/life.ts:417) and 827,614 reasonTerms, because savesReasons (choice.ts:270) keeps the terms of every offer for every focus person while the choice.ts:348 comment says at most the selected and runner-up terms are kept. Measured by removing them from a finished year: stripping reasonTerms from the score rows frees 310 MiB, dropping the other people's scores 316 MiB more; the player's 365 rows are only 11 MiB. The pressure comes from the focus set growing from 33 to 190 people during the year, so big circles cost most; Decaturville, Tennessee and Lawrenceville, Virginia end at 597 and 688 MB.

**Rules.** Speed and the Keep-it-simple rule bookkeeping is a debug switch: reasons are saved for the player and the people they deal with, but a circle member's alternatives only need their numbers and the selected and runner-up terms. Ask why: the selected reason terms and the compact choice stay on every kept act, so the why view still names the choice. One rule, all 56 places: the bound must hold in a big circle in any place, not one tuned town.

**Done when.** tests/golden-path/played-world.node-test.ts (M0-13) passes its memory-at-the-end check in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) with the heap at least 250 MB under the 2000 MB bound in buildBenchWorld, and in two more drawn places named with their seeds; the PR body gives the heap before and after, the count of durable log rows that still hold scores, and src/core2/grief.test.ts, src/core2/condense-decisions.test.ts and src/core2/module-hooks.test.ts still pass unchanged.

**Files.** src/core2/decision-detail.ts, src/core2/choice.ts, src/core2/state.ts, src/core2/life.ts

**Notes.** Found Oct 24 by the M0-13 lead's helper (claim play-golden-path-m0-13-red-st-johnsbury). Method: sampling heap profiler over the year (live bytes by allocation site: 547 MiB scoreOffers, 115 MiB decisionFromScores under activate) and ablation on the finished world. Smallest fix to try: when retainLog (state.ts:682) stores a non-player circle act, drop reasonTerms from the non-selected score rows (src/core2/grief.test.ts:79 reads alternatives' terms from the chooseAct return, not from the log, so it should hold); next: condense circle scores sooner than 30 days. Choosing what the circle keeps is the owner's Oct 12 rule, so flag the choice under OWNER DECISIONS NEEDED. Related: core-played-year-large-town-heap-bound (Sandy, Utah), core-memory-election-log-growth.
