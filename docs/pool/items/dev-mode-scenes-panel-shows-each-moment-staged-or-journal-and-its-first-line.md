---
id: dev-mode-scenes-panel-shows-each-moment-staged-or-journal-and-its-first-line
title: "Dev mode cannot show why a moment became a scene or a Journal line, or which first line it got"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: 'Owner, Nov 16 00:59Z ("all this stuff that you''re tracing, if it''s not already being traced by the dev mode, it should be"), relayed by the Account lead; election-results thread''s traces of Nov 15 and 16'
---

**What.** Every count the election-results thread made on Nov 15 and 16 needed a script outside the game: which of the player's moments were staged as scenes and which became Journal lines, why a moment was not staged (`closed`: not met in time, no one there to speak, nothing to say past its opener), and which first line each staged scene opened on, from which cause record. Dev mode shows none of it. Its Scenes panel lists situation types and what dev mode can do for each, and its waiting list shows only scenes still waiting. Seen: the plain-first-lines count (/mnt/project-files/election-results/plain-first-lines-count.md) took a 120-day scripted run at two places to answer what a dev-mode list would show in the game.

**Cause.** Found in code: no dev route reads the director's ledger schedule. `src/bench/dev-api.ts` serves `GET scenes` (types, `DevMode.scenes`), `GET waiting-scenes` (`director.waitingScenes`, still waiting only) and `GET scene-cast`. The schedule rows the ledger keeps per moment (`outcome` scene-now, scene-waiting or journal-line, and `closed` from `waitingStop` in `src/director/data/director.json`) are read only by the director itself. The first line's piece is chosen in `src/director/scene.ts` (the arrival render, through `wordSceneLine` and `renderGroundedEnglish`), which returns its text and source record ids but not the piece key that was picked. The held view's why rows (`src/bench/play.mjs` `whyRows`) show the cause for a staged talk only.

**Fix.** One read-only dev route over the records the director already keeps, with no second copy: `GET moments` gives the player's schedule rows for a date range (moment id, cause kind and record id, situation type, outcome, `closed` reason as written). For a staged scene, it also gives the first line's piece key and the facts that filled it. To return the key, `wordSceneLine` passes back the key `renderGroundedEnglish` already picks. Dev mode's Scenes panel (`src/bench/ui/dev-scene.mjs`) lists them under the calendar, with counts by outcome and by `closed` reason, in worded labels (`player-screen-text`). The election-results recount (0 of 24 shown scenes opening on a plain home line) can then be read in the game at Sheridan, Wyoming (5669845), seed 7, without a script.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** An effect is a read, not a record: the route reads the ledger's own schedule rows and the render's own pick, and keeps nothing of its own. No hand-written player text in code: the panel's labels come through worded labels, never raw kinds or ids. Review: words.

**Done when.** A second session, on main, opens dev mode at a drawn place named with its seed, plays 60 days, and reads in the Scenes panel each moment's outcome and reason and each staged scene's first-line piece. The counts there match a scripted read of the same life.

**Waits on.** Nothing.

**Files.** src/bench/dev-api.ts, src/bench/dev-mode.ts, src/bench/ui/dev-scene.mjs, src/english/scene-words.ts, src/director/scene.ts

**Notes.** None.
