---
id: words-held-first-test-no-held-lines
title: "The held-first test finds no held lines since every bank piece plays"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: words/held-first-fix
pr: #6048
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:02:36.920Z
---

**What.** src/director/mined/held-first.test.ts fails on clean main (410a5e758c). For scene-words.json and bring-it-up.json it finds no held part offered to grading (expected 0 to be greater than 0), and for journal.json one held part shows in play. The owner's Oct 24 ruling plays every bank piece unless his grades reject it, so the banks now keep no unreleased pieces and the test's premise no longer holds. The journal case is a false match: the test scans raw JSON and finds a look-back key list, not a piece in play.

**Rules.** No hand-written player text: every bank piece plays unless the owner's grades reject it, so the test checks that a rejected piece never plays and an unreleased one plays only in grading, not the old held/shipped split.

**Done when.** held-first.test.ts passes on main with assertions that match the Oct 24 rule, each naming the bank part keys it checks, and a break-it shows each assertion failing when the switch is removed.

**Files.** src/english/mined/held-first.test.ts, src/english/mined/scene-bank.ts, src/english/mined/journal-bank.ts

**Notes.** Worked Oct 25 on words/held-first-fix. The test reads the variants each set of words offers (a key with its text), not raw JSON. It checks that no piece the owner's grades reject is offered, in play or grading, in any of the three banks. On a copy of each bank with one released piece made unreleased, play drops that piece and the grading page offers it. Break-its: with the grade check dropped from the scene adapter's grading branch, the first check fails for scene-words.json; with the shippable check dropped from the journal adapter, the second fails for journal.json.
