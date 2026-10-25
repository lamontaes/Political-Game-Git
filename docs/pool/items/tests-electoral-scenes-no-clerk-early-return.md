---
id: tests-electoral-scenes-no-clerk-early-return
title: "Electoral filing scene test silently passes when a drawn world has no clerk contest"
area: director
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On clean main, src/director/electoral-scenes.test.ts returns from its filing and campaign-stop case after logging NO CLERK CONTEST when the generated world has no qualifying contest. It reaches none of that case's filing, clerk, audience or campaign-stop assertions. A green test can therefore contain no proof of the feature, independently of the hindsight optimization in PR #5928.

**Rules.** Never narrow or skip a test. Keep a drawn-place case from all 56, require positive filing and campaign-stop evidence, and fail after bounded redraw exhaustion; a no-contest case may separately assert its own negative behavior.

**Done when.** A test in buildBenchWorld in a drawn place with its seed named reaches positive filing and campaign-stop assertions by record id; removing the clerk or stop producer fails the positive case, and bounded redraw exhaustion fails rather than returning green.

**Files.** src/director/electoral-scenes.test.ts

**Notes.** Merger 0 found the unchanged early return at lines 142-145 while reviewing #5928 on 2026-10-24; this is a main defect, not introduced by its eligibility filter.
