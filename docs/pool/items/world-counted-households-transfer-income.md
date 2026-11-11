---
id: world-counted-households-transfer-income
title: "A counted household's income leaves out the welfare-line assistance it already receives, so rent and eviction miss it (part 1 of 2)"
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
model: sonnet
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
branch: claude/pool-world-counted-households-transfer-income
---

**What.** A counted household's income (householdIncome in src/core2/modules/residents.ts) is its recorded wages, its retirement awards and its share of the place's unplaced workers. Nothing else is paid to it: no Social Security for a disabled or surviving member, no cash assistance under the law in force. Once unplaced workers are whole people (branch claude/pr-renter-income, not on main), about 40 percent of renter households in a Puerto Rico town have no income at all and are evicted (65 homeless where HUD implies about 1). Pay counted households the transfers the same rules give a full household, read by householdIncome, rent and the eviction path. The Puerto Rico renter-income item (world-counted-renter-income-puerto-rico-third) is proposed to merge here with its ACS figures (B19055, B19065, B19067, B25071) as evidence. Seen: a renter household's card and the town's evictions and homeless count, where about 40 percent of renters have no income.

**Cause.** Found in code: (opus-5234, Nov 11, PR #8704) `householdIncome` (src/core2/modules/residents.ts line 341) is wages, retirement and unplaced pay, but the full tier gets no more: no engine pays Social Security disability or survivor benefits to anyone (data/research/money/public-programs-2026.json is read by no code), and cash assistance is paid only when the welfare line is amended above its base (`payBenefits`, src/core2/law-reach/group-b-money.ts line 604), to counted households too, into their group fund. The no-income renters come from benefit programs the game lacks for both tiers (SSI, SSDI, survivors, TANF or the island's own). The one two-tier gap: `householdIncome` does not read the welfare-line assistance counted households already receive (`assistanceIncomeByHousehold`, line 688, read only by the poverty measure), so rent and eviction miss it. This item is that read. The benefits both tiers lack are part 2, world-counted-households-transfer-income-part-2-disability-and-survivor-benefits.

**Fix.** In src/core2/modules/residents.ts, make `householdIncome` add the household's yearly welfare-line assistance from `assistanceIncomeByHousehold` (src/core2/law-reach/group-b-money.ts line 687). That function builds a map from one row, so read it once per review and pass it in, rather than per household. Check every caller of `householdIncome` (rent sizing, eviction, the vitals tool, the poverty measure) still reads income the same way, and the poverty measure does not count the assistance twice: it already adds it in src/core2/world-poverty.ts line 154, so it must then read `householdIncome` without adding it again. Add a test: amend the welfare line above its base in a drawn place, and see a counted renter household with no earner show the assistance in `householdIncome` by household id.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household receives a transfer by the same rule as a full household, times its count. Wire to the world: each transfer is a journal record from the paying government or outside flow. Estimate, never UNKNOWN: amounts start from sourced per-place figures with a spread. Real figures such as the ACS no-income share are reported beside the result and are never a target (owner, Nov 8).

**Done when.** A second session (not the builder) amends the welfare line above its base in dev mode in a drawn place (seed named), plays two months, and sees a counted renter household with no earner carry the assistance in its income (by household id) and pay rent from it, with the transfer record ids. The poverty measure's count of poor households is the same before and after this change in the same world, so nothing is counted twice. housing-calibration.test.ts passes.

**Waits on.** Nothing. The claude/pr-renter-income branch is not needed on main to start.

**Files.** src/core2/modules/residents.ts, src/core2/law-reach/group-b-money.ts, src/core2/world-poverty.ts, src/core2/housing-calibration.test.ts

**Notes.** Found working world-counted-renter-income-puerto-rico-third (see its Oct 21 notes for the ACS figures fetched: B19055, B19065, B19067 for Puerto Rico).

Oct 21 (claude): not built. The Done-when starts from "the branch's whole unplaced workers merged" (claude/pr-renter-income), which is not on main, so the day-one no-income share cannot be measured from main. Take it after that lands. Claim released.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:28 UTC) on branch claude/pool-world-counted-households-transfer-income.

Released (2026-11-11): Full households get no disability, survivor or baseline cash benefits either; findings on PR 8704. Continue on branch claude/pool-world-counted-households-transfer-income.

Nov 11 (cause finder for Fable B): split in two from opus-5234's finding on PR #8704. Part 1, this item, is the missing read. Part 2 is the benefits neither tier gets, filed as world-counted-households-transfer-income-part-2-disability-and-survivor-benefits.
