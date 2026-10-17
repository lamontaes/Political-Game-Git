---
id: world-player-jobless-no-offers
title: "A jobless 18-year-old player gets no job offer in a whole year in some towns (Addison, West Virginia; Fort Laramie, Wyoming)"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** Four drawn towns from the start of the game (the controlled person is a jobless 18-year-old; the seed is `off:0` to `off:3`): Addison (Webster Springs), West Virginia and Fort Laramie, Wyoming made the player no job offer in a whole year; Winchester, Kentucky made 3 by day 240 and 7 by day 365; Falmouth, Maine made 1 by day 56 and 6 by day 365. The player is never a registered seeker (the engine never answers for the controlled person), so an offer comes only when an employer's open position picks them. In a town where positions open rarely or fit poorly, a player who wants work gets nothing to accept. Find why employers in those towns never pick the player (openings, fit score, age band) and give the player a way to find work that is not luck: the same open positions every other jobless adult is matched to should reach the player as offers on the same rule.

**Rules.** The player is never auto-answered, but the engine may offer. One rule for every jobless adult: the seeker's fit and the position decide. No dice. One rule, all 56 places.

**Done when.** In a drawn place and a seed the builder did not choose, a jobless adult player gets at least one offer within 12 weeks whenever a position they fit is open in town, shown by position and offer ids; `src/core2/jobs-player-offers.test.ts` waits only the weeks that takes.

**Files.** src/core2/modules/jobs.ts

**Notes.** Found making `jobs-player-offers.test.ts` reach its case: it used to return silently when no offer came in 8 weeks (it did so in all 8 draws tried), so it never checked that an acceptance is what hires the player. The test now waits up to a year and draws further towns.
