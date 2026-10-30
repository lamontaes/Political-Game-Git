---
id: campaign-groups-endorse-and-send-volunteers
title: "Organizations in town endorse a candidate whose platform takes up their cause and send members to volunteer"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: governing/campaign-group-endorsements
pr: #6872
blocked-on:
source: governing lead, Oct 30 (phase A of campaign-like-real-races)
lead: governing
claimed-at: 2026-10-30T02:28:01.302Z
---

**What.** No organization in a town has ever taken a side in its races: a residents' group, a cause group someone founded or a party's local chapter never endorsed anyone or sent members to work for a campaign, so a player running for council had only the people they asked themselves. The owner, Oct 29, on how real races are won: "look at real races... she was working with the Democratic Socialists of America. And, you know, then her campaign gained steam", and "it's not just door knocking." This is phase A of campaign-like-real-races: each organization weighs everyone running whose platform takes up its cause, backs the one it favors in public, and the members who care most about its cause and have free evenings join that campaign as volunteers.

**Rules.** No dice: a group endorses from its stance against each candidate's platform, its speaker's tie to the candidate and temperament, and a member volunteers from their own stake in the cause, closeness and free hours, never a roll. Look before you ask: wire through the campaigns engine's existing endorsement reach and its one volunteerIds list, and read interest groups, drives' cause groups and party chapters through one read-only view in campaigns.ts (CTO, Oct 29 22:19), never a second group or campaign system. One model, two tiers: counted residents who share a group's cause are not reached yet, registered as SG-GOV-group-endorsement-stance.

**Done when.** src/core2/campaign-group-endorsements.test.ts passes in a place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one) and prints the place and seed. On the campaigns engine's own turn through advanceCore, a cause group writes one endorsements row, record id endorsement:<filingId>:<organizationId>, answer yes and reason agrees, for the candidate who agrees, none for the one who does not, and no second row on the next turn; the public event campaign-endorsed:<endorsementId> names the group and its speaker; every other member has a cause row with act group-endorsement from the speaker; and at least one member is in both the row's volunteerIds and the campaign's volunteerIds. A person a candidate asks leaves an endorsement:<filingId>:<personId> row for a no as well as a yes, with its reason. A group never backs its speaker's friend on a platform that leaves its cause out or goes against it, and a person who backs a friend at agreement at or below 0 is kept with reason close-tie.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/drives.ts, src/core2/modules/interest-groups.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps.json, src/core2/campaign-group-endorsements.test.ts, src/core2/modules/campaigns.traits.test.ts, src/bench/campaign.ts, src/bench/data/controls.json, src/bench/play.mjs, docs/release/changes/campaign-group-endorsements.md

**Notes.** TODO
