---
id: gov-bargain-district-project-as-a-price
title: "A member's vote can be traded for a project in their district in the budget"
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

**What.** County and state members trade votes for road and building money in their districts. The game has project requests (`projectRequests`, projects.ts) and budget-line sections with a recipient, but no deal that adds a member's project to a bill in return for a vote. Seen: in the evening-before ask at a county board or state chamber, as a price the member names.

**Cause.** Design: owner's card, Nov 14 2026 06:43Z: "What the game can do now" (a colleague asks only for your vote on their bill, a change to part of your bill, or a favor later; bigger asks built afterward). offerDeal knows amend, favor and back-their-item only; brief O report 1, section 3.

**Fix.** A deal kind `district-project` that adds a budget-line section carrying the member's open project request to the bill (the same section shape `budgetProvisions` writes with `requestId`), so the money moves through the existing treasury when the bill passes. askPrice lists it where the member has an open request.

**Time box.** 6 hours.

**Rules.** No dice: the deal is a record both sides read, never a roll; nothing is promised in a scene that no engine act pays (Words lead's rule 106); one engine (offerDeal, askPrice), no second bargaining path.

**Done when.** A second session starts the bench in a county drawn from all 56 (name the place and seed), plays a seated member, and in the running game trades a vote for a colleague's project; the bill passes and the project's money is paid through the treasury, by record id.

**Waits on.** words-bargain-price-from-the-record.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, data/english/parts/scene-talk.json
