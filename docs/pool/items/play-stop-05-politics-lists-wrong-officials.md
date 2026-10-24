---
id: play-stop-05-politics-lists-wrong-officials
title: "Politics lists three U.S. senators, the wrong congressman, 180 state legislators and no mayor"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Anson, Texas on the v0.22.10 release, Politics → Government listed three U.S. senators for me (Paul Villanueva, Andrew Jackson, John Rodriquez) and Richard Fields, the U.S. Speaker from New York, as one of my two U.S. representatives. The same column then lists every state representative and state senator in Texas, about 180 names. The local view shows five council members and no mayor, and their terms run 28 years (Eden Villarreal, 1999 to 2027) and 16 years (Emma May, 2013 to 2029). Parties shows only the Republican party. I expected my mayor, my council with normal terms, my two senators, my one representative and both parties.

**Rules.** One rule, all 56 places: the representatives shown are the player's own districts read from the place's records, the same way in every place. Estimate, never UNKNOWN: a term or a mayor the data lacks starts from the real pattern, marked as an estimate.

**Done when.** The owner does the same steps on the next build and is not stopped: in a town drawn from all 56, Politics → Government shows the player's mayor, council with plausible terms, two U.S. senators where the place has them, one U.S. representative and one state legislator per chamber, and Parties shows every party holding seats. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/government.ts, src/core2/opening-key-people.ts, src/core2/modules/offices.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:57; screenshots 24, 26. assigned: Gov fixer (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).
