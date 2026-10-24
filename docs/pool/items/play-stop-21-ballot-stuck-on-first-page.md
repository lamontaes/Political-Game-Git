---
id: play-stop-21-ballot-stuck-on-first-page
title: "The ballot never leaves its first page, so I can't vote in my own race"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On election day, November 3, 2026, on the v0.22.10 release, pressing Day took me to a polling place with a ballot panel showing five races: Tax assessor-collector and four Commissioner races, two of which have no candidate. The ballot holds 25 races (county offices, three Council member races including mine, Mayor, statewide offices, the legislature, U.S. House and U.S. Senate), but the other 20 are paged out. Continue does nothing, before or after marking every race on the page, and sends nothing to the game; the mouse wheel and Page Down do nothing. The game recorded my ballot only for the five visible races. I expected Continue to show the next page and to vote for myself.

**Rules.** This is a game, not a spreadsheet: voting in your own election is a golden-path moment and every race on the ballot must be reachable. One rule, all 56 places: the ballot pages the same way however many races a place has.

**Done when.** The owner does the same steps on the next build and is not stopped: on election day after filing for a local seat, the player can page through every race on the ballot, mark their own race, and the game records a ballot for each race marked. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/polling.ts, src/director/polling-place.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:30, 16:31; screenshots 73, 74-ballot-page-2, 75, 76. Stopper 1 of 3. assigned: Play fixer (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).
