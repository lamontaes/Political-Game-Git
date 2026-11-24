---
id: story-one-narrator-draws-at-run-time
title: "The one-narrator story test draws its seed at run time and is red on the Train"
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

**What.** src/bench/story-one-narrator.test.ts draws a new seed each run and failed at two seeds on Nov 16. At 690f17e4, seed 27edc8a1da98e2a5, it failed at Lehr, North Dakota (3845740) on the family.gathering-missed moment of person_689a6bbad7dcdb7f, 2025-05-09: "expected [ …(2) ] to deeply equal [ Array(1) ]". On the dev-mode branch it failed at seed bd12152a7a9cc569. A test that draws at run time cannot be a known red.
Seen: in the dev-mode branch's gate on Nov 16, and on a clean checkout of 690f17e4.

**Cause.** Needs cause. Found in code: `storyScene` in src/bench/story.ts serves the gathering-missed scene with two narrators where the test asks for one; which line is said twice, or which second narrator speaks, was not read.

**Fix.** None until the cause is found.

**Time box.** 2 hours, one Opus session at medium.

**Rules.** Ask why: read the two narrators from the served story at the pinned place before any change. No hand-written player text: a fix to the words goes through the bank with a Words reader's line.

**Done when.** The test, pinned (skill `pinned-tests`, Lehr, North Dakota at seed 27edc8a1da98e2a5 among the places, a limit near twice the slowest run) to named places and seeds, passes at the Train head. A second session opens a missed-gathering scene at a drawn place in the running game and hears one narrator.

**Waits on.** Nothing.

**Files.** src/bench/story-one-narrator.test.ts, src/bench/story.ts

**Notes.**
