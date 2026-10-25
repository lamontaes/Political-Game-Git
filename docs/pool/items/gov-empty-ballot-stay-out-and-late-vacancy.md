---
id: gov-empty-ballot-stay-out-and-late-vacancy
title: "Two county races ended with no one on the ballot in St. Johnsbury, Vermont: an incumbent who stayed out and an appointee named after the filing deadline"
area: gov
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** M0-13's 'every race has someone on the ballot' reads 2 of 15 races empty in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4), both on 2025-11-04, and the other two drawn places have none, so it shows by town. Commissioner (contest:seat:gus2025:176534:board:5:2025-11-04): the incumbent person_fc111369cbe5ae65, 25 years old, weighed running on 2025-03-30 (candidacy.decisions row contest:seat:gus2025:176534:board:5:2025-11-04:person_fc111369cbe5ae65, run false; incumbency +3.5, time -0.71, standing 0.88) and all 223 people asked stayed out, so nobody filed and the seat's result has winnerId null with 97 named voters leaving the ballot blank. County treasurer (contest:seat:gus2025:176534:treasurer:0:2025-11-04): the incumbent person_5e422285823e788a was the only filer (filing:contest:seat:gus2025:176534:treasurer:0:2025-11-04:person_5e422285823e788a, on 2025-03-30) and died on 2025-10-17; the governing body appointed person_379274e5d60fcfe5 the same day (term:seat:gus2025:176534:treasurer:0:2025-10-17), 141 days after the 2025-05-29 filing deadline, ballot() in src/core2/modules/elections.ts:806 drops the dead filer, and fileStandingCandidates (src/core2/modules/voting.ts:1132) returns early whenever candidacy is installed, so no one stands for the appointee. Both end with a seat that has a holder and a contest that has no candidate.

**Rules.** No dice: whether an incumbent stands again comes from their age, record, temperament and the seat, never a roll, and a vacancy filled after the deadline follows the place's filing law read from its records. One rule, all 56 places: the filing and vacancy rules come from each place's data, and the fix applies to every office family, not county offices only. An effect is a read: the filing that results is read by ballot() and the result.

**Done when.** In buildBenchWorld in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4), M0-13 every race has someone on the ballot is alive: the Commissioner and County treasurer contests each carry a filing by record id (the incumbent's decision to stand with its reasons, and for the vacancy a filing the place's law allows, or a recorded reason the seat has no election), and two more drawn places show the same check alive or unobserved with their seeds named.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, src/core2/modules/elections.ts

**Notes.** Found Oct 24 by the M0-13 lead's helper. Related and claimed: elections-stand-again-dead-with-candidacy (same early return at voting.ts:1132 means voting.stand-again never runs, which may decide the Commissioner case on its own: read it first). The test comment at tests/golden-path/played-world.node-test.ts:633 says candidacy is calibrated so few adults run; the check is on the ballot, not on challengers, so an incumbent who stays out with nobody else running is the open design question (OWNER DECISIONS NEEDED: may a seat go to an election with no candidate, and who holds it after).
