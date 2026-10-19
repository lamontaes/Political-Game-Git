---
id: core-light-opening-kin-at-fill-in
title: "Filling in a counted household builds its kin and temperament on demand, the same every time"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-light-opening-kin-only-kept
source: split from core-light-opening (M, really L) by the claiming session, Oct 19
claimed-at:
---

**What.** When fillInPerson takes a counted household, run buildOpeningKin and openingTemperaments for that household alone, seeded by the world seed and the household's stableKey, as the opening would have. The household comes back with the same relatives and traits each time and with no change to the town's totals. The deep past already rebuilds this way (pastBuild in src/core2/residents.ts); kin joins it.

**Rules.** One model, two tiers: a filled-in person matches what the records already say and is the same person every time they are clicked. No dice: kin come from the seeded tables, the same for the same household. Ask why: each kin fact names the record that earns it.

**Done when.** In buildBenchWorld in a drawn place and a seed the builder did not choose, a test fills in a counted person twice from two fresh worlds with the same seed and shows identical kin ids and temperament, with the kin named by record id, beside src/core2/fill-in-people.test.ts.

**Files.** src/core2/state.ts, src/core2/residents.ts, src/core2/opening-kin.ts, src/core2/fill-in-people.test.ts

**Notes.** Do after the opening stops building kin for counted households.
