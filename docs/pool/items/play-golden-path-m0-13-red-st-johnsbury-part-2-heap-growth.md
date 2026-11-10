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

**What.** In a played year of St. Johnsbury, Vermont the heap after a collection grows about 17 MiB a month, against the check's 5 MiB ceiling. A long game slows down and runs out of memory on that. The growth is rows: a dozen engine tables add a row for every event and keep it. This item folds the largest group, the three jobs tables, and lists the rest. Seen: the game running, memory growing 17 MiB a month in a played year.

**Cause.** Needs cause. The earlier cause (three jobs tables keep a row for every event) differs from the code, measured by opus-5234 on main f55c104f with this item's repro (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, buildBenchWorld two-level, heap after gc). `regional` (one row per counted person working in the wider region, removed on a layoff, src/core2/modules/jobs.ts:2384) and `turnover` (one pull per live job and regional worker, pruned at jobs.ts:2408) are stocks: 5,675 and 6,604 rows at month 2, 11,647 and 12,547 at month 6, 11,767 and 12,632 at month 12. The heap grew about 26 MiB a month from month 2 to 6 and about 8.5 MiB a month from month 6 to 12, so most of the measured growth is the regional labor market filling from zero after the opening (13,789 hires in the year, nearly all regional, against 888 live town jobs). `changes` is the one event log of the three, about 465 rows a month after month 6. `regional` also keeps rows for counted people gone from the counts (`reviewTurnover` skips them at jobs.ts:2366 and never removes them): 21 at month 2 and 116 at month 10. A finder decides whether the opening should seat the regional workers it already knows, or the check should read growth after the fill. The readers of `changes` and their windows are mapped on PR #8253.

**Fix.** None until the cause is found.

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
