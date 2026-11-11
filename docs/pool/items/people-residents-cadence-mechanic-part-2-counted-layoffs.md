---
id: people-residents-cadence-mechanic-part-2-counted-layoffs
title: "Counted layoffs and full layoffs fall in the same tenure order"
area: people
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: people-residents-cadence-mechanic-part-1-private-jobs-measure
blocked-on:
lead: lives
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-residents-cadence-mechanic in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** layOff already picks counted jobs by the keep score (tenure, reliability), but counted tenure runs from the opening history while full hires made in play are new, so full workers are laid off first. Measured Oct 21, Salem, Utah, seed 07f42052624493fd: layoffs 0.27 a month against JOLTS 1.1. Re-measure with the fixed measure of part 1 before changing the rule. Seen: who is laid off at the town's employers, the player's circle included.

**Cause.** Found in code: src/core2/modules/jobs.ts layOff (line 1779) picks counted jobs by the keep score; counted tenure runs from the opening history.

**Fix.** After part 1, make counted layoffs and full layoffs follow the same tenure order and the employer's books, times the count, and report the layoff rate beside JOLTS.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group follows the same rule as a full person, times its count. No dice: absence and layoffs follow a worker's own record and the employer's books; real rates check totals only. Every dollar balances. Speed: the speed guard holds, with no scan of the whole world each day.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in Salem, Utah (seed 07f42052624493fd) and one more drawn place named with its seed, and sees counted and full workers laid off in the same tenure order by job change record ids, with the monthly layoff rate reported beside JOLTS.

**Waits on.** people-residents-cadence-mechanic-part-1-private-jobs-measure.

**Files.** src/core2/modules/jobs.ts, src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/turnover-check.ts
