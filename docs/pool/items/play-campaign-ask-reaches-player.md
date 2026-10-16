---
id: play-campaign-ask-reaches-player
title: "A candidate's ask for money reaches the player as a request they answer"
area: play
kind: feature
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "core-player-money-spending: world campaigns no longer draw on the player's account"
---

**What.** A world candidate's campaign asks the people it can reach for money, and now skips the controlled player. A candidate who knows the player (family, a friend, the party) should reach them as a request in conversation or a letter, which the player accepts, declines or sizes; the amount then moves through `askForDonation`'s own rules.

**Rules.** No engine makes a choice for the controlled person; words from the English engine; an effect is a read.

**Done when.** In a played year a candidate the player knows asks them, the player answers, and the gift (or the refusal) is a journal or relationship record the candidate's next ask reads.

**Files.** src/core2/modules/campaigns.ts (`campaignTurn`), the conversation surface.

**Notes.** Before the fix the engine took 35 gifts from the player's account in Lake Ridge, Virginia (seed d97611412a84), with no say.
