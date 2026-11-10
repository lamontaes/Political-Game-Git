---
id: laws-other-places-chains-part-2-enacted-acts
title: "A law enacted in another place is written to the laws module and read by every worker who lives there"
area: laws
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: laws-other-places-chains-part-1-record-chains
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: design-country-tier
source: split from laws-other-places-chains in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** When another state or county passes a law, the town does not share that jurisdiction, so the act is never written where withholding reads it and a worker who lives there is withheld by the starting law forever. Once part 1 records each residence's chain, write acts enacted in other jurisdictions to the same table so withholding follows them from their effective date. This is part 2 of laws-other-places-chains.

**Cause.** Found in code: `outsideEnact` in src/core2/modules/world-legislating.ts enacts another state's act as a `national:` event, and `residentLaw` in src/core2/modules/budgets.ts reads recorded rows only where the jurisdiction is shared with the town, so an act elsewhere is never read.

**Fix.** Write each act enacted in a jurisdiction the town does not share into the recorded chain table from part 1, and let `residentLaw` resolve every level of a worker's residence from it.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: one enacted law is followed to a named worker's paycheck and the treasury that received it. An effect is a read: withholding must read the recorded rows at the moment it pays. One rule, all 56 places: no place or state is named in logic. No dice: tax follows the law in force and where the worker lives.

**Done when.** A second session, not the builder, runs a one-year played world (buildBenchWorld) in a place drawn from all 56 on a seed nobody chose and sees: a law enacted in a jurisdiction the town does not share changes the withholding of a named worker who lives there from its effective date, with the law row id, the payroll record id and the treasury journal entry named. src/core2/withholding-outside-governments.test.ts proves it.

**Waits on.** laws-other-places-chains-part-1-record-chains (its chains table).

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/withholding-outside-governments.test.ts

**Notes (Fable's check, Nov 10).** **Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as already built. `outsideEnact` in src/core2/modules/world-legislating.ts (line 1486) enacts another state's act with `enactLaw`, a row in the laws table under that state's jurisdiction, and `residentLaw` in src/core2/modules/budgets.ts hands every recorded row of the series to the resolver with the residence's own chain. The proof this item asked for (an act elsewhere changes a named worker's withholding) is now part 1's test. Read on main, not run.
