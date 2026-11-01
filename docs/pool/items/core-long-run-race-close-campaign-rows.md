---
id: core-long-run-race-close-campaign-rows
title: "Drop a decided race's gifts, endorsements, polls and stepped-up rows unless the player filed in it"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The campaigns engine keeps every gift, endorsement, poll and stepped-up row of every race forever, though every reader in play reads them only while the race is open or reads the player's own race. They grow with every election in every place the world plays. The campaign row keeps raisedMinor, and the campaign-endorsed and campaign-stepped-up events carry what news reads.

**Rules.** Speed (owner, Oct 29): old records fold once play no longer reads them. The governing lead agreed on Nov 1 at 21:22 UTC, keyed on the player's contests: every row of any contest the player filed in stays, rivals' included, because the played-year proof and the incumbent-response unit read them; the rest go at the race-close step. Replace, never layer: the drop runs in the close step that already drops door rows.

**Done when.** A four-year run of the played world (npm run speed:year -- --seed long-1 --years 4, Ringgold, Louisiana) on main and the branch, one process each, keeps dev mode's records proof identical in every table except campaigns gifts, endorsements, polls and steppedUp, with row counts in the PR body, and src/core2/campaign-doors-fold.test.ts in a drawn place named with its seed shows a closed race's rows gone and a contest the player filed in keeping all of its rows.

**Files.** src/core2/modules/campaigns.ts,src/core2/campaign-doors-fold.test.ts

**Notes.** lead: speed. Round four; stacked on core-long-run-closed-race-rows-fold (speed/fold-doors).
