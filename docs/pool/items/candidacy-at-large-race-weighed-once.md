---
id: candidacy-at-large-race-weighed-once
title: "A would-be candidate weighs an at-large race once, with the whole field, not each seat apart"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Since an at-large race is counted as one (elections-at-large-race-pooled), its seats' fields add up: in Jericho, Vermont (replay 6f539fcfdf6d96f9-5) 12 candidates ran for three selectboard seats in March 2026 and more than 17 in March 2027. Candidacy (src/core2/modules/candidacy.ts weighContest) still weighs each seat's contest apart, and a runner lowers the pull (candidacyFieldWeight) only for their own seat, so each seat draws three or four.

**Rules.** One rule: the field term counts everyone running in the race (every seat of the at-large group), per seat, so a three-seat race with three runners reads as one with one a seat. No dice; real shares check totals (the uncontested share, unit 5).

**Done when.** In Jericho, Vermont and two drawn places with at-large races (named with seeds), the number of candidates per seat in an at-large race is no more than in a single-seat race of the same town, by contest ids and filing counts, and the test fails when the field term reads one seat only.

**Files.** src/core2/modules/candidacy.ts

**Notes.** Filed by Lane 1, Nov 4, from #7269.
