---
id: play-campaign-ask-reaches-player
title: "A candidate's ask for money reaches the player as a request they answer"
area: play
kind: feature
priority: 3
status: in-pr
claimed-by: claude/campaign-ask-player
pr: #4865
blocked-on:
milestone:
source: "core-player-money-spending: world campaigns no longer draw on the player's account"
claimed-at: 2026-10-20T02:08:40.501Z
---

**What.** A world candidate's campaign asks the people it can reach for money, and now skips the controlled player. A candidate who knows the player (family, a friend, the party) should reach them as a request in conversation or a letter, which the player accepts, declines or sizes; the amount then moves through `askForDonation`'s own rules.

**Rules.** No engine makes a choice for the controlled person; words from the English engine; an effect is a read.

**Done when.** In a played year a candidate the player knows asks them, the player answers, and the gift (or the refusal) is a journal or relationship record the candidate's next ask reads.

**Files.** src/core2/modules/campaigns.ts (`campaignTurn`), the conversation surface.

**Notes.** Before the fix the engine took 35 gifts from the player's account in Lake Ridge, Virginia (seed d97611412a84), with no say.

Sent back 2026-10-17 from PR #4865 (branch claude/campaign-ask-player): Morning check: this Play item changes the Government campaign engine in src/core2/modules/campaigns.ts and adds its engine test, beyond the bench/screen area. Record agreement from the Government owning area on this PR or split the engine work into its owning-area PR. The PR also states the changed screen was never opened in a browser; include a generated-game browser check for the request, gift and refusal paths after that split/agreement.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4865 (branch claude/campaign-ask-player): Morning check: pool item play-campaign-ask-reaches-player changes Government-owned src/core2/modules/campaigns.ts as well as Play files. Split the Government engine work to its owning session/PR, then keep this Play PR within src/bench and its checks.; finish on that branch, merge main into it first.
