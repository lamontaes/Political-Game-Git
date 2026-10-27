---
id: tests-opening-unemployment-scope-red-on-drawn-seed
title: "The opening unemployment-scope test is red on main on a drawn seed"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/unemployment-scope
pr: #6306
blocked-on:
source: "Merger 7, Oct 27 12:00 UTC, while rechecking lane PRs"
lead: words
milestone: play-first
claimed-at: 2026-10-27T11:41:05.810Z
---

**What.** On clean main at 11:00 UTC Oct 27, `opening-unemployment-scope.test.ts` fails on a drawn seed (Merger 7's recheck of #6260). The test checks that every unemployment rate the opening names says where it applies. Either the opening address rebuilt from records (#6235) names a rate without its place in some worlds, or the test's expectation is stale against the new address. Find which on the failing seed and fix the one that is wrong; a rate a player sees always names its place (play-stop-10, done).

**Rules.** Estimate, never UNKNOWN; player screen text (a rate names where it applies); one rule, all 56 places (the test draws its place).

**Done when.** The test passes on main's head on the failing seed and on three fresh draws, and the PR body names the seed and the cause.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Every unemployment rate in the opening says where it applies, in every world.

**Screenshot.** Not a screen; the test output on the failing seed in the PR body.

**Files.** src/english/english-opening-speech.ts, tests or src/bench opening-unemployment-scope.test.ts

**Notes.** Merger 7, Oct 27 12:00 UTC: "opening-unemployment-scope.test.ts is red on main on a drawn seed." Lead: words.
