---
id: director-office-scene-hook-shape-red
title: "office-scene tests fail on main: they register a bare beforeVote function where legislature now wants { name, run }"
area: director
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #5825
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main (ff36bf96b2), src/director/office-scene.test.ts fails before any test runs with 'TypeError: hook.run is not a function' at runBeforeVote, src/core2/modules/legislature.ts:3369. registerLegislatureHooks({ beforeVote }) now takes { name, run } (120f63963e, committee-stage hooks), but office-scene.test.ts and office-scene-levels.test.ts still pass a bare function. Renaming to { name, run } alone is not enough: a named hook outside committee-day.json's committeeStage list runs only on the floor day, so the 'bill its committee did not report' check would loop over an empty list.

**Rules.** Never loosen or skip a test; the committee-death check must still see a committee death. One rule, all 56 places: keep the existing drawn-place setup rather than pinning a convenient passing place.

**Done when.** office-scene.test.ts and office-scene-levels.test.ts pass on main with the new hook shape, and the committee-did-not-report test asserts on at least one bill its committee killed. That positive assertion must not be weakened or skipped.

**Files.** src/director/office-scene.test.ts, src/director/office-scene-levels.test.ts, src/core2/modules/legislature.ts, the committee-day data

**Notes.** TODO

Sent back 2026-10-21 from PR #5825 (branch claude/office-scene-hook-shape): `src/director/office-scene.test.ts:154` returns once it finds a scene even when no committee death has been collected, then `src/director/office-scene.test.ts:261` requires at least one. My changed-file run on the integrated head drew Meridian Village, Colorado (0850026), OFFICE_SCENE_SEED=17184bf3ac60d67e, found a scene on 2026-10-13 and zero committee deaths, and failed that assertion. Keep the nonempty assertion and make the bounded played-world search establish both required cases before returning. The PR also needs the required Done when table mapping `docs/pool/items/director-office-scene-hook-shape-red.md:20` to its test evidence.; finish on that branch, merge main into it first.
