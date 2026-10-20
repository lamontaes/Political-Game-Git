---
id: gov-medicaid-coverage-reader
title: "A Medicaid expansion law in force gives eligible low-income adults a coverage record that lowers their household's medical bill"
area: gov
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/medicaid-reader
pr:
blocked-on:
after: people-coverage-record-monthly-pass,world-medical-spending-categories
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:13:09.979Z
---

**What.** The law-reach engine writes Medicaid eligibility and work-requirement records on named adults and counted groups (stopgap SG-GOV-REACH-B-medicaid-coverage), but no engine reads them, so no one's coverage or medical bill changes. Make the coverage engine read those records: an adult under the income limit in a state with the expansion in force gets a Medicaid coverage record, the work-requirement law ends it for those under the hours limit, and the household's out-of-pocket flow falls accordingly. Repealing the law ends the records.

**Rules.** An effect is a read, not a record: the medical spending flow must pay less because the coverage record says Medicaid. The chain is the acceptance: law row, eligibility, coverage record, the lower bill, the household's cash. One model, two tiers: counted groups follow the same rule times their weight.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed) with a Medicaid expansion law in force, a named low-income adult and a counted group hold Medicaid coverage records, their monthly medical spending is lower than an uncovered neighbor's by record id, the cash journal balances, and the SG-GOV-REACH-B-medicaid-coverage row in stopgaps.json is closed with the reader named.

**Files.** src/core2/law-reach/group-b.ts, src/core2/modules/health.ts, src/core2/data/stopgaps.json

**Notes.** Part 3 of 3 split from missing-engine-health-coverage-and-medical-spending (Oct 20).
