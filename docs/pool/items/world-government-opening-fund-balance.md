---
id: world-government-opening-fund-balance
title: "Every government's treasury opens with no cash, so a small town's first closes pay none of its budget lines"
area: world
lead: m0-m2
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: laws lead, Oct 26
claimed-at:
---

**What.** A drawn world gives each government a budget but no cash: the treasury pays its lines only from revenue it has collected since the opening (laws lead's rights helper, measured on PR #5669: Martin's Additions, Maryland, seed fc77ce2f81eb630a, paid nothing on any line at its first closes). Real governments carry a fund balance. The Census Bureau's Annual Survey of State and Local Government Finances reports cash and security holdings by government type and state, which can seed each treasury's opening balance with a per-world spread. Until then, the rights and environment family test gives a town's treasury a year of its lines as a test fixture so the chain from a law to a payment can be checked.

**Rules.** Estimate, never UNKNOWN: a government with no sourced balance opens at its state's per-government average for its type, marked ESTIMATED with its spread. Research calibrates, never decides. Every dollar balances: the opening balance is a journal posting from the outside account with its source. One rule, all 56 places.

**Done when.** In a played year of buildBenchWorld in a drawn place (seed named), every government's treasury opens with a sourced or estimated balance recorded on the journal, its first close pays its lines from it, and the rights family test's treasury fixture is deleted. **On screen.** None directly: a town's books open with money in them, so its first month's spending happens.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, data/research (new government finance table)

**Notes.** Filed by the laws lead, Oct 26. Stopgap `SG-WORLD-government-opening-fund-balance` marks the test fixture until this is built.
