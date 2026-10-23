---
id: play-campaign-ask-reaches-player
title: "A candidate's ask for money reaches the player as a request they answer"
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr: #5407
blocked-on:
milestone:
source: "core-player-money-spending: world campaigns no longer draw on the player's account"
claimed-at:
---

**What.** A world candidate's campaign asks the people it can reach for money, and now skips the controlled player. A candidate who knows the player (family, a friend, the party) should reach them as a request in conversation or a letter, which the player accepts, declines or sizes; the amount then moves through `askForDonation`'s own rules.

**Rules.** No engine makes a choice for the controlled person; words from the English engine; an effect is a read.

**Done when.** In a played year a candidate the player knows asks them, the player answers, and the gift (or the refusal) is a journal or relationship record the candidate's next ask reads.

**Files.** src/core2/modules/campaigns.ts (`campaignTurn`), the conversation surface.

**Notes.** Before the fix the engine took 35 gifts from the player's account in Lake Ridge, Virginia (seed d97611412a84), with no say.

Sent back 2026-10-17 from PR #4865 (branch claude/campaign-ask-player): Morning check: this Play item changes the Government campaign engine in src/core2/modules/campaigns.ts and adds its engine test, beyond the bench/screen area. Record agreement from the Government owning area on this PR or split the engine work into its owning-area PR. The PR also states the changed screen was never opened in a browser; include a generated-game browser check for the request, gift and refusal paths after that split/agreement.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4865 (branch claude/campaign-ask-player): Morning check: pool item play-campaign-ask-reaches-player changes Government-owned src/core2/modules/campaigns.ts as well as Play files. Split the Government engine work to its owning session/PR, then keep this Play PR within src/bench and its checks.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4865 (branch claude/campaign-ask-player): The Government/Play split addresses that review, but the earlier send-back also required a generated-game browser check of request, gift and refusal paths. The current body still explicitly says the screen was never opened and the request card has only typecheck coverage. Supply that browser proof and the played-year record chain: known candidate asks, player answers, gift journal or refusal relationship record, and the next ask reads that answer. This remains a fixer into open parent #5407; a non-main merge cannot complete the pool item.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5407 (branch claude/campaign-ask-gov): The ruling-date and code-conflict repairs are present. The body still has no Done when evidence table, and this engine-only PR names the full Play item whose acceptance is a played-year ask, player answer and gift/refusal record read by the next ask. Its conversation/control surface remains in #4865. Track the engine half under a bounded completed item or finish the full acceptance together; keep the Play item open until its surface and played-world proof land. Add evidence rows naming the generated place/full seed, request, answer and subsequent read. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5407 (branch claude/campaign-ask-gov): The engine-only campaign-ask slice still lacks the Play surface and one-year request/answer/next-read acceptance; it needs bounded completion routing. Rechecked unchanged head ccc6a5fe14; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/5407#issuecomment-6316718334; finish on that branch, merge main into it first.
