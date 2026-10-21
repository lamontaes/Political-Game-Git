---
id: core-old-imports-opening-builders
title: "Move the opening builders off the old town-pay, employment and residents code"
area: core
kind: cleanup
priority: 2
size: L
status: blocked
claimed-by: claude/old-imports-town-households
pr:
blocked-on: core-old-imports-town-households
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:26:57.363Z
---

**What.** Seven non-test files in `src/core2` still import the old engine folders: `population.ts`, `opening-employment.ts`, `opening-work.ts`, `town-households.ts`, `tooling/generated-world.ts`, `tooling/build-place-lookup-data.ts` and `tooling/build-opening-schools.ts`. They pull in `town-pay` (2,169 lines), `town-employment` (1,718), `town-residents` (907), `work-schedules` (714), `life-queries` (1,206, used by 199 files) and `jail-terms`. Move what the golden path still uses into the core, write it fresh where that is simpler, and delete the rest.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs. Same town by record id for a drawn place before and after.

**Done when.** The grep `grep -rlE 'from "\.\./(\.\./)?(simulation|presentation)' src/core2 --include=*.ts | grep -v test` prints nothing, the typecheck passes, and a drawn-place opening in buildBenchWorld builds the same town by record id.

**Files.** src/core2/population.ts, src/core2/opening-employment.ts, src/core2/opening-work.ts, src/core2/town-households.ts, src/core2/tooling/

**Notes.** Follows core-old-imports-14 (PR #4773). One module per session; start with the smallest leaf the opening builders share.
