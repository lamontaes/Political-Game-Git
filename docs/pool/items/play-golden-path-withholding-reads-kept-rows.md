---
id: play-golden-path-withholding-reads-kept-rows
title: "The played-world tax check (M0-13) fails whenever nobody the player knows is paid after January 1"
area: play
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/withholding-kept-rows
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T06:53:48.934Z
---

**What.** tests/golden-path/played-world.node-test.ts checks that taxes are withheld after January 1 by reading the budgets withholding table. src/core2/modules/budgets.ts postWithholding keeps that row only when keepsWhy (src/core2/why-kept.ts) holds for the payer, which means the player, their household, family, known people or focus people, while the journal entry for the withholding is posted for every paycheck. So the check fails on main in any world where nobody in the player's circle draws a taxed paycheck in January: Casa Colorada, New Mexico (place key 3512786, seed 1a17f2abcf6871f10c19f20fc75f174095a8c43f90f6ecfcf8d937ea8720945c) shows 0 kept rows after 2026-01-01 on main 0ba492e67f, and labor's PR showed the same in Huson, Montana when one worker never joined the circle.

**Rules.** Do not keep withholding rows for everyone in play (bookkeeping is a debug switch). Read the posted journal entries whose source kind is the withholding kind, or another record every paycheck writes. Do not narrow the check or skip worlds.

**Done when.** M0-13 passes on main in Casa Colorada, New Mexico (place key 3512786, seed 1a17f2ab…945c) and still fails when the starting tax rows are removed from src/core2/data/laws/starting-law.json.

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** TODO
