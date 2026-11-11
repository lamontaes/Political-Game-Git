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
lead: m0-m2
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** When fillInPerson takes a counted household, run buildOpeningKin and openingTemperaments for that household alone, seeded by the world seed and the household's stableKey, as the opening would have. The household comes back with the same relatives and traits each time and with no change to the town's totals. The deep past already rebuilds this way (pastBuild in src/core2/residents.ts); kin joins it.

**Cause.** Found in code: src/core2/state.ts `fillInPerson` (line 2309) takes a counted household without building kin and temperament; `buildOpeningKin` (src/core2/opening-kin.ts) and `openingTemperaments` (src/core2/opening-personality.ts) run only at the opening.

**Fix.** On fill-in run `buildOpeningKin` and `openingTemperaments` for that household alone, seeded by the world seed and the household's stableKey, so it comes back the same every time, with the town's totals unchanged.

**Time box.** 4 hours for a Sonnet session.

**Rules.** One model, two tiers: a filled-in person matches what the records already say and is the same person every time they are clicked. No dice: kin come from the seeded tables, the same for the same household. Ask why: each kin fact names the record that earns it.

**Done when.** A second session, in buildBenchWorld in a drawn place and a seed the builder did not choose, runs a test beside src/core2/fill-in-people.test.ts that fills in a counted person twice from two fresh worlds with the same seed and sees identical kin ids and temperament, with the kin named by record id.

**Waits on.** core-light-opening-kin-only-kept.

**Files.** src/core2/state.ts, src/core2/residents.ts, src/core2/opening-kin.ts, src/core2/opening-personality.ts, src/core2/fill-in-people.test.ts

**Notes.** Do after the opening stops building kin for counted households.
