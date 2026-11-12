---
id: play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth
title: "A year of office hours turns 400 counted residents into full people, the largest single part of the played world's memory growth"
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
model: sonnet
effort: medium
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-11
claimed-at:
branch: claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth
---

**What.** In a played year the game's memory grows about 20 MiB a month, against the golden path's 5 MiB ceiling (check M0-13), so a long game slows and then runs out of memory. Measured on Nov 11 in the item's own town, month by month, the growth is not one leak. The largest single part is people: the town opens with 961 full people and ends the year with 1,558, and 403 of the 597 new ones are counted residents that an official's office hours filled in, with their households, because they brought a case. Nobody the player knows met them. Each then learns facts, keeps accounts, a payroll, trait scores and monthly act counters for the rest of the save. This part stops that. The Notes list what else grows, by size, for the parts after it. Seen: dev mode's Records count on the Calendar and the People screen, where a year of play no longer adds hundreds of full people the player never met, and the golden path's M0-13 line, which reports the month's growth beside 19.6 MiB.

**Cause.** Measured: three probes and the code they point at (main c9cfd369eb, St. Johnsbury, Vermont, key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, `buildBenchWorld` two-level, heap after two collections).

- **The heap.** 514.5 MiB at the opening, 666.1 after month 1, 816.3 after month 6, 882.2 after month 12. The check reads month 1 to month 12: 19.6 MiB a month. Months 1 to 6 grow 30 a month; months 7 to 12 grow 10.
- **Who fills people in.** `bringCases` in src/core2/modules/constituent-cases.ts (line 276 to 292) reads the jobs engine's counted seekers at every office hours, and for each one whose leaning says "bring" it calls `fillInPerson` (line 291) before `bringCase`. Its own comment says why: "so the case, the relationship and the view of the official land on a full person". `fillInPerson` (src/core2/state.ts, line 2309) takes the whole household. Counted over the year with a probe at that function: 167 fill-ins made 471 people; 140 of them, 403 people, came from `bringCases`; 14 (45 people) from `hireStaff`; the rest from drives, filing and the player's hiring.
- **What a full person costs.** By estimated JSON bytes at month 12: about 29 KB of knowledge (`core.knowledgeByPerson`, 42 MB for 1,451 people at month 9), 8 KB in `core.people`, 4.8 KB of trait scores (the trait-change part's `scores`), and for one who works about 36 KB of payroll (`core.work.payrollCashSources`, 24 KB a row, 0 rows at the opening and 459 at month 12; `latestPayrollByJob`, 12 KB a row). They also add act counters (`core.actCounters`, 577 rows at month 1 and 14,955 at month 12), name and "met" facts (651 name facts at the opening, 8,260 at month 6) and drive decisions. Those rows are the first-half growth the earlier measurement called "the regional fill".
- **They do not leave.** By month 12, 306 of them are husks, but a husk stays in `core.people` and keeps its rows.

**Fix.** Steps 1 to 3 are already built: pull request #8738 (core-speed-counted-cases-stay-counted, the Speed lead, Nov 11) keeps a counted seeker counted unless the player holds the office or watches the official, and keys the case by the resident's id so a later fill-in finds it. The lead wrote this item before finding that pull request; the steps stay here as the record of what the fix is. What is left for this item is step 4 and the second measurement.

1. **A counted seeker stays counted.** In `bringCases`, the loop over `countedOutOfWork` no longer calls `fillInPerson`. `bringCase` takes what it reads from a person (id, traits, place, the problem and its facts) as a small input both tiers can give, and writes the same case row for a counted seeker, keyed by their id.
2. **One rule decides both.** The office's decision on a case (at office hours, or by the office's staff or habit past the deadline) reads the case row and the same inputs for a counted seeker as for a full person, and records the same reasons. Where it writes the resident's view of the official, a counted seeker's goes through the views module's counted writer (the table `countedStances`), never a second store.
3. **Filled in when met.** The seeker is filled in when the official hearing the case is the person the player controls, when the player opens the case or the person, and at no other time. The fill-in then reads the case rows already kept for that id, so the person's card and their tie to the official match the record (two-level population: a filled-in person must match what the records already say). If the cases module has no `onFillIn` step, add one that builds the tie from the kept cases.
4. **The check says what grew.** In tests/golden-path/played-world.node-test.ts, when the month's growth is over the ceiling, the failure line names the five tables or parts that grew most between month 1 and the end, with rows, read from table sizes only (no digests). Today it says only that the durable log grows most, which the measurement above shows is not so.
5. **Not daily, no new store.** Nothing new runs on an ordinary day; no table is added.

**Time box.** 2 hours for one Sonnet session, once #8738 is on main. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Two-level population (owner, Oct 11): full people exist only where they matter, and a filled-in person must match what the records already say. One model, two tiers (owner, Oct 14): a counted seeker's case is decided by the same rule as a full person's; a rule that works only on full people is an unregistered placeholder, and filling people in to make it work is the same fault. Speed (owner, Oct 29): memory and records kept must hold over a long save. No dice: who brings a case is still decided by their own leaning, as now. One rule, all 56 places: the tests draw their places and name them with their seeds.

**Done when.** With #8738 on main, a second session runs the played-world check on main with GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 and sees fewer than 1,200 full people at the end of the year, against 1,558 on Nov 11, and the month's heap growth reported beside 19.6 MiB. When the growth is over the ceiling, the failure line names the five tables or parts that grew most between month 1 and the end, with their rows, and that list is written into this item's Notes with the next part's id for the largest of them. In a drawn place written down with its seed, the same check's line names its growers too. The seen check of the office hours themselves (a counted resident's case on the player's own desk) belongs to core-speed-counted-cases-stay-counted.

**Waits on.** core-speed-counted-cases-stay-counted (pull request #8738) on main. The first part's re-run is done (Nov 10, main cb25bfa5c8).

**Files.** tests/golden-path/played-world.node-test.ts

**Notes (Fable B, Nov 11, 15:45 UTC: the measurement).** The lead ran three probes in the repro town on main c9cfd369eb: every table's rows and estimated bytes each month, the fields inside the largest parts at months 0, 1, 6 and 12, and a count at `fillInPerson` of who called it. This part will not bring the check under 5 MiB by itself. What else grows, largest first by estimated JSON bytes, each needing its own item with its readers mapped before any fold (skill `cadence-and-summaries`):

- **Other states' officials are built as full people when they die.** 78 died in the year (16 by month 3, 37 by month 6, 61 by month 9), nearly all legislators of other states, out of about 8,000 officials on record, which is a real rate. Each is built as a full person the day the death falls due (src/core2/modules/health.ts, about line 1140, "A husk whose death falls due is built now") and stays in `core.people` dead. A small part; listed so nobody reads the 78 as the home state's officials, as the lead first did.
- `core2-employer-taxes-v1.shares`: 135 rows at month 1, 5,058 at month 12 (8.3 MB), about 500 a month and never fewer: one row a receipt (src/core2/modules/employer-taxes.ts, line 716).
- `core2-record-v1.votes`: 12,136 rows at month 1, 22,940 at month 12 (13.2 MB).
- `credit.loans`: 18 rows at month 1, 4,688 at month 12 (7.4 MB). The opening holds almost no loans and the town takes them out all year; whether closed loans are kept is not yet read.
- `core2-coverage-v1.countedCoverage`: 9,182 rows at month 1, 24,227 at month 12 (16.5 MB); it levels off after month 6.
- `candidacy.decisions`: 208 rows at month 1, 6,969 at month 12 (6.5 MB), nearly all written by month 9.
- `jobs.changes`: 3,011 rows at month 1, 17,813 at month 12 (7.3 MB), about 700 a month in the second half.
- `core.durableLog`: 1,313 rows at month 1, 6,257 at month 12 (11.3 MB); by kind at month 12: `person.acted` 2,367, `person.weighed` 925, `law-took-effect` 478, `person.recorded` 471, `campaign-gift` 342.
- The drives part's `decisions`: 581 at month 1, 2,452 at month 12 (4.2 MB).
- Stocks that are large from the opening and hold steady: the residents part (about 65 MB), `core2-officials-v1.officials` (8,265 rows, 35 MB), `core2-coverage-v1.medicalBills` (about 20,000 rows, 27 MB).

The earlier cause (three jobs tables) and its "regional fill" reading were measurements of the same year by rows; by bytes the jobs tables are a small part. The probes are the lead's scratch scripts; a builder repeats them with `scripts/speed-years/probe-bytes.ts` and a count at `fillInPerson`.

**Notes (Fable, Nov 10).** Re-run by Fable on Nov 10 on main cb25bfa5c8 with the command in the Cause (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4; the year ran in 105 seconds): 21 checks pass and 1 fails. This part's check is still broken: heap growth a month after the first is 16.7 MiB over 11 months, against the 5 MiB ceiling, and the check says the durable log grows most. The first part's re-run is therefore done; a finder starts from counting the durable log's rows by kind at month 2 and month 12.

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 22:49 UTC) on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth.

Released (2026-11-10): Cause differs from code: turnover and regional are one row per live worker and level off after month 6 (St. Johnsbury VT, seed f915eb03); the heap growth is the regional fill in the first half year; measurements and reader map on PR #8253. Continue on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth and pull request #8253.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:01 UTC) on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth.

Released (2026-11-10): Re-offered after release; marking its Cause Needs cause with the measurement (PR #8253). Continue on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth and pull request #8253.
