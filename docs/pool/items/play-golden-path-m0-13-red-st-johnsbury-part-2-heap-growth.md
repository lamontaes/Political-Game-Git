---
id: play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth
title: "Monthly heap growth in the played world stays under the test's 5 MiB ceiling"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #8253
after: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split
blocked-on:
lead: play-first
model: opus
effort: medium
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth
---

**What.** In a played year of St. Johnsbury, Vermont the heap after a collection grows about 17 MiB a month, against the check's 5 MiB ceiling. A long game slows down and runs out of memory on that. The growth is rows: a dozen engine tables add a row for every event and keep it. This item folds the largest group, the three jobs tables, and lists the rest.

**Cause.** Measured: on main cb25bfa5c8 (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, buildBenchWorld, two-level, heap read after a forced collection) the heap is 679 MiB a month in and 873 MiB at twelve months, 17.6 MiB a month. In the same eleven months the engine tables gained about 110,000 rows. The largest: the jobs module's `changes` +12,920 (now 15,921), `regional` +8,872 and `turnover` +8,767 (src/core2/modules/jobs.ts, the tables at lines 507, 2355 and 2301); law-effects `applied` +10,569 (now 36,577); coverage `countedCoverage` +8,849; candidacy `decisions` +6,945; news `heard` +6,907; the record module's `votes` +6,352; employer-taxes `shares` +4,910; credit `loans` +4,694 and `households` +3,954; campaigns `doors` +3,060; law-reach `people` +2,876; views `openings` +2,820. The durable log gained 3,863 rows (person.acted 1,658), relationships 5,638 and people kept as records 442 (144 more in the weekly, monthly and calendar tiers, and husks from 24 to 322), so the log is not the largest part, whatever the check's text says. The three jobs tables are the largest group, 30,559 rows, and no fold item covers them.

**Fix.** Fold the three jobs tables, following .agents/skills/speed-work/SKILL.md ("Fold what grows"). First map every reader of `changes`, `turnover` and `regional` in src (screens, scenes, the life record, law reach, tests) and agree each reader's window with the Jobs session named in docs/coordination/CREW.md. Then keep, as rows, what a reader still reads: every row of the player, their household and circle and anyone in focus, and every row inside the agreed window. Fold the rest into totals per employer and month (hires, quits, layoffs, pay changes), written on the month's close that already runs, never by scanning history. `findRecord` must still resolve a folded row's id to its total. One fold per pull request if the three tables' readers differ. Then file one item per remaining table in the Cause's list that has no fold item (coverage `countedCoverage`, credit `loans` and `households`, the record module's `votes`, news `heard`, employer-taxes `shares`), each with its own measured count; `applied` is core-speed-law-effects-records-growth.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the played-world check on main with GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 and sees the three jobs tables hold fewer rows at twelve months than at two, the month's heap growth reported beside 17.6 MiB, and the records proof (`npm run speed:year -- --proof-out`) differing from main only in the three folded tables. In the running game in a drawn place (place and seed named) the player's own job history, a coworker's card and the Trace still show every job change they showed before.

**Waits on.** Nothing. The re-run its first part was to make is done (Nov 10, main cb25bfa5c8).

**Files.** src/core2/modules/jobs.ts, src/bench/dev-proof.ts, tests/golden-path/played-world.node-test.ts

**Notes (Fable, Nov 10).** Re-run by Fable on Nov 10 on main cb25bfa5c8 with the command in the Cause (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4; the year ran in 105 seconds): 21 checks pass and 1 fails. This part's check is still broken: heap growth a month after the first is 16.7 MiB over 11 months, against the 5 MiB ceiling, and the check says the durable log grows most. The first part's re-run is therefore done; a finder starts from counting the durable log's rows by kind at month 2 and month 12.

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 22:49 UTC) on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth.

Released (2026-11-10): Cause differs from code: turnover and regional are one row per live worker and level off after month 6 (St. Johnsbury VT, seed f915eb03); the heap growth is the regional fill in the first half year; measurements and reader map on PR #8253. Continue on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth and pull request #8253.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:01 UTC) on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth.

Released (2026-11-10): Re-offered after release; marking its Cause Needs cause with the measurement (PR #8253). Continue on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth and pull request #8253.
