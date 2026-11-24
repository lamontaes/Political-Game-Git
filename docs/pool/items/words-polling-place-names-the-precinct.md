---
id: words-polling-place-names-the-precinct
title: "Election morning says where the voter votes: the building, the precinct and who works the polls, from the polling place record"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/director-polling-place
pr: #8132
blocked-on:
lead: words
milestone: play-first
source: "polling-place read as never firing in a played year; it plays, but through the bench player's election-day stop, which scene-year.ts does not count, and its words never named the polling place"
claimed-at: 2026-11-10T11:00:00.000Z
merged-at: 2026-11-10T19:41:44.738Z
seen-by: second-session-2
seen-at: 2026-11-11T02:00:09.995Z
---

**What.** polling-place is not a schedule entry by design: at the close of the eve the director stages a ledger visit (polling-place.ts, `stagePollingVisits`), the bench player stops at the polls (`player.pollingPlace`), and the screen draws the ballot (bench/polling.ts) under the election-day narrator (election-night.ts `electionDay`). So the scene plays, by a path scene-year.ts does not count. Its words, though, named only the town: the visit carried the voting engine's polling place and poll workers (`pollingPlaceId`, `pollWorkerIds`) and nothing read them. `electionDay` now reads the voting engine's polling place record for the voter and says, from it, the building ("You vote at the Town of X offices, in precinct 2." or "Your polling place is the Town of X offices."), the precinct where the town has several, and one of the people working it ("Raymond O'Neill is working the polls at your precinct."), each line citing the polling place record. A place whose record holds no building yet (the registered stopgap SG-GOV-polling-place-kind) still says the precinct and the worker.

**Done when.** src/bench/election-day.test.ts, in a drawn place with the player filed, reaches election morning through the bench player and finds the morning naming the polling place's building and precinct (where the record holds them) and a poll worker, citing the polling place record.

**Files.** src/bench/election-night.ts, data/english/parts/scene-talk.json, src/bench/election-day.test.ts

**Time box.** 1 hour.

**You will see.** On election morning: "You vote at the Town of X offices, in precinct 2. Raymond O'Neill is working the polls at your precinct."

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn seed 50ec6d6e1ac4 (test world), seed 50ec6d6e1ac4, main 32a6683b: election-day.test.ts passed on a fresh seed, reaching election morning through the bench player
