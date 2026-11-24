---
id: gov-bargain-hearing-as-a-price
title: "A committee chair can trade a hearing on a member's bill for their vote"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: words-bargain-price-from-the-record
blocked-on:
source: owner's card Nov 14 06:43Z ("bigger asks get built afterward")
lead: laws
standard: 2
model: opus
effort: medium
root: rc7-player-cannot-drive
---

**What.** In real chambers a chair's power to hear or hold a bill is the commonest price for a vote. The game has holds and hearings (`holdCommittee`, `bill-held-in-committee`), but no act lets a chair promise a hearing in return for a vote, so the bargain lines that offered one were pulled. Seen: in the evening-before ask, as a price the asker or the asked can name when they chair the committee holding the other's bill.

**Cause.** Design: owner's card, Nov 14 2026 06:43Z: "What the game can do now" (a colleague asks only for your vote on their bill, a change to part of your bill, or a favor later; bigger asks built afterward). The committee stage decides a hearing from the chair's position only (legislature.ts committeeStage), with no deal read; brief O report 1, section 3.

**Fix.** Add a deal kind `hearing` to offerDeal, valid only when the offering member chairs the committee holding the other's bill; holdCommittee reads an accepted hearing deal as the chair's reason to hear it, cited by deal id. askPrice lists it where it would carry the member.

**Time box.** 6 hours.

**Rules.** No dice: the deal is a record both sides read, never a roll; nothing is promised in a scene that no engine act pays (Words lead's rule 106); one engine (offerDeal, askPrice), no second bargaining path.

**Done when.** A second session starts the bench in a state drawn from all 56 (name the place and seed), plays a seated legislator whose bill a chair holds, and in the running game sees the evening-before ask offer a hearing as the price; taken, the committee record for the bill cites the deal by id and the bill is heard.

**Waits on.** words-bargain-price-from-the-record (the price read).

**Files.** src/core2/modules/legislature.ts, src/director/bargain-facts.ts, data/english/parts/scene-talk.json
