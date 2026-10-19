---
id: laws-reach-b-medicaid-coverage
title: "Medicaid expansion changes a person's health coverage and medical costs, read by household spending"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** SG-GOV-REACH-B-medicaid-coverage. Medicaid expansion and its work requirement are eligibility records on adults and counted shares, but no one's coverage or medical cost changes. Add a coverage record on a person (plan, from, to) and a counted-group coverage share, written when the law makes an adult eligible and they enroll from their income and health, and read by the household spending engine when it prices medical care.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/modules/health.ts, src/core2/law-reach/group-b-people.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
