---
id: world-player-jobless-no-offers
title: "A jobless 18-year-old player gets no job offer in a whole year in some towns (Addison, West Virginia; Fort Laramie, Wyoming)"
area: world
kind: bug
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-l9cym2-d
pr:
blocked-on: jobs-no-openings-in-small-towns
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:59:12.245Z
---

**What.** Four drawn towns from the start of the game (the controlled person is a jobless 18-year-old; the seed is `off:0` to `off:3`): Addison (Webster Springs), West Virginia and Fort Laramie, Wyoming made the player no job offer in a whole year; Winchester, Kentucky made 3 by day 240 and 7 by day 365; Falmouth, Maine made 1 by day 56 and 6 by day 365. The player is never a registered seeker (the engine never answers for the controlled person), so an offer comes only when an employer's open position picks them. In a town where positions open rarely or fit poorly, a player who wants work gets nothing to accept. Find why employers in those towns never pick the player (openings, fit score, age band) and give the player a way to find work that is not luck: the same open positions every other jobless adult is matched to should reach the player as offers on the same rule.

**Rules.** The player is never auto-answered, but the engine may offer. One rule for every jobless adult: the seeker's fit and the position decide. No dice. One rule, all 56 places.

**Done when.** In a drawn place and a seed the builder did not choose, a jobless adult player gets at least one offer within 12 weeks whenever a position they fit is open in town, shown by position and offer ids; `src/core2/jobs-player-offers.test.ts` waits only the weeks that takes.

**Files.** src/core2/modules/jobs.ts

**Notes.** Found making `jobs-player-offers.test.ts` reach its case: it used to return silently when no offer came in 8 weeks (it did so in all 8 draws tried), so it never checked that an acceptance is what hires the player. The test now waits up to a year and draws further towns.

**Cause found by reading the code (Oct 17, claude), not built.** The player is considered: each week `runWeek` (`src/core2/modules/jobs.ts`) lets the jobless, working-age player apply to every open position in their place, and `offerToPlayer` fires when they are an opening's best-placed applicant. An employer ranks applicants by `fit`: `jobsFitExperienceWeight` times years in that occupation, plus `jobsFitReliabilityWeight` times reliability, plus a referral term. A new adult has no years in any occupation, so any seeker with experience in the role beats them for that opening, and a town with many counted seekers fills each posting from them. The player gets an offer only when a position opens that no experienced applicant applies to. That is the rule applied evenly (no dice), so the town data shows no defect to fix at the matching step. What is open is a design question for the owner: how a first-time job seeker finds work. The register says the world offers plausible entry-level work and the engine offers, the player decides (`DECISION-REGISTER.md`, job availability and the player's choices). Two ways forward, simplest first: rank an applicant's experience against what the position asks for, so an entry-level posting does not go to the most experienced seeker, or let the player look for work by choosing an employer, which is a play screen. Needs a ruling before a builder changes the fit rule, since it moves every hire in the world.
