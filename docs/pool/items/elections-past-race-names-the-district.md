---
id: elections-past-race-names-the-district
title: "A past race's story names its district, or says the seat is at large"
area: elections
kind: feature
priority: 2
size: S
status: claimed
claimed-by: governing/past-race-district
pr:
blocked-on: elections-past-race-votes-from-electorate
source: governing lead, Nov 1 (the district half of elections-past-race-votes-from-electorate, split off at Words' request)
lead: governing
milestone: play-first
claimed-at: 2026-11-01T23:17:06.134Z
---

**What.** The opening paper's archived election stories name the office ("the race for Senator") but not the seat, so fifteen at-large Senate stories in one Virgin Islands paper, or a state's House seats, read alike. The seat's record holds its district (a Census code such as "004" or "12A", or "At-large"). Pass the district from the seat row by `seatId` to the archived election-result story in src/bench/printed-words.ts as its own fact, with leading zeros stripped, or `atLarge: true` instead of it for an at-large seat. Add Words' lines to the news bank: "{name} won the race for {office} in District {district}.", "{name} won the at-large race for {office}.", and the headlines "{name} takes District {district}" and "{name} wins at-large seat". Keep every existing piece without the district as the fallback. Delete the parenthesis strip in `body()`, which no body name needs once elections-past-race-votes-from-electorate has merged.

**Rules.** No hand-written player text: the words come from the bank, and the district from the seat record. One rule, all 56 places: the district is read from each seat's record, never named in logic.

**Done when.** In a drawn place with district seats and in one with at-large seats (places and seeds in the PR body), each past legislature race's printed story names its district or says it is at large, by story and seat id. A piece that needs `{district}` never prints for an at-large seat. Every race still prints. printed-words and grade-reach pass, and the PR carries `Review: words`.

**Time box.** 3 hours.

**You will see.** Last November's races on the first paper name their district, like "District 4", or say the seat is at large.

**Screenshot.** The opening paper's race results before and after, from a drawn place with district seats.

**Files.** src/bench/printed-words.ts, data/english/parts/news.json

**Notes.** Words' wording and instructions, Nov 1, 23:06 and 23:11.
