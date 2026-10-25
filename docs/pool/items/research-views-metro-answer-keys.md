---
id: research-views-metro-answer-keys
title: "M1-10 asks for metro answer keys for views; only state and national keys exist, and territories fall back to national"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Roadmap M1-10 says views are checked against state and metro answer keys. src/core2/modules/views.ts reads VIEWS_KEYS with state keys (CES 2024) and a national key only; no metro key exists, and a territory such as Barrigada, Guam opens on the national key ('no state sample'). M1-10 stays false until metro keys exist and the check reads them.

**Rules.** Research before building: each metro key is SOURCED from fetched survey data (CES or a comparable sample) with its sample size and spread, and it checks totals; it never assigns one person's view.

**Done when.** VIEWS_KEYS carries metro keys for the metros the survey samples with their sources, the M1-10 command checks a drawn place's opening views against its metro key where one exists (named with place and seed in the PR), and fails when a town's mean lean is moved outside it.

**Files.** data/research/views/, src/core2/modules/views.ts, src/bench/m1-10-check.ts

**Notes.** TODO
