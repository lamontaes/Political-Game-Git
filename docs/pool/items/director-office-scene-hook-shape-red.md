---
id: director-office-scene-hook-shape-red
title: "office-scene tests fail on main: they register a bare beforeVote function where legislature now wants { name, run }"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main (ff36bf96b2), src/director/office-scene.test.ts fails before any test runs with 'TypeError: hook.run is not a function' at runBeforeVote, src/core2/modules/legislature.ts:3369. registerLegislatureHooks({ beforeVote }) now takes { name, run } (120f63963e, committee-stage hooks), but office-scene.test.ts and office-scene-levels.test.ts still pass a bare function. Renaming to { name, run } alone is not enough: a named hook outside committee-day.json's committeeStage list runs only on the floor day, so the 'bill its committee did not report' check would loop over an empty list.

**Rules.** Never loosen or skip a test; the committee-death check must still see a committee death.

**Done when.** office-scene.test.ts and office-scene-levels.test.ts pass on main with the new hook shape, and the committee-did-not-report test asserts on at least one bill its committee killed.

**Files.** src/director/office-scene.test.ts, src/director/office-scene-levels.test.ts, src/core2/modules/legislature.ts, the committee-day data

**Notes.** TODO
