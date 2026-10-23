---
id: release-vote-level-federal-story-draw
title: "A drawn federal vote-level world prints no qualifying national story"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: glm/vote-level-federal-story-draw
pr: #5845
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-23T16:54:36.669Z
---

**What.** On clean main 5cfd65f6f19b19855162dd297d88fdd98d0bd269, vote-level.test.ts second case fails its national outlet publication assertion at line 138. GOLDEN_PATH_SEED=dc4ca02829931f61516253751229f4eb270be44f draws place 0815330. The same seed fails identically at line 148 on the main-integrated township fix, head 67c4cef7727d275512b563cabfe178459e56c08e. The vote mapping case passes. Diagnose whether the press never selects a federal item or the test misses the item it printed.

**Rules.** One rule, all 56 places: the press must file and choose stories by the same government-level rule in every drawn place. Fix the producer, reader or test at the demonstrated root. Do not skip or weaken the positive publication assertion. Preserve township mapping and drawn-place coverage; use the same rule in all places.

**Done when.** On a main-integrated head, the exact seed passes the complete vote-level.test.ts and a fresh drawn-place run also passes; name the national outlet, printed story and federal wire IDs and explain the root cause. Retain the named township regression alongside drawn coverage.

**Files.** src/core2/vote-level.test.ts, src/core2/press-topics.ts, src/core2/modules/press.ts

**Notes.** Found while gating PR #5827 on 2026-10-23. The unchanged second case failed in about 70 seconds on both integrated PR and clean frozen main. Prior release-red-vote-level-organizing-filed is done and already counts opening chamber IDs; this recurrence remains.
