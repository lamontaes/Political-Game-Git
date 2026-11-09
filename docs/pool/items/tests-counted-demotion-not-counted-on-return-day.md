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

**What.** The test src/core2/counted-demotion.test.ts, "demotes it after a long while out of the player's life...", fails on main 56acfdbe2 with GOLDEN_PATH_SEED=df6e76e8e58c78ac7e0fcd05f68ce334, drawn at Lookout Mountain, Georgia. Right after the household's demotion is found, expect(residentPerson(core, id)?.id).toBe(id) gets undefined for person_be97cb8c926abd3c, so the counts do not hold that person on the day the household returns to them. The Memory fix session found it on Nov 9, and the same seed fails identically on memory/full-demotion, so it is not that branch's change.

**Rules.** One model, two tiers (owner, Oct 14): a person returned to the counts must be held by the counted record under their own id from the day they return, as every engine reads them there. One rule, all 56 places: the fix is proven on the failing seed and on fresh draws from all 56 places, never by naming a place.

**Done when.** The test passes on that seed and on 10 fresh draws, with the cause named by record (who the person is, why the counts do not hold them on the return day).

**Files.** src/core2/counted-demotion.test.ts, src/core2/modules/counted-demotion.ts, src/core2/modules/residents.ts

**Notes.** TODO
