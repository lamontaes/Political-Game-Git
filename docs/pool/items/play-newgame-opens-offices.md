---
id: play-newgame-opens-offices
title: "newGame never opens offices, so a saved game's pre-start history has no seats"
area: play
kind: bug
priority: 3
<<<<<<< HEAD
size: L
status: open
claimed-by:
pr:
blocked-on:
source: "found while building gov-prestart-history, Oct 19"
=======
size: M
status: claimed
claimed-by: claude/newgame-opens-offices
pr:
blocked-on:
source: "found while building gov-prestart-history, Oct 19"
claimed-at: 2026-10-19T23:01:04.180Z
>>>>>>> 0965781d8f809d4c17c2dcb9ea9810d6a5404447
---

**What.** `openOffices` is called only by the bench world builder (src/bench/world.ts), not by `newGame` in src/core2/saves.ts, which /play and saves use. A game started that way has no offices, so the government pre-start pass finds no terms and writes no seat-reached records. Open the offices in `newGame` before the pre-start run.

**Rules.** Wire to the world. One rule, all 56 places. Replace, never layer: one way to open a world.

**Done when.** A game from newGame in a drawn place lists office.seat-reached records through preStartHistory, in src/core2/pre-start-government.test.ts, with the place and seed named.

**Files.** src/core2/saves.ts, src/bench/world.ts

<<<<<<< HEAD
**Notes.** Looked at Oct 19: it is bigger than one call. The bench builder (src/bench/world.ts, lines 325 to 350) installs the people modules, the outcome web and the director, then opens laws, offices, officials, elections, campaigns, parties, voting, the record and budgets in order; `newGame` installs only WORLD_MODULES. Opening offices alone would fail without laws and officials. The real fix is one world builder for the bench and for /play and saves (M6-01), split by the claiming session. The government pre-start test builds the bench world and runs the pass on it for now.
=======
**Notes.** The government pre-start test builds the bench world and runs the pass on it for now.
>>>>>>> 0965781d8f809d4c17c2dcb9ea9810d6a5404447
