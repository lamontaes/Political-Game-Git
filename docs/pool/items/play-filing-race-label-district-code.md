---
id: play-filing-race-label-district-code
title: "The clerk's race list shows a district's raw code: 'U.S. Representative (05)' and 'Seat 05'"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** At the filing counter in Oakland, South Carolina (custom world seed lane4-rows-1, Feb 2, 2026) a race reads 'I want to run for U.S. Representative (05).' with the facts 'Seat 05 · November 3, 2026'. The district is the records' padded code, said twice. Seen in docs/play-first/shots/play-stop-race-list-row-heights-differ-when-a-label-wraps/race-list-1440.png.

**Rules.** player-screen-text: no raw codes or unrounded numbers on a play screen. Words from controls or the English engine. One rule, all 56 places.

**Done when.** In a drawn place the clerk's race list and the Campaigns titles name a district as 'District 5' once (placeWords in src/bench/results.ts from #7197 or one shared rule), shown by a screenshot with place and seed.

**Files.** src/bench/government.ts, src/bench/campaign.ts, src/director (the counter's reply line)

**Notes.** lead: Lane 4. Found by Lane 4 on Nov 4 while checking the race list's row heights.
