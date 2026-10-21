---
id: core-old-imports-opening-work
title: "The opening's work schedules come from the core, not the old work-schedules code"
area: core
kind: cleanup
priority: 2
size: S
status: claimed
claimed-by: claude/old-imports-opening-work
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:02:59.914Z
---

**What.** The opening's work schedules still import the old work-schedules code. Read the core's own schedule data instead, porting only the part the opening uses. The old import is removed in the same change, so the opening builds schedules from one place.

**Rules.** Replace, never layer: the old work-schedules import is deleted when the core's read lands, and the PR body counts what was removed. One rule, all 56 places: schedules come from data, with no place named in logic.

**Done when.** In a drawn place and a seed the builder did not choose, `buildBenchWorld` opens with the same work schedules by record id as before the change, the tests for the changed files pass, and no import of the old work-schedules module remains in the opening files.

**Files.** src/core2/opening-work.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
