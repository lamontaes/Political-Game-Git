---
id: gov-campaign-day-no-money-small-town
title: "Campaign day raises no money from reachable people (Putney, Vermont)"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/gov-campaign-day-no-money
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T14:39:43.617Z
---

**What.** In a small town the campaign day raises no money from reachable people (Putney, Vermont): the player can run the day but no donor is reachable, so the war chest never grows. The campaign day should draw its donors from the people the town's records actually put within reach, scaled to the town, instead of finding none. Find which reachability rule empties the donor list for a small place and make it read the town's residents and their connections.

**Rules.** One rule, all 56 places: the reachability rule reads place data and counts, never a named town, and a small place gets a smaller but real pool of donors. Sliding scales and causes: who gives money is decided by their means and their reasons, never a threshold that flips at a size.

**Done when.** In a drawn small place and a seed the builder did not choose, a campaign day in the played world (buildBenchWorld) raises money from named donors by person record id, the money lands on the campaign's journal, and a test in src/core2 proves it for Putney, Vermont and one other drawn place.

**Files.** src/core2/campaign-day.ts, src/core2/modules/campaigns.ts, src/core2/campaign-day.test.ts

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).
