---
id: director-concession-received-plays-for-the-loser
title: "After a lost race the winner phones the player with the loser's concession, and the Journal says the player was elected"
area: director
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-79vfwq
pr: #9050
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc6-scenes-repeat
source: added with npm run pool -- add
---

**What.** On the morning after the count the player who lost got the call meant for a winner: the winner rang and said the player's own total back ('58 votes. That's what it came to. You earned it.'), offered to stand beside them at the first meeting and congratulated them. The Journal then wrote both outcomes: 'We lost. / So, I was elected to Selectboard member. / Because of that, I didn't win.' This is the end of the golden path's race. Seen: the morning after a lost race, the phone call and the Journal's lines about the result.

**Cause.** Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13). Mar 4, 2025 count Stephen Pugh 116, Sofia Nash 58; on Mar 5 at 8:00 AM the situation type concession-received (src/director/data/situation-types.json, key concession-received) played with Stephen Pugh as its loser role, although its cause match requires the election-result's winnerId to be the subject. The Journal line 'So, I was elected to Selectboard member' comes from the same moment. Not yet traced: whether the match is not applied, or the result record the player's moment reads names the wrong winner (the returns also counted three seats as one race, see play-election-night-counts-three-seats-as-one-race).

**Fix.** Replay the seed to Mar 5, read the election-result record the moment cites (its winnerId and contest), and find which of the two is wrong: the director's causeFacts match for concession-received, or the result record (one per contest). Fix that one place so the call plays only for the winner and the loser hears concession-call. The Journal's result line reads the same corrected fact.

**Time box.** 3 hours

**Rules.** Ask why: name the record the scene cited before and after. One rule, all 56 places: test in drawn places. No hand-written player text: no words change.

**Done when.** A second session plays a new life in a drawn place on main, files for a contested local seat, loses, and on the morning after hears the concession call from their own side (or none), never the winner's call; the Journal says they lost and nowhere that they were elected.

**Waits on.** elections-at-large-count-disagrees-with-per-seat-filing-and-ballot: the count seated the player (top three of a pooled four-name race), which is likely why the winner's call played; re-check after it.

**Files.** src/director/data/situation-types.json

**Notes (Account lead T20, Nov 13).** Cause traced: in a vote-for-N race `holdElection` (src/core2/modules/voting.ts) wrote one election-result per seat and every one named the whole field, so each winner was remembered "elected" once and "lost" on every other seat's record, and the director's `opponent` role (civic-roles.ts) cast the top finisher other than the subject, another winner, as the caller. Replayed on main 48296b91: Dandridge TN (4719380, world seed 619f499e…8237), 3 council seats, each winner elected 1 and lost 2; Newport East RI (4450140, world seed t20:4450140), 5 board seats, elected 1 and lost 4. The single-seat match was right; the record was wrong. Fix on branch claude/project-thread-79vfwq: each seat's record names only its winner (those who missed the cut once, on the race's first seat's), every record carries `outIds`, `race` and `seats`, and the caller, the winner's "lead", the paper's opponent and the results screen read who missed the cut.
