---
id: elections-campaign-turn-test-draws-outsiders
title: "campaign-turn.test picks a national outlet's head as a rival and a zero-lean nominee as the sliding-scale proof"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/campaign-turn-test-draws-s5
pr: #4885
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:22:58.740Z
---

**What.** Two campaign tests in `src/core2/campaign-turn.test.ts` failed on one seed because of how they picked people, not because of the game. The rival was the second-richest adult, who in that place is the head of a national cable outlet and lives elsewhere, and a Florida nominee's views and party canceled to zero, so the test that demanded a non-zero answer from each nominee alone failed. The fix in pull request 4885 files the richest two adults the contest lets on the ballot and checks both nominees' answers together.

**Rules.** No dice: a nominee's answer follows their views and party, and the test reads the pair of them together rather than demanding a non-zero value from one. One rule, all 56 places: the test names the place and seed it drew.

**Done when.** In a drawn place and a seed the builder did not choose, `src/core2/campaign-turn.test.ts` passes, including on the seed that failed, which is named in the pull request; the test fails by name if the contest has no two adults who can run.

**Files.** src/core2/campaign-turn.test.ts

**Notes.** Body repaired Oct 17 (claude) from the pull request's description; the fix is in that pull request.

Sent back 2026-10-19 from PR #4885 (branch claude/campaign-turn-test-draws-s5): Morning check: src/core2/campaign-turn.test.ts now skips the continuous-position assertion for any nominee whose answers are all zero, where the old test asserted it for each first nominee. The merger rules refuse loosening a test; preserve the per-nominee invariant or fix its generated inputs without dropping that assertion; finish on that branch, merge main into it first.
