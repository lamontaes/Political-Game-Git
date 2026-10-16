---
id: core-release-household-flow-index
title: "releaseResidentHousehold reads every counted flow on each fill-in"
area: core
kind: cleanup
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "split from core-needs-core-91 (Oct 15, 2026)"
---

**What.** `releaseResidentHousehold` loops over every counted flow (`rt.flows`) on each household fill-in or release. Index the flows by household and by job so it reads only that household's flows. In year three of a profiled run (Kagman, Northern Mariana Islands, seed 31a4370993ef) about 7% of the day's time went there.

**Rules.** An effect is a read; one rule, all 56 places; estimate, never UNKNOWN; speed: measure before and after on the same base and machine, one process at a time.

**Done when.** The same drawn-place year runs with the function off the profile's top, measured on the same base before and after, and no dollar changes.

**Files.** src/core2/modules/residents.ts

**Notes.** Split out of `core-needs-core-91`; verify against main before starting.

Checked 2026-10-16 against main (verify-first, as the note asks): CPU-profiled 1,100 played days (three years from the January 20, 2025 start) in a drawn place, New London, Minnesota (seed eb73b169...075d; 306 s non-idle). `releaseResidentHousehold` took 2.3 s of self time, about 0.8 percent of the run, against the 7 percent the item recorded for Kagman in year three. At that size an index saves at most about 2 s over three years and adds a structure to keep in step on every fill-in. Dropped; reopen with a place and seed whose profile shows it near 7 percent.
