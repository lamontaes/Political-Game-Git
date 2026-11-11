---
id: elections-door-pledge-turnout-shown
title: "A race's record shows whether the people who said yes at the door voted more than their neighbors, where a player or a run log can see it"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-elections-door-pledge-turnout-shown
pr: #8443
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:24:58.766Z
---

**What.** Confirmer replay of Lane 1 path 3 on main 2e321723d8: New Game in Murray, Nebraska (3133425, replay 1d3f0e18ca4ba7e5), Emily Carter (person_ea1ae075f260430c) filed for Council member on June 2, 2026, knocked doors every week (Campaigns shows 54 doors after the first evening and 4,105 by November), and won November 3, 2026, 110 to 37, 34 and 4. Path 3 also asks to see the race's record showing that people who promised voted more than their neighbors (17% against 19% before #7163). No screen, results row or printed run log carries that comparison, and path-check prints the count of door yeses but not their turnout. The comparison exists only inside `src/core2/door-pledge.test.ts`, which a confirmer cannot count.

**Cause.** Found in code: `src/bench/path-check.ts` line 385 prints the count of door yeses (`door yes N`) but not whether they voted; the comparison exists only in `src/core2/door-pledge.test.ts`. Measured: Murray, Nebraska (3133425, replay 1d3f0e18ca4ba7e5).

**Fix.** Print, in path-check's campaign line or the race's results record, the share of door-yes people who voted and the share of other adults who voted, reading the campaigns pledges table and the ballots. No new screen.

**Time box.** 3 hours for one Sonnet session.

**Rules.** This is a game, not a spreadsheet: no new player step; the figure goes where a measurement already prints (path-check's campaign line or the race's results record), not a new screen unless the owner asks. One engine per mechanic: read the campaigns module's pledges table and the voting engine's ballots, never a second count. No dice.

**Done when.** A second session replays New Game in Murray, Nebraska at replay 1d3f0e18ca4ba7e5 on main, knocks doors to the election, and reads in a printed log or on a screen the share of door-yes people who voted and the share of other adults who voted for that race. The same line prints in a drawn place and a second drawn place from all 56 (place and seed named), and the two shares are reported, not judged against a target.

**Waits on.** Nothing.

**Files.** src/bench/path-check.ts, src/core2/modules/campaigns.ts, src/bench/election-night.ts, src/core2/door-pledge.test.ts

**Notes.** TODO
