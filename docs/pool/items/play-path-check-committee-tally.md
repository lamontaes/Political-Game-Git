---
id: play-path-check-committee-tally
title: "path-check prints a bill killed in committee as failed (0-0): it counts only floor votes"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/path-check-committee-tally
pr: #4944
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T16:06:13.585Z
---

**What.** The path check printed a bill that never reached the floor as `failed (0-0)` because it counted only floor votes. It now prints the committee's count, or says the chair never heard it.

**Rules.** No hand-written player text: this is a developer line.

**Done when.** `billTally` in `src/bench/bill-tally.ts` prints the floor count when members voted, the committee count for a bill decided in committee, and a held-not-heard line, with a test beside it in `bill-tally.test.ts`.

**Files.** src/bench/path-check.ts, src/bench/bill-tally.ts

**Notes.** Six drawn places (seeds pc1 to pc6) all took their bill to the floor or left it drafted, so none showed a committee kill: a committee only exists for a body larger than the committee-of-the-whole size (state legislatures and Congress), so the proof is the unit test, not a played run.
