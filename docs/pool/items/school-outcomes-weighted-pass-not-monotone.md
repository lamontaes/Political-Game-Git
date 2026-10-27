---
id: school-outcomes-weighted-pass-not-monotone
title: "The school engine's pass rule can fail a senior when the share grows: each student takes their household's weight of the share in order of standing"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/school-pass-monotone
pr: #6210
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T01:40:48.683Z
---

**What.** src/core2/school-outcomes.ts gives each income fifth an expected share and walks its students by standing; a student clears only if the owed share left covers their whole weight (a counted senior stands for their household's weight). That greedy pass is not monotone: with owed 1 and weights [2, 1] the second student clears, with owed 2 the first clears and the second fails. In school-outcomes-spending-web.test.ts (seed 020184272677dc2b) a senior who graduated in the base world, school.graduation-pct:person_120aee2b3081f3c7:2024, failed in the world with the schools line raised eight times over, though their factor rose.

**Rules.** One model, two tiers: a counted senior is read by the same rule as a full one, times their weight. No dice: who graduates comes from standing and the share, not a draw. Sliding scales and causes: more share never makes a given student fail; nothing flips at a threshold.

**Done when.** The pass rule clears students in order of standing so that raising a fifth's share never fails a student who cleared before (for example a counted record clears its weight in part, as a share of its household); school-outcomes-spending-web.test.ts checks per senior again that the raise fails no one, on seed 020184272677dc2b and two fresh drawn places named in the PR body; the town's graduation share stays within the calibrated band. **On screen.** Nothing yet: it would show on Who you are and News, and nothing there reads it.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/school-outcomes.ts, src/core2/school-outcomes-spending-web.test.ts

**Notes.** TODO
