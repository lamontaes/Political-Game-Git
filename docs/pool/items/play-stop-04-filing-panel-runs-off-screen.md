---
id: play-stop-04-filing-panel-runs-off-screen
title: "The filing panel runs 2,200 pixels off the bottom, so party and positions can't be set"
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

**What.** At the city secretary I chose "I want to run for Council member." and a side panel opened with the filing rules, about 50 statewide issues each with For and Against, and a PARTY picker. On a 1440 by 900 window the panel is 3,117 pixels tall, does not scroll, and the mouse wheel does nothing, so the party picker (about 3,000 pixels down) and every For or Against button are out of reach. Filing went through with party Republican, the picker's default, which I never saw; the campaign record shows a platform of three positions I never chose. I expected to pick my party and my stands before filing.

**Rules.** This is a game, not a spreadsheet: choosing a party and a platform is the player's act at filing and must be reachable. Ask why: a platform the player never set must not be recorded as their stand.

**Done when.** The owner does the same steps on the next build and is not stopped: on a 1440 by 900 window the filing panel scrolls or fits, the party picker and each issue's For and Against can be reached with the mouse, and the filed party and platform match what was picked. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/play.css, src/bench/play.mjs, src/bench/filing.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:03, 16:04; screenshots 44, 45.
