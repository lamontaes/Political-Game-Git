---
id: gov-justice-player-case-scenes-red
title: "justice-player.test.ts fails on main: a case on the player reaches no scenes (Elk River, Idaho, seed 49f900453d6680e5)"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #4642
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-16 from PR #4642 (branch claude/gov-justice-player-case-scenes-red): Morning check: src/core2/justice-player.test.ts removes the requirement that a refusing member reports the offer and returns successfully when no complaint exists (lines 251–257). This loosens the test and lets the investigation path go untested. Keep the report/investigation assertion and arrange a generated-world case that reaches it; finish on that branch, merge main into it first.
