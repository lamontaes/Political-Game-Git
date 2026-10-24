---
id: words-opening-stopgap-why
title: "The director test fails on main: the opening-goal stopgap is resolved but its why doesn't say so"
area: words
kind: bug
priority: 1
size: S
status: claimed
claimed-by: words/opening-stopgap-why
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T16:00:53.372Z
---

**What.** src/director/director.test.ts, "registers every stopgap it marks and keeps numbers in data", requires every resolved row in src/director/data/stopgaps.json to say Resolved in its why. SG-PEOPLE-opening-goal-words was resolved by words/opening-speech-per-world (commit 1a2d315815) with the resolution written into its replacement instead, so the test fails on clean main and in every PR's unit run that merges main. Move the resolution into the why, as every other resolved row has it.

**Rules.** Look before you register: the row is the existing stopgap and the fix only moves its resolution note where the test reads it. Replace, never layer: the replacement field keeps only what was to replace it.

**Done when.** src/director/director.test.ts passes 23 of 23 on the fix and fails on clean main with the stopgap message, and the row's why ends with its Resolved note.

**Files.** src/director/data/stopgaps.json

**Notes.** TODO
