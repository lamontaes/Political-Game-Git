---
id: tests-view-learned-strongest-question-reply-fails-by-seed
title: "view-learned's strongest-question case is red by seed: a reply about thin pay fails its check"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Civic roles builder, Nov 15, comparing #9538's reds against the clean Train"
model: opus
effort: medium
---

**What.** In `src/director/view-learned.test.ts`, the case "where someone stands names their strongest question, from their own life, and the player's stand is kept" fails on the clean Train b22cd350 at GOLDEN_PATH_SEED=2a8e133a04cc81641bec. It fails in Garretts Mill, Maryland (2431575), seed 413f86fea4c2a13bdf896ed226250fb72872dba381be4d73ac24ca66a61b30f3, with "Because the pay is thin, you. Do the math.: expected false to be true". It fails the same way at other seeds, on lines like "The pay doesn't stretch far, you." in Rosedale MS and Camano WA. The line ends with ", you." and "you" stands where a name or nothing belongs. Seen: in a talk where someone says where they stand on pay, a line that addresses the player as "you" after a comma.

**Cause.** Needs cause. Measured: the case in What fails the same way on the clean Train 892427ec at the place and seed named there; the cause is not yet traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Opus.

**Rules.** Ask why: the check that fails must be read to say which slot fills "you" and from which record.

**Done when.** A second session runs the case at the seed above and three seeds of its own, each in a drawn place it names, and sees it pass; the reply names the player as the bank intends.

**Waits on.** Nothing.

**Files.** src/director/view-learned.test.ts

**Notes.** Filed by hand by the civic roles builder, Nov 15. The same seed is red with and without #9538. Also red on the clean Train 892427ec at GOLDEN_PATH_SEED=6c9909734087836a5f6c (Augusta, Michigan: "You try living on what I make, you.").
