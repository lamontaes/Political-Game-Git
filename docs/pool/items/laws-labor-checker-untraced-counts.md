---
id: laws-labor-checker-untraced-counts
title: "Trace four labor checker results the laws lead could not explain"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The labor family's checker runs (PR #5589, audit seeds a91c03e7d2b84f10 Prescott, Michigan and 5e27b0c4196fd3a8 Uehling, Nebraska) leave four results untraced. The two local wage authority laws' money links grade wired on Uehling payroll posts journal:2025-01-24:1557 and journal:2025-01-28:1574 that no engine reading the grant made. Re-enacting a law in force at the opening reaches more records than the opening had (the state raise question 30 then 92 in Prescott). Paid family leave reaches exactly 138 records in both towns from different mixes. Social Security reaches 56 counted groups where the unemployment taxes on the same paydays reach 27.

**Rules.** Ask why: each result gets its cause by file and line, or is shown to be a checker artifact and the checker is fixed. An effect is a read: a money grade stands only on a post an engine that reads the law made.

**Done when.** For each of the four, a note in this item names the cause by file and line from a rerun of scripts/law-wiring/check.ts on the two audit seeds (a played world, buildBenchWorld), and any checker or engine fix lands with a test that fails without it.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts, src/core2/question-wages.ts, src/core2/law-reach/group-a-records.ts

**Notes.** TODO

Laws lead, Oct 25, 19:55: on the checker at 878c4dc4e1 (labor head 160d33ac25), the minimum wage's own payment in Prescott is a bigger paycheck for 11 of the 20 workers it paid over the year; in a 100-day run, 8 of the 9 raised by then got one, and `person_d1c82dce42074b2e`, raised on February 26, 2025, was paid less on March 3 ($392.00 against $404.54). Why the other nine of the year's twenty show no bigger paycheck, and why that one was paid less, is not traced. The six-to-fourteen-fold raises are filed as `gov-town-officers-paid-under-minimum-wage`.
