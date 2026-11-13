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
after: metrics-town-jobs-one-rule
blocked-on:
lead: jobs
model: opus
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The effects end-to-end proof on main (src/core2/effects-end-to-end.test.ts, test seed 6f539fcfdf6d96f9, drawn again to Santa Rita, Guam, seed 6f539fcfdf6d96f9-5) reads the town's economy record metrics:jurisdiction_12906d1946ba6871:2025-12-02 at 25.76 percent unemployment. A quarter of the town's labor force out of work after eleven months of play is far from Guam's recent published rates, which are in single digits, and the proof's unemployment links then raise the town's assault factor by 22 percent, so the number reaches named people. Find which engine record makes the rate (the jobs engine's counted and full workers against the labor force the world-metrics module divides by) and why it climbs in a territory town. The six-year Gracey, Kentucky game shows the same shape (town 15.1% while its state stood at 4.6%), so the item is now the measuring item for why a town's unemployment runs far above its state's, with the fix in the owning engine. Seen: Metrics' town unemployment beside the state's, in a Guam town and a second drawn place.

**Cause.** Found in code: the town's rate is built from about 86 people in a shrinking town (src/core2/modules/world-metrics.ts:186), while the state's comes from the regional model (src/core2/regional-model.ts:293). Inferred, not yet measured; three things stack: a town of 189 people has a labor force of about 86 so one seeker moves the rate by more than a point; the town's businesses fell from 31 to 22 and its residents at work from 108 to 69 (the shrink `world-local-sales-below-opening-forecast` names); and the counted tier is read by a different rule here than in the jobs engine (world-metrics.ts:102 and 115 against world-panels.ts:59 and 75, which `metrics-town-jobs-one-rule` unifies). From docs/design/output-numbers.md (#8926).

**Fix.** Take the measurement in two drawn places, Santa Rita (seed 6f539fcfdf6d96f9-5) and one more. In December of the second year read the seekers by tier, months looking, age and whether their last employer closed; read the same month's labor force both ways (by weight with out-of-town workers, and as the row counted it before `metrics-town-jobs-one-rule`); then count businesses founded against closed over the years played. Then fix the measured cause in the owning engine, or file it against `world-local-sales-below-opening-forecast` with the numbers.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a place the source lacks takes the median of the sourced places, marked as an estimate. One rule, all 56 places: the fix lives in data or in the shared rule, never in a branch for Guam. Real rates check totals; they never pick one worker's outcome (owner, Nov 8: ranges are not targets).

**Done when.** A second session plays two years in a drawn place, naming the place and seed, on main, and the town's December rate sits within the place's published band or the gap is named by record id. The pull request names the record that drove the December rate and the cause by file and line, and the island's published rate is printed beside it as a report. A test in src/core2 names the place and seed.

**Waits on.** metrics-town-jobs-one-rule.

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/jobs.ts, src/core2/regional-model.ts, src/core2/effects-end-to-end.test.ts

**Notes.** Found Oct 26 by the effects lead while making the end-to-end talk screenshot; the proof itself passes and is unchanged.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Santa Rita, Guam replay, read how the metrics row's unemployment is built in src/core2/modules/world-metrics.ts (the labor force and the jobless counts it sums) and compare each count with the jobs engine's own tables for that town. The fix is then made in the shared rule, never in a branch for one place, and the real island rate is printed beside the result as a figure to report.

**Notes (Nov 12).** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12: the page's trace of the town-over-state gap is this item's cause and fix, rewritten above; the build that makes the count one rule is `metrics-town-jobs-one-rule`.
