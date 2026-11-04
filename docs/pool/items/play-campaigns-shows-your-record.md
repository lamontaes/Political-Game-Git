---
id: play-campaigns-shows-your-record
title: "Campaigns shows the player's record in office when they run again: votes cast, bills passed or failed, promises kept or broken"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Path 11 of Lane 1 starts with the player seeing their own record on Campaigns when they run for re-election. The records exist (legislature roll calls, bills the player sponsored, promises and their status), and voters already weigh them, but the screen the player plans a campaign from does not show them, so the player cannot see what a rival will attack or what to run on. The section reads the same records voters read, worded through the English engine.

**Rules.** One model: the screen is a view of the legislature and promise records, never its own copy. No hand-written player text: labels and lines come from the English engine's banks (player-screen-text). Screen-to-mock: the section uses the shared controls. Agreement 1-4: Lane 4 owns the screen; Lane 1 supplies the record view.

**Done when.** In the bench, a New Game life that won a seat and voted shows on Campaigns, when filing again, a record section naming its roll-call votes, its bills and their outcomes and its promises with their status, each line citing its record id, in a 1440 by 900 screenshot of a drawn place named with its seed.

**Files.** src/bench/campaigns.ts, src/core2/campaign-views.ts

**Notes.** TODO
