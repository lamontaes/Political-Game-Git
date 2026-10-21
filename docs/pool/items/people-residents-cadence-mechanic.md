---
id: people-residents-cadence-mechanic
title: "The wider population's pay timing, absence and turnover read the counts' pay dates and the sourced industry rates (SG-CORE-residents-cadence)"
area: people
kind: feature
priority: 2
size: L
status: claimed
claimed-by: claude/cadence
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T16:34:33.888Z
---

**What.** SG-CORE-residents-cadence in src/core2/residents.ts still merges the wider population's purchases per seller, kind and week of the month and pays them monthly, and counted workers always work their full schedule. The rows are sourced now (data/research/people/jolts-cps-turnover-absence-2025.json, read by src/core2/turnover-check.ts). Measured Oct 21, Salem, Utah, seed 07f42052624493fd: hires 2.18 a month against JOLTS 3.3, quits 2.11 against 2.0, layoffs 0.27 against 1.1, separations 2.68 against 3.3. Build counted purchases timed from each group's own pay dates, and counted absence and layoffs that follow the same reasons as full workers, times their count.

**Rules.** One model, two tiers; no dice: absence and layoffs follow a worker's own record and the employer's books; real rates check totals only; every dollar balances; the speed guard holds.

**Done when.** In a one-year played world in a drawn place (place and seed named) the town's monthly hires, quits, layoffs and separations land within the range of the JOLTS industry rates weighted by the town's employment, shown by job change record ids with src/core2/turnover-check.ts, and SG-CORE-residents-cadence is resolved.

**Files.** src/core2/residents.ts,src/core2/modules/residents.ts,src/core2/turnover-check.ts

**Notes.** TODO

Oct 21 (claude, scoped, not built): three separate mechanics, best taken as separate items.
(1) The measure first. `turnoverReport` (src/core2/turnover-check.ts, PR #5796) divides by every open job in `core.jobs` and the counted books. A drawn town's open jobs are mostly full public and office posts of other governments, which the monthly worker review skips: Scranton, North Dakota (3871500, drawn with seed q1, purpose "quits") has 1,563 of 1,630. JOLTS total private rates count private jobs only, so divide changes at `finance.businesses` by worker-months at businesses, full and counted.
(2) Counted layoffs. `layOff` (modules/jobs.ts) already picks counted jobs, by the keep score (tenure, reliability). Counted tenure runs from the opening history while full hires made in play are new, so full workers are laid off first. Re-measure with (1) before changing the rule.
(3) Counted absence and purchases timed from pay dates both need inputs counted records don't hold (needs, pay dates per member). See world-jobs-quit-rate-jolts's Oct 21 notes: a counted record's strain is zero, so it never leaves for strain.
Claim released.
