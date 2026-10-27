---
id: tests-offer-deadline-held-polling-place
title: "The job-offer deadline test fails on some seeds when its weekly presses reach election day and the character is held at the polls"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "found by the words-and-scenes lead, Oct 27, running the gate for PR #6206; fails the same way on main"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** `src/core2/jobs-offer-deadline-held.test.ts` fails on seed `43f77fe652c5e64808e664675ffaca45b21c8a7c` (place 3933376) with "Vote or leave the polling place first". Its run of weekly presses reaches election day, the bench holds the character at the polling place, and the test never leaves the polls. It fails identically on clean main, so it predates PR #6206. `src/bench/path-check.ts` met the same hold on Oct 17 (tests-path-check-polling-place) and answers it by leaving the polls.

**Rules.** One rule, all 56 places: the test keeps drawing a random place and seed and names both, and it must pass on every draw, not only the lucky ones. No dice: the test answers the polls the way a player would (leave), never by forcing a vote.

**Done when.** The test leaves the polling place when the bench reports the hold (or stops its presses before election day), and passes on seed `43f77fe652c5e64808e664675ffaca45b21c8a7c` and on three other drawn seeds, each named in the PR body.

**Time box.** 1 hour.

**You will see.** Nothing changes on screen; the gate stops reporting a red test that has nothing to do with the change under review.

**Screenshot.** None needed (test only); the PR body quotes the passing run with place and seed.

**Files.** src/core2/jobs-offer-deadline-held.test.ts

**Notes.** Seen on the gate for words/shifts-never-stop (PR #6206) and on main at the same commit base.
