---
id: tests-own-filing-scenes-finds-no-race-for-a-housemate
title: "The own-filing scenes test draws places and finds no race a housemate could enter"
area: office
lead: filing-counter
kind: bug
priority: 3
size: M
status: merged
standard: 2
claimed-by:
pr: 9467
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead builder, Nov 15 (gate of the home-talk race PR, coordinator's request)"
checked:
---

**What.** `src/director/own-filing-scenes.test.ts` ("a housemate's filing is never staged as the player's own") fails with "no drawn place had a housemate's filing reach the player": every one of its 12 drawn places says "no race a housemate could enter". Seed 0a445a1a2f9e285a8b6817b49968076684a8db7b drew Plantation FL, Naples ME, Alamogordo NM, Bensville MD, Filer ID, DeWitt AR, Storrs CT, Springer OK, Washington DC, De Lamere ND, San Luis AZ and I Chenchon MP, and failed the same way on the clean Train head (32a99421) as on a PR that does not touch it. Seen: the changed-file gate of any PR in `src/director` can go red on this test by draw.

**Cause.** Found in code: `src/director/own-filing-scenes.test.ts` filed on the game's start date (2025-01-20) at drawn places, and no filing window is open then. A probe on Nov 15 found 0 open contests (`openContests`) at Plantation FL, Naples ME and Alamogordo NM on 2025-01-20, 2025-03-21 and 2025-05-20, and on 2025-08-08 at Alamogordo 4 open and 148 eligible person-and-race pairs among 40 adults (only residency unmet, for 12). So it is not a game defect in who may file; the test's date held no race to enter. The old premise: a race is open to enter on the start date at a drawn place. It never held at these places.

**Fix.** The test plays to the first day a race is open (up to 240 days), then the housemates file through the game's own filing (`fileForOffice`), pinned to Sherrodsville, Ohio (key 3972242, seed "scan-25", about 40 seconds). A second place was tried and left out because Alamogordo took about 200 seconds. No assertion loosened; the three expectations (grown pairs share a home, a housemate filed, a filing reached the one at home) are `expect`s instead of a pass-by-draw.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Skills `pinned-tests` and `drawn-place-tests`. The test needs a named place and fixed seed and a staged filing: a place where a race is open and a housemate meets every check on a stated date, the housemate's filing made through the game's own filing (`fileForOffice`), and no loosened assertion.

**Done when.** The test runs at a drawn place pinned by name and fixed seed (Sherrodsville, Ohio, key 3972242, seed "scan-25") in under a minute, with the housemates' filings made through the game's own filing, red or green by the code and never by the draw, and a second session reruns it on main and sees the same result.

**Waits on.** Nothing.

**Files.** src/director/own-filing-scenes.test.ts

**Notes.** Found while gating the home-talk race PR (Nov 15). The older item `people-filing-and-loss-scenes-for-non-candidates` (done) is the defect this test guards; this item is the test's own draw.
