---
id: core-demotion-outside-counted-places
title: "A year stops when an evicted household that doubled up with a relative in another town is returned to counts that town does not keep (Brandsville, Missouri)"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/demotion-outside-counts
pr: #5852
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-23T22:31:13.446Z
---

**What.** A jobless household evicted in the town doubles up with a relative in another town (housing-homeless.ts placeRemovedHousehold), keeping the tier the days run. Months later the monthly demotion review (modules/counted-demotion.ts) sends it back to the counts at that town, but the counts keep no group or residents account there, so fundOf throws and the played year stops. Seen in Brandsville, Missouri (place seed 203b073afe7dfef52c0fa1b5a5bc9fb72c924305a80a9b654ee69aeddb2d49f9) on 2025-10-01: No residents account for jurisdiction_b1026a58f8e32e09.

**Rules.** One model, two tiers: only a place whose counts are kept can take a household back into them. Replace, never layer: the review decides it once, where it picks households. Generated-world proof: the Brandsville year runs through.

**Done when.** The demotion review leaves a household living where no counts are kept as filled in; counted-demotion.test.ts reproduces the crash without the fix (a filled-in household moved to the state jurisdiction) and passes with it; the Brandsville, Missouri world runs a full year.

**Files.** src/core2/modules/counted-demotion.ts, src/core2/counted-demotion.test.ts

**Notes.** TODO
