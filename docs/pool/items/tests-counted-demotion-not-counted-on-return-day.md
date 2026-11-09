---
id: tests-counted-demotion-not-counted-on-return-day
title: "counted-demotion.test fails by seed: a demoted person is not in the counts on the day they return (Lookout Mountain, Georgia)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/counted-demotion.test.ts, 'demotes it after a long while out of the player's life...', fails on main 56acfdbe2 with GOLDEN_PATH_SEED=df6e76e8e58c78ac7e0fcd05f68ce334 (Lookout Mountain, Georgia): expect(residentPerson(core, id)?.id).toBe(id) gets undefined for person_be97cb8c926abd3c right after the household's demotion is found. Found by the Memory fix session on Nov 9; the same seed fails identically on memory/full-demotion.

**Rules.** A fix lands where the failure reproduces; one rule, all 56 places.

**Done when.** The test passes on that seed and on 10 fresh draws, with the cause named by record (who the person is, why the counts do not hold them on the return day).

**Files.** src/core2/counted-demotion.test.ts, src/core2/modules/counted-demotion.ts, src/core2/modules/residents.ts

**Notes.** TODO
