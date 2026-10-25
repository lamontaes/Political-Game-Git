---
id: gov-bribes-in-played-worlds-measured
title: "How often a bribe is offered, taken and reported in played worlds, against real counts"
area: gov
kind: research
priority: 2
size: M
status: claimed
claimed-by: claude/gov-bribes-played-measured
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T15:28:51.689Z
---

**What.** In two drawn bench worlds played 22 months, Cuyamungue Grant, New Mexico (seed b71a31b3cabbf14d) and Lawton, North Dakota (seed 3e7525a63795aa7b), the corruption engine recorded no bribe at all (crimes 0, surfaced 0, reported 0). Bribes start only at contract awards and lobbyist meetings on bills. So the voting engine's scandal term, which carries the exposed-corruption-to-reelection link, never acts in play there, and web-reach-civic has no played witness for it. Small towns may rightly see none; the question is how often a player's places should. Measure the offered, taken, surfaced and reported counts across drawn places of several sizes over a played term, and check them against real counts (for example the Justice Department's Public Integrity Section reports of public corruption prosecutions, scaled by the number of local governments).

**Rules.** Real data checks the simulation and never decides one official's choice: no dice, a bribe stays the offerer's and the official's own decision. Research before building: rates are fetched and quoted. One rule, all 56 places.

**Done when.** A research note under data/research gives the real rate with its source and spread; a played-world measurement across at least four drawn places (seeds named) reports offered, taken, surfaced and reported bribes per place-year against it; and either the counts fall in the real range or a follow-up item names the decision term that keeps them out of it.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/contracts.ts, src/core2/modules/interest-groups.ts

**Notes.** Filed Oct 25 by the effects lead from the civic family's played test (outcome-web-civic-played.test.ts), which reports the corruption chain each run.
