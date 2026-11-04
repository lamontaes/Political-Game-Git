---
id: play-loading-typecheck-red
title: "Main red: loading.ts imports PersonId from a module that does not export it"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: lane3/red-loading-personid
pr: #7220
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T09:19:33.760Z
---

**What.** npx tsc --noEmit -p tsconfig.app.json fails on main since 2c3a4b59: src/bench/loading.ts(3,15) imports PersonId from core2/kernel/brands, which has no such export.

**Rules.** Red main comes first (AGENTS.md); a fix lands where the failure reproduces.

**Done when.** The typecheck passes on the branch; loading.ts reads PersonId from core2/types like the rest of the bench.

**Files.** src/bench/loading.ts

**Notes.** Filed and fixed by Lane 3 (Nov 4) on lane3/red-loading-personid; the file is Lane 4's, a one-line import fix.
