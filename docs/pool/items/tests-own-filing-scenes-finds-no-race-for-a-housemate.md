---
id: tests-own-filing-scenes-finds-no-race-for-a-housemate
title: "The own-filing scenes test draws places and finds no race a housemate could enter"
area: office
lead: filing-counter
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead builder, Nov 15 (gate of the home-talk race PR, coordinator's request)"
checked:
---

**What.** `src/director/own-filing-scenes.test.ts` ("a housemate's filing is never staged as the player's own") fails with "no drawn place had a housemate's filing reach the player": every one of its 12 drawn places says "no race a housemate could enter". Seed 0a445a1a2f9e285a8b6817b49968076684a8db7b drew Plantation FL, Naples ME, Alamogordo NM, Bensville MD, Filer ID, DeWitt AR, Storrs CT, Springer OK, Washington DC, De Lamere ND, San Luis AZ and I Chenchon MP, and failed the same way on the clean Train head (32a99421) as on a PR that does not touch it. Seen: the changed-file gate of any PR in `src/director` can go red on this test by draw.

**Cause.** Needs cause. The test starts the world at the game start and looks for a race a housemate can enter (`openContests`, `fileCandidacy`) in 12 drawn places; a race is open for filing only on some days of a year and the housemate must meet the age and fee checks (at Sherrodsville the open races failed minimum-age and filing-fee for the player). Whether the first date it tries is before any filing window, or the fee check fails for everyone, is not yet read from the test's own output.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Skills `pinned-tests` and `drawn-place-tests`. The test needs a named place and fixed seed and a staged filing: a place where a race is open and a housemate meets every check on a stated date, the housemate's filing made through the game's own filing (`fileForOffice`), and no loosened assertion.

**Done when.** The test runs at named places with fixed seeds (drawn place and seed named in the PR, for example Sherrodsville, key 3972242, seed "scan-25", and two more named with their seeds), each with a filing staged through the game's own filing, red or green by the code and never by the draw, and a second session reruns it on main and sees the same result.

**Waits on.** Nothing.

**Files.** src/director/own-filing-scenes.test.ts

**Notes.** Found while gating the home-talk race PR (Nov 15). The older item `people-filing-and-loss-scenes-for-non-candidates` (done) is the defect this test guards; this item is the test's own draw.
