---
id: campaign-door-yes-is-their-choice
title: "A door yes goes to the one candidate the resident would vote for, one a race"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: governing/door-yes-is-their-choice
pr:
blocked-on:
source: governing lead, Oct 30 (Price UT measurement, runner A)
lead: governing
claimed-at: 2026-10-30T06:54:07.029Z
---

**What.** Residents said yes at the door to every candidate who knocked, because a warm visit was the yes. In a Price, Utah path-check run, 1,259 of the 1,462 counted residents' pledges went to the player's rivals and 40 of 163 full people's did too, so the near-binding yes from campaign-door-yes-near-binding counted for whoever knocked most, not whoever the voter preferred. A real voter tells one candidate they have their vote, the one they would vote for now; a later yes to someone else takes the first one back.

**Rules.** No dice: the answer is the voter's own appeal by the ballot's rule (countedChoice of appealFor or countedAppeal), their earlier word included, so a yes is hard to win from a voter already pledged. One model, two tiers: full people and counted residents answer by the same rule. One engine: the voting engine registers the reader with the campaigns module, as it already does for ward residency.

**Done when.** src/core2/door-pledge.test.ts passes in a drawn place with the seed it prints and checks that every resident met holds a pledge to the knocking candidate exactly when doorChoiceOf names that candidate, that no resident holds pledges to two candidates in one contest after the rival knocks, and that every pledge to the rival names the rival as the voter's choice.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/door-pledge.test.ts

**Notes.** TODO
