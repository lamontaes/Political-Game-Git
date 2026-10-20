---
id: laws-other-places-chains-enacted
title: "A law enacted in another place is written to the laws module and read by every worker who lives there"
area: laws
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: laws-other-places-chains-record
source: split from laws-other-places-chains by pool feeder Oct 20
---

**What.** Once each residence's chain is recorded, a law that another council, state legislature or Congress enacts (the world-legislating engine and `enactLaw` in src/core2/modules/laws.ts, called from legislature.ts, ballot-measures.ts and executive.ts with the enacting jurisdiction) lands in the same laws table under that jurisdiction. `residentLaw` in budgets.ts then reads it from the worker's residence chain from its effective date, instead of the starting rows only. Delete the remaining `shared` jurisdiction special case, the `api.stopgap("SG-WORLD-withholding-residence-law")` calls and the stopgap row in src/core2/data/stopgaps.json.

**Rules.** An effect is a read: a neighbor state's enacted tax change must change what that state's residents have withheld on the next payday. Replace, never layer: the shared-jurisdiction special case and the stopgap are removed in the same change. One rule, all 56 places: the enacting jurisdiction is a record field, never named in code. No dice: the rate comes from the enacted row, and who is taxed from the worker's residence. The chain is the acceptance: the law row, the paycheck, the worker and the treasury are followed by record id.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a law enacted in a jurisdiction the town does not share changes the withholding of a named worker who lives there from its effective date, with the law row id, the payroll record id and the treasury journal entry named, and SG-WORLD-withholding-residence-law is gone from stopgaps.json; src/core2/withholding-outside-governments.test.ts proves it.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/modules/world-legislating.ts, src/core2/data/stopgaps.json, src/core2/withholding-outside-governments.test.ts

**Notes.** Part 2 of 2 of laws-other-places-chains.
