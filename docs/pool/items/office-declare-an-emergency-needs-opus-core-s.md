---
id: office-declare-an-emergency-needs-opus-core-s
title: "Declare an emergency (needs OPUS-CORE's disasters engine, PR no. 4125)."
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: core-disasters-ss-prices
source: "docs/coordination/OFFICE-LOCAL.md line 32 (unchecked checklist line)"
---

**What.** An executive (mayor, county executive, governor) cannot declare an emergency because the world holds no disaster record to declare it about: the disasters engine is PR #4125, carried by the pool item core-disasters-ss-prices. Once real disasters exist as records, add the act: the executive declares an emergency for a hazard in the jurisdiction, which unlocks emergency spending and powers the law allows, and the Guard for a governor. The player would notice a flood or storm in the town, the call to declare, and aid and spending reacting to it.

**Rules.** An effect is a read, not a record: the budget, the executive's powers and the response read the declaration record at the moment they spend or act; Ask why: a declaration keeps the hazard record and the law row it cites; The chain is the acceptance: follow one hazard to the declaration, the aid spending, a household's repair or relief and the news line; One rule, all 56 places: which powers an emergency unlocks is law data for all 56 places; No dice: a disaster comes from the hazard record (a cause), not a monthly chance; This is a game, not a spreadsheet: one choice for the player: declare or not; No hand-written player text: the announcement is worded by the English engine; Placeholders: any stand-in crisis list stays registered until real records replace it.

**Done when.** After core-disasters-ss-prices is done. In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) (draw a place with a recorded disaster): the executive's office day offers 'declare an emergency' tied to the hazard record, the declaration changes a named budget line or power, and a named household's situation reads the aid (declaration, hazard and aid ids). Tests beside `src/core2/office-day-acts.ts` tests. The owner plays it: as mayor, declares an emergency after a flood and sees relief money move.

**Files.** src/core2/office-day-acts.ts, src/core2/modules/executive.ts, src/core2/modules/budgets.ts, src/core2/health-hazard.ts

**Notes.** Checklist line from OFFICE-LOCAL.md; verify against main before starting.
Sent forward as of 2026-10-15: the disasters engine PR #4125 is carried by core-disasters-ss-prices.
