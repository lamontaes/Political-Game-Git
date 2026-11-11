---
id: world-counted-households-transfer-income
title: "Counted households with no earner have no income: transfers the full tier would receive are not in their income"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: opus
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
branch: claude/pool-world-counted-households-transfer-income
---

**What.** A counted household's income (householdIncome in src/core2/modules/residents.ts) is its recorded wages, its retirement awards and its share of the place's unplaced workers. Nothing else is paid to it: no Social Security for a disabled or surviving member, no cash assistance under the law in force. Once unplaced workers are whole people (branch claude/pr-renter-income, not on main), about 40 percent of renter households in a Puerto Rico town have no income at all and are evicted (65 homeless where HUD implies about 1). Pay counted households the transfers the same rules give a full household, read by householdIncome, rent and the eviction path. The Puerto Rico renter-income item (world-counted-renter-income-puerto-rico-third) is proposed to merge here with its ACS figures (B19055, B19065, B19067, B25071) as evidence. Seen: a renter household's card and the town's evictions and homeless count, where about 40 percent of renters have no income.

**Cause.** Needs cause. Looked at (opus-5234, Nov 11, PR #8704): `householdIncome` (src/core2/modules/residents.ts line 341) is wages, retirement and unplaced pay, but the full tier gets no more: no engine pays Social Security disability or survivor benefits to anyone (data/research/money/public-programs-2026.json is read by no code), and cash assistance is paid only when the welfare line is amended above its base (`payBenefits`, src/core2/law-reach/group-b-money.ts line 604), to counted households too, into their group fund. The no-income renters come from benefit programs the game lacks for both tiers (SSI, SSDI, survivors, TANF or the island's own). The one two-tier gap: `householdIncome` does not read the welfare-line assistance counted households already receive (`assistanceIncomeByHousehold`, line 688, read only by the poverty measure), so rent and eviction miss it. The writer splits: that read, and a benefits engine for both tiers from research.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household receives a transfer by the same rule as a full household, times its count. Wire to the world: each transfer is a journal record from the paying government or outside flow. Estimate, never UNKNOWN: amounts start from sourced per-place figures with a spread. Real figures such as the ACS no-income share are reported beside the result and are never a target (owner, Nov 8).

**Done when.** A second session (not the builder) plays Puerto Rico place 7237336 (seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8) and a drawn place (seed named), and sees counted renter households with no earner receive transfers shown by transfer record ids, a household with no wages paying its rent from them instead of being evicted on day one, and housing-calibration.test.ts passing; the share of counted renter households with no income on day one is reported beside the ACS share.

**Waits on.** Nothing. The claude/pr-renter-income branch is not needed on main to start.

**Files.** src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/housing-calibration.test.ts

**Notes.** Found working world-counted-renter-income-puerto-rico-third (see its Oct 21 notes for the ACS figures fetched: B19055, B19065, B19067 for Puerto Rico).

Oct 21 (claude): not built. The Done-when starts from "the branch's whole unplaced workers merged" (claude/pr-renter-income), which is not on main, so the day-one no-income share cannot be measured from main. Take it after that lands. Claim released.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:28 UTC) on branch claude/pool-world-counted-households-transfer-income.

Released (2026-11-11): Full households get no disability, survivor or baseline cash benefits either; findings on PR 8704. Continue on branch claude/pool-world-counted-households-transfer-income.
