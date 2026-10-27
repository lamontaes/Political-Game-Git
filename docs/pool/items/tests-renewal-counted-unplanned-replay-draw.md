---
id: tests-renewal-counted-unplanned-replay-draw
title: "Record and replay the counted unplanned-pregnancy test draw before building it"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6255
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The counted unplanned-pregnancy case in src/core2/renewal.test.ts calls randomBytes inside each attempt instead of using the file replay root. On main the source at lines 387-391 keeps the drawn key and seed only in the in-memory tried array, and prints the input after successful play. A worker killed during world construction or its year therefore leaves no complete replay input; this is a separate source defect from the currently observed rooted-case memory failures. Record the input before building so a later failure can be compared on main without replacing its town.

**Rules.** One rule, all 56 places: derive every attempt from an independent replayable root while preserving the existing place pool, attempt bound and played-year horizon. No vacuous tests: retain the full counted cohort, bookkeeping and all positive pregnancy, decision, birth and expected-flow assertions.

**Done when.** The original full counted unplanned-pregnancy case accepts the file replay root and logs its place, world seed, root and attempt before buildBenchWorld; rerunning that recorded input on main and a PR selects the same world, with unchanged PLACES bound, 365-day play, bookkeeping and positive assertions.

**Files.** src/core2/renewal.test.ts

**Notes.** TODO
