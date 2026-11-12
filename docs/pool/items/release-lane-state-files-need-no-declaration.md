---
id: release-lane-state-files-need-no-declaration
title: "Main's release run goes red on every lane state push: docs/lanes needs no declaration"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: lane-5/release-lane-files
pr: #7183
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T05:37:40.487Z
---

**What.** The Release run on main fails at Enforce declarations whenever a lane or the merge desk pushes its state file straight to main: run 41779634904 on 44f14801eb says the range modifies docs/lanes/state/merge-desk.md and adds no declaration, and runs 12086, 12088 and 12089 failed the same way. docs/lanes is coordination, like docs/coordination and docs/pool, which the check already skips.

**Rules.** Red main comes first: a red on main is fixed at the root on its own PR. Release machinery owns declarations; a coordination file never changes the client, so it needs none.

**Done when.** The release declaration test passes with a new case for a lane state file pushed to main, release:check on the range 7497b6035b..44f14801eb prints OK, and the release workflow ignores docs/lanes/** as its test checks.

**Files.** scripts/release/transition.ts,.github/workflows/release.yml,tests/release/declaration-transition.test.ts,tests/release/release-workflow.test.ts

**Notes.** TODO
