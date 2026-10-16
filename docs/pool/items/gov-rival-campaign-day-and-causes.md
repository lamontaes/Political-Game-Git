---
id: gov-rival-campaign-day-and-causes
title: "Rival campaign days and causes for a contest"
area: gov
kind: feature
priority: 3
size: S
status: claimed
claimed-by: claude/rival-campaign-day
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T14:10:31.816Z
---

**What.** `causesFor` (campaigns.ts) is read by no screen, and `rivalCampaignDay` does not exist. Have rivals run their campaign day by the same choices the player has (campaign-day.ts), and show the causes a contest turns on beside the door and speech results.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place a rival's campaign day is recorded by the same acts as the player's, and the doors result names the causes it heard, by contest and act record ids.

**Files.** src/core2/campaign-day.ts, src/core2/modules/campaigns.ts, src/bench/campaign.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
