---
id: gov-treasury-diversion
title: "An official can divert a budget line's money, recorded on the treasury's books"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "found by gov-u13"
---

**What.** The corruption engine moves one person's cash to another's (a bribe), but nothing takes money out of a treasury's line, so a government's books always match its budget and an auditor would find nothing. Add the cause: an official who controls a line weighs diverting part of it to their own account, from their traits, their need, their ties and the law, and a diversion is a transfer on the treasury's journal from the line's account to the official, with a crime record the justice engine can charge.

**Rules.** No dice: whether an official diverts follows traits, need, relationships and the law in force, never a percentage. An effect is a read: the treasury's next close reads the smaller balance and the line pays less, and the justice engine reads the crime. Ask why: the transfer keeps the line and the crime record by id. One rule, all 56 places: no place named. Speed: no scan of the whole world each day.

**Done when.** In a one-year played world (`buildBenchWorld`) in a drawn place, a diversion appears as a treasury-journal transfer to a named official, the line's payments fall by that amount, and the crime record exists; a test in `src/core2/corruption.test.ts` covers an official who diverts and one who does not. Then gov-u13 (the auditor) can read it.

**Files.** src/core2/modules/corruption.ts, src/core2/budgets-treasury.ts, src/core2/modules/justice.ts

**Notes.** Found by gov-u13: an audit of the played world finds nothing today because nothing misspends. Check the register for what the owner ruled on corruption before adding any player-facing step.
