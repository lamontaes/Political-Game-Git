---
id: core-fill-in-returning-commuter-job-start
title: "Filling in a household returned to the counts stops the game in startCommuterJob: A job start needs a recorded person and employer"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5900
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Two existing tests fail on clean main at e3c00ba8ef with the same error: fill-in-returning-newborn.test.ts in Nahant, Massachusetts (GOLDEN_PATH_SEED=334e5aef0e2adb0f4c996afec92a7c77) and fill-in-returning-dead-member.test.ts in Funny River, Alaska (GOLDEN_PATH_SEED=0a6edc45e4a58e597bfd408e3490ce39). The stack is fillInPerson (state.ts:2262) to releaseResidentHousehold (residents.ts:1828) to startCommuterJob (residents.ts:2711) to startJob, which throws at job-lifecycle.ts:32. One of its four conditions fails for the returning household's jobless worker; which one was not traced. A likely suspect is a commuter job id already in core.jobs from the household's first fill-in, but that is unverified.

**Rules.** One model, two tiers: a household met again after returning to the counts comes back whole, with its worker's commuter job started as at a first fill-in. Wire to the world: name the person, the job id and the failing condition from records. No dice.

**Done when.** Both named seeds pass fill-in-returning-newborn.test.ts and fill-in-returning-dead-member.test.ts, and a drawn place passes each too; the PR body names the person, the commuter job id and which startJob condition failed, and the fix fails its test when undone.

**Files.** src/core2/modules/residents.ts, src/core2/state.ts, src/core2/job-lifecycle.ts, src/core2/fill-in-returning-newborn.test.ts, src/core2/fill-in-returning-dead-member.test.ts

**Notes.** Found Oct 24 while gating tests-counted-demotion-retained-cash; the same seeds fail identically with and without that branch's change.

October 24, 2026 (claude, claude/returning-fill-in-commuter-start): the fix reached main through lamontaes/Political-Game-Git#5938, which carried the same two lines (merge 874b69b809); lamontaes/Political-Game-Git#5900 now holds this record and the release note. Measured on main at d9db96b354: fill-in-returning-newborn.test.ts passes on 334e5aef0e2adb0f4c996afec92a7c77 (Nahant, Massachusetts) and on a fresh draw, ed5bf3b3f2f090653163493b0788b4f3 (Liberty, Kansas); fill-in-returning-dead-member.test.ts passes on 0a6edc45e4a58e597bfd408e3490ce39 (Funny River, Alaska) and on a fresh draw, 072b09c427c102db5a9c911e6ca98ced (Dayton Lakes, Texas). The cause, by record: in Nahant, person_b43807f56f22db9a's commuter job job:commuter:person_b43807f56f22db9a:2025-01-21 was built a second time on the same day, and the taken id failed the core.jobs.has(job.id) condition of startJob (src/core2/job-lifecycle.ts:29).
