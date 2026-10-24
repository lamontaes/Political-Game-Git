---
id: people-coverage-counted
title: "Counted households hold a health coverage share and pay a premium by the same rule as a full person"
area: people
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/coverage-counted
pr: #5475
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T00:11:38.769Z
---

**What.** Full people hold a coverage record and the policyholder pays a monthly premium, but the wider population is counted and holds none, so a town's counted households pay no premium (stopgap SG-PEOPLE-coverage-counted). Give each counted group a coverage share by plan, set by the same rule as a full person (age, employer rank, the law in force) times the group's weight, and a premium flow per covered counted household to the outside account that fill-in takes back contract by contract. Counted and full households in the same town should then pay premiums by one rule.

**Rules.** One model, two tiers: a counted group is covered and pays by the same rule as a full person times its weight. An effect is a read, not a record: the premium flow must read the share when it pays. No dice: shares follow age, employment and the law in force.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed), a counted household with an employed adult pays a monthly premium by journal record id equal to what a full household of the same shape pays, filling that household in leaves its coverage and premium unchanged, the cash journal balances, and src/core2/health-coverage-counted.test.ts proves it.

**Files.** src/core2/modules/coverage.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Follow-up of people-coverage-record-monthly-pass, which covers full people only.

Oct 20 (claude/coverage-counted, stacked on claude/fs11vb-coverage-record, PR #5460): built. `holdersToday` ranks full and counted working adults together; counted policyholders hold a `countedCoverage` row and pay through `countedPayment`. The year time for Cruz Bay, USVI (seed 7dacf222...) is 228 s against 259 to 281 s before, so no slowdown.

Sent back 2026-10-23 from PR #5475 (branch claude/coverage-counted): The Done-when table omits the required one-year run and named premium journal posting; the cited test advances only 44 days and checks lastDueMinor, not the weighted money-chain acceptance; finish on that branch, merge main into it first.

Oct 24 (claude/coverage-counted, finishing the send-back): the "none where the counted record says employer" failures came from the module keeping a filled-in household's plan only on its counted record and writing its full records at the next monthly review, up to a month later, where the plan was ranked afresh: a job that changed in the gap read as no plan, and until then the person had no coverage record at all. `coverage.ts` now implements `onFillIn`: the counted record ends the day the household is filled in and its members hold full records on the same plan, policyholder and premium (and what the counted record paid last month, so a lapsed policy still lapses). Employer size now counts a counted job times its household's weight. `health-coverage-counted.test.ts` plays one year of a drawn place and reads the premiums off the cash journal by record id; `health-coverage.test.ts` no longer asserts that the paid holders are the opening's holders (a household's policy moves to the worker who ranks first when an employer shrinks).
