---
id: tests-campaign-turn-cases-fail-on-drawn-places
title: "Three campaign-turn cases fail on clean main in some drawn places (a turn asks no one, no event offered, an ad reaches no one)"
area: elections
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/campaign-turn-draws
pr: #6344
blocked-on:
source: laws-and-effects lead, Oct 27 (changed-file tests of campaigns-local-platform-budget-lines)
claimed-at: 2026-10-27T15:50:28.906Z
---

**What.** `src/core2/campaign-turn.test.ts` fails on clean main (88bdea10f4) in three of five fresh runs, each a different case, each reproduced with the same `GOLDEN_PATH_SEED` on main and on the platform branch. "A world candidate's turn is a campaign day taken through the player's own choices" asks no one for money in Miller, South Dakota (4642460, seed c309b8ddbc38aa36d771e3a83be4c4054aec68d5ccf695bd915f18c9cc23947b): "expected 0 to be greater than 0". "A rich rival holds an event on a day it is offered" finds no event offered in Londonderry, Vermont (5040150, seed 1185bef2c956d421f00ba41feef01ad37712f029a36c2a04ad0e4ae188de24be), although its seats there list 12 and 3 positions. "An ad is a message the views engine reads" reaches no one in South Woodstock, Vermont (5069250, seed d404056ccd9a86cb48c4c67d343ecf83a2d4cdf92fcaeb0442674a31a7871545).

**Rules.** Never skip, disable or quarantine a case. One rule, all 56 places: a case that needs a candidate with someone left to ask, a platform or an outlet draws again until it has one and names the place and seed when it runs out, as the case below it already does for calls and doors (Simsboro, Louisiana).

**Done when.** Each of the three cases names, by record, why it fails in its place above (nobody left to ask, an empty campaign platform, no outlet in town or another cause read from the records), the case draws again where the place lacks what it tests, and the file passes on the three seeds above and three fresh seeds named in the PR body.

**Time box.** 2 hours, any fixer or the laws-and-effects lead.

**Files.** src/core2/campaign-turn.test.ts, src/core2/campaign-day.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27. Five runs on fresh seeds: two passed, three failed one case each, all on main too.
