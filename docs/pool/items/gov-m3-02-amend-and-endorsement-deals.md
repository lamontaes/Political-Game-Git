---
id: gov-m3-02-amend-and-endorsement-deals
title: "The player can trade an amendment or an endorsement for a vote, and each changes the bill's or the campaign's real terms"
area: gov
lead: governing
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
root: rc7-player-cannot-drive
source: governing lead Oct 29
after:
checked: fable 2026-11-10
---

**What.** M3-02's test sentence says each deal changes real terms: bill text, support, favors and endorsements. `offerDeal` in src/core2/modules/legislature.ts has three kinds (amend, back-their-item and favor), and only back-their-item (legislature.test.ts) and favor (src/bench/office-deals.test.ts) are tested; an accepted amend rewrites the bill's section for every member, but no test offers one, and the office panel's deal control lists none, favor and back-their-item only. There is no endorsement deal at all, though the campaigns engine already weighs an endorsement ask (`askForEndorsement`). Add the endorsement as a deal kind that reads the campaigns engine's own endorsement record, offer amend from the player's office panel, and test both. Seen: the office panel's deal control offering an amend deal, and the bill's text changing when it is taken.

**Cause.** Found in code: src/core2/modules/legislature.ts function offerDeal (line 3477) has the amend kind, which no test offers, and the office panel in src/bench/office.ts lists no amend control; the campaigns engine's askForEndorsement in src/core2/modules/campaigns.ts is 'never for a price', so no endorsement deal exists.

**Fix.** Offer amend from the player's office panel and test it through to the bill's changed section. Build the endorsement deal as the sponsor's promise to endorse the member at their next race, kept as an obligation and written into the campaigns engine's endorsements when the member files (Lane 1's Nov 4 proposal in the Notes).

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Look before you ask: the endorsement is the campaigns engine's existing ask and record (campaigns-endorsement-ask-answer-record), never a second endorsement system. No dice: the member takes or declines from their own position before and after the offer, as `offerDeal` already decides. The chain is the acceptance: an accepted amend is followed to the bill's changed section and the vote that reads it, by record id.

**Done when.** A second session, in a drawn place built with buildBenchWorld and the seed it prints, offers an amend deal and an endorsement deal to colleagues through the office panel's talk. An accepted amend changes the bill's section value for every member's next position, an accepted endorsement writes the campaigns engine's endorsement record naming the member, and each deal is on the bill's record with its status; the M3-02 command names the test file.

**Waits on.** Amend half: Nothing. Endorsement half: the Nov 4 question in the Notes (does the deal mean the sponsor endorses the member later, or the member endorses the sponsor), which the CTO answers after the reading line.

**Files.** src/core2/modules/legislature.ts, src/bench/office.ts, src/bench/data/controls.json, src/bench/office-deals.test.ts, src/core2/modules/campaigns.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-02 command (branch governing/m3-spec-commands). The engine's own committee trades (trade-amendment, src/core2/legislature-committees.test.ts) already change bill text for world members in a played world; this item is the player's offer. src/bench is the lane's; ask before editing.

Nov 4 (Lane 1, read before building): the owner's M3 spec lists "favors and endorsements" as tradeable (docs/packages/M3-legislating.md), but the campaigns engine says an endorsement is given "never for a price" (askForEndorsement), and the done-when's endorsement record needs a filing for the endorsed member, which a colleague rarely holds while a bill is pending. Before building: is the endorsement deal the sponsor's promise to endorse the member at their next race (kept as an obligation, written into campaigns' endorsements when the member files, which is campaign-favor-called-in's reader), or the member's endorsement of the sponsor? Lane 1 proposes the first, with the amend half built now. Read: OWNER-DECISIONS (Nov 2 back to Oct 16 papers endorse), DECISION-REGISTER, prior-rulings/legislature, M3-legislating.md; searched: endorse, endorsement deal, never for a price.
