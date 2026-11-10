---
id: core-group-quarters-institution-books
title: "Institutions bill and pay: room and board, per diems, nursing rates and military pay"
area: core
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
after: core-group-quarters-institution-records
blocked-on:
lead: money
source: stand-in triage Nov 10, 2026; stopgaps SG-GQ-institution-costs, SG-GQ-military-pay
standard: 2
model: opus
effort: high
root: design-one-model-two-tiers
---

**What.** No one pays for a group-quarters resident's room: a college's room and board, a prison's per diem and a nursing home's rate are billed to nobody, and service members earn no pay at all. Once each institution is a record, give it books: it bills or is paid for its residents, and an armed-forces payer pays service members by rank and years.

**Cause.** Found in code: src/core2/population.ts line 1375 (stopgap("SG-GQ-institution-costs"), an institutional room gets zero monthly cost) and line 374 (SG-GQ-military-pay, military residents are outside the civilian labor force with no payer, see opening-employment.ts and jobs.ts).

**Fix.** Reuse the money paths that exist; add no payment, billing or ledger path of its own. Read each type's rate from a sourced table (college room and board, state prison cost per inmate, nursing-home daily rate, military basic pay by rank). Every payment is a `transfer` (or `transferSplit`) in src/core2/accounts.ts between the payer's and the payee's accounts, on the dates the accounts' own due calendar gives (`nextDue`): a college and a nursing home bill their rooms' residents or the one benefit payer's Medicaid; a prison is paid from its government's treasury through the budget lines in src/core2/budgets-treasury.ts; military residents are paid through the public payroll in src/core2/public-payroll.ts (`startPublicJob`) with withholding taken as for any public employee. Run it monthly by room counts (rooms times rate), never per resident per day. Delete both markers and resolve both rows.

**Time box.** 8 hours for an Opus session.

**Rules.** The chain is the acceptance: one dollar is followed from the institution's books to a government budget or a household and back. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. Speed is part of done: monthly by counts, with no change making a played year more than 20% slower.

**Done when.** A second session, in a played world at a drawn college town, a prison town and a base town (places and seeds named), sees the institution's monthly bill and who paid it by record id, a prison's cost in its government's budget, and a service member's pay in a household's income, with the year's timing on the speed bench.

**Waits on.** core-group-quarters-institution-records.

**Files.** src/core2/population.ts, src/core2/opening-employment.ts, src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/core2/data/stopgaps/gq.json
