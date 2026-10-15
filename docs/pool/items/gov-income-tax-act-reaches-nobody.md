---
id: gov-income-tax-act-reaches-nobody
title: "An act to adopt an income tax records people reached when it writes no tax"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from gov-next-from-the-audit-this-lane (laws stress audit, defect 16)"
---

**What.** Defect 16: a federal act that adopts an income tax, where one exists, writes no tax row (`wroteLaw` is 0 in the `income-tax-adopt` case of `law-reach/group-b.ts`) yet the reach records show 1,426 people as reached. A person is reached only by an effect that changed what they pay or can do. Record the people only when the act wrote a tax or changed a rate.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a drawn place (name it and the seed) a federal act to adopt an income tax where one exists reaches no one, and where none exists it reaches the people whose paycheck withholding changes, by person id and payroll record id. A test in src/core2/law-reach-group-b.test.ts covers both.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 16. Verify against main before starting; the audit ran on the Oct 14 build.
