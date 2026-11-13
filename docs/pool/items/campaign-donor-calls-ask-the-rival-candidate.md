---
id: campaign-donor-calls-ask-the-rival-candidate
title: "Call donors asks the player's own opponent (and his household) for money"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: none
source: "Playtester P3, Nov 13, 2026 (crew line #8928, comment 6844698994)"
checked:
claimed-at:
---

**What.** Calling donors for a selectboard race asked the opponent himself: 'Stephen Pugh would rather keep the money for now.' His wife was asked too. A rival's world campaign can likewise ask the player for money. Seen: the call list after Call donors on the campaign trail.

**Cause.** Found in code: reachablePeople in src/core2/modules/campaigns.ts (line 4147) adds everyone who has heard of the candidate (the impressions table) and drops only the candidate (ids.delete(campaign.candidateId)), so a rival on the same ballot who has heard of them is on the list. peopleToAsk in src/core2/campaign-day.ts (line 317) and askPlayerForMoney's check (line 969) read it. The volunteer and turnout asks already pass rivals over with rivalFiling (campaigns.ts line 1867), the donor asks do not. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026), Feb 3, 2025.

**Fix.** In reachablePeople, also drop every person with a filing on the same contest's ballot (ballot(api, campaign.contestId)), which covers the candidate too. Every reader then passes rivals over in one place. A test in a drawn place with a contested race checks that no rival is on another candidate's call list.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice; one rule, all 56 places (the test draws its place and names it). Wire to the world: the money that moves is the same journal, only the list changes. Speed: no new scan; the ballot is already indexed.

**Done when.** A second session plays a contested local race in a drawn place on main, presses Call donors, and the list of people asked never names the opponent; the rival's campaign never asks the player for money.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts
