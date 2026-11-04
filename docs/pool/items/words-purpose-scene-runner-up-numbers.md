---
id: words-purpose-scene-runner-up-numbers
title: "Main red: director guard finds bare 0 and 1 in purpose-scene.ts (runner-up sort, #7258)"
area: words
kind: bug
priority: 1
size: S
status: claimed
claimed-by: lane3/red-purpose-numbers
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T14:59:41.876Z
---

**What.** Deterministic validation on main failed at 14:20 UTC Nov 4 (run 41846509312): director.test.ts 'registers every stopgap it marks and keeps numbers in data' found purpose-scene.ts:1, :1, :0, :0, the runner-up sort #7258 added.

**Rules.** Numbers live in data; in src/director, P.zero and P.one or named values.

**Done when.** director.test.ts passes on main; victory-night.test.ts still passes.

**Files.** src/director/purpose-scene.ts

**Notes.** Lane 3, Nov 4: fixed on lane3/red-purpose-numbers.
