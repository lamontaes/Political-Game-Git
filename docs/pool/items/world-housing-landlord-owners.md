---
id: world-housing-landlord-owners
title: "Each town rental names a real owner who files for eviction from their own patience and money"
area: world
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "split from world-stopgap-housing-faked-mechanic (claude/housing-landlord-judge notes, Oct 19)"
---

**What.** Today every rental in a town belongs to one ownerless business, `organization:landlord:<place>`, and it serves notice by summed pulls of months owed and months late calibrated to landlords filing at about two months owed (stopgap SG-WORLD-housing-landlord). Give each lease a named owner, a person or a business the business engine owns, and have that owner decide to file from their own patience, cash and the law's steps. Remove the calibrated pull in the same change.

**Rules.** No dice: a landlord files because of their own patience, money and the law's steps, never a calibrated pull alone. One model, two tiers: a counted landlord and a full one read the same rule, times their count. Replace, never layer: the ownerless landlord and `landlordPulls` are deleted, not kept beside the owners.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) an eviction case names its landlord by record id, that landlord's cash and patience are the recorded reasons it filed, and the lease record names the same owner. The test in `src/core2/housing.test.ts` and the stopgap tripwire show SG-WORLD-housing-landlord resolved in `src/core2/data/stopgaps.json`.

**Files.** src/core2/modules/housing.ts, src/core2/data/stopgaps.json, src/core2/housing.test.ts

**Notes.** The landlord id is built in housing.ts at about lines 379, 776 and 1115. Real owners need the business engine to own rental businesses; read `docs/coordination/DECISION-REGISTER.md` first.
