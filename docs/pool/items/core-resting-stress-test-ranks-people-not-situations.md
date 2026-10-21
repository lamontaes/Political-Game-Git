---
id: core-resting-stress-test-ranks-people-not-situations
title: "resting-stress.test fails in some places: it ranks two different people on money and work, but traits outweigh both, and it holds every town to the national average"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/political-game-pool-yucp92-ai
pr: #5631
blocked-on:
after: people-resting-stress-test-flaky
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:33:26.052Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 20: Switched from blocked to the automatic after: gate on people-resting-stress-test-flaky, so it opens by itself the moment those items are done.

Oct 20 (claude/political-game-pool-yucp92-ai): not reproduced on current main. `src/core2/resting-stress.test.ts` on main already compares the same person with changed cash or work (so traits cannot outweigh the situation) and holds the opening mean on the pooled mean of four drawn towns, not each town to the national average. It passed on three random seeds: `29db6566c26466cc`, `8f0bdb8b60a4b5ba`, `084fdd7f11e8f129`. The CTO can mark this done; PR #4908 (people-resting-stress-test-flaky) was sent back for loosening bounds, and this item needs nothing beyond it.
