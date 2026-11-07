---
id: law-levels-opening-income-tax-reversal
title: "Repeal and restore an income tax already in force at the opening"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: astra/opening-income-tax-reversal
pr: #7337
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T23:18:33.217Z
---

**What.** The income-tax adoption handler appears to return without removing an opening tax when no previous adoption wrote a lawRowId. Prove the path in an unchosen generated game and make repeal and restoration use the existing tax writer and exact prior schedule.

**Rules.** One income-tax engine, level as parameter. Preserve deductions, schedules and territorial replacesFederal standing. Repeated reviews and unrelated later tax acts must not be overwritten. No invented federal replacement rates and no changes to campaigns, electorate, views or state/local wage bars.

**Done when.** A generated-world regression proves opening-tax repeal stops its withholding, restoration returns the prior schedule, repeated reviews are stable, and an independent later tax act survives. Actual authorized state bill drafts exercise the policy route where a state has a tax; a no-tax draw is reported rather than skipped. Break-it, ten fresh draws and a new game pass. Federal catalog expansion remains a separate sourced unit until its full enactment path is exact.

**Files.** src/core2/law-reach/group-b-money.ts,src/core2/opening-income-tax-reversal.test.ts

**Notes.** Astra, Nov 7. Bounded two-hour unit after #7335; no helpers. Read OWNER-DECISIONS top, DECISION-REGISTER, prior-rulings/economy and LAW; searched pool and docs for income-tax repeal. Existing tax family items concern effect attribution, not this opening-law transition. 26 USC 1 fetched for the separate federal reach work; do not treat its old subsection tables as current rates.
