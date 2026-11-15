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

**Cause.** Measured: at Astoria's seed above, by bisecting the 41 train folds from 808bea72 to aa927a84 with the test alone: the first red fold is c01ae17c ("Fold #9388 ff296651", talk-stranger-introduces-first-before-any-news). The news is not lost (the builder of #9388, Nov 15, with played talks at /mnt/project-files/words-lead/intro-first/played-ff296651.md): a stranger now opens with the introduction (a line of kind "here"), and the news follows in the same talk after the player gives their name (`raiseBroughtNews` runs in the `say` branch after `here-back`, src/director/conversation.ts). The test counts a talk only when the opening's last line (`before = talk.lines.at(-1)`) cites the result, so strangers drop out of the count and only people who already know the player are counted.

**Fix.** In the test, when a talk's last line is of kind "here" and the talk has choices, press the first reply as a player would, take the new last line as `before`, and keep the reply checks on the choices after it. The count stays as it is, at the same place and seed. A stranger who closes after the name with no news is the one-telling-a-day rule and is not counted.

**Owner.** The conversation engine thread, which built #9388.

**Time box.** 1 hour.

**Rules.** Look before you ask: the fix reads the opening the way a player meets it. Pinned tests: the test keeps its named place and fixed seed, and is never loosened or re-pinned without the old premise stated and the lead's yes.

**Done when.** The test passes at Astoria on the train with its count unchanged, and the PR says which of the two the cause was. A second session plays a week after a count in a drawn place on main, names its seed, and sees in the running game a stranger introduce themselves and then bring up the result.

**Waits on.** Nothing.

**Files.** src/director/bring-it-up-election.test.ts, src/director/conversation.ts
