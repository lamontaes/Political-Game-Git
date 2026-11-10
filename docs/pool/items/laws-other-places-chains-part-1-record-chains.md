---
id: laws-other-places-chains-part-1-record-chains
title: "Each other place's law chain is recorded in the laws module, so a worker's residence law is read from records"
area: laws
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: design-country-tier
source: split from laws-other-places-chains in the pool redo, Nov 10, 2026
---

**What.** A worker who lives outside the played town is withheld by the law of their residence, but that law comes from a static starting-law lookup, not from recorded rows, because only the town's own chain is recorded as a world (stopgap SG-WORLD-withholding-residence-law). Record each residence's chain (federal, state, county, place) and its starting law rows in the laws module, which already takes an enacting jurisdiction on every row, and have withholding read them. This is part 1 of laws-other-places-chains.

**Cause.** Found in code: `residentLaw` and `residenceLawFor` in src/core2/modules/budgets.ts read a static residence map for any worker whose residence is not the town, and call `api.stopgap("SG-WORLD-withholding-residence-law")` (row in src/core2/data/stopgaps/world.json).

**Fix.** Add a chains table to the laws module: one row per residence chain, written the first time a worker living there is paid, with the starting law rows for each level. Make `residentLaw` read those rows through the same resolver the town uses (`resolveLawInForce`), and delete `residenceLawFor`.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a worker's paycheck is followed from the recorded law row to the amount withheld and the treasury that received it, by record id. An effect is a read, not a record: withholding must read the recorded rows. One rule, all 56 places: no place or state is named in logic. Replace, never layer: the static residence map goes in the same change. No dice: tax follows the law in force and where the worker lives.

**Done when.** A second session, not the builder, runs a one-year played world (buildBenchWorld) in a place drawn from all 56 on a seed nobody chose and sees: a worker who lives in another state has a recorded chain row and recorded starting law rows, their withholding on a named payday equals the recorded rows' income-tax answer, and the journal balances. A test in src/core2/tax-withholding.test.ts names the chain row, the law row and the payroll record by id.

**Waits on.** Nothing.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/tax-withholding.test.ts, src/core2/data/stopgaps/world.json
