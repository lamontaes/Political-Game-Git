---
id: laws-voucher-full-households
title: "School vouchers also pay on full households' tuition plans, not only the counted flow"
area: laws
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: laws-family-school-vouchers
source: added with npm run pool -- add
---

**What.** School vouchers pay only on the counted flow of private tuition today, not on full households' tuition plans, so a named family that pays tuition never receives the voucher. The voucher law family must also pay on each full household's tuition plan, using the same eligibility rule as the counted flow. A player would notice the voucher in a named family's budget and their school choice.

**Rules.** One model, two tiers: a full household is read with the same rule as a counted group, times its count, and a full person is a consistent member of their group. Wire to the world: the voucher moves a real dollar from the treasury to the school. No dice: eligibility comes from the household's income, children and the law in force.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56 where a voucher law is in force, seed named) a full household's tuition plan record id receives the voucher, the treasury journal record id shows the payment, and the family's choice or view record id moves. The test in src/core2/law-reach-group-b.test.ts covers it. The owner plays it: pass the voucher law and see a family's tuition bill drop.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/laws/

**Notes.** TODO
