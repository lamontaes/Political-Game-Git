---
id: people-residents-cadence-mechanic
title: "The wider population's pay timing, absence and turnover read the counts' pay dates and the sourced industry rates (SG-CORE-residents-cadence)"
area: people
kind: feature
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on: people-residents-cadence-mechanic-part-1-private-jobs-measure, people-residents-cadence-mechanic-part-2-counted-layoffs, people-residents-cadence-mechanic-part-3-counted-absence, people-residents-cadence-mechanic-part-4-counted-purchase-timing
source: added with npm run pool -- add
claimed-at:
after:
standard: 2
model: sonnet
effort: low
root: design-one-model-two-tiers
lead: lives
checked: fable 2026-11-10
---

**What.** SG-CORE-residents-cadence still merges the wider population's purchases per seller, kind and week of the month and pays them monthly, and counted workers always work their full schedule. The turnover rows are sourced (JOLTS and CPS 2025). Measured Oct 21 in Salem, Utah: hires 2.18 a month against JOLTS 3.3, quits 2.11 against 2.0, layoffs 0.27 against 1.1, separations 2.68 against 3.3. Build counted purchases timed from each group's pay dates, and counted absence and layoffs that follow the same reasons as full workers, times their count. The measure itself is fixed first, and the work is four parts.

**Cause.** Measured: Salem, Utah, seed 07f42052624493fd (item, Oct 21): hires 2.18 a month against JOLTS 3.3, layoffs 0.27 against 1.1; src/core2/turnover-check.ts turnoverReport divides by every open job including other governments' posts.

**Fix.** First fix the measure to count private jobs only (part 1), then make counted layoffs follow full workers' tenure order (part 2), counted absence follow full workers' reasons times the count (part 3), and time counted purchases from pay dates (part 4); resolve SG-CORE-residents-cadence.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** One model, two tiers: a counted group follows the same rule as a full person, times its count. No dice: absence and layoffs follow a worker's own record and the employer's books; real rates check totals only. Every dollar balances. Speed: the speed guard holds, with no scan of the whole world each day.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in Salem, Utah (seed 07f42052624493fd) and one more drawn place named with its seed, and sees the town's monthly hires, quits, layoffs and separations reported beside the JOLTS industry rates weighted by the town's employment, shown by job change record ids with src/core2/turnover-check.ts, and SG-CORE-residents-cadence resolved.

**Waits on.** Its four parts: people-residents-cadence-mechanic-part-1-private-jobs-measure, people-residents-cadence-mechanic-part-2-counted-layoffs, people-residents-cadence-mechanic-part-3-counted-absence and people-residents-cadence-mechanic-part-4-counted-purchase-timing.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/turnover-check.ts

**Notes.** TODO

Oct 21 (claude, scoped, not built): three separate mechanics, best taken as separate items.
(1) The measure first. `turnoverReport` (src/core2/turnover-check.ts, PR #5796) divides by every open job in `core.jobs` and the counted books. A drawn town's open jobs are mostly full public and office posts of other governments, which the monthly worker review skips: Scranton, North Dakota (3871500, drawn with seed q1, purpose "quits") has 1,563 of 1,630. JOLTS total private rates count private jobs only, so divide changes at `finance.businesses` by worker-months at businesses, full and counted.
(2) Counted layoffs. `layOff` (modules/jobs.ts) already picks counted jobs, by the keep score (tenure, reliability). Counted tenure runs from the opening history while full hires made in play are new, so full workers are laid off first. Re-measure with (1) before changing the rule.
(3) Counted absence and purchases timed from pay dates both need inputs counted records don't hold (needs, pay dates per member). See world-jobs-quit-rate-jolts's Oct 21 notes: a counted record's strain is zero, so it never leaves for strain.
Claim released.

Deferred Oct 25: nothing on screen reads it yet.

**Notes (Fable's check, Nov 10).** research-residents-cadence-sourced sources the pay dates and the absence comparison behind the same stopgap, SG-CORE-residents-cadence. Parts 3 and 4 read its rows where they have landed; the stopgap is resolved once, by whichever of the two finishes last.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A roll-up of four parts; the layoff-order part is kept on its own, and the counted pay-date, absence and purchase-timing detail is dropped.
