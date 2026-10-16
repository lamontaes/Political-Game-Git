---
id: gov-succession-vp-foreign-born-red
title: "succession.test.ts fails on main: the vice president is drawn foreign-born and the birth-record test expects native"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/succession.test.ts` fails on main, with or without recent changes, in a drawn place when the vice president is drawn foreign-born: the test "reads each official's birth record: the president and vice president are native-born" expects `nativity: native` and gets `foreign-born`. Place 0640746, `SUCCESSION_SEED=6ff649d3d89a2869` reproduces it. Find why a foreign-born vice president is seated, and fix either the officials' birth records (a vice president must be eligible to be president, so native-born) or the test's expectation if the law data allows otherwise.

**Rules.** No dice: the birth record comes from the person's records and the law in force, never a roll. One rule, all 56 places: eligibility comes from data, not a named place. Ask why: the failure names the record id that fixes the nativity.

**Done when.** With `SUCCESSION_SEED=6ff649d3d89a2869` (place 0640746) the succession tests pass, and the birth record test passes again in three more drawn places played through `buildBenchWorld`, each named with its seed in the PR body, and the vice president's nativity is read from the officials' records by record id.

**Files.** src/core2/succession.test.ts, src/core2/modules/succession.ts, src/core2/modules/officials.ts

**Notes.** Found while taking gov-vacancy-fills-leave-no-record (PR 4678); not caused by it.
