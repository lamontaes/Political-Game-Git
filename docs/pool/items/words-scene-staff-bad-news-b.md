---
id: words-scene-staff-bad-news-b
title: "Bench screenshot: an aide brings the player a story that runs against them"
area: words
kind: feature
priority: 1
size: S
status: dropped
claimed-by:
pr:
blocked-on:
after: play-officeholder-hires-aide
source: added with npm run pool -- add
---

**What.** The second half of words-scene-staff-bad-news. Once the player can hire an aide (play-officeholder-hires-aide), a player who holds a seat and has an aide gets the staff-news scene when a printed story runs against them or their bill, from words-scene-staff-bad-news-a. This item plays it in the bench and captures it, and fixes whatever the screen shows wrong.

**Rules.** No hand-written player text: the screen shows the scene's bank lines and control names only. Ask why: the caption names the story record and the outlet the scene cites. One rule, all 56 places: the place is drawn, and the place and seed are named under the screenshot.

**Done when.** In the bench, in a drawn place with its seed named, a player who holds a seat and has hired an aide is brought a printed story that runs against them or their bill by that aide, who names the outlet; a bench screenshot at 1440x900 with the place and seed under it shows the scene, and the story record id is named in the PR body.

**Files.** src/bench/play.mjs, docs/play-first/screens/

**Notes.** TODO

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, replaced. A bench screenshot of a built scene is replaced by the acceptance rule in AGENTS.md ("Done means a second session saw it in the game") and the seen-in-game skill. Its only dependency, play-officeholder-hires-aide, is still open and carries the aide.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): replaced by a design or ruling (named in the Notes above).
