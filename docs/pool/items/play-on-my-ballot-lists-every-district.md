---
id: play-on-my-ballot-lists-every-district
title: "Elections → On my ballot lists every district's seat on the board (Commissioner District 1 to 7), though a voter lives in one (Hewitt, New Jersey; Joseph City, Arizona)"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Hewitt, New Jersey, seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0; Joseph City, Arizona, seed 3bb11757-b22e-4a8d-b6c4-7259e5c84834)
---

**What.** On main, Politics → Elections → On my ballot in Hewitt, New Jersey (seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0, Commissioner Andre Roberts) lists "Commissioner (District 1)" through "Commissioner (District 7)", then the township committee, assessor, clerk, treasurer and sheriff. In Joseph City, Arizona (seed 3bb11757-b22e-4a8d-b6c4-7259e5c84834, Supervisor Anna Williams, District 1) it lists "Supervisor (District 1)", "(District 2)" and "(District 3)" for November 7, 2028. A voter votes for the one seat whose district they live in. Seen: On my ballot lists only the races the player's own ballot will hold.

**Cause.** Found in code: `localRaces` in `src/bench/government.ts` (line 397) takes every contest of a local level on the next election date (`LOCAL_LEVELS.has(contest.level) && contest.electionDate >= core.date`) and never asks whether the viewer's home is in the contest's district. The voting engine already places each household in a ward and reads a contest's `district` against it (`candidateInWard` and `wardMap` in `src/core2/modules/voting.ts`, line 2900), but only for candidates.

**Fix.** Export from `voting.ts` one reader, built on `wardMap`, that says whether a person's home is in a contest's ward (true for an at-large seat or where the town has no wards, as now). `localRaces` keeps a districted contest only when the viewer's home is in it. A test draws a place whose board has districts and checks that On my ballot holds exactly one seat of that board.

**Time box.** 1.5 hours

**Rules.** One rule, all 56 places: the filter reads the contest's district and the ward map for any body with districts, never a named board. An effect is a read, not a record: the one ward map the candidates are read from is the one the screen reads.

**Done when.** The new test passes in two drawn places, and a second session sees, on the bench on main, a drawn Advanced start in a place whose county board has districts, with On my ballot showing one district's seat (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/government.ts, src/core2/modules/voting.ts

**Notes.** The polling place's ballot does list every district too. Seen Nov 13 on main 596d5127 in Polonia, Wisconsin (seed f16d7fc3-47fe-4728-bc01-a3bae3c02f07), the Portage County spring election of April 7, 2026: "15 races are on the ballot", and the ballot begins "FOR COMMISSIONER / LEAVE BLANK / FOR COMMISSIONER / VIVIAN DOMINGUEZ / LEAVE BLANK / FOR COMMISSIONER / SAM PARKER / ..." (one race per district, the first with no candidate at all). `contestsOn` in `src/director/polling-place.ts` takes every contest on the date, so the Fix's one reader must serve the ballot (and the count of who may vote in each district) as well as On my ballot.
