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
source: governing lead Oct 29
---

**What.** M3-02's test sentence says each deal changes real terms: bill text, support, favors and endorsements. `offerDeal` in src/core2/modules/legislature.ts has three kinds (amend, back-their-item and favor), and only back-their-item (legislature.test.ts) and favor (src/bench/office-deals.test.ts) are tested; an accepted amend rewrites the bill's section for every member, but no test offers one, and the office panel's deal control lists none, favor and back-their-item only. There is no endorsement deal at all, though the campaigns engine already weighs an endorsement ask (`askForEndorsement`). Add the endorsement as a deal kind that reads the campaigns engine's own endorsement record, offer amend from the player's office panel, and test both.

**Rules.** Look before you ask: the endorsement is the campaigns engine's existing ask and record (campaigns-endorsement-ask-answer-record), never a second endorsement system. No dice: the member takes or declines from their own position before and after the offer, as `offerDeal` already decides. The chain is the acceptance: an accepted amend is followed to the bill's changed section and the vote that reads it, by record id.

**Done when.** A test in a drawn place built with buildBenchWorld and the seed it prints has the player offer an amend deal and an endorsement deal to colleagues through the office panel's talk; an accepted amend changes the bill's section value for every member's next position, an accepted endorsement writes the campaigns engine's endorsement record naming the member, and each deal is on the bill's record with its status; the M3-02 command names the test file.

**Files.** src/core2/modules/legislature.ts, src/bench/office.ts, src/bench/data/controls.json, src/bench/office-deals.test.ts, src/core2/modules/campaigns.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-02 command (branch governing/m3-spec-commands). The engine's own committee trades (trade-amendment, src/core2/legislature-committees.test.ts) already change bill text for world members in a played world; this item is the player's offer. src/bench is the lane's; ask before editing.
