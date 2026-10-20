---
id: laws-other-places-chains-record
title: "Each other place's law chain is recorded in the laws module, so a worker's residence law is read from records"
area: laws
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from laws-other-places-chains by pool feeder Oct 20
---

**What.** Today `openLaws` (src/core2/modules/laws.ts) records only the town's own law chain, and `residenceLawFor` in src/core2/modules/budgets.ts rebuilds another place's chain and starting rows from static data on every read, behind the stopgap SG-WORLD-withholding-residence-law. Record each place a worker lives in as a world: add a `chains` row per residence place and put that chain's starting law rows into the laws table (rows are keyed by jurisdiction, so levels shared with the town are written once). Open a residence's chain the first time a paycheck needs it, from the same `lawChainForPlace` and `startingLawRows`. Then `residentLaw` reads recorded rows through `resolveLawInForce`, and the static `residenceLaw` map is deleted.

**Rules.** Replace, never layer: the static `residenceLaw` map and its `try` and `catch` fallback are deleted when the recorded read lands. An effect is a read: withholding reads the recorded rows for the worker's residence at the moment a paycheck is cut. One rule, all 56 places: chains come from place data, with no place or state named in logic. Estimate, never UNKNOWN: a residence the place lookup cannot resolve gets federal law and a marked estimate, as today. Speed: chains open on first use, never by scanning every place each day.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a worker who lives in another state has a recorded chain row and recorded starting law rows, their withholding on a named payday equals the recorded rows' income-tax answer, and the journal balances; a test in src/core2/tax-withholding.test.ts names the chain row, the law row and the payroll record by id.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/tax-withholding.test.ts

**Notes.** Part 1 of 2 of laws-other-places-chains.
