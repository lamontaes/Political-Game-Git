# A debate answer outside the filed platform: both sides offered, the record decides which is first

Replay: three drawn places with a race, each with the player filed with **no platform handed in** (the Campaigns row and the debate read what the player holds). The player plays to the debate's invitation, says yes, and opens the moderator's conversation; for each question the menu is listed, then the plain reply is taken. No vote was recorded by hand and the player joined no party, so each stand below comes from the player's own view (their lean and what has reached them), never from a party. Places passed over for no race to enter: Kingsport TN, Lakeview LA, Hana HI, Drayton SC. Script: `/mnt/project-files/platform-at-filing/replay-stand.ts` (copy it into `scripts/dev-tests/` and run `node --import tsx scripts/dev-tests/replay-stand.ts 12 3`).

Each reply: **[plain]** the side the record holds, listed first of the two sides; **[other]** the opposite side; **[brief]** the way not to answer, which states nothing. The player picks; nothing is said without a press. For a player who keeps it short the way not to answer is listed first.

Where each stand came from, per question: `[stand <position> from <source>]` (source is `platform` the filed platform, `vote` a vote cast, `view` the player's own view; a stand only the party takes is never shown as the player's own and counts as none).

Before this change (#9140 alone) Wetumpka offered only "My platform doesn't cover ending cash bail." / "I haven't taken a position on ..." and "Nothing to add on that." on all four questions.

```
Wetumpka, Alabama (0181720), seed replay-stand-1:2
Q us-policy-positions:justice-public-safety.end-cash-bail  [stand -0.174 from view]
   [plain] I oppose ending cash bail.
   [other] I support ending cash bail.
   [brief] Nothing to add on that.
Q us-federal-positions:energy-environment.limit-power-plant-carbon  [stand -0.412 from view]
   [plain] I oppose limits on power plant carbon.
   [other] I support limits on power plant carbon.
   [brief] Nothing to add on that.
Q us-policy-positions:justice-public-safety.raise-handgun-purchase-age  [stand -0.256 from view]
   [plain] I'm against a higher age to buy a handgun.
   [other] I want to raise the age to buy a handgun. That's my platform.
   [brief] Nothing to add on that.
Q us-federal-positions:foreign-affairs.increase-foreign-aid  [stand -0.413 from view]
   [plain] I'm against more foreign aid.
   [other] I'm for more foreign aid.
   [brief] No position yet.
Pemberton Heights, New Jersey (3457540), seed replay-stand-1:5
Q us-federal-positions:health.medicare-drug-price-negotiation  [stand 0.29 from view]
   [plain] I want to let Medicare negotiate drug prices. That's my platform.
   [other] I oppose Medicare negotiating drug prices.
   [brief] Nothing to add on that.
Q us-policy-positions:government-operations.all-mail-voting  [stand 0.165 from view]
   [plain] I'm for voting by mail for everyone.
   [other] I oppose voting by mail for everyone.
   [brief] No position yet.
Q us-federal-positions:territories-culture.statehood-for-dc  [stand 0.278 from view]
   [plain] I'm for statehood for the nation's capital.
   [other] I oppose statehood for the nation's capital.
   [brief] Nothing to add on that.
Q us-policy-positions:environment-energy.price-carbon  [stand 0.169 from view]
   [plain] I'm for a price on carbon.
   [other] I oppose a price on carbon.
   [brief] Nothing to add on that.
Eagle Rock, Virginia (5124208), seed replay-stand-1:6
Q us-policy-positions:justice-public-safety.restore-voting-after-sentence  [stand -0.296 from view]
   [brief] No position yet.
   [plain] I'm against restoring the vote after a sentence.
   [other] I support restoring the vote after a sentence.
Q us-federal-positions:health.medicare-drug-price-negotiation  [stand -1 from view]
   [brief] Nothing to add on that.
   [plain] I'm against Medicare negotiating drug prices.
   [other] I'm for Medicare negotiating drug prices.
Q us-federal-positions:justice-rights.reduce-mandatory-minimums  [stand -0.493 from view]
   [brief] No position yet.
   [plain] I wouldn't reduce mandatory minimum sentences. That's my platform.
   [other] I'm for shorter mandatory minimum sentences.
Q us-federal-positions:territories-culture.statehood-for-dc  [stand -1 from view]
   [brief] No position yet.
   [plain] I'm against statehood for the nation's capital.
   [other] I support statehood for the nation's capital.
```

Wetumpka, Alabama (against first on all four, all from the player's view), Eagle Rock, Virginia (against first on all four; the player there keeps it short, so the way not to answer is listed first) and Pemberton Heights, New Jersey (**for first** on all four, from view).

## Two lines that are wrong until the bank is changed

- "That's my platform." is said on stands that came from the player's view, not the filed platform (Wetumpka's handgun age on the other side, Eagle Rock's mandatory minimums). The two pieces `i-want-to-to-thats-my-platform` and `i-wouldnt-to-thats-my-platform` need `on-platform` in their `requiresFacts`; the code already sets that fact only on the side the filed platform holds.
- "No position yet." is said as the way not to answer when the player does hold a stand (Wetumpka, foreign aid). The piece `no-position-yet` needs `no-record` in its `requiresFacts`; the code sets it only where the player holds no stand.

Both edits are in data/english/parts/conversation.json, which the permission check refused to a builder without the owner's own words.
