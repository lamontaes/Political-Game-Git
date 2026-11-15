---
id: tests-constituent-cases-warmth-no-ballot-cooled
title: "The case-warmth ballot test is red at Rock Ridge, Connecticut: no counted ballot is cooled by a declined case"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: governing
model: sonnet
effort: medium
source: Views thread, Nov 15 (gate of #9434 on the train at ff9703d7)
---

**What.** `src/core2/modules/constituent-cases-warmth.test.ts`, "a real election's counted ballots carry the warmth, up for a helped case and down for a declined one", fails on the train at ff9703d7 and on #9434's head the same way: "Rock Ridge, Connecticut (0965160), seed kw-6: ballots cooled by a declined case: expected 0 to be greater than 0". Seen: a test red on the clean train at its own seed.

**Cause.** Needs cause. Looked at: the message. Over its 26 played months no counted ballot carries a negative case warmth. Either no counted resident's case with a candidate on the ballot was declined, or a declined case's warmth no longer reaches the counted ballot (`countedWarmths` in src/core2/modules/voting.ts). Neither is checked yet.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Never loosen a test to get green (pinned-tests). Ask why, by record: name the declined case and the ballot it should have cooled.

**Done when.** A second session runs the test on main and sees it pass at seed kw-6, and in a drawn place (place and seed named) sees a counted ballot cooled by a declined case, by ballot and case id.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases-warmth.test.ts, src/core2/modules/voting.ts

**Notes.**

- Nov 15 (views thread): if declined cases simply do not happen there, the fix stages one through the game's own path, so the test does not wait for one.
