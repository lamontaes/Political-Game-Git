---
id: laws-voucher-full-households
title: "School vouchers also pay on full households' tuition plans, not only the counted flow"
area: laws
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/laws-voucher-full
pr: #4592
blocked-on:
after: laws-family-school-vouchers
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:11:16.613Z
---

**What.** School vouchers pay only on the counted flow of private tuition today, not on full households' tuition plans, so a named family that pays tuition never receives the voucher. The voucher law family must also pay on each full household's tuition plan, using the same eligibility rule as the counted flow. A player would notice the voucher in a named family's budget and their school choice.

**Rules.** One model, two tiers: a full household is read with the same rule as a counted group, times its count, and a full person is a consistent member of their group. Wire to the world: the voucher moves a real dollar from the treasury to the school. No dice: eligibility comes from the household's income, children and the law in force.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56 where a voucher law is in force, seed named) a full household's tuition plan record id receives the voucher, the treasury journal record id shows the payment, and the family's choice or view record id moves. The test in src/core2/law-reach-group-b.test.ts covers it. The owner plays it: pass the voucher law and see a family's tuition bill drop.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/laws/

**Notes.**

Finding (Oct 16, the claiming session): the premise is out of date on main. `payVouchers` (src/core2/law-reach/group-b-money.ts, around line 520) already pays on full households: it walks `core.finance.contracts` for every live tuition contract whose payer lives in the town and opens a state-treasury obligation for the voucher share, and `school-voucher-law.test.ts` sums both tiers into its tuition total. What the test shows instead is a lag: with GOLDEN_PATH_SEED=63b3fa23465e463e (Woodside, California) the voucher total after 45 days (4,254,338 minor) is 0.47 percent above the tuition the test then reads (4,234,505), because the voucher obligations are re-reconciled only every `reviewEveryMonths` and counted tuition fell in between. That drift is the open item world-counted-tuition-drops. Nothing to build here; once that item merges, rerun the test on that seed, and if it still fails, make the voucher obligation follow tuition at each close.
