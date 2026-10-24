---
id: play-stop-24-every-statewide-race-unopposed
title: "Every 2026 Texas statewide race is an unopposed Republican, with totals that disagree"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release, the November 3, 2026 results in Texas show U.S. Senator, Governor, Lieutenant Governor, Attorney General, Comptroller, Land Commissioner, Agriculture Commissioner, Railroad Commission, my state senator and state representative all "UNOPPOSED", each won by a Republican with about 4.15 million votes. No Democrat or other party ran for any of them. The U.S. Representative (19) result reads "113,807" in its header and "TX-19 Joe Richardson · 213,727" under it. Every race shows "Turnout 50 / 138" and "You —". On my own ballot two of four county commissioner races had no candidate at all. I expected contested statewide races and one total per race.

**Rules.** No dice: who files comes from people's traits, parties and money, so a major party fielding no one statewide needs a cause. One rule, all 56 places: candidate entry and the results screen work the same in every place.

**Done when.** The owner does the same steps on the next build and is not stopped: in a drawn state's first general election, statewide races draw candidates from more than one party where the place has them, each race shows one vote total, and the turnout line says what it counts. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/results.ts, src/core2/modules/world.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:30, 16:33; screenshots 73, 79, 80-results-page-1 to 3.
