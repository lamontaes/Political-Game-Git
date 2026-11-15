---
id: gov-sponsor-position-shifts-between-filing-and-the-vote
title: "A sponsor's reason for their own amount bill reads the sections traded into it"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) staging amount bills (#9310), Nov 14 2026; measured the same night
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** When a sponsor asks a colleague for a vote on their own amount bill, the request says the reason that weighs most for them (src/director/bargain-facts.ts `sponsorAmountFacts`). It reads `memberPosition` on the bill as it stands that evening, so a section traded in since filing changes the reason. Measured in Iowa (1926400), seed cost1: four senators each file a bill setting the income tax at 4.95 percent on 2025-03-10 with a vote on 2025-03-17. By the evening of 2025-03-16 each bill also carries a traded section on the bottle deposit (`us-policy-positions:environment-energy.bottle-deposit`, -1). Eric Arnold's views part moves from -0.258 to 0.337 and the constituents parts from 0.049 to -0.075. Without the vote scheduled, the same four positions are identical on both days, and every senator has an officials row and is a full person on both days. In the amount-bills staging, senators whose own record gave "the next election" or "the people back home" gave their own view by the evening of the vote in every try. Seen: the reason a colleague gives when asking the player for a vote on their own bill.

**Cause.** Found in code: the sponsor's trade in src/core2/modules/legislature.ts (the holdout loop that gives "a holdout their own section for their vote", `provisions: [...current.provisions, section]`) adds sections before the vote, and `sponsorAmountFacts` weighs the whole bill. The figure it says already comes from the first section only. The first guess, a senator weighed as a town member with no officials row, was measured and is wrong.

**Fix.** Ruled by the coordinator (Nov 15, 01:11Z and 01:20Z): the sponsor states a reason only from sections they wrote, never from a traded-in section or a poison pill, and of their own sections from the one that weighs most for them, weighed alone. The vote keeps reading the whole bill. `sponsorsStrongestSection` in legislature.ts reads the bill's sections minus those an accepted trade or pill deal added (each deal now records its section), weighs each alone with the rule `memberPosition` uses, and `sponsorAmountFacts` takes the figure and reason from it. Test: src/director/sponsor-own-section.test.ts at Nathrop CO.

**Time box.** 2 hours.

**Rules.** Ask why: the reason a sponsor says must come from their record on the section they filed. Pinned tests: name the place and seed in the test file and replay that seed.

**Done when.** At Iowa (1926400), seed cost1, a sponsor whose bill took a traded section gives the same reason on the evening of the vote as on the day they filed it. A second session then sees a sponsor give a reason for their own amount bill in a drawn place of its own choosing in the running game, and the reason matches their record on the section they filed.

**Waits on.** Nothing.

**Files.** src/director/bargain-facts.ts, src/core2/modules/legislature.ts
