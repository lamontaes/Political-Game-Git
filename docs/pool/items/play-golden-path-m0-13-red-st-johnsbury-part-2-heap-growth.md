---
id: play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth
title: "Monthly heap growth in the played world stays under the test's 5 MiB ceiling once the growing tables fold"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #8253
after: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split
blocked-on: core-long-run-tables-grow-with-history-part-2-durable-log-and-speech, core-memory-arcadia-medical-bills-and-loans-grow, play-golden-path-m0-13-red-st-johnsbury-part-6-employer-tax-shares-fold
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth
---

**What.** In a played year of St. Johnsbury, Vermont the heap after a collection grows about 21 MiB a month, against the check's 5 MiB ceiling. A long game slows down and runs out of memory on that. The growth is not one table: about 30 tables add rows for every event and keep them, and the largest already have fold items with the speed lead. This item waits on those folds and the new employer-tax fold (part 6), then re-measures and records what is left. Seen: the desktop game keeps playing past year 2 instead of running out of memory, and the played year's memory line in the check passes.

**Cause.** Measured: St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, `buildBenchWorld` two-level, bookkeeping off, heap after two `gc()` calls, main d64255aa (Nov 11). Heap: 514 MiB at the opening, 665 at month 1, 821 at month 6, 899 at month 12, so 21.3 MiB a month by the test's measure (months 1 to 12) and 13 MiB a month from month 6 to 12, after the regional labor market has filled. The kept records as JSON grow 56 MB from month 6 to 12. The largest growers in that half year, in MB: core.durableLog 8.3; core2-coverage-v1 tables 7.9 (medical bills and counted coverage); core2-employer-taxes-v1 tables 5.3 (`shares`, one row per paycheck, src/core2/modules/employer-taxes.ts line 716); core2-campaigns-v1 4.4 (an election season, owned by the speed lead); credit 4.1 (households and loans); trait-change scores 3.3; jobs 2.7; record votes 2.6; drives decisions 2.2; detailed cash receipts 2.1. Each of these is listed in docs/design/daily-register.md as "grows, a row per event, no fold yet". The three jobs tables are not the cause: `regional` and `turnover` are stocks that level off after month 6 (measured by opus-5234, PR #8253), and `changes` is 465 rows a month.

**Fix.** Build nothing here until the three items in blocked-on land: the durable log fold (core-long-run-tables-grow-with-history-part-2-durable-log-and-speech), the medical bills, coverage and loans fold (core-memory-arcadia-medical-bills-and-loans-grow) and the employer-tax shares fold (part 6). Then rerun the played-world check with the place and seed above. If growth is under 5 MiB a month, record the figure in the Notes and close the item through its PR. If not, list the next five growers by MB over months 6 to 12 with the probe described in the Notes, and file one fold item for each that has no item yet (search docs/pool/items first). Do not raise the ceiling and do not change the check's months.

**Time box.** 2 hours for one Sonnet session, once the three folds are merged. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the played-world check on main with GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 and on one drawn place (place and seed named), and sees the line "the town's memory grows under its ceiling" pass, or sees the item's Notes list each remaining grower by MB with the fold item filed for it.

**Waits on.** The three items in blocked-on.

**Files.** tests/golden-path/played-world.node-test.ts, scripts/core2-guard/policies.json, docs/design/daily-register.md

**Notes (Fable, Nov 10).** Re-run by Fable on Nov 10 on main cb25bfa5c8 with the command in the Cause (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4; the year ran in 105 seconds): 21 checks pass and 1 fails. This part's check is still broken: heap growth a month after the first is 16.7 MiB over 11 months, against the 5 MiB ceiling, and the check says the durable log grows most. The first part's re-run is therefore done; a finder starts from counting the durable log's rows by kind at month 2 and month 12.

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 22:49 UTC) on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth.

Released (2026-11-10): Cause differs from code: turnover and regional are one row per live worker and level off after month 6 (St. Johnsbury VT, seed f915eb03); the heap growth is the regional fill in the first half year; measurements and reader map on PR #8253. Continue on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth and pull request #8253.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:01 UTC) on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth.

Released (2026-11-10): Re-offered after release; marking its Cause Needs cause with the measurement (PR #8253). Continue on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth and pull request #8253.

Cause found (Nov 11, 2026, cause finder for Fable B): measured month by month on main d64255aa with the place and seed above. The probe built the world, advanced day by day, and at months 1, 6 and 12 took the JSON length of every table `worldRecords` (src/core2/snapshot.ts) returns. The growth is spread over many per-event tables, already on the daily register's list of folds. The one real leak in jobs (`regional` keeps rows for counted people gone from the counts, src/core2/modules/jobs.ts line 2366) is about 20 rows a month and is not worth an item of its own. Part 6 takes the largest grower with no item yet.
