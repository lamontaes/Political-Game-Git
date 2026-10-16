---
id: gov-succession-vp-foreign-born-red
title: "succession.test.ts fails on main: the vice president is drawn foreign-born and the birth-record test expects native"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Checked Oct 16 (claude/vp-foreign-born) on main at 77fbeb0efd: src/core2/succession.test.ts passed 7 runs in a row, each in a different drawn place and seed (5 of 5 tests). The cause it names is already handled: `fillInIdentity` passes `qualified: true` to `nativityFact` for the seats `seat:US:president` and `seat:US:vice-president` (state.ts around line 2236), so a sitting president or vice president is never drawn foreign-born. It no longer reproduces; recommend the CTO sets it done. The body of this item was never filled in (all TODO), so it would fail the pool quality gate if reopened.
