---
id: gov-official-salary-research
title: "Every elected office's salary cited to its statute or schedule"
area: gov
kind: research
priority: 3
size: M
status: in-pr
claimed-by: claude/official-salary-table-test
pr: #5312
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:09:25.050Z
---

**What.** Governors and 29 states' legislators are paid sourced figures (data/source/official-office-pay/facts.json), but every lieutenant governor, attorney general, secretary of state and treasurer, the legislators of the other states, and the governors of Alabama, Indiana, Kentucky, D.C. and American Samoa still come from recalled values in data/research/offices/official-salaries-2026.json, marked ESTIMATED with a spread read from how far the recalled governor and legislator figures were from the sourced ones. Read each of those from the state's statute or compensation schedule, add them to the sourced facts, and drop the recalled row once its figure is cited.

**Rules.** Research before building: every figure cites its source (SOURCED), or stays ESTIMATED with a spread. One rule, all 56 places: no state named in code. Never copy a publisher's table whole (the Council of State Governments licence forbids it); read each figure from the statute or official schedule.

**Done when.** Every row of the salary table for all 56 places carries a source or an estimate with its spread, shown by a test over the table in src/core2 (new), and an official's pay in a drawn place's played world cites it by record id in the PR body (the drawn place and seed named).

**Files.** data/source/official-office-pay/facts.json, data/research/offices/official-salaries-2026.json, src/core2/modules/official-pay.ts

**Notes.** Split out of gov-official-salary-through-payroll (Oct 16), which pays officials by paycheck and carries each figure's provenance. Ballotpedia and NCSL both refused automated reads in that session.
