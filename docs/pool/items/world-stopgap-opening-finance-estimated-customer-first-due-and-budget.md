---
id: world-stopgap-opening-finance-estimated-customer-first-due-and-budget
title: "Stopgaps in opening-finance (estimated-customer-first-due-and-budget-horizon): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-finance.json, kind estimated-customer-first-due-and-budget-horizon"
after:
---

**What.** The opening's agreements with nonhousehold customers take their first payment in the first month of the next period and run a twelve-month source-year budget horizon, which are generated conventions (src/core2/opening-customers.ts, src/core2/data/opening-finance.json); the annual statistical sources observe no invoice day and no contract end. Replace them: a public buyer's purchase becomes a contract award from the contracts module (`src/core2/modules/contracts.ts`), starting on its government's fiscal-year start (a per-jurisdiction table: July 1 for most states and Puerto Rico, April 1 New York, September 1 Texas, October 1 Alabama, Michigan, D.C., Guam and the Virgin Islands, with a local government taking its state's unless its record says otherwise), paid monthly from the budget line, and renewed each fiscal year by the same award decision rather than ending at twelve months. A household's standing bills take their due day from the provider's billing rule (rent on the lease's day, a utility on the account's billing cycle, a loan on its closing day) instead of one first-of-next-month day. Delete the first-next-period-month rule, the twelve-month cutoff and the marker.

**Rules.** An effect is a read, not a record: the treasury must pay the award each month from the budget line, and the award's renewal must read the next year's budget. One rule, all 56 places: fiscal-year starts and billing rules are data per jurisdiction and provider kind, never a named place. No dice: the due day is the provider's cycle or the lease's day, not spread by a draw. Replace, never layer: the first-month and twelve-month conventions are deleted when the dated agreements replace them. Public contract awards exist (owner ruling, Oct 19 to 20): this item reads the award engine, not a second one. Estimate, never UNKNOWN: a local government without a recorded fiscal-year start takes its state's, marked ESTIMATED.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a town's custodial or road contract starts on its government's fiscal-year start by contract award record id, is paid monthly from the budget line by journal record id, is renewed (or lost to a different bidder) at the next fiscal-year start through the award decision, a household's rent is due on its lease day and a utility on its billing cycle by finance contract record id, and src/core2/opening-customers-calendar.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/opening-customers.ts, src/core2/data/opening-finance.json, src/core2/data/opening-customers.json, src/core2/modules/contracts.ts, src/core2/modules/budgets.ts, src/core2/opening-customers-calendar.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: First-next-period-month payment and a twelve-month source-year budget horizon are generated conventions; the annual statistical source does not observe any actual contract expiry or renewal.

Oct 20 (pool feeder): spec written; fiscal-year table from data/research/stopgaps-oct19/B-people-behavior-2.json (NCSL/NASBO; local governments assumed to follow their state, to be verified from the Census of Governments); the contracts module already awards a budget line to a firm for a fiscal year, so this connects the opening's customers to it.
