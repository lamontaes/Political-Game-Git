---
id: world-town-unemployment-quarter-santa-rita-guam
title: "The town's unemployment is counted two ways: the Metrics tab reads about 10 percent in Santa Rita, Guam, the outcome web reads 2 percent"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The effects end-to-end proof on main (src/core2/effects-end-to-end.test.ts, test seed 6f539fcfdf6d96f9, drawn again to Santa Rita, Guam, seed 6f539fcfdf6d96f9-5) reads the town's economy record metrics:jurisdiction_12906d1946ba6871:2025-12-02 at 25.76 percent unemployment. A quarter of the town's labor force out of work after eleven months of play is far from Guam's recent published rates, which are in single digits, and the proof's unemployment links then raise the town's assault factor by 22 percent, so the number reaches named people. Find which engine record makes the rate (the jobs engine's counted and full workers against the labor force the world-metrics module divides by) and why it climbs in a territory town.

**Cause.** Found in code: the 25.76 percent no longer reproduces, but one town holds two unemployment figures, and the outcome web reads the wrong one. Measured on main d64255aa in Santa Rita, Guam (territory:GU:santa-rita, `drawPlace("6f539fcfdf6d96f9-5", "effects-end-to-end")`, `buildBenchWorld`, 150 households filled in as src/core2/effects-end-to-end.test.ts does). The world-metrics row for the town reads 9.1 percent in March, 4.7 percent in June and 2.1 percent in December 2025 (19 unemployed against 905 residents employed). `townJobsPanel` in src/core2/modules/world-panels.ts, which the Metrics tab's town section shows (src/bench/metrics.ts `metricsView`), reads 2,568 employed and 288 seekers on the same day, about 10.1 percent. They differ because `townMetrics` in src/core2/modules/world-metrics.ts (the loops at about lines 88 to 137) counts residents employed only from recorded job rows, one per row, and leaves out the 1,663 workers the opening placed outside a recorded employer (`CountedHousehold.unplacedWorkers`). It also counts each `seekers` and `countedSeekers` row as one person, where the panel counts each counted resident at its household's weight and adds the unplaced workers. The outcome web reads the metrics row (`world-metrics months.unemploymentRate`, src/core2/data/outcome-web/outcome-web.json about line 334), so the assault factor and every other unemployment link run on a figure the player never sees.

**Fix.** One figure, one place (one engine per mechanic: every view reads the same record). In `townMetrics`, compute a town's residents employed and unemployed by the panel's rule: counted residents at their weight, the weighted `unplacedWorkers` as employed, and seekers by heads, as `townJobsPanel` does. Then make `townJobsPanel` read the month's metrics row for its employed and seekers instead of counting again, so there is one count. Keep `employed` (jobs at the town's firms, commuters included) as it is: it is a different fact. Check the outcome web's unemployment links still read `unemploymentRate`, and note in the PR body how the assault factor in the effects proof moved.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: a Guam town's unemployment on the Metrics tab and the assault factor the outcome web raises from a different figure.

**Rules.** Estimate, never UNKNOWN: a place the source lacks takes the median of the sourced places, marked as an estimate. One rule, all 56 places: the fix lives in data or in the shared rule, never in a branch for Guam. Real rates check totals; they never pick one worker's outcome (owner, Nov 8: ranges are not targets).

**Done when.** A second session, on main, plays a year in dev mode in Santa Rita, Guam (seed 6f539fcfdf6d96f9-5, drawn with "effects-end-to-end") and in one other drawn place. Each month, the Metrics tab's town employed and seekers and the metrics row's `unemploymentRate` give the same rate, by record id, and the outcome web's unemployment links read that rate. A test in src/core2 names the place and seed and asserts the two agree. Guam's published rate is printed beside it as a report.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/world-panels.ts, src/bench/metrics.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/effects-end-to-end.test.ts

**Notes.** Found Oct 26 by the effects lead while making the end-to-end talk screenshot; the proof itself passes and is unchanged.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Santa Rita, Guam replay, read how the metrics row's unemployment is built in src/core2/modules/world-metrics.ts (the labor force and the jobless counts it sums) and compare each count with the jobs engine's own tables for that town. The fix is then made in the shared rule, never in a branch for one place, and the real island rate is printed beside the result as a figure to report.

Nov 11 (cause finder for Fable B): the 25.76 percent did not reproduce on main d64255aa (2.1 percent in December with the test's 150 fill-ins). Comparing the two readers in the same world showed the metrics row and the Metrics tab's panel counting unemployment differently, which is the defect left. Rewritten to that.
