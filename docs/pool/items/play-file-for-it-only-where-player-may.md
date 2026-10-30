---
id: play-file-for-it-only-where-player-may
title: "Campaigns offers File for it only on races the player may run for"
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

**What.** Politics then Campaigns offered File for it on every local race whose filing was open, including circuit clerk, county commissioner, coroner and sheriff, which the player may not run for (owner, Oct 29: the player runs only for the place's council or its equivalent, mayor, state legislature, governor, Congress and president). Clicking it on such a race opened nothing, because the filing office refuses the player there. The CTO found it in Winfield AL, seed 336f2b4d-ecd7-477a-a113-7d862361e154, and campaigns-ballot.browser.mjs failed at that step on clean main.

**Rules.** One engine per mechanic: the screen reads the one filing rule (playerMayFileFor, player-offices.json) through a field on the race row instead of a second list in the screen. One rule, all 56 places: the field comes from the place's own office kinds in data.

**Done when.** src/bench/local-races.test.ts passes in a buildBenchWorld drawn place with the seed it prints, asserting each local race row's playerMayFile equals playerMayFileFor for that contest; the Campaigns screen and campaigns-ballot.browser.mjs offer File for it only where it is true.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/campaigns-ballot.browser.mjs, src/bench/local-races.test.ts

**Notes.** TODO
