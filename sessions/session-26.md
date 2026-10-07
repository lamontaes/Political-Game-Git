# Session 26 — English engine and phrase mining

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
The engine writes every kind of text the owner named (conversation, law wording, winning, losing, judges, notices, news, journal) and grading batches cover all of them.

## Milestones
1. #3008 EP-1e: merge main in, regenerate test-results/dialogue-batch/eng-20261007-ep1e.json, READY (ENGLISH).
2. Notices composer + bank (hearings, ordinances, elections) from record fields; added to the batch generator.
3. Local ordinance moves in the legislation bank so local measures get bill text.
4. Mined banks (data, mergeable): victory/concession, meeting procedure, stump remarks, sentencing, newspaper ledes — one bank per PR.

## Endpoint
A batch with every text kind present (no 'no output' rows) READY for the owner's grading, and ≥4 new mined banks merged-ready.

## CTO instructions and findings (do these)
- OWNER, 10:55 a.m., after grading eng-20261007-ep1c (2 Kill, 4 Rewrite, 1 Good): the situations make no sense and have nothing to do with the game (a 121-year-old grandmother playing a game, asking a former classmate on a date); the lines are terrible and must be rewritten. This is now your FIRST item, ahead of everything else in this file.
- 1. SITUATIONS FROM THE GAME, NOT FROM A MENU: the batch generator must sample real moments that happen in a played/watched world, weighted to what the game is about — filing to run at the clerk's counter, public comment at a council meeting, a council member arguing a bill, door-knocking for a campaign, a reporter's question, a coworker talking about a law that changed their pay, a neighbor about a property tax bill, a landlord about rent rules, election night win/loss remarks, a judge sentencing, a governor signing or vetoing, a legislator's floor speech, minutes and notices. Drop the toy intents (play a game together, ask on a date, generic say hello) from batches. Each item names the real record that produced it.
- 2. NO AUTHORED PHRASE LISTS: the replies are hand-written phrase banks — subject-reply-english.ts (139 fixed parts), legislative-motif-english.ts (82), small-talk-english.ts (59), refusal-english.ts (24; e.g. 'I like how things are between us now.' at refusal-english.ts:164), election-speech-english.ts (22), press-english.ts (11). Replace them with parts mined from real speech (the O2 banks: hearings, briefings, work talk, and the new ones you mine: council meetings, floor speeches, campaign remarks, concessions, sentencing) and compose from the speaker's record (who, role, stake, belief, traits). Delete each authored bank once its mined replacement covers the same moves; the guard test must show the fixed-text count falling.
- 3. NEVER READ RECORD TEXT ALOUD: 'I remember you bringing up “Hopkins County is governed by County board.”' quotes a raw record string (life-reply-english.ts remembered-topic). Compose the topic in plain speech from the record's fields.
- 4. NEWS: front-page lines are record dumps ('Kayla Hill sits on the central bank's board as a governor, and leans toward holding prices down.'; '2 people entered the race for…'). Compose ledes from mined newspaper-lede structure (who did what, where, why it matters to this town), using the record fields.
- Done when: a new batch of ≥40 items, every item a real game moment with its record named, no toy intents, no authored-bank parts (every part traced to a mined source), READY (ENGLISH) for the owner's grading.
- Batch rule: no two items share situation+relationship; every kind appears; 'no output, because…' rows for anything still missing.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
