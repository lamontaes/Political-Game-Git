---
id: people-press-staff-absent-person
title: "Press week fails with 'Absent person' filling in a counted outlet worker"
area: people
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found running src/core2/price-laws.test.ts in a random place, Oct 15"
---

**What.** `refreshPressStaff` (src/core2/modules/press.ts, around line 2265) calls `fillInPerson` for the holder of a counted job at a news outlet and the core throws `Absent person: person_198acb51f9501e29` from `updatePerson` (src/core2/state.ts:1444). `advanceCore` stops. Seen once in a year run of a random drawn place with the usual bench world; the place and seed were not printed. Reproduce by running `src/core2/price-laws.test.ts` until it fails, or loop `refreshPressStaff` over several drawn places.

**Rules.** Fix at the root. A counted worker is filled in from the world, so the person must exist when the job lists them; do not skip the error.

**Done when.** A one-year run in the drawn place that failed completes; a test names the place and seed.

**Files.** src/core2/modules/press.ts, src/core2/state.ts

**Notes.** Not caused by the cannabis or clean-air work; the stack is press week to `fillInPerson`.
