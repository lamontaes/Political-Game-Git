---
id: elections-at-large-race-pooled
title: "A local body's at-large seats up on one day are one race: each voter votes for up to that many, the top finishers are seated"
area: elections
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: governing/at-large-pooled
pr: #7269
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T16:08:44.662Z
---

**What.** Each at-large seat of a town council or board is its own contest with one winner, so the player is offered only the first at-large seat's contest and files for that seat (stopgap SG-GOV-at-large-race-one-contest in src/core2/modules/elections.ts). In a real at-large election every candidate files once for the race, each voter may vote for as many candidates as there are seats, and the top finishers take the seats. Today a challenger who files for seat 1 meets that seat's holder head on and cannot win one of the other seats with the second-highest vote, which makes the race harder than the real one and wrong on the ballot the player sees.

**Rules.** One engine per mechanic: the one elections and voting engines count the pooled race; the seat count and method come from the body's data row, never a per-place path. No dice: each voter's several votes go by the same appeal rule as one vote, counted records split by the same share rule times their count. One rule, all 56 places: proven in drawn places whose councils are elected at large. Replace, never layer: the per-seat at-large contests and the stopgap are deleted.

**Done when.** In three drawn places whose council is elected at large (named with seeds), the council's seats up on one day form one contest; the player and the world's candidates file once for it; the tally gives each voter up to the number of seats in votes; the top finishers are seated in the offices engine, read back by record id; the stopgap SG-GOV-at-large-race-one-contest is deleted; a test fails when the race is split back into one contest per seat.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/modules/candidacy.ts

**Notes.** TODO

Nov 4 (Lane 1, design before building): 84 reads of a result's winnerId across 19 files (bench, director, press), so one contest with several winners would touch three lanes. The design that keeps every reader unchanged: the at-large seats up together stay separate seat contests, each with one winner, but they share one field (a filing for any of them counts for the race) and one count (each voter gives up to as many votes as there are seats, by the same appeal rule; counted records split by the same share rule), and the top finishers are assigned to the seats in order. The parts to change are holdElection's choice (a voter's top N instead of one), the player's chosen ballot (up to N picks), the counted split, pledges and the exit poll. It is several steps of about 400 lines, after unit 1b.

