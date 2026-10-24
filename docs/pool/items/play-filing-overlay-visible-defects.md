---
id: play-filing-overlay-visible-defects
title: "The filing counter's overlay shows rule ids as labels, runs off the screen and sits under the news card; U.S. Senator is offered twice"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-filing-overlay
pr: #5888
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T05:03:24.768Z
---

**What.** Played in the bench on main ddcca36444 in The University of Virginia's College at Wise, Virginia (place key 5178264, seed 3f8aeef952bba5311b6380863c3ceca61588e758d27ebd1d18be83e968697640), at 1440 by 900. The filing overlay labels its checks with raw rule ids (FILING-DEADLINE, ALREADY-FILED, MINIMUM-AGE) and shows Deadline twice. Its platform list runs past the bottom of the screen. The news card covers the overlay's title (GOVERNO…). At the state counter the player is offered 'I want to run for U.S. Senator.' twice, with nothing to tell the two contests apart.

**Rules.** No hand-written player text: the labels come from the controls data or the English engine, never typed into the screen. Wire to the world: the two Senate contests are told apart by their own records (class, special election or date).

**Done when.** In Wise, Virginia (seed above) the overlay's checks read as words from data, fit the screen without covering or being covered, and the two Senate choices differ by their records; a browser check in src/bench walks the counter and a screenshot with place and seed is in the PR body.

**Files.** src/bench/play.mjs, src/bench/filing.ts, src/bench/data/controls.json

**Notes.** Found by the M0-M2 lead playing M2-03, Oct 24. Blocks roadmap M2-03's flag.
