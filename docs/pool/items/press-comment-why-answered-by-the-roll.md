---
id: press-comment-why-answered-by-the-roll
title: "After a vote, the reporter asks why and the member answers with no reason, or with one the record does not hold"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-a6n4tc-vote-reasons
pr: 9584
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Words lead and second reader, Nov 15 17:15Z and 18:00Z (after-vote-lines.md)
---

**What.** On the reporter's call after a council vote, the reporter asks "why" and the player's plain answer is "I voted no. I'll stand on that." or "I voted for it. I'd vote for it again.", which give no reason (rule 111). Seen at #9510's head 321ba3fc in the played file for Salem, Ohio (3969834, rank-m4), Downs, Kansas (2018500, yes-vote-3) and Bagdad, Arizona (0405140, yes-vote-6).
Seen: on the reporter's call after a council vote, the player's answer to "why" gives no reason.

**Cause.** Found in code: `voteStandFacts` in src/director/vote-stand-facts.ts reads the member's row of the roll, which keeps their position part by part (views, constituents, sponsor, deal, party), and sets `reason-*` for every part that leans their way, but no press-comment answer reads a reason; the answers read only `voted-yes`/`voted-no`.

**Fix.** vote-stand-facts.ts sets `top-reason-<part>` for the two largest parts that lean the way the member voted, cited to the roll. The Words lead's line for each part requires its fact. A member with no part leaning their way gives the plain answer, which gets a second wording. The two lines with no reason are deleted. Only lines a played call says ship; the rest wait with the Words lead.

**Time box.** 2 hours, one Opus session at medium. The lines are the Words lead's.

**Rules.** Ask why: every reason said cites the roll. No dice. No line ships unplayed.

**Done when.** In a played world built by `buildBenchWorld` at a pinned place, the player votes with the game's own press on their own bill or on a colleague's bill that came up in play. A second session plays the reporter's call that follows, tapping replies by their move, and sees the answer to "why" name a reason the roll holds, cited to the vote's record id, or the plain answer when no part of the player's position leans their way. The test src/director/press-comment-after-vote.test.ts plays five such calls at Bagdad, Arizona, Dunthorpe, Oregon and Downs, Kansas.

**Waits on.** Nothing.

**Files.** src/director/vote-stand-facts.ts, data/english/parts/scene-talk.json, src/director/press-comment-after-vote.test.ts, src/director/press-comment-context.test.ts

**Notes.**
