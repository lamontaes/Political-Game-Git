---
id: press-comment-why-deal-reason-played
title: "After a vote the player traded for, the reporter's why never hears the deal"
area: words
kind: wiring
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
source: Account lead, Nov 15 23:00Z
---

**What.** After a council vote the player traded for, the reporter asks why, and no answer says "I gave my word I'd vote for it." because no played call has reached a deal yet. The Words lead's deal lines wait in /mnt/project-files/words-lead/press-comment/after-vote-lines.md.
Seen: on the reporter's call after a council vote the player agreed to in a colleague's vote-ask scene.

**Cause.** Found in code: `positionOn` in src/core2/modules/legislature.ts counts a deal only when one was recorded on the bill, and the only town path that records one is `payAsk` in the same file (a favor answer to a colleague's vote ask, calling `offerDeal`). `WORDED_REASONS` in src/director/vote-stand-facts.ts leaves `deal` out until a played call says it.

**Fix.** Pin a town vote where the player answers a colleague's ask with a favor, through the scene's own reply, and plays to the vote; read `top-reason-deal` on the reporter's call; add `deal` to `WORDED_REASONS` and the Words lead's deal lines for the vote that played.

**Time box.** 2 hours, one Opus session at medium. The lines are the Words lead's.

**Rules.** No hand-made deal row: the deal comes from the scene's reply. No line ships unplayed.

**Done when.** In a played world built by `buildBenchWorld` at a pinned place and seed, the player answers a colleague's vote ask with a favor, the vote is held, and the reporter's call that follows answers why with the deal, cited to the roll's record id; a pinned test shows it and a second session plays it.

**Waits on.** Nothing.

**Files.** src/director/vote-stand-facts.ts, data/english/parts/scene-talk.json, a new pinned test under src/director/

**Notes.**
