---
id: elections-door-pledge-turnout-shown
title: "A race's record shows whether the people who said yes at the door voted more than their neighbors, where a player or a run log can see it"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 1 path 3 on main 2e321723d8: New Game in Murray, Nebraska (3133425, replay 1d3f0e18ca4ba7e5), Emily Carter (person_ea1ae075f260430c) filed for Council member on June 2, 2026, knocked doors every week (Campaigns shows 54 doors after the first evening and 4,105 by November), and won November 3, 2026, 110 to 37, 34 and 4. Path 3 also asks to see the race's record showing that people who promised voted more than their neighbors (17% against 19% before #7163). No screen, no /api/results row and no printed run log carries that comparison: /api/results holds only the player's own ballot reasons (pledge 1.2), and path-check prints the count of door yeses but not their turnout. The comparison exists only inside src/core2/door-pledge.test.ts, which a confirmer cannot count.

**Rules.** This is a game, not a spreadsheet: no new player step; the figure goes where a measurement already prints (path-check's campaign line or the race's results record), not a new screen unless the owner asks. One engine per mechanic: read the campaigns module's pledges table and the voting engine's ballots, never a second count. No dice.

**Done when.** A fresh session replays New Game in Murray, Nebraska at replay 1d3f0e18ca4ba7e5 on main, knocks doors to the election, and reads in a printed log or on a screen the share of door-yes people who voted and the share of other adults who voted for that race; the same line prints in two places drawn from all 56 (place and seed named).

**Files.** src/bench/path-check.ts, src/core2/modules/campaigns.ts, src/bench/election-night.ts

**Notes.** TODO
