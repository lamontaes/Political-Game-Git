---
id: laws-other-places-chains
title: "Other places' law chains are recorded as worlds, so a worker's residence law and a neighbor town's enacted acts are read"
area: laws
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
after:
source: added with npm run pool -- add
claimed-at:
---

**What.** This is the roll-up for recording other places' law chains as worlds, so a worker's residence law and a neighbor jurisdiction's enacted acts are read. Today only the town's chain is recorded (stopgap SG-WORLD-withholding-residence-law, found by gov-stopgap-budgets-assumed-data). It is built in two parts: laws-other-places-chains-record (each residence's chain and starting rows recorded in the laws module) and laws-other-places-chains-enacted (an act enacted elsewhere is written to the same table and read by withholding). When both are done this item is closed by checking one worker's paycheck end to end. Combined by the Oct 25 audit, one change in one seam; the parts folded in: laws-other-places-chains-record (Each other place's law chain is recorded in the laws module, so a worker's residence law is read from records); laws-other-places-chains-enacted (A law enacted in another place is written to the laws module and read by every worker who lives there). Each part's own done-when line is listed in Notes and is part of this item's acceptance.

**Rules.** The chain is the acceptance: one enacted law is followed to a named worker's paycheck and the treasury that received it. An effect is a read: withholding must read the recorded rows. One rule, all 56 places: no place or state is named in logic. Replace, never layer: the static residence map and the stopgap are gone. No dice: tax follows the law in force and where the worker lives.

**Done when.** After both parts are done, a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body) shows a worker living outside the town with withholding that follows their residence's recorded law, including one act enacted in play, by law row id and payroll record id; src/core2/tax-withholding.test.ts and src/core2/withholding-outside-governments.test.ts pass.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps.json, src/core2/tax-withholding.test.ts, src/core2/modules/world-legislating.ts, src/core2/withholding-outside-governments.test.ts

**Notes.** Oct 20 (pool feeder): spec written; L item split into two; the laws module already takes an enacting jurisdiction on every row, so no schema change is needed beyond a chains table.

Folded in Oct 25 from laws-other-places-chains-record. Its done when: In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a worker who lives in another state has a recorded chain row and recorded starting law rows, their withholding on a named payday equals the recorded rows' income-tax answer, and the journal balances; a test in src/core2/tax-withholding.test.ts names the chain row, the law row and the payroll record by id.

Folded in Oct 25 from laws-other-places-chains-enacted. Its done when: In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a law enacted in a jurisdiction the town does not share changes the withholding of a named worker who lives there from its effective date, with the law row id, the payroll record id and the treasury journal entry named, and SG-WORLD-withholding-residence-law is marked resolved in stopgaps.json with its replacement reader named and its ID retained; src/core2/withholding-outside-governments.test.ts proves it.
