---
id: elections-ads-reach-counted-followers
title: "Campaign ads reach an outlet's counted followers by group, times count"
area: elections
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/ads-counted
pr: #5328
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T13:15:51.841Z
---

**What.** A candidate's ad was bought from the town's outlet but reached only that outlet's named followers, the full people, so the counted followers of the same outlet, the wider population, never saw it. The ad's contacts now go to the named followers first and then to the outlet's counted followers, one contact for each real adult the counted group stands for, and the candidate's own ad adds those adults to the campaign's counted reach, which the town's recognition reads alongside the counted adults the doors and mail reach. An attack ad is about the rival, so it adds nothing to the attacker's counted reach.

**Rules.** One model, two tiers: a counted follower is reached by the same contacts as a named one, times the count the group stands for. An effect is a read: `countedReached` is read by `townShareKnowing` in the voting engine when it builds the candidate's recognition. No dice: the contacts a buy pays for are fixed by its amount and `adContactsPerThousandMinor`, and the named followers are reached before the counted ones.

**Done when.** In a played world (`worldWith`, a place drawn by seed, with a local outlet that has counted followers) `adReach` for a buy far larger than the audience equals the outlet's named and counted followers, a buy too small for the named followers reaches no counted one, and a candidate's ad raises the campaign's `countedReached`; `src/core2/campaign-ads.test.ts` passes.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/press.ts, src/core2/campaign-ads.test.ts

**Notes.** Oct 20 (claude/ads-counted). The press engine already counted an outlet's counted followers (`countedFollowersOf`); `adOutlet` now returns that count. A counted follower's reach is a number added to the campaign, not a per-group warmth, because the counted electorate reads recognition as a town share; group-level warmth for counted voters belongs to the views items.

**Notes.** TODO

Sent back 2026-10-20 from PR #5328 (branch claude/ads-counted): merge conflict with main in campaigns.ts, press.ts and campaign-ads.test.ts (code); finish on that branch, merge main into it first.

Correction 2026-10-20: the send-back above for PR #5328 was a mistake (two merger gate runs overlapped in one checkout); the branch merges cleanly with main and is being gated again. No author action needed.
