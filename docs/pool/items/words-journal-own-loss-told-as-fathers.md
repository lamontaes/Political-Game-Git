---
id: words-journal-own-loss-told-as-fathers
title: "The Journal tells the player's own lost race as a relative's: 'My father lost the race for Selectman.'"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 3 path 6 on main 2e321723d8: New Game in Storrs, Connecticut (replay storrs-1). Emily Carter (person_b83e0bf262b37c19) ran for Selectman and lost November 4, 2025, 223 to 552. On November 6, while her father Raymond Jimenez (person_3e4a6cb26692f00a, who walked doors for her) talks with her about the loss, the Journal toast reads 'My father lost the race for Selectman.' Her father never ran. The line is the bank piece journal.election-other-result.other-lost-the-race ('{other} lost the race for {office}.') in data/english/parts/journal.json, filled with the father as {other}, so the player's own result reached the Journal as someone else's.

**Rules.** One engine per mechanic: the Journal reads the race record's candidate, never the person in the scene. No hand-written player text in code. The player's own result uses the player's own line (I lost the race for ...).

**Done when.** A fresh session replays New Game in Storrs, Connecticut at replay storrs-1 on main, files for the first race, loses with a relative who helped, and the Journal says the player lost, naming no relative as the candidate; the same in two places drawn from all 56 (place and seed named); a test fails when the player's own race is told with a relative as its subject.

**Files.** src/director/, data/english/parts/journal.json

**Notes.** TODO
