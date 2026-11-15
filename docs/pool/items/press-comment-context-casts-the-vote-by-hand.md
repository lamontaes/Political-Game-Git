---
id: press-comment-context-casts-the-vote-by-hand
title: "The reporter's-call context test casts the player's vote by hand, so the lines it shows were never played"
area: words
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-a6n4tc-pcc-vote
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 15 23:28Z (second reader's hold on #9584)
---

**What.** src/director/press-comment-context.test.ts casts the member's vote with the legislature's own `castMemberVote`, not with the press a player uses. Every after-vote line it prints rests on a vote the player never cast. Seen at Salem, Ohio (3969834, rank-m4:1), Downs, Kansas (2018500, yes-vote-3:0) and Bagdad, Arizona (0405140, yes-vote-6:0) on Train ef708196.
Seen: on the reporter's call after a council vote, in the lines a words reader stamps from this test.

**Cause.** Found in code: the test's draft loop calls `castMemberVote(api, bill.id, me, …)` directly; the player's press is `chooseOwnVote` in src/bench/bill-stage.ts, which checks the player may vote and then casts through the same call.

**Fix.** Cast the vote with `chooseOwnVote(core, bill.id, vote, me)`. No assertion changes.

**Time box.** 30 minutes, one session.

**Rules.** No hand staging. No assertion loosened.

**Done when.** The test, run at the three seeds above in a played world built by `buildBenchWorld`, casts the vote through `chooseOwnVote` and passes at each, drawing the same place and seed as before.

**Waits on.** Nothing.

**Files.** src/director/press-comment-context.test.ts

**Notes.**
