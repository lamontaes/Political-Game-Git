---
id: people-coverage-counted
title: "Counted households hold a health coverage share and pay a premium by the same rule as a full person"
area: people
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/coverage-counted
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:24:51.813Z
---

**What.** Full people hold a coverage record and the policyholder pays a monthly premium, but the wider population is counted and holds none, so a town's counted households pay no premium (stopgap SG-PEOPLE-coverage-counted). Give each counted group a coverage share by plan, set by the same rule as a full person (age, employer rank, the law in force) times the group's weight, and a premium flow per covered counted household to the outside account that fill-in takes back contract by contract. Counted and full households in the same town should then pay premiums by one rule.

**Rules.** One model, two tiers: a counted group is covered and pays by the same rule as a full person times its weight. An effect is a read, not a record: the premium flow must read the share when it pays. No dice: shares follow age, employment and the law in force.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed), a counted household with an employed adult pays a monthly premium by journal record id equal to what a full household of the same shape pays, filling that household in leaves its coverage and premium unchanged, the cash journal balances, and src/core2/health-coverage-counted.test.ts proves it.

**Files.** src/core2/modules/coverage.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Follow-up of people-coverage-record-monthly-pass, which covers full people only.
