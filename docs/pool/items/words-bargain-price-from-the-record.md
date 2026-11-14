---
id: words-bargain-price-from-the-record
title: "A colleague the player asks for a vote names what they need from their own record, and taking it up is a real deal"
area: gov
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: Account lead (bargaining thread)
pr:
after:
blocked-on:
source: brief O (Words lead, Nov 14 2026); owner's card Nov 14 06:43Z "What the game can do now"
lead: words
standard: 2
model: opus
effort: medium
root: rc7-player-cannot-drive
---

**What.** The evening before a floor vote the player asks a colleague for their vote. Today the colleague answers only from their lean and a favor's worth, never names what they need, never says why, and the player's "deal" lines promise acts nothing does. Seen: in the evening-before ask scene (vote-sought) and at the roll.

**Cause.** Measured: three played places (report /mnt/project-files/words-lead/bargaining/report-1.md): no member named a price; askStanding (purpose-scene.ts) passes only the total; askBeforeTheRoll asks only members a favor would carry; scene favors write no obligation; favorsGiven read the record's stance sign, not the vote cast.

**Fix.** legislature.ts: `askPrice` (the player's vote on the member's own waiting bill, or half the section that weighs most against them) and `absenceCarries`; keepReply pays a taken price through `offerDeal` (back-their-item now names the item) or records the member absent, and writes a favor-owed ending to `obligations`. The scene offers the bargain and the smaller ask only where the act exists, and gets the reason as a `reason-<term>` fact (bargain-facts.ts). favorsGiven reads the vote cast and a returned favor is square.

**Time box.** 8 hours, one Opus session.

**Done when.** At three named places with fixed seeds, the player asks a colleague, takes up their price, and the roll call reads the deal (deal or obligation id named); a colleague asked to stay out is recorded absent; the reason line said matches the position's biggest term; lines ruled by the Words lead.
