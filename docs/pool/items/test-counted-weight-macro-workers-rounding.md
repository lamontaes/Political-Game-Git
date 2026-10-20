---
id: test-counted-weight-macro-workers-rounding
title: "counted-weight-macro: workers at count scale 3 exceed 1.05 times three times the base in a small town (Huntington Center, Vermont, 178.1 against 166.95)"
area: core
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/macro-workers-rounding
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:19:47.157Z
---

**What.** On seed 81f3003b4329071a3e587bb803de9acf3816104a8fcfb0e6ca02e3ba1d4276ff, place 5034675, the workers sum at SCALE 3 is 3.2 times the base. Find whether rounding of per-household worker counts or a real scaling error causes it, and fix the source.

**Rules.** No loosened tolerance; find the cause (ask why) and fix the engine or the test's expectation with the cause named.

**Done when.** The test passes on that seed and on 20 repeated drawn seeds.

**Files.** src/core2/counted-weight-macro.test.ts, src/core2/modules/residents.ts

**Notes.** TODO
