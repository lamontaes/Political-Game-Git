---
id: words-held-first-test-no-held-lines
title: "The held-first test finds no held lines since every bank piece plays"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: words/held-first-fix
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:02:36.920Z
---

**What.** src/director/mined/held-first.test.ts fails on clean main (410a5e758c): for scene-words.json and bring-it-up.json it finds no held part offered to grading (expected 0 to be greater than 0), and for journal.json one held part shows in play. The owner's Oct 24 ruling plays every bank piece unless his grades reject it, so the test's premise, that each bank keeps held parts out of play, no longer holds as written.

**Rules.** Every bank piece plays unless the owner's grades reject it (words-engine, Oct 24). The test must check what the heldFirst switch still does under that rule (grade-rejected parts stay out of play; the grading view offers parts the grades have not yet passed), not the old held/shipped split.

**Done when.** held-first.test.ts passes on main with assertions that match the Oct 24 rule, each naming the bank part keys it checks, and a break-it shows each assertion failing when the switch is removed.

**Files.** src/director/mined/held-first.test.ts, src/director/mined/scene-bank.ts, src/director/mined/journal-bank.ts

**Notes.** TODO
