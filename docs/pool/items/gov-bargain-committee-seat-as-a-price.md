---
id: gov-bargain-committee-seat-as-a-price
title: "A leader can trade a committee seat for a member's vote"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
after: gov-bargain-hearing-as-a-price
blocked-on:
source: owner's card Nov 14 06:43Z ("bigger asks get built afterward")
lead: laws
standard: 2
model: opus
effort: medium
root: rc7-player-cannot-drive
---

**What.** A chamber's leader assigns committee seats; members trade votes for them. The game seats committees without any deal, so no scene can offer one. Seen: in the evening-before ask in a state chamber, as a price the leader names.

**Cause.** Design: owner's card, Nov 14 2026 06:43Z: "What the game can do now" (a colleague asks only for your vote on their bill, a change to part of your bill, or a favor later; bigger asks built afterward). Committee membership is set by the leadership module's rules (src/core2/modules/leadership.ts); no act moves a member onto a committee mid-session.

**Fix.** A deal kind `committee-seat` the leader can offer, read by the leadership module at its next assignment, cited by deal id; askPrice lists it only for the chamber's leader.

**Time box.** 8 hours.

**Rules.** No dice: the deal is a record both sides read, never a roll; nothing is promised in a scene that no engine act pays (Words lead's rule 106); one engine (offerDeal, askPrice), no second bargaining path.

**Done when.** A second session starts the bench in a state drawn from all 56 (name the place and seed), plays the chamber's leader, and in the running game sees a member take a vote for a committee seat; the next assignment seats that member, citing the deal id.

**Waits on.** words-bargain-price-from-the-record.

**Files.** src/core2/modules/leadership.ts, src/core2/modules/legislature.ts, data/english/parts/scene-talk.json
