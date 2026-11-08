---
id: dev-mode-move-dev-page-controls-into-game
title: "Give the old /dev page's remaining controls a home on the game's screens, then delete the page"
area: play
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Dev mode now lives in the game for run until, memory, bills at every body, bribes and the loan cap, but src/bench/dev.html, dev.mjs and the dev routes still hold set a law directly, choose a person's next decision, trace any record, the person view with money, job, views, health and drives, watch the world and saved experiments. Each needs a home beside what it acts on (Issues, the person card, the calendar), driven through the same routes. When every control has one, the page, its files and every reference to it are deleted in the same change.

**Rules.** Replace, never layer: the page and its controls are deleted in the change that gives them a home, and the PR counts what was removed.

**Done when.** In a drawn place, each control the old page had works from a game screen with dev mode on, a search of src and docs finds no reference to /dev or dev.html, and a screenshot names the place and seed.

**Files.** src/bench/dev.html, src/bench/dev.mjs, src/bench/dev-api.ts, src/bench/play.mjs

**Notes.** TODO
