---
id: most-specific-follow-press-without-acted
title: "The most-specific-line test is red on the Train: a press follow-up is said without the fact acted"
area: words
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
model: opus
effort: medium
root: none
source: vote-reasons thread, gate of the dev-mode branch, Nov 16 (red at #9584's accepted head 690f17e4 too)
---

**What.** src/english/most-specific-line-wins.test.ts fails "says the line tied to the record where one fits, else a generic one" at #9584's head 690f17e4 and on the branch built on it. The test lists one wrong pick: "scene|press-comment|routine|follow|press|asker|refuse|: without acted said scene-talk.follow-press.people-will-want-to-hear-it-from-you-not-from-me". The test reads the shipped bank only, with no drawn place or seed.
Seen: in the dev-mode branch's gate on Nov 16, and on a clean checkout of 690f17e4.

**Cause.** Needs cause. Found in code: `fitting` in src/english/scene-talk-words.ts picks the press follow-up at the spot the test names; whether the piece's use needs a guard on `acted` or the test asks the spot without one was not read.

**Fix.** None until the cause is found.

**Time box.** 1 hour, one Opus session at medium.

**Rules.** Ask why: name the use that placed the piece and the fact it lacks, from the bank row and the test's spot, before any change; a guard added to the bank is a Words lead's line, never a loosened assertion.

**Done when.** The test passes at the Train head with no change to an assertion. A second session runs src/english/most-specific-line-wins.test.ts on the Train and sees it green, and plays a reporter's call at a drawn place to see the follow-up said only after the member acted.

**Waits on.** Nothing.

**Files.** src/english/most-specific-line-wins.test.ts, src/english/scene-talk-words.ts, data/english/parts/scene-talk.json

**Notes.**
