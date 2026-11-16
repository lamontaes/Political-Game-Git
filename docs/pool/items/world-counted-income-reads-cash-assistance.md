---
id: world-counted-income-reads-cash-assistance
title: "A counted household's income leaves out the welfare line's cash assistance that a full household's includes"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9653
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: step 1 of world-counted-households-transfer-income, Nov 16
claimed-at:
---

**What.** A counted household's yearly income is its wages, retirement awards and unplaced workers' pay, and nothing else, while a full household's income counts the cash assistance the welfare line pays it. Two households with the same assistance show different incomes by tier, so each reader of the counted income (affordability, homelessness, the buy test, the income band) sees a household living on assistance as having none. Seen: any played place where the welfare line pays a counted household, for example Puerto Rico place 7237336 (seed 63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8).

**Cause.** Found in code: `householdIncome` in src/core2/modules/residents.ts sums `wagesMinorYear`, `retirementMinorYear` and unplaced pay and never reads `assistanceIncomeByHousehold` in src/core2/law-reach/group-b-money.ts, which the poverty measure and the voucher ranking add by hand for counted households (world-poverty.ts, housing-occupancy.ts).

**Fix.** `householdIncome` reads the welfare line's assistance for the household through one lookup (`assistanceIncomeOf`), and the two hand additions for counted households are deleted so the assistance is counted once.

**Time box.** 3 hours for one session of the Sonnet model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household's income is read by the same rule as a full household's, times its count. No second place that adds assistance. Unattended-world timing at three places, with and without, twice each side.

**Done when.** A second session draws a place at random from the 56 in buildBenchWorld, names the place and seed, gives a counted renter household a welfare-line assistance record, and sees the household's tenant income and its income band rise by that amount, by household id, and the poverty count counts it once.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/law-reach/group-b-money.ts, src/core2/world-poverty.ts, src/core2/housing-occupancy.ts, src/core2/counted-income-cash-assistance.test.ts (new)

**Notes.** Nov 16 (account lead): built. Pinned test at Danville PA (4218136, seed ilt-danville), red without the change and green with. Year-1 timing with and without, twice a side, at West Union OH, Danville PA and Puerto Rico place 7237336: within 4 percent each way, run to run noise.
