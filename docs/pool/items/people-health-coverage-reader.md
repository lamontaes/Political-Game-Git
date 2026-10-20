---
id: people-health-coverage-reader
title: "Medicaid expansion eligibility lowers a covered adult's health bills, read from the law-reach record"
area: people
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: people-health-spending-flows
source: added with npm run pool -- add
---

**What.** The law-reach Medicaid policies already record who is eligible (named adults and counted shares). Make the health bill flow read that record: a covered adult's premium and medical services bills fall to the covered level, and a lost job or a raise that moves them over the limit raises them again. Close SG-GOV-REACH-B-medicaid-coverage with the reader named.

**Rules.** An effect is a read: the bill flow reads reachedBy on the Medicaid policy key at the moment it charges. Ask why: a person's smaller bill cites the coverage record, and nobody credits the law unless they learned of it. No dice: coverage follows income, age, work hours and the state's law.

**Done when.** In a one-year run in a drawn place with a Medicaid expansion law enacted in play, a named low-income adult's bill drops on the month coverage starts, by coverage and journal record ids; the chain reaches the director's line; the stopgap row is closed.

**Files.** src/core2/law-reach/group-b.ts, src/core2/opening-finance.ts, src/core2/data/stopgaps.json

**Notes.** TODO
