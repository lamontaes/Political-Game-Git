---
id: core-speed-campaign-day-chosen-only
title: "Taking a campaign day builds every kind of day to use one, and a world candidate's day builds the player's full choice screen (Ringgold, Louisiana 2028: about 5 s)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/cut-campaign-day
pr: #6948
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T09:24:00.273Z
---

**What.** A candidate's campaign day (src/core2/campaign-day.ts) builds every choice the player's screen shows, with each choice's facts, even when it takes one: takeCampaignDayChoice calls campaignDayChoices and keeps one row. A world candidate's rivalDay builds the same full screen only to read which kinds are open and their hours. A 2028 profile of one Ringgold, Louisiana save (seed long-1) put campaignDayChoices at 4.8 s against 0.3 s in 2025. sendMail in src/core2/modules/campaigns.ts also builds full adult rows only to count them.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** takeCampaignDayChoice builds only the chosen kind, rivalDay reads which kinds are open from campaignDayOpen, the interview facts are read once per screen, and sendMail counts adults without building rows; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table of the played world at year 4, with the times in the PR body.

**Files.** src/core2/campaign-day.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
