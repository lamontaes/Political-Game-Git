---
id: tests-result-talks-astoria-fall-after-introduction-first
title: "At Astoria, Oregon, neighbors bring up a race's result once where the pinned test needs more than three, since strangers introduce themselves first"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Interview check thread, Nov 15, 2026, bisecting a red on the train while gating #9424"
model: sonnet
effort: medium
root: none
---

**What.** `src/director/bring-it-up-election.test.ts` at Astoria, Oregon (4103150), seed 0c04a6002f604427e427591b0e1749643730d79a9b5ed334c1a9e3ab91be8e63, fails on the train: "result talks: expected 1 to be greater than 3". It passed when #9279 folded it in (train 808bea72). Seen: after a count, a played week at Astoria should hold several neighbors bringing up the result, each citing it; the train's run holds one.

**Cause.** Measured by bisecting the 41 train folds from 808bea72 to aa927a84 with the test alone: the first red fold is c01ae17c ("Fold #9388 ff296651", talk-stranger-introduces-first-before-any-news). #9388 makes a talk with a stranger open on their introduction and moves the brought-up news (`raiseBroughtNews` in src/director/conversation.ts) to after the player's name, in the `here` answer step. Inferred, not yet traced line by line: the test's talks with strangers end or are counted before that step, so their result lines no longer reach its count.

**Fix.** Read how the test drives each talk and where it counts a result line. If the talk now needs the player's name answered before the news, drive that step as a player would (the same reply the talk offers) and count the lines after it. Do not loosen the count or re-pin the seed. If the news is lost when a stranger's talk ends at the introduction, that is a defect in #9388's rule and goes to its builder.

**Time box.** 1 hour.

**Rules.** Pinned tests: named place, fixed seed, never loosened or re-pinned without the old premise stated and the lead's yes.

**Done when.** The test passes at Astoria on the train with its count unchanged, and the PR says which of the two the cause was.

**Waits on.** Nothing.

**Files.** src/director/bring-it-up-election.test.ts, src/director/conversation.ts
