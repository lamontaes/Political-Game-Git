---
id: core-long-run-election-and-term-rows
title: "Office terms and every race's returns by place are kept forever, and seating every legislature multiplies them (Kirkman, Iowa)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: speed/fold-election-rows
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T22:53:56.640Z
---

**What.** Since every state's whole legislature is seated as named officials (PR #7020, merged Nov 1), each election adds a term row per seat and a race, result and return row per race, plus a row per race and voting place, and none is ever dropped. In Kirkman, Iowa (key 1941520, seed 905132a2f8984748), four years on main just before and after that merge, records kept rose from 367,386 to 454,608 at year 4 (+24%): offices.terms 782 to 34,145, voting.places 12,492 to 40,971, and voting races, results and returns about 1,300 to about 14,000 each. The gap grows every election year (+397, +34,480, +52,280 and +87,222 records), so a century-long save keeps decades of every legislature's terms and precinct-level returns.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 of a save hold at most 1.2 times the records of years 1 to 4, and old records fold into summaries once play no longer reads them. Folds are built once each reader's window is agreed with its owner (CTO, Oct 30 04:14): the laws lead owns the world's governing, the governing lead owns voting and the player's path. The world has a past (owner): officials keep voting records and the prior election exists, so what running on the record reads must stay.

**Done when.** A reader map names every reader of offices.terms, voting places, returns, results and races with file and line and its window; each owner agrees a window in writing; and a four-year run of the played world (npm run speed:year -- --seed 905132a2f8984748 --years 4, Kirkman, Iowa) on main and the branch keeps dev mode's records proof identical in every table except the folded ones, with records at year 4 within 10% of main before every legislature was seated (367,386 at main cc464cc9ce's first parent) and the row counts in the PR body.

**Files.** src/core2/modules/offices.ts,src/core2/modules/voting.ts

**Notes.** lead: speed. Measured by the speed lead Nov 1, 22:55 UTC (scratchpad u1/before.json and after.json); Merger 0 flagged it on PR #7020.

Nov 1, 23:00 UTC (speed lead): this item resolves the laws lead's registered stopgap SG-GOV-outside-seat-records-unfolded (PR #7020's body: after four years Long Hill, Connecticut kept 1,356,122 records against main's 1,252,886); the fold clears it, so there is one record of the growth, not two. Readers the laws lead named for the map beyond terms and returns: holderOf fill-ins (a met official reads their term rows), the U3 seam of SG-GOV-other-legislatures-not-sitting (other chambers will vote from saved positions), and pastTerms for each office's own state's term limits. The laws lead agrees each reader's window when the proposal lands; the governing lead for voting.

Nov 1, 23:30 UTC (speed lead): reader map and independent check done (read-only, main 24cebf2761; full report in the speed lead's scratchpad u1/election-rows-map.json). Proposal, to agree with each owner before building:
- Terms (laws lead). Never fold: seats that cover the town, the president and vice president, every seat the player or the person played holds or held, and any resident's term. Every other ended term folds at its own seat's next seating (seatTerm, seatWinner), keeping the serving row and the seat's newest ended row, into two new offices tables: seatPasts (one row per seat: each holder's identity once, and per term the original term id, start, end, how reached, how ended, and elected date and share) and careers (one row per filled-in official: lifetime years and the current run's start per office, parties, first start and last leaving, the latest office). One resolver, termById, reads a live or folded term by id for every reader that holds a term id (the card, printed words, the press desk, scenes, recalls, candidate identity, the dev trace); one helper, careerOf, serves the history-by-person readers (term limits, heldOffice, candidate pool, lobbying bar). The office-day trigger counts store writes instead of the table's size. Expected: about 23,000 to 25,000 term rows at steady state against about 27,000 in years 1 to 4; seatPasts entries still grow about 6,400 per even year, to be measured for memory in the long save.
- Voting, other races (laws lead): on each general election day, drop the places and returns rows of outside contests counted before the previous general election, copy each result's votes onto its race row and drop the result, keep every presidential row, and fold a seat's older race rows into its newest seated row as a summary (race count, wins by party, last flip, the previous race's date, winner and votes); a race whose seating is pending is never folded.
- Voting, the played place (governing lead): keep every town result; drop a town contest's returns and places once its town has a newer election night with a result.
- Asks: the lane (the card reading seatPasts and querying by seat, the trace resolving folded ids, /api/results with no places for an old night); Words (printed-words' term reads moving to termById); the CTO (whether a folded id resolving to its seat's summary meets "the trace reaches any table by id"). The laws lead also named the U3 seam of SG-GOV-other-legislatures-not-sitting (other chambers voting from saved positions), which the map did not find a reader for yet; asked.
- Found outside the fold: press-desk.ts holdsHighOffice and printed-words.ts officeOf and termOf read the term named by an official's own id, which has ended after a re-election, so holdsHighOffice returns false for a re-elected official (same flaw in recalls.ts:208-215).
