---
id: words-purpose-scene-guards-red
title: "Main red: purpose-scene.ts has bare zeros and reaches inside the press desk"
area: words
kind: bug
priority: 1
size: S
status: claimed
claimed-by: lane3/red-purpose-scene-guards
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T06:40:40.630Z
---

**What.** Lane 5's handoff (Nov 4 06:45 UTC): director-numbers-in-data fails on src/director/purpose-scene.ts, where (tie?.latestChange?.requestedChange ?? 0) < 0 uses bare 0s (from #7186), and the families guard fails because the file imports PRESS_STORY_EVENT from core2/press-desk.

**Rules.** Every number lives in a parameter table (AGENTS.md, Placeholders). One engine per mechanic: import a family's entry, not its inside (families guard).

**Done when.** director.test.ts 'registers every stopgap it marks and keeps numbers in data' passes; tests/guards/families.test.ts no longer lists src/director/purpose-scene.ts.

**Files.** src/director/purpose-scene.ts, src/core2/modules/press.ts

**Notes.** Filed by Lane 3 (Nov 4); fix on lane3/red-purpose-scene-guards.
