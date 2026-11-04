---
id: screens-loading-worth-watching
title: "Loading is worth watching: the town's past years with their headlines, your life's journal writing itself, the map filling in"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Loading is a bar and a status line (src/bench/play.mjs startLife). Path 3 (docs/lanes/lane-4.md): New Game, Storrs; see the journal writing itself, a year counter with headlines, the map filling in. The world's past (openThePast: elections, laws, the news archive) and the player's life story exist about a second before the build ends; the server then spends several more seconds drawing the first scene and faces.

**Rules.** Every line from records: archive headlines worded by wordArchiveStory, the player's history from personCard's story lines, the map from governmentMap. No staged screenshot, no invented history. Fits 1440x900, 1280x800 and 1024x768 with no scroll. Replace, never layer: the bar and line are kept only as the frame.

**Done when.** New Game in Storrs, Connecticut (0973980) shows, while it loads, a year counter stepping through the past's years with that year's headlines, the player's life lines appearing one by one, and the state's districts filling in, all from the built world's records (a test checks each headline and line against its record id); screenshots at three sizes with no overflow.

**Files.** src/bench/handler.ts, src/bench/world.ts, src/bench/play.mjs, src/bench/play.css, src/bench/loading.ts

**Notes.** lead: Lane 4 (unit 5). Card in docs/lanes/state/lane-4.md.
