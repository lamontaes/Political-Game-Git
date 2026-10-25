---
id: people-views-opening-place-type-and-values
title: "Opening views read the kind of place a person lives in and form the 14 values"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Opening views in src/core2/modules/views.ts read the person's state and age band from the CES 2024 keys, their education and faith, and a household share, but not the kind of place they live in, and the 14 values (limited government, collective provision and the rest, listed in docs/packages/M1-views.md) are not formed for anyone. Pew's 2024 report on partisan coalitions measured the place-type gap among registered voters: urban counties 60% Democratic and 37% Republican, suburban counties 47% and 50%, rural counties a 25-point Republican edge (data/research/people/pew-partisanship-community-type-2023.json). The opening lean should take a place-type term converted from those shares, and each adult should open with the 14 values from their own records, checked against a sourced answer key. The views engine has another open change to the same file, so build after it lands.

**Rules.** Estimate, never UNKNOWN: a place-type or value cell the survey lacks starts from the national average marked ESTIMATED with its source. One model, two tiers: the counted groups carry the same place-type term and values as full people, times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld, two drawn places from all 56 of different place types, seeds named), each adult's opening view record names its place-type term, the town's right and left shares are reported against the Pew band for its type, every adult has the 14 values with their reasons, and src/core2/views.test.ts covers the place-type term.

**Files.** src/core2/modules/views.ts, src/core2/data/views/views.json, data/research/people/pew-partisanship-community-type-2023.json

**Notes.** TODO
