---
id: play-campaign-ask-reaches-player
title: "A candidate's ask for money reaches the player as a request they answer"
area: play
kind: feature
priority: 2
status: merged
standard: 2
claimed-by: claude/pool-play-campaign-ask-reaches-player
pr: #8387
blocked-on:
milestone:
source: "core-player-money-spending: world campaigns no longer draw on the player's account"
claimed-at: 2026-11-11T00:31:51.670Z
after:
lead: governing
model: opus
effort: medium
root: rc7-player-cannot-drive
size: M
checked: fable 2026-11-10
merged-at: 2026-11-11T15:00:49.045Z
---

**What.** A world candidate's campaign asks the people it can reach for money, and now skips the controlled player. A candidate who knows the player (family, a friend, the party) should reach them as a request in conversation or a letter, which the player accepts, declines or sizes; the amount then moves through `askForDonation`'s own rules. The engine side is done under core-player-money-spending, which stopped world campaigns from drawing on the player's account (before the fix it took 35 gifts from the player's account in Lake Ridge, Virginia, seed d97611412a84, with no say). What is missing is the player's side: a request they can see and answer, and an answer the candidate's next ask reads.

**Cause.** Found in code: `campaignTurn` in src/core2/modules/campaigns.ts (line 6307) calls `askOutsideDonors` (line 6323) and, by design, skips the controlled player; a favor owed by the player is only a registered stopgap call `api.stopgap("SG-GOV-player-favor-asked")` (line 6331). No request record or screen reaches the player.

**Fix.** When a candidate who knows the player asks, write a request the director stages as a conversation or a letter, let the player accept, decline or size it, and have `askForDonation`'s rules move the amount; the candidate's next ask reads the answer from the journal or relationship record. Keep the engine half in its own PR (Government owns src/core2/modules/campaigns.ts) and the screen half within src/bench.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No engine makes a choice for the controlled person. No hand-written player text: the request's words come from the English engine. An effect is a read, not a record: the candidate's next ask reads the player's answer from the journal or relationship record. Wire to the world: the gift moves real money between the player's and the campaign's accounts.

**Done when.** A second session, in a played year in a drawn place (name and seed recorded), sees a candidate the player knows ask them, answers the request, and sees the gift (or the refusal) written as a journal or relationship record that the candidate's next ask reads, named by record id, with a generated-game browser screenshot of the request, the gift and the refusal.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/bench/campaign.ts, src/bench/play.mjs, src/director/

**Notes.** Before the fix the engine took 35 gifts from the player's account in Lake Ridge, Virginia (seed d97611412a84), with no say.

Sent back 2026-10-17 from PR #4865 (branch claude/campaign-ask-player): Morning check: this Play item changes the Government campaign engine in src/core2/modules/campaigns.ts and adds its engine test, beyond the bench/screen area. Record agreement from the Government owning area on this PR or split the engine work into its owning-area PR. The PR also states the changed screen was never opened in a browser; include a generated-game browser check for the request, gift and refusal paths after that split/agreement.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4865 (branch claude/campaign-ask-player): Morning check: pool item play-campaign-ask-reaches-player changes Government-owned src/core2/modules/campaigns.ts as well as Play files. Split the Government engine work to its owning session/PR, then keep this Play PR within src/bench and its checks.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4865 (branch claude/campaign-ask-player): The Government/Play split addresses that review, but the earlier send-back also required a generated-game browser check of request, gift and refusal paths. The current body still explicitly says the screen was never opened and the request card has only typecheck coverage. Supply that browser proof and the played-year record chain: known candidate asks, player answers, gift journal or refusal relationship record, and the next ask reads that answer. This remains a fixer into open parent #5407; a non-main merge cannot complete the pool item.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5407 (branch claude/campaign-ask-gov): The ruling-date and code-conflict repairs are present. The body still has no Done when evidence table, and this engine-only PR names the full Play item whose acceptance is a played-year ask, player answer and gift/refusal record read by the next ask. Its conversation/control surface remains in #4865. Track the engine half under a bounded completed item or finish the full acceptance together; keep the Play item open until its surface and played-world proof land. Add evidence rows naming the generated place/full seed, request, answer and subsequent read. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5407 (branch claude/campaign-ask-gov): The engine-only campaign-ask slice still lacks the Play surface and one-year request/answer/next-read acceptance; it needs bounded completion routing. Rechecked unchanged head ccc6a5fe14; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/5407#issuecomment-6316718334; finish on that branch, merge main into it first.
