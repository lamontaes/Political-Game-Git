---
id: gov-rival-day-test-picks-a-statewide-candidate
title: "The rival's campaign-day test fails by draw when its candidate runs in a statewide race (Hayfield, Virginia)"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: account lead sweep, Nov 14 (Measured: the carry of #8516 against the clean train at one pinned place)
standard: 2
model: sonnet
effort: medium
root: none
checked:
---

**What.** `src/core2/rival-campaign-day-played.test.ts` draws a place and takes the first world candidate on a ballot with an event and an interview on offer. When that candidate runs for a statewide office, the test's "the rich turn holds the event" line fails ("expected null to be 'event'") even though the day's plan is an event. It fails on some draws and passes on others, with no change in the code, so a red there says nothing about the campaign engine. Seen: a rival's campaign day on a statewide race, where the town hears of an evening event only when the town's share of the race has built up to one.

**Cause.** Measured: place Hayfield, Virginia (5135912), place seed `9ef69bf9b9f5a4ebc1b139d323419e9f51bd165797c008f8692f1b741a9fc0b8`, twoLevel world played to 2025-02-19. The world candidate there files for attorney general. With the bank set rich, `rivalDay` returns act `event` (callHours 0.158, doorHours 0.394, actHours 3), and `campaignTurn` returns `dayAct` null, on the train at ee82407b5d with campaigns.ts as on the train and again with the #8516 carry. In `campaignTurn` an event is taken only when `heldInTown` (`src/core2/modules/campaigns.ts`) says so, and for a race the town is only part of it holds an event once the town's share of the race (`townShareOfRace`, under 1) has added up to one, so the first turns hold none.

**Fix.** Make the test pick a world candidate in a race the town is the whole of (`townShareOfRace` equal to 1), or stage the credit the way the engine builds it (run turns until `townEventCredit` reaches one), and name the choice in the failure message. Do not change `heldInTown`: its share rule is the speed fix of Nov 8. Pin the test to named places with their place seeds, one town race and one statewide, per `drawn-place-tests`.

**Time box.** 2 hours, Sonnet.

**Rules.** No dice. A retry over fresh seeds is still a draw. Never loosen the line "the rich turn holds the event" for a town race.

**Done when.** A second session runs the test at Hayfield, Virginia (seed above) and at a town-race place in a played world built with buildBenchWorld, sees each pass by its place seed with the failure message naming the place, and sees the test fail when `heldInTown` is made to return false for a town race.

**Waits on.** Nothing.

**Files.** src/core2/rival-campaign-day-played.test.ts

**Notes.** Nov 14 (account lead): found while carrying #8516, where two of six draws failed; the clean train fails at the same place, so the carry did not cause it.
