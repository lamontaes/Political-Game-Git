---
id: world-town-unemployment-quarter-santa-rita-guam
title: "A Guam town's December unemployment reads 25.76 percent in a played year (Santa Rita, seed 6f539fcfdf6d96f9-5)"
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

**Cause.** Needs cause. Looked at: src/core2/effects-end-to-end.test.ts reads 25.76 percent unemployment at metrics:jurisdiction_12906d1946ba6871:2025-12-02 in Santa Rita, Guam (seed 6f539fcfdf6d96f9-5); the rate is built in src/core2/modules/world-metrics.ts from the residents' jobs.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: a Guam town's unemployment rate on the Metrics tab, 25.76 percent, and the assault factor it raises.

**Rules.** Estimate, never UNKNOWN: a place the source lacks takes the median of the sourced places, marked as an estimate. One rule, all 56 places: the fix lives in data or in the shared rule, never in a branch for Guam. Real rates check totals; they never pick one worker's outcome (owner, Nov 8: ranges are not targets).

**Done when.** A second session, on main, plays a year in dev mode in Santa Rita, Guam (seed 6f539fcfdf6d96f9-5) and in a second drawn territory place, and reads the town's unemployment each month on the Metrics tab: the pull request names the record that drove the December rate and the cause by file and line, the rate follows from the town's labor force and jobs records by record id, and the island's published rate is printed beside it as a report. A test in src/core2 names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/jobs.ts, src/core2/effects-end-to-end.test.ts

**Notes.** Found Oct 26 by the effects lead while making the end-to-end talk screenshot; the proof itself passes and is unchanged.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Santa Rita, Guam replay, read how the metrics row's unemployment is built in src/core2/modules/world-metrics.ts (the labor force and the jobless counts it sums) and compare each count with the jobs engine's own tables for that town. The fix is then made in the shared rule, never in a branch for one place, and the real island rate is printed beside the result as a figure to report.
