---
id: laws-other-places-chains
title: "Other places' law chains are recorded as worlds, so a worker's residence law and a neighbor town's enacted acts are read"
area: laws
kind: feature
priority: 3
size: L
status: blocked
claimed-by: claude/political-game-pool-yucp92-cc
pr:
blocked-on:
after: laws-other-places-chains-record,laws-other-places-chains-enacted
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:33:08.059Z
---

**What.** This is the roll-up for recording other places' law chains as worlds, so a worker's residence law and a neighbor jurisdiction's enacted acts are read. Today only the town's chain is recorded (stopgap SG-WORLD-withholding-residence-law, found by gov-stopgap-budgets-assumed-data). It is built in two parts: laws-other-places-chains-record (each residence's chain and starting rows recorded in the laws module) and laws-other-places-chains-enacted (an act enacted elsewhere is written to the same table and read by withholding). When both are done this item is closed by checking one worker's paycheck end to end.

**Rules.** The chain is the acceptance: one enacted law is followed to a named worker's paycheck and the treasury that received it. An effect is a read: withholding must read the recorded rows. One rule, all 56 places: no place or state is named in logic. Replace, never layer: the static residence map and the stopgap are gone. No dice: tax follows the law in force and where the worker lives.

**Done when.** After both parts are done, a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body) shows a worker living outside the town with withholding that follows their residence's recorded law, including one act enacted in play, by law row id and payroll record id; src/core2/tax-withholding.test.ts and src/core2/withholding-outside-governments.test.ts pass.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps.json, src/core2/tax-withholding.test.ts

**Notes.** Oct 20 (pool feeder): spec written; L item split into two; the laws module already takes an enacting jurisdiction on every row, so no schema change is needed beyond a chains table.
