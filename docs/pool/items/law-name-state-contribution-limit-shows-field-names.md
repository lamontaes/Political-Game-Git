---
id: law-name-state-contribution-limit-shows-field-names
title: 'News names the state contribution limits "stateHouse" and "stateSenate", the field names (Poplar, Montana; Herman, Minnesota)'
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-law-name-state-contribution-limit-shows-field-names
pr: #8664
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-11T05:59:38.248Z
merged-at: 2026-11-12T21:12:54.346Z
---

**What.** With dev mode off, News prints "State campaign contribution limit: stateHouse took effect on January 1, 2025." and the same with stateSenate. Found by src/bench/plain-text.browser.mjs in Poplar, Montana (seed e3056f1a-ed8b-448f-8d00-2e902f96abf7) and Herman, Minnesota (no seed printed), both on main; the governor and local limits read fine. Guards: the plain-text check of play-stop-02-developer-text-on-play-screens in any drawn place

**Cause.** Found in code: src/core2/data/legislature/bill-catalog.json lines 1715 and 1724 name the two laws "State campaign contribution limit: stateSenate" and "State campaign contribution limit: stateHouse"; the news line prints that name as the law name. The governor and local entries (lines 1706 and 1733) read as words.

**Fix.** Name the two laws in words (state senate and state house limits), as the other limits are named, in bill-catalog.json; check that the series names are not used as text anywhere else. Re-run src/bench/plain-text.browser.mjs in two drawn places and see no field name on News.

**Time box.** 1 hours

**Rules.** No hand-written player text outside the catalog name fields; American English; one rule for all 56 places (no place named in logic).

**Done when.** A second session runs src/bench/plain-text.browser.mjs in two drawn places (named with their seeds) and finds no field name on News; the contribution-limit laws read in words.

**Waits on.** Nothing.

**Files.** src/core2/data/legislature/bill-catalog.json, src/bench/plain-text.browser.mjs
