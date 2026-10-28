---
id: elections-night-null-for-voter
title: "Election night is null for a player who voted: election-day.test fails on main in drawn Connecticut towns"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/elections-night-for-voter
pr: #6632
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T15:26:04.693Z
---

**What.** src/bench/election-day.test.ts fails on clean main: electionNight(core, playerId) returns null after the player votes, because electionResults (src/bench/results.ts) finds no race on the newest night that is the player's or carries ballot.voted. Reproduced on main: Canaan, Connecticut (0910870), seed aeeca931fade0e61:0; North Granby, Connecticut (0954660), seed 0a54c3dcd64e7501:1, race contest:seat:gus2025:211229:board:0:2025-11-04.

**Rules.** Fix at the root in the reader or the ballot record, never by loosening the test. One engine per mechanic: the voted mark is the voting engine's ballot row.

**Done when.** GOLDEN_PATH_SEED=aeeca931fade0e61 and 0a54c3dcd64e7501 both pass src/bench/election-day.test.ts on the PR, and a third drawn seed named in the PR body passes in a played world with the ballot record id the night read.

**Files.** src/bench/results.ts,src/bench/election-night.ts,src/core2/modules/voting.ts

**Notes.** Found by wire-elections-and-campaigns (PR 6614 body). Read: OWNER-DECISIONS (Oct 28), searched pool for election-day, election night, electionNight.
