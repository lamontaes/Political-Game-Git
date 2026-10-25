---
id: tests-lived-crime-redraw-two-worlds
title: "The lived-crime test lets a redrawn year's last world go before it builds the next"
area: people
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/lived-crime-redraw-memory
pr: #5978
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T18:34:01.995Z
---

**What.** src/core2/views-lived-crime.test.ts redraws a place, up to five times, when a year victimizes no full household. Its loop still holds the last draw's played world while it builds the next, so two worlds sit in memory at once. The counted-jobs test with the same loop ran out of CI's 4 GB heap on October 24, so this test can too on a large draw.

**Rules.** No dice: the redraw stays a bounded, seeded draw from all 56 places, and the fix changes only what the test holds in memory, never a rate or an outcome.

**Done when.** The test sets its run to null before each redraw's play, and it passes at a 4 GB heap (NODE_OPTIONS=--max-old-space-size=4096) on a seed that redraws, with the drawn place and seed named in the PR body.

**Files.** src/core2/views-lived-crime.test.ts

**Notes.** Found Oct 24 by the effects lead after #5895 merged; the fix was pushed to that branch after the merge (f9000fa33f), so it lands here instead.
