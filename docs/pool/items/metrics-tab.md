---
id: metrics-tab
title: "Metrics tab: the world panels as plain numbers, this year beside last"
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

**What.** The approved Metrics tab (RULINGS-nov5 #23, like The Political Process's Metrics page) shows how the place is doing: City, State and Nation sections, each with categories (economy, jobs, housing and evictions, benefits, health, budget), each figure this year beside last year with 'since last year ... up/down ...'. It reads /api/world-panels (national, region, evictions, benefits, owners and building as housing, metrics); the turnover, bank, lawCosts and board panels are developer panels and stay out of the player's tab.

**Rules.** Serves RULINGS-nov5 #23 and the 2:10 playtest ruling: plain numbers, no charts, bars or pagers. Read the panels, compute nothing in the screen (screen-to-mock; one reader). Words come from controls.json labels and the bank; numbers through the shared money and number words, rounded. Replace, never layer: the tab reads the existing world panels and adds no second reader of the same numbers.

**Done when.** In a drawn place's played game, a Metrics tab opens with City, State and Nation sections of plain numbers, each this year beside last year, with no charts or bars and no developer panels, shown by a screenshot naming the place and seed; a browser check fails if a chart, bar or turnover/bank/lawCosts/board panel appears.

**Files.** src/bench/play.mjs, src/bench/economy.ts, src/bench/data/controls.json, src/bench/ui/*.mjs

**Notes.** TODO
