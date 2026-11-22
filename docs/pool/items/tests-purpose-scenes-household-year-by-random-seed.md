---
id: tests-purpose-scenes-household-year-by-random-seed
title: "The household scenes year test is red by random seed on the Train"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: governor's briefing room builder, Nov 15; red on the Train at 32a994212b
lead: words-engine
claimed-at:
---

**What.** `src/director/purpose-scenes.test.ts` (removed) "a filing and a count fire the household's scenes in the lines that play, over a full year" draws a random place and seed and fails on some draws. Seen: the test passes on any drawn place, and the household's scenes play with the office named the way the Journal names it.

**Cause.** Needs cause. Measured: on the Train head 32a994212b441a0e1a3d95d2029a50a70bcefb71 and on the briefing room branch, `npx vitest run --dir . src/director/purpose-scenes.test.ts` failed at Galatia, Kansas (2025050), seed 5a5019ed8cb2fc5d:1 with `expected 'council member' to be 'Council member'` for filing `filing:contest:seat:gus2025:126868:council:0:2025-11-04:person_775bdbbb1c64dad4`, and a second run failed at seed abd06e229185de3e (message not read). The test draws its place and seed each run (see skill pinned-tests).

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes and say so. Seen: the test is pinned to named places and seeds and passes.

**Rules.** No dice. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, on main at a drawn place and a seed the builder did not choose, and also at Galatia, Kansas with seed 5a5019ed8cb2fc5d:1, replays the household filing and count scenes and sees the office named the same way in the scene and the record, and the test passes.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts

**Notes.**

- Nov 15. Filed with Needs cause so nobody builds it before the cause is found.
- Nov 16, views thread: the test is now pinned to Litchfield, Connecticut (seed pin-ps-2:1, passes) with Galatia, Kansas (seed 5a5019ed8cb2fc5d:1) kept as a red case. Replayed on the Train a62a2fda, Galatia now fails with "no race-lost scene" for filing:contest:seat:gus2025:126868:council:0:2025-11-04:person_0eedb5268ea92e66 rather than the office name.
