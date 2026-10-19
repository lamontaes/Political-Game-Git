---
id: laws-reach-b-snap-benefit
title: "A baseline SNAP benefit is paid by a benefits writer, and the work requirement counts each person's own months"
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

**What.** SG-GOV-REACH-B-assistance-benefits. No baseline SNAP benefit is paid, and the work requirement time-limits only the raised welfare line. Add a benefits writer (person or household, program, monthly amount, payer account, from, to) that pays an eligible household monthly from the treasury, and have the work requirement count each person's own months of benefit.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
