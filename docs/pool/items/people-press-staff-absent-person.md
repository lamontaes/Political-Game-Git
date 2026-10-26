---
id: people-press-staff-absent-person
title: "Press week fails with 'Absent person' filling in a counted outlet worker"
area: people
kind: bug
priority: 1
size: S
status: dropped
claimed-by:
pr:
blocked-on: cto-drop-not-reproducible
milestone:
source: "found running src/core2/price-laws.test.ts in a random place, Oct 15"
claimed-at:
---

**What.** `refreshPressStaff` (src/core2/modules/press.ts, around line 2265) calls `fillInPerson` for the holder of a counted job at a news outlet and the core throws `Absent person: person_198acb51f9501e29` from `updatePerson` (src/core2/state.ts:1444). `advanceCore` stops. Seen once in a year run of a random drawn place with the usual bench world; the place and seed were not printed. Reproduce by running `src/core2/price-laws.test.ts` until it fails, or loop `refreshPressStaff` over several drawn places.

**Rules.** Fix at the root. A counted worker is filled in from the world, so the person must exist when the job lists them; do not skip the error.

**Done when.** A one-year run in the drawn place that failed completes; a test names the place and seed.

**Files.** src/core2/modules/press.ts, src/core2/state.ts

**Notes.** Not caused by the cannabis or clean-air work; the stack is press week to `fillInPerson`.

Checked Oct 16 (claude): `src/core2/price-laws.test.ts` on seeds ab1, ab2 and ab3 did not throw Absent person (ab2 fails a different assertion, filed as world-price-laws-rules-missing). The same stop is the subject of core-year-crash-press-staff-absent-person (done, #4781) and core-fill-in-returning-household-absent-member (done, #4762). Probably a duplicate; the CTO can drop it.

Looked at Oct 17 (claude session), not reproduced. Ran the played world (`buildBenchWorld`, two-level, bookkeeping off) for 120 days from the start in 14 drawn places (seeds `pressfuzz-a-0` to `-13` through `drawPlace(seed, "press")`, including Guam and the Northern Marianas) with press weeks every week: all 14 ran clean, no `Absent person`. Read the fill-in path (`fillInPerson`, state.ts about 1906 to 2200): the only `updatePerson` calls inside it are on members already in `core.people` (the returning-household branches), and the `onFillIn` hooks (`housing.ts`) and `giveHealthRecord` do not call it. The failure is therefore most likely the `returning` branch with a household whose record lists a member who is neither in `core.people` nor admitted in the same pass, which needs a demoted (returned-to-the-counts) person in a press job. A reproduction would need `countedDemotion` to have run on an outlet worker first: run a year or more, not 120 days. If it recurs, print the place and seed from the failing test's `where` and attach them here.

Checked Oct 17 (claude, after the fixes in #4781 and #4762 landed on main): five more drawn places (seeds `pf1` to `pf5` through `drawPlace(seed, "press-year")`: Swink, Colorado; Moshannon, Pennsylvania; Briartown, Oklahoma; Aguila, Arizona; Excel, Alabama), the bench world with every module, 800 days each from the start, press weeks included: all five ran to March 31, 2027 with no `Absent person`. Not reproducible on main; recommend the CTO drops it.
