---
id: press-comment-plain-yes-in-other-arc
title: "In another arc of the reporter's call, a yes answer gives no reason"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: press-comment-why-answered-by-the-roll
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 16 00:41Z
---

**What.** At Camp Point, Illinois (1710877, pr-5:0), a colleague's bill came up in play on day 1 and the player voted yes. The reporter's call opened "Give me the reason in your own words and I'll use them." The answer offered was "I voted for it, and I'd vote for it again tomorrow.", which gives no reason, even though the roll held `top-reason-sponsor`. Seen on #9584's branch at d3940185 by the probe that found the pinned places.
Seen: on the reporter's call after a yes vote, in the arc whose question asks for the reason in the member's own words.

**Cause.** Found in code: the reason lines in data/english/parts/scene-talk.json are placed only on the routine arc (`key: "routine"`). The other arc's plain yes answer reads only `voted-yes`, so `voteStandFacts` (src/director/vote-stand-facts.ts) sets a reason that this arc never words.

**Fix.** The Words lead writes this arc's reason lines for each `top-reason-*` fact, or places the routine reason lines on it, and deletes the plain yes answer here as the routine one was deleted. Play it at Camp Point by presses.

**Time box.** 1 hour, one Opus session at medium. The lines are the Words lead's.

**Rules.** Ask why: a "why" is answered by the reason the roll holds, cited to the vote's record id, in every arc and not only the routine one.

**Done when.** In a played world built by `buildBenchWorld` at the pinned place Camp Point, Illinois (pr-5:0), the player votes yes on the colleague's bill. A pinned test taps the reporter's call by presses and sees the answer give the sponsor reason. A second session plays it and sees the same.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json

**Notes.**
