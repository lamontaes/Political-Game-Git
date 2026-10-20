---
id: release-audit-13-grade-always-wins
title: "Stop one grade making a piece always win (#5286)"
area: words
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:27.396Z
---

**What.** Require several grades or keep variety so one grade no longer forces a piece to win, and set the release note to impact none until grades exist.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** A test shows a piece with one grade does not always win in a drawn place and seed, and the release declaration reads impact none.

**Files.** docs/release/changes, the grading module #5286 touched

**Notes.** Item 13 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

**Result (Oct 20).** preferGraded kept only the best-scoring pieces, so one grade (0.25) made a piece the only one left, against the step's own note that one grade never decides. It now keeps every piece within one step of the best, so a second grade in the same direction settles it. Tests in scripts/dialogue-batch/calibration.test.ts: a once-graded piece keeps company with the ungraded, a twice-graded one wins, and the engine words a once-graded line as it does with nothing graded. The words-bench-calibration declaration is impact none until grades exist (the table has no graded part).
