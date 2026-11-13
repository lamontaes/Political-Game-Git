---
id: people-residents-cadence-mechanic-part-1-private-jobs-measure
title: "The turnover measure counts private jobs and worker-months only"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: low
root: design-one-model-two-tiers
source: split from people-residents-cadence-mechanic in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-people-residents-cadence-mechanic-part-1-private-jobs-measure
---

**What.** turnoverReport divides job changes by every open job in core.jobs and the counted books. A drawn town's open jobs are mostly full public and office posts of other governments, which the monthly worker review skips: Scranton, North Dakota (3871500, seed q1) has 1,563 of 1,630. JOLTS total private rates count private jobs only, so the measure must divide changes at finance.businesses by worker-months at businesses, full and counted. Feeds: people-residents-cadence-mechanic-part-2-counted-layoffs.

**Cause.** Found in code: src/core2/turnover-check.ts turnoverReport (line 43) divides by every open job; the rates are in data/research/people/jolts-cps-turnover-absence-2025.json.

**Fix.** Change turnoverReport to count private jobs and worker-months only, full and counted, and report hires, quits, layoffs and separations per month beside the JOLTS industry rates weighted by the town's employment.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group follows the same rule as a full person, times its count. No dice: absence and layoffs follow a worker's own record and the employer's books; real rates check totals only. Every dollar balances. Speed: the speed guard holds, with no scan of the whole world each day.

**Done when.** A second session runs src/core2/turnover-check.ts over a one-year played world (buildBenchWorld) in Salem, Utah (seed 07f42052624493fd) and one more drawn place named with its seed, and sees the rates divide by private jobs and worker-months only, with hires, quits, layoffs and separations per month reported beside the JOLTS rates, by job change record ids.

**Waits on.** Nothing.

**Files.** src/core2/turnover-check.ts, src/core2/residents-turnover-bands.test.ts

**Notes.** Released by next (2026-11-13): no push to claude/pool-people-residents-cadence-mechanic-part-1-private-jobs-measure since 2026-11-11 07:45 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-people-residents-cadence-mechanic-part-1-private-jobs-measure.
